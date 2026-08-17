package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"strconv"
	"time"

	"github.com/decred/dcrd/dcrec/secp256k1/v4"
)

const (
	DynamicKeyRotationSeconds int64 = 300 // 5 minutes rotation window
)

// EncryptedEnvelope contains ciphertext and Secp256k1 ephemeral curve points for zero-knowledge key agreement
type EncryptedEnvelope struct {
	Nonce       string `json:"nonce"`        // Base64 12-byte IV for AES-GCM
	Ciphertext  string `json:"ciphertext"`   // Base64 AES-256-GCM ciphertext + 16-byte auth tag
	EphemeralPK string `json:"ephemeral_pk"` // Hex compressed 33-byte Secp256k1 Ephemeral Public Key
	Timestamp   int64  `json:"timestamp"`    // Unix timestamp (anti-replay defense)
	TimeSlot    int64  `json:"time_slot"`    // Discrete 300s rotation slot index
	Signature   string `json:"signature"`    // Double-SHA256 HMAC signature
}

// DoubleSHA256 executes SHA256(SHA256(data)) matching Bitcoin standard hashing
func DoubleSHA256(data []byte) []byte {
	first := sha256.Sum256(data)
	second := sha256.Sum256(first[:])
	return second[:]
}

// GetBitcoinMasterPrivateKey derives the node's Secp256k1 private key from environment secrets
func GetBitcoinMasterPrivateKey() *secp256k1.PrivateKey {
	raw := os.Getenv("GENESIS_ENCRYPTION_KEY")
	if raw == "" {
		raw = os.Getenv("GENESIS_ROOT_SECRET")
	}
	if raw == "" {
		raw = os.Getenv("JWT_SECRET")
	}
	if raw == "" {
		raw = "atheric-bitcoin-secp256k1-master-seed"
	}

	seed := DoubleSHA256([]byte(raw))
	return secp256k1.PrivKeyFromBytes(seed)
}

// GetCurrentTimeSlot calculates discrete time bucket index for rolling keys
func GetCurrentTimeSlot(windowSeconds int64) int64 {
	if windowSeconds <= 0 {
		windowSeconds = DynamicKeyRotationSeconds
	}
	return time.Now().Unix() / windowSeconds
}

// DeriveSecp256k1RollingKey computes ECDH curve shared secret and expands via HKDF-SHA256d
func DeriveSecp256k1RollingKey(privKey *secp256k1.PrivateKey, pubKey *secp256k1.PublicKey, timeSlot int64) []byte {
	var sharedSecret []byte
	if pubKey != nil && privKey != nil {
		// Secp256k1 Diffie-Hellman scalar multiplication
		sharedSecret = secp256k1.GenerateSharedSecret(privKey, pubKey)
	} else {
		sharedSecret = privKey.Serialize()
	}

	salt := DoubleSHA256([]byte(fmt.Sprintf("atheric-secp256k1-slot:%d", timeSlot)))
	
	hPRK := hmac.New(sha256.New, salt)
	hPRK.Write(sharedSecret)
	prk := hPRK.Sum(nil)

	info := []byte("atheric-bitcoin-secp256k1-ecies-aes256")
	hExpand := hmac.New(sha256.New, prk)
	hExpand.Write(info)
	hExpand.Write([]byte{0x01})
	dynamicKey := hExpand.Sum(nil)

	return dynamicKey[:32]
}

// GenerateDynamicAccessToken generates a short-lived ephemeral access token for external clients
func GenerateDynamicAccessToken() (string, int64, int) {
	masterPriv := GetBitcoinMasterPrivateKey()
	slot := GetCurrentTimeSlot(DynamicKeyRotationSeconds)
	dynKey := DeriveSecp256k1RollingKey(masterPriv, nil, slot)

	h := hmac.New(sha256.New, dynKey)
	h.Write([]byte(fmt.Sprintf("access-token:%d", slot)))
	sum := h.Sum(nil)

	now := time.Now().Unix()
	remainingSeconds := int(DynamicKeyRotationSeconds - (now % DynamicKeyRotationSeconds))

	tokenHex := hex.EncodeToString(sum[:16])
	return tokenHex, slot, remainingSeconds
}

// ValidateDynamicAccessToken verifies external token against active and previous slot window
func ValidateDynamicAccessToken(token string) (bool, string) {
	if token == "" {
		return false, "Token tidak boleh kosong"
	}

	masterPriv := GetBitcoinMasterPrivateKey()
	currentSlot := GetCurrentTimeSlot(DynamicKeyRotationSeconds)

	for _, slot := range []int64{currentSlot, currentSlot - 1} {
		dynKey := DeriveSecp256k1RollingKey(masterPriv, nil, slot)
		h := hmac.New(sha256.New, dynKey)
		h.Write([]byte(fmt.Sprintf("access-token:%d", slot)))
		expectedToken := hex.EncodeToString(h.Sum(nil)[:16])

		if hmac.Equal([]byte(token), []byte(expectedToken)) {
			return true, ""
		}
	}

	return false, "Dynamic access key tidak valid atau telah kadaluarsa"
}

// ComputeDynamicHMAC calculates HMAC-SHA256 signature for envelope authentication
func ComputeDynamicHMAC(dynKey []byte, nonce, ciphertext string, timestamp, timeSlot int64) string {
	mac := hmac.New(sha256.New, dynKey)
	mac.Write([]byte(nonce))
	mac.Write([]byte(":"))
	mac.Write([]byte(ciphertext))
	mac.Write([]byte(":"))
	mac.Write([]byte(strconv.FormatInt(timestamp, 10)))
	mac.Write([]byte(":"))
	mac.Write([]byte(strconv.FormatInt(timeSlot, 10)))
	return hex.EncodeToString(mac.Sum(nil))
}

// EncryptPayloadDynamic encrypts plaintext with Bitcoin Secp256k1 ECIES + AES-256-GCM
func EncryptPayloadDynamic(plaintext []byte) (*EncryptedEnvelope, error) {
	now := time.Now().Unix()
	slot := GetCurrentTimeSlot(DynamicKeyRotationSeconds)

	// 1. Generate Ephemeral Secp256k1 Keypair (Bitcoin Curve)
	ephemeralPriv, err := secp256k1.GeneratePrivateKey()
	if err != nil {
		return nil, fmt.Errorf("failed to generate secp256k1 ephemeral key: %w", err)
	}
	ephemeralPubKeyBytes := ephemeralPriv.PubKey().SerializeCompressed()

	// 2. Derive Shared AES-256 key via ECDH with Master Key
	masterPriv := GetBitcoinMasterPrivateKey()
	dynKey := DeriveSecp256k1RollingKey(ephemeralPriv, masterPriv.PubKey(), slot)

	// 3. AES-256-GCM Encryption
	block, err := aes.NewCipher(dynKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create gcm: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nil, nonce, plaintext, nil)

	nonceB64 := base64.StdEncoding.EncodeToString(nonce)
	cipherB64 := base64.StdEncoding.EncodeToString(ciphertext)
	ephemeralHex := hex.EncodeToString(ephemeralPubKeyBytes)
	sig := ComputeDynamicHMAC(dynKey, nonceB64, cipherB64, now, slot)

	return &EncryptedEnvelope{
		Nonce:       nonceB64,
		Ciphertext:  cipherB64,
		EphemeralPK: ephemeralHex,
		Timestamp:   now,
		TimeSlot:    slot,
		Signature:   sig,
	}, nil
}

// DecryptPayloadDynamic decrypts an envelope using master private key and sender's ephemeral curve point
func DecryptPayloadDynamic(env *EncryptedEnvelope, maxAgeSeconds int64) ([]byte, error) {
	if env == nil || env.Nonce == "" || env.Ciphertext == "" {
		return nil, errors.New("invalid envelope: missing nonce or ciphertext")
	}

	now := time.Now().Unix()

	// 1. Anti-Replay Defense: Verify message age
	if maxAgeSeconds > 0 {
		diff := math.Abs(float64(now - env.Timestamp))
		if int64(diff) > maxAgeSeconds {
			return nil, fmt.Errorf("replay attack: timestamp expired (%d seconds old)", int64(diff))
		}
	}

	// 2. Active Window Validation (±1 slot for clock drift tolerance)
	currentSlot := GetCurrentTimeSlot(DynamicKeyRotationSeconds)
	slotDiff := env.TimeSlot - currentSlot
	if slotDiff < -1 || slotDiff > 1 {
		return nil, fmt.Errorf("key expired: slot %d outside active window", env.TimeSlot)
	}

	// 3. Reconstruct Ephemeral Public Key and compute ECDH shared secret
	masterPriv := GetBitcoinMasterPrivateKey()
	var dynKey []byte

	if env.EphemeralPK != "" {
		ephemBytes, err := hex.DecodeString(env.EphemeralPK)
		if err != nil {
			return nil, fmt.Errorf("invalid ephemeral public key hex: %w", err)
		}
		ephemPubKey, err := secp256k1.ParsePubKey(ephemBytes)
		if err != nil {
			return nil, fmt.Errorf("failed to parse secp256k1 ephemeral public key: %w", err)
		}
		dynKey = DeriveSecp256k1RollingKey(masterPriv, ephemPubKey, env.TimeSlot)
	} else {
		dynKey = DeriveSecp256k1RollingKey(masterPriv, nil, env.TimeSlot)
	}

	// 4. Verify HMAC Signature
	expectedSig := ComputeDynamicHMAC(dynKey, env.Nonce, env.Ciphertext, env.Timestamp, env.TimeSlot)
	if !hmac.Equal([]byte(env.Signature), []byte(expectedSig)) {
		return nil, errors.New("signature verification failed")
	}

	// 5. Decode Base64 & Decrypt AES-256-GCM
	nonce, err := base64.StdEncoding.DecodeString(env.Nonce)
	if err != nil {
		return nil, fmt.Errorf("invalid base64 nonce: %w", err)
	}

	ciphertext, err := base64.StdEncoding.DecodeString(env.Ciphertext)
	if err != nil {
		return nil, fmt.Errorf("invalid base64 ciphertext: %w", err)
	}

	block, err := aes.NewCipher(dynKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create gcm: %w", err)
	}

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("decryption failed: %w", err)
	}

	return plaintext, nil
}
