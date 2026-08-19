import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/components/common/Toast"

type View = "login" | "register" | "otp"

export function LoginPage() {
  const { login, register, verifyCode, resendCode } = useAuth()
  const toast = useToast()
  const [view, setView] = useState<View>("login")

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)

  const [regUser, setRegUser] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPass, setRegPass] = useState("")
  const [regPassConf, setRegPassConf] = useState("")
  const [showRegPass, setShowRegPass] = useState(false)
  const [showRegPassConf, setShowRegPassConf] = useState(false)

  const [otpEmail, setOtpEmail] = useState("")
  const [devCode, setDevCode] = useState<string | null>(null)
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""])
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const [countdown, setCountdown] = useState(0)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const hasExpiredAlerted = useRef(false)

  useEffect(() => {
    if (countdown <= 0) {
      if (view === "otp" && !hasExpiredAlerted.current && otpEmail) {
        hasExpiredAlerted.current = true
        toast.error("Waktu Verifikasi Habis", "Batas waktu 1 menit telah berakhir. Akun belum aktif telah otomatis dihapus, silakan daftar ulang.")
      }
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, view, otpEmail, toast])

  function switchView(v: View) { setView(v); setError(null); setLoading(false) }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    const clean = username.trim().replace(/[<>'"&]/g, "")
    if (!clean || !password.trim()) { setError("Email/Username dan Password wajib diisi."); return }
    setLoading(true)
    const res = await login(clean, password.trim())
    setLoading(false)
    if (res.success && res.needsVerification) {
      setOtpEmail(res.email!)
      setDevCode(res.devCode ?? null)
      setCountdown(60)
      hasExpiredAlerted.current = false
      setOtpDigits(["", "", "", "", "", ""])
      setView("otp")
      toast.warning("Verifikasi Perangkat Diperlukan", "Kode 6 digit telah dikirim. Berlaku 1 menit.")
    } else if (!res.success) {
      setError(res.error || "Login gagal.")
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (!regUser.trim() || !regEmail.trim() || !regPass) { setError("Semua field wajib diisi."); return }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(regEmail.trim())) { setError("Format email tidak valid (contoh: user@domain.com)."); return }
    if (regUser.trim().length < 3) { setError("Username minimal 3 karakter."); return }
    if (regPass.length < 6) { setError("Password minimal 6 karakter."); return }
    if (regPass !== regPassConf) { setError("Password tidak sama."); return }
    setLoading(true)
    const res = await register(regUser.trim(), regEmail.trim(), regPass)
    setLoading(false)
    if (res.success && res.needsVerification) {
      setOtpEmail(res.email!)
      setDevCode(res.devCode ?? null)
      setCountdown(60)
      hasExpiredAlerted.current = false
      setOtpDigits(["", "", "", "", "", ""])
      setView("otp")
      toast.warning(
        "Verifikasi Dalam 1 Menit",
        "Kode OTP telah dikirim ke email. Akun akan otomatis dihapus jika tidak diverifikasi dalam 1 menit."
      )
    } else if (!res.success) setError(res.error || "Registrasi gagal.")
  }

  function handleOtpChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1)
    const next = [...otpDigits]; next[idx] = digit; setOtpDigits(next)
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) otpRefs.current[idx - 1]?.focus()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!text) return; e.preventDefault()
    const next = Array(6).fill(""); for (let i = 0; i < text.length; i++) next[i] = text[i]
    setOtpDigits(next); otpRefs.current[Math.min(text.length, 5)]?.focus()
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const code = otpDigits.join("")
    if (code.length !== 6) { setError("Masukkan 6 digit kode verifikasi."); return }
    setError(null); setLoading(true)
    const res = await verifyCode(otpEmail, code)
    setLoading(false)
    if (!res.success) setError(res.error || "Kode salah atau kedaluarsa.")
  }

  async function handleResend() {
    if (countdown > 0) return; setError(null)
    const res = await resendCode(otpEmail)
    if (res.success) {
      setCountdown(60)
      hasExpiredAlerted.current = false
      setDevCode(null)
      toast.info("Kode Baru Dikirim", "Kode verifikasi 6 digit baru berlaku selama 1 menit.")
    } else {
      setError(res.error || "Gagal mengirim ulang kode.")
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 16px", borderRadius: "var(--radius-sm)",
    background: "var(--panel)", border: "1px solid var(--border-strong)",
    color: "var(--text)", fontSize: "14px", outline: "none", boxSizing: "border-box",
    transition: "border-color .15s, box-shadow .15s",
  }
  const lbl: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-dim)",
    letterSpacing: "0.05em", marginBottom: "7px", textTransform: "uppercase",
  }
  function onF(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "var(--blue)"
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,110,246,.2)"
  }
  function onB(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "var(--border-strong)"
    e.currentTarget.style.boxShadow = "none"
  }

  return (
    <div style={{
      minHeight: "100vh", width: "100vw", backgroundColor: "var(--bg)",
      backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1.2px, transparent 1.2px)",
      backgroundSize: "22px 22px", color: "var(--text)", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px", fontFamily: "var(--font)",
    }}>
      <style>{`
        .at-tab{cursor:pointer;padding:8px 0;font-size:13.5px;font-weight:600;color:var(--text-dim);border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none;flex:1;transition:.15s}
        .at-tab.active{color:var(--blue);border-bottom-color:var(--blue)}
        .at-tab:hover:not(.active){color:var(--text)}
        .at-sub{width:100%;padding:14px;border-radius:var(--radius-sm);background:var(--blue);color:#fff;font-weight:700;font-size:15px;border:none;cursor:pointer;transition:.2s}
        .at-sub:hover:not(:disabled){filter:brightness(1.15)}
        .at-sub:disabled{opacity:.7;cursor:not-allowed}
        .at-lnk{background:none;border:none;cursor:pointer;color:var(--blue);font-size:13px;font-weight:600;padding:0}
        .at-lnk:hover{opacity:.8}
        .otp-d{width:44px;height:52px;border-radius:var(--radius-sm);background:var(--panel);border:1.5px solid var(--border-strong);color:var(--text);font-size:22px;font-weight:700;text-align:center;outline:none;transition:.15s}
        .otp-d:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(59,110,246,.2)}
      `}</style>

      <div style={{ width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", alignItems: "center", gap: "28px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            Atheric <span style={{ color: "var(--blue)" }}>AI</span>
          </div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-dim)", marginTop: "6px" }}>by GIBEI Telkom University</div>
        </div>

        <div style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "32px 28px" }}>
          {view === "otp" ? (
            <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>Verifikasi Email</div>
                <div style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.6 }}>
                  Kode 6-digit dikirim ke <strong style={{ color: "var(--text)" }}>{otpEmail}</strong>
                </div>
                <div style={{ marginTop: "6px", fontSize: "11.5px", color: countdown > 0 ? "#f59e0b" : "#ef4444", fontWeight: 600 }}>
                  {countdown > 0 ? (
                    `⏱️ Batas waktu verifikasi: ${countdown}s (Akun otomatis dibatalkan jika melebihi 1 menit)`
                  ) : (
                    "⚠️ Waktu 1 menit telah habis. Akun belum verifikasi otomatis dihapus dari DB."
                  )}
                </div>
                {devCode && (
                  <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(255,180,0,0.12)", border: "1px solid rgba(255,180,0,0.3)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "#f5a623", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Dev mode - kode: <strong>{devCode}</strong>
                  </div>
                )}
              </div>
              {error && <ErrBox msg={error} />}
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }} onPaste={handleOtpPaste}>
                {otpDigits.map((d, i) => (
                  <input key={i} ref={el => { otpRefs.current[i] = el }} className="otp-d"
                    type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)} autoFocus={i === 0} />
                ))}
              </div>
              <button type="submit" className="at-sub" disabled={loading || countdown === 0}>
                {loading ? "Memverifikasi..." : "Verifikasi & Masuk"}
              </button>
              <div style={{ textAlign: "center", fontSize: "13px", color: "var(--text-dim)" }}>
                Tidak dapat kode?{" "}
                {countdown > 0 ? <span>Kirim ulang ({countdown}s)</span>
                  : <button type="button" className="at-lnk" onClick={handleResend}>Kirim Ulang</button>}
              </div>
              <div style={{ textAlign: "center" }}>
                <button type="button" className="at-lnk" style={{ color: "var(--text-dim)", fontSize: "12px" }}
                  onClick={() => switchView("register")}>← Kembali ke Daftar</button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "24px" }}>
                <button className={`at-tab${view === "login" ? " active" : ""}`} onClick={() => switchView("login")}>Masuk</button>
                <button className={`at-tab${view === "register" ? " active" : ""}`} onClick={() => switchView("register")}>Daftar</button>
              </div>
              {error && <ErrBox msg={error} />}
              {view === "login" && (
                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div>
                    <label style={lbl}>Email / Username</label>
                    <input type="text" required style={inp} placeholder="trader@gibei.id"
                      value={username} onChange={e => setUsername(e.target.value)} onFocus={onF} onBlur={onB} />
                  </div>
                  <div>
                    <label style={lbl}>Password</label>
                    <div style={{ position: "relative" }}>
                      <input type={showPass ? "text" : "password"} required
                        style={{ ...inp, paddingRight: "42px" }} placeholder="••••••••"
                        value={password} onChange={e => setPassword(e.target.value)} onFocus={onF} onBlur={onB} />
                      <EyeBtn show={showPass} onToggle={() => setShowPass(v => !v)} />
                    </div>
                  </div>
                  <button type="submit" className="at-sub" disabled={loading} style={{ marginTop: "4px" }}>
                    {loading ? "Masuk..." : "Masuk ke Dashboard"}
                  </button>
                </form>
              )}
              {view === "register" && (
                <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={lbl}>Username</label>
                    <input type="text" required style={inp} placeholder="johndoe"
                      value={regUser} onChange={e => setRegUser(e.target.value)} onFocus={onF} onBlur={onB} />
                  </div>
                  <div>
                    <label style={lbl}>Email</label>
                    <input type="email" required style={inp} placeholder="john@example.com"
                      value={regEmail} onChange={e => setRegEmail(e.target.value)} onFocus={onF} onBlur={onB} />
                  </div>
                  <div>
                    <label style={lbl}>Password</label>
                    <div style={{ position: "relative" }}>
                      <input type={showRegPass ? "text" : "password"} required
                        style={{ ...inp, paddingRight: "42px" }} placeholder="Min. 8 karakter"
                        value={regPass} onChange={e => setRegPass(e.target.value)} onFocus={onF} onBlur={onB} />
                      <EyeBtn show={showRegPass} onToggle={() => setShowRegPass(v => !v)} />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Konfirmasi Password</label>
                    <div style={{ position: "relative" }}>
                      <input type={showRegPassConf ? "text" : "password"} required
                        style={{ ...inp, paddingRight: "42px" }} placeholder="••••••••"
                        value={regPassConf} onChange={e => setRegPassConf(e.target.value)} onFocus={onF} onBlur={onB} />
                      <EyeBtn show={showRegPassConf} onToggle={() => setShowRegPassConf(v => !v)} />
                    </div>
                  </div>
                  <button type="submit" className="at-sub" disabled={loading} style={{ marginTop: "4px" }}>
                    {loading ? "Mendaftarkan..." : "Buat Akun"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <div style={{ fontSize: "12px", color: "var(--text-mute)", textAlign: "center", fontWeight: 500 }}>
          © 2026 Atheric AI. Secured &amp; Encrypted.
        </div>
      </div>
    </div>
  )
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: "11px 14px", borderRadius: "var(--radius-sm)", marginBottom: "4px",
      background: "rgba(240,86,75,0.12)", border: "1px solid rgba(240,86,75,0.3)",
      color: "var(--red)", fontSize: "13px", lineHeight: 1.45
    }}>{msg}</div>
  )
}

function EyeBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label="Toggle visibility" style={{
      position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
      background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: "4px", display: "flex",
    }}>
      {show ? (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.858A9.954 9.954 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-4.592-4.592a3 3 0 11-4.243-4.243m4.242 4.242L3 3l18 18" />
        </svg>
      ) : (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  )
}
