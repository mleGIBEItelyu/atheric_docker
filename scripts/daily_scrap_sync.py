#!/usr/bin/env python3
"""
Daily Automated Scraper & Market Sync Pipeline.
Designed for Jenkins CI/CD and scheduled cron jobs.
Fetches latest daily OHLCV for IDX universe, computes technical indicators,
updates SQLite DB, and syncs deltas to the Atheric Backend / VPS.
"""

import os
import sys
import time
import json
import sqlite3
import datetime
import urllib.request
import urllib.error
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parents[1]
BE_DATA_DIR = ROOT_DIR / "BE" / "data"
DB_PATH = Path(os.environ.get("MARKET_DB_PATH", BE_DATA_DIR / "idx_scraped_data.db"))

# Top IDX Universe for Daily Pipeline
IDX_TICKERS = [
    "BBCA.JK", "BBRI.JK", "BMRI.JK", "BBNI.JK", "ASII.JK",
    "TLKM.JK", "UNVR.JK", "ICBP.JK", "INDF.JK", "GOTO.JK",
    "AMMN.JK", "ADRO.JK", "PTBA.JK", "KLBF.JK", "CPIN.JK",
    "MDKA.JK", "PGAS.JK", "SMGR.JK", "INCO.JK", "BRPT.JK",
    "ANTM.JK", "MEDC.JK", "ACES.JK", "BRIS.JK", "BUMI.JK",
]

def load_env():
    for env_file in [ROOT_DIR / ".env", ROOT_DIR / "BE" / ".env"]:
        if env_file.exists():
            with open(env_file, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k, v = k.strip(), v.strip().strip('"').strip("'")
                        if k and not os.environ.get(k):
                            os.environ[k] = v

load_env()

def scrape_yfinance_ohlcv(ticker: str, days: int = 5):
    """Fetch recent OHLCV data using yfinance if available, or fallback gracefully."""
    try:
        import yfinance as yf
        t = yf.Ticker(ticker)
        df = t.history(period=f"{days}d")
        if not df.empty:
            records = []
            for date_idx, row in df.iterrows():
                d_str = date_idx.strftime("%Y-%m-%d")
                records.append({
                    "date": d_str,
                    "ticker": ticker,
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "adj_close": float(row.get("Adj Close", row["Close"])),
                    "volume": float(row["Volume"]),
                })
            return records
    except Exception as e:
        print(f"[SCRAPER WARN] yfinance failed for {ticker}: {e}")
    return []

def run_daily_pipeline():
    print("=" * 60)
    print(f"[CI/CD DAILY SCRAPE] Started at {datetime.datetime.now().isoformat()}")
    print(f"[CI/CD] Target Database: {DB_PATH}")
    print("=" * 60)

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    # 1. Check & ensure DB tables exist
    generator_script = ROOT_DIR / "genesis_service" / "generate_db.py"
    if generator_script.exists():
        import subprocess
        subprocess.run([sys.executable, str(generator_script)], check=False)

    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    updated_count = 0
    today_str = datetime.date.today().strftime("%Y-%m-%d")

    # 2. Try scraping latest market prices
    print(f"[CI/CD] Fetching latest market candles for {len(IDX_TICKERS)} IDX stocks...")
    for ticker in IDX_TICKERS:
        records = scrape_yfinance_ohlcv(ticker, days=5)
        if records:
            for r in records:
                cur.execute("""
                INSERT OR REPLACE INTO raw_teknikal 
                (date, ticker, open, high, low, close, adj_close, volume, dividends, stock_splits)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
                """, (r["date"], r["ticker"], r["open"], r["high"], r["low"], r["close"], r["adj_close"], r["volume"]))
            updated_count += 1
            print(f"[SCRAPE OK] {ticker}: {len(records)} daily records updated.")

    # Simpan hanya data 1 hari terkini (data hari sebelumnya langsung dibersihkan)
    cur.execute("DELETE FROM raw_teknikal WHERE date < ?", (today_str,))
    cur.execute("DELETE FROM dataset_teknikal WHERE date < ?", (today_str,))
    conn.commit()
    conn.close()
    print(f"[CI/CD] Database di-prune (hanya menyimpan data 1 hari terkini: {today_str}).")

    # 3. Synchronize to Backend API if configured
    sync_script = ROOT_DIR / "TrainerProduksiML" / "sync_vps.py"
    if sync_script.exists():
        print("[CI/CD] Triggering sync_vps.py to push deltas to Backend API...")
        import subprocess
        subprocess.run([sys.executable, str(sync_script), "market"], check=False)

    print("=" * 60)
    print(f"[CI/CD DAILY SCRAPE COMPLETE] {updated_count}/{len(IDX_TICKERS)} tickers updated successfully.")
    print("=" * 60)

if __name__ == "__main__":
    run_daily_pipeline()
