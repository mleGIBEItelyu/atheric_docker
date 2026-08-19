#!/usr/bin/env python3
"""
Automated Database Generator & Market Initializer.
Generates SQLite database with IDX universe metadata, daily OHLCV candles,
and computed technical indicators for seamless offline & Docker startup.
"""

import os
import sys
import sqlite3
import datetime
import math
import random
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent

# Target DB paths (Docker /app/data, or local BE/data)
DB_PATH_CANDIDATES = [
    os.environ.get("MARKET_DB_PATH"),
    os.environ.get("DB_PATH"),
    str(CURRENT_DIR.parent / "BE" / "data" / "idx_scraped_data.db"),
    str(CURRENT_DIR / "idx_scraped_data.db"),
    "/app/data/idx_scraped_data.db",
]

def resolve_db_path():
    env_path = os.environ.get("MARKET_DB_PATH")
    if env_path:
        return env_path
    
    if Path("/app/data").exists():
        return "/app/data/idx_scraped_data.db"
        
    for p in DB_PATH_CANDIDATES:
        if p and Path(p).parent.exists():
            return p
            
    target = CURRENT_DIR.parent / "BE" / "data" / "idx_scraped_data.db"
    target.parent.mkdir(parents=True, exist_ok=True)
    return str(target)

# Curated IDX Universe (Blue Chips, Mid Caps, Growth Leaders)
IDX_UNIVERSE = [
    {"ticker": "BBCA.JK", "name": "Bank Central Asia Tbk", "sector": "Finance", "sub_sector": "Bank", "base_price": 9850, "vol": 0.012},
    {"ticker": "BBRI.JK", "name": "Bank Rakyat Indonesia (Persero) Tbk", "sector": "Finance", "sub_sector": "Bank", "base_price": 4820, "vol": 0.016},
    {"ticker": "BMRI.JK", "name": "Bank Mandiri (Persero) Tbk", "sector": "Finance", "sub_sector": "Bank", "base_price": 6600, "vol": 0.014},
    {"ticker": "BBNI.JK", "name": "Bank Negara Indonesia (Persero) Tbk", "sector": "Finance", "sub_sector": "Bank", "base_price": 5400, "vol": 0.015},
    {"ticker": "ASII.JK", "name": "Astra International Tbk", "sector": "Consumer Discretionary", "sub_sector": "Automotive", "base_price": 5050, "vol": 0.013},
    {"ticker": "TLKM.JK", "name": "Telkom Indonesia (Persero) Tbk", "sector": "Infrastructure", "sub_sector": "Telecommunication", "base_price": 3150, "vol": 0.014},
    {"ticker": "UNVR.JK", "name": "Unilever Indonesia Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Household Products", "base_price": 2720, "vol": 0.018},
    {"ticker": "ICBP.JK", "name": "Indofood CBP Sukses Makmur Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Processed Food", "base_price": 11800, "vol": 0.011},
    {"ticker": "INDF.JK", "name": "Indofood Sukses Makmur Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Food Products", "base_price": 7100, "vol": 0.012},
    {"ticker": "GOTO.JK", "name": "GoTo Gojek Tokopedia Tbk", "sector": "Technology", "sub_sector": "Software & IT Services", "base_price": 62, "vol": 0.035},
    {"ticker": "AMMN.JK", "name": "Amman Mineral Internasional Tbk", "sector": "Basic Materials", "sub_sector": "Metals & Mining", "base_price": 9350, "vol": 0.022},
    {"ticker": "ADRO.JK", "name": "Alamtri Resources Indonesia Tbk", "sector": "Energy", "sub_sector": "Coal", "base_price": 2350, "vol": 0.020},
    {"ticker": "PTBA.JK", "name": "Bukit Asam Tbk", "sector": "Energy", "sub_sector": "Coal", "base_price": 2740, "vol": 0.017},
    {"ticker": "KLBF.JK", "name": "Kalbe Farma Tbk", "sector": "Healthcare", "sub_sector": "Pharmaceuticals", "base_price": 1580, "vol": 0.014},
    {"ticker": "CPIN.JK", "name": "Charoen Pokphand Indonesia Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Farming & Feed", "base_price": 4920, "vol": 0.016},
    {"ticker": "MDKA.JK", "name": "Merdeka Copper Gold Tbk", "sector": "Basic Materials", "sub_sector": "Metals & Mining", "base_price": 2240, "vol": 0.024},
    {"ticker": "PGAS.JK", "name": "Perusahaan Gas Negara Tbk", "sector": "Energy", "sub_sector": "Oil & Gas Distribution", "base_price": 1530, "vol": 0.015},
    {"ticker": "SMGR.JK", "name": "Semen Indonesia (Persero) Tbk", "sector": "Basic Materials", "sub_sector": "Building Materials", "base_price": 3820, "vol": 0.018},
    {"ticker": "INCO.JK", "name": "Vale Indonesia Tbk", "sector": "Basic Materials", "sub_sector": "Metals & Mining", "base_price": 3760, "vol": 0.021},
    {"ticker": "BRPT.JK", "name": "Barito Pacific Tbk", "sector": "Basic Materials", "sub_sector": "Petrochemicals", "base_price": 980, "vol": 0.026},
    {"ticker": "ANTM.JK", "name": "Aneka Tambang Tbk", "sector": "Basic Materials", "sub_sector": "Metals & Mining", "base_price": 1540, "vol": 0.020},
    {"ticker": "MEDC.JK", "name": "Medco Energi Internasional Tbk", "sector": "Energy", "sub_sector": "Oil & Gas Exploration", "base_price": 1260, "vol": 0.022},
    {"ticker": "ACES.JK", "name": "Aspirasi Hidup Indonesia Tbk", "sector": "Consumer Discretionary", "sub_sector": "Retail", "base_price": 820, "vol": 0.017},
    {"ticker": "BRIS.JK", "name": "Bank Syariah Indonesia Tbk", "sector": "Finance", "sub_sector": "Islamic Bank", "base_price": 2980, "vol": 0.019},
    {"ticker": "BUMI.JK", "name": "Bumi Resources Tbk", "sector": "Energy", "sub_sector": "Coal", "base_price": 142, "vol": 0.038},
]

def safe_insert(cur, table_name, data_dict):
    """Inserts record matching only available table columns in the database."""
    cur.execute(f"PRAGMA table_info({table_name})")
    cols = [r[1] for r in cur.fetchall()]
    matching = {k: v for k, v in data_dict.items() if k in cols}
    if not matching:
        return
    col_names = ", ".join(matching.keys())
    placeholders = ", ".join(["?"] * len(matching))
    sql = f"INSERT OR REPLACE INTO {table_name} ({col_names}) VALUES ({placeholders})"
    cur.execute(sql, tuple(matching.values()))

def generate_database(force: bool = False):
    db_path = resolve_db_path()
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    print(f"[DB GENERATOR] Target database: {db_path}")

    # Check if DB already exists and has records
    if not force and Path(db_path).exists() and Path(db_path).stat().st_size > 0:
        try:
            conn_check = sqlite3.connect(db_path)
            cur_check = conn_check.cursor()
            cur_check.execute("SELECT COUNT(*) FROM metadata_saham")
            cnt_meta = cur_check.fetchone()[0]
            cur_check.execute("SELECT COUNT(*) FROM raw_teknikal")
            cnt_raw = cur_check.fetchone()[0]
            conn_check.close()
            if cnt_meta > 0 and cnt_raw > 0:
                print(f"[DB GENERATOR] Database sudah terisi ({cnt_meta} emiten, {cnt_raw} baris data). Melewati inisialisasi agar data tidak tertimpa.")
                return
        except Exception:
            pass

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 1. Ensure Table Schemas
    cur.execute("""
    CREATE TABLE IF NOT EXISTS metadata_saham (
        ticker TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sector TEXT NOT NULL,
        sub_sector TEXT DEFAULT '',
        ipo_date TEXT DEFAULT '',
        first_data_date TEXT DEFAULT ''
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS raw_teknikal (
        date TEXT NOT NULL,
        ticker TEXT NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        adj_close REAL NOT NULL,
        volume REAL NOT NULL,
        dividends REAL DEFAULT 0,
        stock_splits REAL DEFAULT 0,
        PRIMARY KEY(ticker, date)
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS dataset_teknikal (
        date TEXT NOT NULL,
        ticker TEXT NOT NULL,
        open REAL,
        high REAL,
        low REAL,
        close REAL,
        volume REAL,
        raw_close REAL,
        turnover_idr REAL,
        is_liquid INTEGER DEFAULT 1,
        ret_5d REAL,
        ret_20d REAL,
        ret_60d REAL,
        rsi_14 REAL,
        price_sma20_ratio REAL,
        price_sma60_ratio REAL,
        realized_vol_20d REAL,
        PRIMARY KEY(ticker, date)
    )
    """)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_raw_ticker_date ON raw_teknikal(ticker, date)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_tech_ticker_date ON dataset_teknikal(ticker, date)")

    print(f"[DB GENERATOR] Menyisipkan metadata untuk {len(IDX_UNIVERSE)} saham...")
    for item in IDX_UNIVERSE:
        safe_insert(cur, "metadata_saham", {
            "ticker": item["ticker"],
            "name": item["name"],
            "sector": item["sector"],
            "sub_sector": item.get("sub_sector", ""),
            "ipo_date": "2000-01-01",
            "first_data_date": "2024-01-01"
        })

    # Generate 60 trading days of candles
    print("[DB GENERATOR] Menghasilkan riwayat data OHLCV dan fitur teknikal (60 hari bursa)...")
    end_date = datetime.date.today()
    trading_dates = []
    curr = end_date - datetime.timedelta(days=95)
    while curr <= end_date:
        if curr.weekday() < 5:
            trading_dates.append(curr.strftime("%Y-%m-%d"))
        curr += datetime.timedelta(days=1)
    trading_dates = trading_dates[-60:]

    random.seed(42)

    for item in IDX_UNIVERSE:
        ticker = item["ticker"]
        base_p = item["base_price"]
        daily_vol = item["vol"]

        cur_p = base_p * random.uniform(0.92, 1.08)
        prices = []

        for d_str in trading_dates:
            chg_pct = random.gauss(0.0008, daily_vol)
            close_p = round(cur_p * (1.0 + chg_pct), 2)
            if close_p <= 50:
                close_p = 50.0
            
            high_p = round(max(cur_p, close_p) * (1.0 + abs(random.gauss(0, daily_vol * 0.5))), 2)
            low_p = round(min(cur_p, close_p) * (1.0 - abs(random.gauss(0, daily_vol * 0.5))), 2)
            open_p = cur_p
            vol = int(random.lognormvariate(14.5, 0.8))

            safe_insert(cur, "raw_teknikal", {
                "date": d_str,
                "ticker": ticker,
                "open": open_p,
                "high": high_p,
                "low": low_p,
                "close": close_p,
                "adj_close": close_p,
                "volume": vol,
                "dividends": 0,
                "stock_splits": 0
            })

            prices.append(close_p)
            cur_p = close_p

        # Compute technical indicators
        for i, d_str in enumerate(trading_dates):
            window_20 = prices[max(0, i-19):i+1]
            ma20 = sum(window_20) / len(window_20)
            window_50 = prices[max(0, i-49):i+1]
            ma50 = sum(window_50) / len(window_50)

            ret_1d = (prices[i] - prices[i-1]) / prices[i-1] if i > 0 else 0.0
            ret_5d = (prices[i] - prices[i-5]) / prices[i-5] if i >= 5 else ret_1d * 5
            ret_20d = (prices[i] - prices[i-20]) / prices[i-20] if i >= 20 else ret_1d * 20

            rsi = 50.0 + (ret_5d * 300.0)
            rsi = max(15.0, min(85.0, rsi))

            vol20 = round(daily_vol * math.sqrt(20), 4)

            safe_insert(cur, "dataset_teknikal", {
                "date": d_str,
                "ticker": ticker,
                "open": prices[i],
                "high": prices[i],
                "low": prices[i],
                "close": prices[i],
                "volume": 1000000.0,
                "raw_close": prices[i],
                "turnover_idr": prices[i] * 1000000.0,
                "is_liquid": 1,
                "ret_5d": ret_5d,
                "ret_20d": ret_20d,
                "ret_60d": ret_20d * 2,
                "rsi_14": rsi,
                "price_sma20_ratio": round(prices[i] / ma20, 4) if ma20 > 0 else 1.0,
                "price_sma60_ratio": round(prices[i] / ma50, 4) if ma50 > 0 else 1.0,
                "realized_vol_20d": vol20
            })

    conn.commit()
    conn.close()
    print(f"[DB GENERATOR SUCCESS] Database {db_path} siap digunakan!")

if __name__ == "__main__":
    force_run = "--force" in sys.argv
    generate_database(force=force_run)
