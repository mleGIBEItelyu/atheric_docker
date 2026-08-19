#!/usr/bin/env python3
"""
IDX Scheduled Cronjob Market Scraper (09:30 WIB).
Runs 30 minutes after IDX market opening (09:00 WIB).
Automatically checks and skips:
  1. Weekends (Sabtu & Minggu)
  2. Indonesian National Public Holidays (Libur Nasional)
  3. Joint Leaves & Exchange Holidays (Cuti Bersama & Libur Resmi BEI/IDX)
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

# Top IDX Universe
IDX_TICKERS = [
    "BBCA.JK", "BBRI.JK", "BMRI.JK", "BBNI.JK", "ASII.JK",
    "TLKM.JK", "UNVR.JK", "ICBP.JK", "INDF.JK", "GOTO.JK",
    "AMMN.JK", "ADRO.JK", "PTBA.JK", "KLBF.JK", "CPIN.JK",
    "MDKA.JK", "PGAS.JK", "SMGR.JK", "INCO.JK", "BRPT.JK",
    "ANTM.JK", "MEDC.JK", "ACES.JK", "BRIS.JK", "BUMI.JK",
]

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

    return True, "Hari Kerja Aktif Bursa IDX (Sesi Perdagangan Pagi 09:30 WIB)"

def scrape_morning_prices():
    today = datetime.date.today()
    today_str = today.strftime("%Y-%m-%d")
    is_open, reason = is_idx_trading_day(today)

    now_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("=" * 68)
    print(f"[IDX 09:30 WIB CRON SCRAPER] Waktu Eksekusi: {now_time}")
    print(f"[STATUS BURSA] {reason}")
    print("=" * 68)

    # JIKA HARI LIBUR / SABTU / MINGGU -> BERHENTI DENGAN AMAN
    if not is_open:
        print(f"[IDX CRON SKIP] >>> Scraping DILEWATI karena bursa tutup: {reason} <<<")
        print("=" * 68)
        return True

    print(f"[IDX CRON] Bursa AKTIF. Memulai scraping data sesi 09:30 WIB...")
    print(f"[TARGET DATABASE] {DB_PATH}")

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    updated = 0
    try:
        import yfinance as yf
        for ticker in IDX_TICKERS:
            try:
                t = yf.Ticker(ticker)
                df = t.history(period="2d")
                if not df.empty:
                    last_row = df.iloc[-1]
                    d_str = df.index[-1].strftime("%Y-%m-%d")
                    
                    cur.execute("""
                    INSERT OR REPLACE INTO raw_teknikal 
                    (date, ticker, open, high, low, close, adj_close, volume, dividends, stock_splits)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
                    """, (
                        d_str,
                        ticker,
                        float(last_row["Open"]),
                        float(last_row["High"]),
                        float(last_row["Low"]),
                        float(last_row["Close"]),
                        float(last_row.get("Adj Close", last_row["Close"])),
                        float(last_row["Volume"])
                    ))
                    updated += 1
                    print(f"  [OK] {ticker}: Rp {float(last_row['Close']):,.0f} (Vol: {int(last_row['Volume']):,})")
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

    # Trigger sync ke Backend VPS (market data & news)
    sync_script = ROOT_DIR / "TrainerProduksiML" / "sync_vps.py"
    if sync_script.exists() and updated > 0:
        print("\n[SYNC] Mengirimkan delta data harga & berita pagi ke Backend API...")
        import subprocess
        subprocess.run([sys.executable, str(sync_script), "market"], check=False)
        subprocess.run([sys.executable, str(sync_script), "news"], check=False)
        subprocess.run([sys.executable, str(sync_script), "market"], check=False)

    print("=" * 68)
    print(f"[IDX CRON SELESAI] Sukses update {updated}/{len(IDX_TICKERS)} saham pada sesi 09:30 WIB.")
    print("=" * 68)
    return True

if __name__ == "__main__":
    scrape_morning_prices()
