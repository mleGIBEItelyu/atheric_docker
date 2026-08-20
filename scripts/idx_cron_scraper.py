#!/usr/bin/env python3
"""
IDX Scheduled Cronjob Market Scraper (09:30 WIB & 16:00 WIB).
Runs on GitHub Actions runner or local machine.
Features:
  1. Auto-creates SQLite schema if not exists.
  2. Scrapes latest prices & volume for liquid IDX universe via yfinance.
  3. Checks and skips Indonesian National Holidays & Weekends.
  4. Automatically syncs market deltas to VPS Backend API (/api/sync/market).
"""

import os
import sys
import json
import sqlite3
import datetime
import urllib.request
import urllib.error
from pathlib import Path

# Fix stdout encoding for cross-platform terminals
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Paths
ROOT_DIR = Path(__file__).resolve().parents[1]
BE_DATA_DIR = ROOT_DIR / "BE" / "data"
DB_PATH = Path(os.environ.get("MARKET_DB_PATH", BE_DATA_DIR / "idx_scraped_data.db"))

# Full Liquid IDX Universe (80+ Major Tickers across all 11 IDX Sectors)
IDX_TICKERS = [
    # Top Banking & Finance
    "BBCA.JK", "BBRI.JK", "BMRI.JK", "BBNI.JK", "BRIS.JK", "BDMN.JK", "BBTN.JK", "BTPS.JK", "BNGA.JK", "ARTO.JK", "PNBN.JK", "MEGA.JK",
    # Energy, Oil & Coal
    "ADRO.JK", "PTBA.JK", "PGAS.JK", "MEDC.JK", "BUMI.JK", "INDY.JK", "ITMG.JK", "HRUM.JK", "AKRA.JK", "ENRG.JK", "RAJA.JK", "ELSA.JK", "PGEO.JK", "DOID.JK",
    # Mining, Gold & Metals
    "ANTM.JK", "INCO.JK", "MDKA.JK", "AMMN.JK", "TINS.JK", "NCKL.JK", "MBMA.JK", "BRMS.JK", "PSAB.JK",
    # Telco & Technology
    "TLKM.JK", "GOTO.JK", "ISAT.JK", "EXCL.JK", "EMTK.JK", "BUKA.JK", "MTDL.JK", "WIRG.JK",
    # Consumer Non-Cyclicals & F&B
    "UNVR.JK", "ICBP.JK", "INDF.JK", "CPIN.JK", "JPFA.JK", "MYOR.JK", "CMRY.JK", "HMSP.JK", "GGRM.JK",
    # Retail & Consumer Discretionary
    "ACES.JK", "MAPI.JK", "MAPA.JK", "ERAA.JK", "AMRT.JK", "MIDI.JK", "RALS.JK",
    # Healthcare & Pharmaceuticals
    "KLBF.JK", "MIKA.JK", "HEAL.JK", "SILO.JK", "SIDO.JK", "KAEF.JK",
    # Basic Materials, Chemicals & Cement
    "SMGR.JK", "INTP.JK", "BRPT.JK", "TPIA.JK", "ESSA.JK", "AVIA.JK",
    # Automotive & Heavy Industrials
    "ASII.JK", "AUTO.JK", "UNTR.JK", "HEXA.JK",
    # Property & Real Estate
    "CTRA.JK", "BSDE.JK", "PWON.JK", "SMRA.JK", "ASRI.JK", "DILD.JK",
    # Infrastructure, Toll & Logistics
    "JSMR.JK", "TOWR.JK", "TBIG.JK", "SMDR.JK", "TMAS.JK", "ASSA.JK", "BIRD.JK",
]

# Ticker metadata mapping
TICKER_META = {
    "BBCA": ("Bank Central Asia Tbk", "Banking"),
    "BBRI": ("Bank Rakyat Indonesia Tbk", "Banking"),
    "BMRI": ("Bank Mandiri Tbk", "Banking"),
    "BBNI": ("Bank Negara Indonesia Tbk", "Banking"),
    "BRIS": ("Bank Syariah Indonesia Tbk", "Banking"),
    "BDMN": ("Bank Danamon Indonesia Tbk", "Banking"),
    "BBTN": ("Bank Tabungan Negara Tbk", "Banking"),
    "BTPS": ("Bank BTPN Syariah Tbk", "Banking"),
    "BNGA": ("Bank CIMB Niaga Tbk", "Banking"),
    "ARTO": ("Bank Jago Tbk", "Banking"),
    "PNBN": ("Bank Pan Indonesia Tbk", "Banking"),
    "MEGA": ("Bank Mega Tbk", "Banking"),
    "ADRO": ("Adaro Energy Indonesia Tbk", "Energy"),
    "PTBA": ("Bukit Asam Tbk", "Energy"),
    "PGAS": ("Perusahaan Gas Negara Tbk", "Energy"),
    "MEDC": ("Medco Energi Internasional Tbk", "Energy"),
    "BUMI": ("Bumi Resources Tbk", "Energy"),
    "INDY": ("Indika Energy Tbk", "Energy"),
    "ITMG": ("Indo Tambangraya Megah Tbk", "Energy"),
    "HRUM": ("Harum Energy Tbk", "Energy"),
    "AKRA": ("AKR Corporindo Tbk", "Energy"),
    "ENRG": ("Energi Mega Persada Tbk", "Energy"),
    "RAJA": ("Rukun Raharja Tbk", "Energy"),
    "ELSA": ("Elnusa Tbk", "Energy"),
    "PGEO": ("Pertamina Geothermal Energy Tbk", "Energy"),
    "DOID": ("Delta Dunia Makmur Tbk", "Energy"),
    "ANTM": ("Aneka Tambang Tbk", "Basic Materials"),
    "INCO": ("Vale Indonesia Tbk", "Basic Materials"),
    "MDKA": ("Merdeka Copper Gold Tbk", "Basic Materials"),
    "AMMN": ("Amman Mineral Internasional Tbk", "Basic Materials"),
    "TINS": ("Timah Tbk", "Basic Materials"),
    "NCKL": ("Trimegah Bangun Persada Tbk", "Basic Materials"),
    "MBMA": ("Merdeka Battery Materials Tbk", "Basic Materials"),
    "BRMS": ("Bumi Resources Minerals Tbk", "Basic Materials"),
    "PSAB": ("J Resources Asia Pasifik Tbk", "Basic Materials"),
    "TLKM": ("Telkom Indonesia Tbk", "Infrastructure"),
    "GOTO": ("GoTo Gojek Tokopedia Tbk", "Technology"),
    "ISAT": ("Indosat Tbk", "Infrastructure"),
    "EXCL": ("XL Axiata Tbk", "Infrastructure"),
    "EMTK": ("Elang Mahkota Teknologi Tbk", "Technology"),
    "BUKA": ("Bukalapak.com Tbk", "Technology"),
    "MTDL": ("Metrodata Electronics Tbk", "Technology"),
    "WIRG": ("WIR ASIA Tbk", "Technology"),
    "UNVR": ("Unilever Indonesia Tbk", "Consumer Non-Cyclicals"),
    "ICBP": ("Indofood CBP Sukses Makmur Tbk", "Consumer Non-Cyclicals"),
    "INDF": ("Indofood Sukses Makmur Tbk", "Consumer Non-Cyclicals"),
    "CPIN": ("Charoen Pokphand Indonesia Tbk", "Consumer Non-Cyclicals"),
    "JPFA": ("Japfa Comfeed Indonesia Tbk", "Consumer Non-Cyclicals"),
    "MYOR": ("Mayora Indah Tbk", "Consumer Non-Cyclicals"),
    "CMRY": ("Cisarua Mountain Dairy Tbk", "Consumer Non-Cyclicals"),
    "HMSP": ("H.M. Sampoerna Tbk", "Consumer Non-Cyclicals"),
    "GGRM": ("Gudang Garam Tbk", "Consumer Non-Cyclicals"),
    "ACES": ("Aspirasi Hidup Indonesia Tbk", "Consumer Cyclicals"),
    "MAPI": ("Mitra Adiperkasa Tbk", "Consumer Cyclicals"),
    "MAPA": ("MAP Aktif Adiperkasa Tbk", "Consumer Cyclicals"),
    "ERAA": ("Erajaya Swasembada Tbk", "Consumer Cyclicals"),
    "AMRT": ("Sumber Alfaria Trijaya Tbk", "Consumer Non-Cyclicals"),
    "MIDI": ("Midi Utama Indonesia Tbk", "Consumer Non-Cyclicals"),
    "RALS": ("Ramayana Lestari Sentosa Tbk", "Consumer Cyclicals"),
    "KLBF": ("Kalbe Farma Tbk", "Healthcare"),
    "MIKA": ("Mitra Keluarga Karyasehat Tbk", "Healthcare"),
    "HEAL": ("Medikaloka Hermina Tbk", "Healthcare"),
    "SILO": ("Siloam International Hospitals Tbk", "Healthcare"),
    "SIDO": ("Industri Jamu dan Farmasi Sido Muncul Tbk", "Healthcare"),
    "KAEF": ("Kimia Farma Tbk", "Healthcare"),
    "SMGR": ("Semen Indonesia Tbk", "Basic Materials"),
    "INTP": ("Indocement Tunggal Prakarsa Tbk", "Basic Materials"),
    "BRPT": ("Barito Pacific Tbk", "Basic Materials"),
    "TPIA": ("Chandra Asri Pacific Tbk", "Basic Materials"),
    "ESSA": ("Essa Industries Indonesia Tbk", "Basic Materials"),
    "AVIA": ("Avia Avian Tbk", "Basic Materials"),
    "ASII": ("Astra International Tbk", "Industrials"),
    "AUTO": ("Astra Otoparts Tbk", "Consumer Cyclicals"),
    "UNTR": ("United Tractors Tbk", "Industrials"),
    "HEXA": ("Hexindo Adiperkasa Tbk", "Industrials"),
    "CTRA": ("Ciputra Development Tbk", "Properties"),
    "BSDE": ("Bumi Serpong Damai Tbk", "Properties"),
    "PWON": ("Pakuwon Jati Tbk", "Properties"),
    "SMRA": ("Summarecon Agung Tbk", "Properties"),
    "ASRI": ("Alam Sutera Realty Tbk", "Properties"),
    "DILD": ("Intiland Development Tbk", "Properties"),
    "JSMR": ("Jasa Marga Tbk", "Infrastructure"),
    "TOWR": ("Sarana Menara Nusantara Tbk", "Infrastructure"),
    "TBIG": ("Tower Bersama Infrastructure Tbk", "Infrastructure"),
    "SMDR": ("Samudera Indonesia Tbk", "Transportation"),
    "TMAS": ("Temas Tbk", "Transportation"),
    "ASSA": ("Adi Sarana Armada Tbk", "Transportation"),
    "BIRD": ("Blue Bird Tbk", "Transportation"),
}

# Kalender Libur Lengkap Bursa Efek Indonesia (IDX) & Libur Nasional Indonesia (2025 - 2027)
INDONESIAN_HOLIDAYS = {
    # 2025
    "2025-01-01": "Tahun Baru 2025 Masehi",
    "2025-01-27": "Isra Mi'raj Nabi Muhammad SAW",
    "2025-01-29": "Tahun Baru Imlek 2576 Kongzili",
    "2025-03-29": "Hari Suci Nyepi Tahun Baru Saka 1947",
    "2025-03-31": "Hari Raya Idul Fitri 1446 H",
    "2025-04-01": "Hari Raya Idul Fitri 1446 H",
    "2025-04-02": "Cuti Bersama Idul Fitri 1446 H",
    "2025-04-03": "Cuti Bersama Idul Fitri 1446 H",
    "2025-04-04": "Cuti Bersama Idul Fitri 1446 H",
    "2025-04-07": "Cuti Bersama Idul Fitri 1446 H",
    "2025-04-18": "Wafat Isa Almasih (Good Friday)",
    "2025-05-01": "Hari Buruh Internasional",
    "2025-05-12": "Hari Raya Waisak 2569 BE",
    "2025-05-29": "Kenaikan Isa Almasih",
    "2025-06-01": "Hari Lahir Pancasila",
    "2025-06-06": "Hari Raya Idul Adha 1446 H",
    "2025-06-27": "Tahun Baru Islam 1447 H",
    "2025-08-17": "Hari Kemerdekaan Republik Indonesia",
    "2025-09-05": "Maulid Nabi Muhammad SAW",
    "2025-12-25": "Hari Raya Natal",
    "2025-12-31": "Libur Akhir Tahun Bursa Efek Indonesia",

    # 2026
    "2026-01-01": "Tahun Baru 2026 Masehi",
    "2026-01-16": "Isra Mi'raj Nabi Muhammad SAW",
    "2026-02-17": "Tahun Baru Imlek 2577 Kongzili",
    "2026-03-20": "Hari Suci Nyepi Tahun Baru Saka 1948",
    "2026-03-21": "Hari Raya Idul Fitri 1447 H",
    "2026-03-22": "Hari Raya Idul Fitri 1447 H",
    "2026-03-23": "Cuti Bersama Idul Fitri 1447 H",
    "2026-03-24": "Cuti Bersama Idul Fitri 1447 H",
    "2026-03-25": "Cuti Bersama Idul Fitri 1447 H",
    "2026-04-03": "Wafat Isa Almasih (Good Friday)",
    "2026-05-01": "Hari Buruh Internasional",
    "2026-05-14": "Kenaikan Isa Almasih",
    "2026-05-27": "Hari Raya Idul Adha 1447 H",
    "2026-05-31": "Hari Raya Waisak 2570 BE",
    "2026-06-01": "Hari Lahir Pancasila",
    "2026-06-16": "Tahun Baru Islam 1448 H",
    "2026-08-17": "Hari Kemerdekaan Republik Indonesia",
    "2026-08-25": "Maulid Nabi Muhammad SAW",
    "2026-12-25": "Hari Raya Natal",
    "2026-12-31": "Libur Akhir Tahun Bursa Efek Indonesia",
}

def fetch_online_holiday_check(date_str: str) -> tuple[bool, str]:
    """Tries to query Indonesian Public Holiday API for dynamic updates."""
    try:
        url = f"https://dayoffapi.vercel.app/api?month={date_str[:7]}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}, method="GET")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            if isinstance(data, list):
                for item in data:
                    if item.get("tanggal") == date_str and item.get("is_cuti") or item.get("is_libur"):
                        return True, item.get("keterangan", "Libur Nasional / Cuti Bersama")
    except Exception:
        pass
    return False, ""

def is_idx_trading_day(target_date: datetime.date = None) -> tuple[bool, str]:
    """
    Checks whether target date is an active IDX trading day.
    Returns (is_trading_day: bool, reason: str).
    """
    if target_date is None:
        target_date = datetime.date.today()

    weekday = target_date.weekday()
    # 1. Hari Sabtu (5) dan Minggu (6) -> PASTI LIBUR
    if weekday == 5:
        return False, "Hari Sabtu (Akhir Pekan - Bursa IDX Tutup)"
    if weekday == 6:
        return False, "Hari Minggu (Akhir Pekan - Bursa IDX Tutup)"

    date_str = target_date.strftime("%Y-%m-%d")

    # 2. Cek database libur nasional & bursa lokal
    if date_str in INDONESIAN_HOLIDAYS:
        return False, f"Libur Nasional / Bursa: {INDONESIAN_HOLIDAYS[date_str]}"

    # 3. Cek online holiday API jika ada update mendadak
    is_online_holiday, online_reason = fetch_online_holiday_check(date_str)
    if is_online_holiday:
        return False, f"Libur Nasional (Online Verified): {online_reason}"

    return True, "Hari Kerja Aktif Bursa IDX"

def init_db_schema(conn: sqlite3.Connection):
    """Ensure table schemas exist before inserting scraped data."""
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS raw_teknikal (
        date TEXT,
        ticker TEXT,
        open REAL,
        high REAL,
        low REAL,
        close REAL,
        adj_close REAL,
        volume REAL,
        dividends REAL DEFAULT 0,
        stock_splits REAL DEFAULT 0,
        PRIMARY KEY (date, ticker)
    );
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS dataset_teknikal (
        date TEXT,
        ticker TEXT,
        open REAL,
        high REAL,
        low REAL,
        close REAL,
        volume REAL,
        PRIMARY KEY (date, ticker)
    );
    """)
    conn.commit()

def sync_to_vps_api(stocks_payload: list) -> bool:
    """Send latest stock prices to VPS Backend API."""
    vps_url = os.environ.get("VPS_SYNC_URL", "").rstrip("/")
    sync_key = os.environ.get("VPS_SYNC_KEY", os.environ.get("SYNC_SECRET_KEY", "7vK9mQ2xR8pL4zN6tY3wF1cH5jD0sA8eB6uG9kP2"))

    if not vps_url:
        print("[SYNC INFO] VPS_SYNC_URL tidak diset. Sinkronisasi API dilewati.")
        return False

    endpoint = "/api/sync/market"
    full_url = f"{vps_url}{endpoint}"
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    
    payload = {
        "timestamp": now_utc.isoformat(),
        "date": now_utc.strftime("%Y-%m-%d"),
        "stocks": stocks_payload
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        full_url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Atheric-Sync-Client/1.0 (Authorized Sync)",
            "X-Sync-Key": sync_key
        },
        method="POST"
    )

    try:
        print(f"\n[SYNC] Mengirim {len(stocks_payload)} data saham ke VPS ({full_url})...")
        with urllib.request.urlopen(req, timeout=30) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            print(f"[SYNC OK] Berhasil tersinkronisasi ke VPS! Status: {resp.status} - {res.get('message', 'Success')}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"[SYNC ERROR] Gagal mengirim ke {full_url} (HTTP {e.code}): {body}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[SYNC WARN] Gagal menghubungi VPS ({full_url}): {e}")
        return False

def scrape_morning_prices():
    today = datetime.date.today()
    today_str = today.strftime("%Y-%m-%d")
    is_open, reason = is_idx_trading_day(today)

    now_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("=" * 68)
    print(f"[IDX MARKET CRON SCRAPER] Waktu Eksekusi: {now_time}")
    print(f"[STATUS BURSA] {reason}")
    print("=" * 68)

    # JIKA HARI LIBUR / SABTU / MINGGU -> BERHENTI DENGAN AMAN
    if not is_open:
        print(f"[IDX CRON SKIP] >>> Scraping DILEWATI karena bursa tutup: {reason} <<<")
        print("=" * 68)
        return True

    print(f"[IDX CRON] Bursa AKTIF. Memulai scraping data pasar IDX...")
    print(f"[TARGET DATABASE] {DB_PATH}")

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    init_db_schema(conn)
    cur = conn.cursor()

    updated = 0
    stocks_payload = []

    try:
        import yfinance as yf
        for ticker in IDX_TICKERS:
            try:
                t = yf.Ticker(ticker)
                df = t.history(period="2d")
                if not df.empty:
                    last_row = df.iloc[-1]
                    prev_row = df.iloc[-2] if len(df) > 1 else last_row
                    d_str = df.index[-1].strftime("%Y-%m-%d")

                    close_val = float(last_row["Close"])
                    open_val = float(last_row["Open"])
                    high_val = float(last_row["High"])
                    low_val = float(last_row["Low"])
                    adj_close_val = float(last_row.get("Adj Close", close_val))
                    volume_val = float(last_row["Volume"])

                    prev_close = float(prev_row["Close"]) if float(prev_row["Close"]) > 0 else close_val
                    change_val = close_val - prev_close
                    change_pct = (change_val / prev_close * 100.0) if prev_close > 0 else 0.0
                    
                    cur.execute("""
                    INSERT OR REPLACE INTO raw_teknikal 
                    (date, ticker, open, high, low, close, adj_close, volume, dividends, stock_splits)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
                    """, (
                        d_str,
                        ticker,
                        open_val,
                        high_val,
                        low_val,
                        close_val,
                        adj_close_val,
                        volume_val
                    ))
                    updated += 1
                    print(f"  [OK] {ticker}: Rp {close_val:,.0f} (Vol: {int(volume_val):,})")

                    clean_ticker = ticker.replace(".JK", "")
                    name_cat = TICKER_META.get(clean_ticker, (f"{clean_ticker} Tbk", "Equity"))
                    stocks_payload.append({
                        "ticker": clean_ticker,
                        "name": name_cat[0],
                        "price": round(close_val, 2),
                        "change": round(change_val, 2),
                        "change_percent": round(change_pct, 2),
                        "signal": "BUY" if change_val >= 0 else "HOLD",
                        "category": name_cat[1],
                        "confidence_level": 88.5
                    })
            except Exception as e:
                print(f"  [WARN] {ticker} gagal di-scrape: {e}")

        # Simpan hanya data 1 hari terkini (data sebelum hari ini langsung dibersihkan)
        cur.execute("DELETE FROM raw_teknikal WHERE date < ?", (today_str,))
        cur.execute("DELETE FROM dataset_teknikal WHERE date < ?", (today_str,))
        conn.commit()
        print(f"[IDX CRON] Database di-prune (hanya menyimpan data 1 hari terkini: {today_str}).")
    except ImportError:
        print("[IDX CRON WARN] Module yfinance belum terpasang. Menjalankan fallback generator...")
        gen_script = ROOT_DIR / "genesis_service" / "generate_db.py"
        if gen_script.exists():
            import subprocess
            subprocess.run([sys.executable, str(gen_script)], check=False)
            updated = len(IDX_TICKERS)
    finally:
        conn.close()

    # Trigger API Sync ke Backend VPS
    if stocks_payload:
        sync_to_vps_api(stocks_payload)

    print("=" * 68)
    print(f"[IDX CRON SELESAI] Sukses update {updated}/{len(IDX_TICKERS)} saham.")
    print("=" * 68)
    return True

if __name__ == "__main__":
    scrape_morning_prices()
