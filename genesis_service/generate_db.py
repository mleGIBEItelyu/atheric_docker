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

# Curated Full IDX Universe (80+ Major Companies across all 11 Sectors)
IDX_UNIVERSE = [
    # Top Banking & Finance
    {"ticker": "BBCA.JK", "name": "Bank Central Asia Tbk", "sector": "Finance", "sub_sector": "Bank", "base_price": 9850, "vol": 0.012},
    {"ticker": "BBRI.JK", "name": "Bank Rakyat Indonesia (Persero) Tbk", "sector": "Finance", "sub_sector": "Bank", "base_price": 4820, "vol": 0.016},
    {"ticker": "BMRI.JK", "name": "Bank Mandiri (Persero) Tbk", "sector": "Finance", "sub_sector": "Bank", "base_price": 6600, "vol": 0.014},
    {"ticker": "BBNI.JK", "name": "Bank Negara Indonesia (Persero) Tbk", "sector": "Finance", "sub_sector": "Bank", "base_price": 5400, "vol": 0.015},
    {"ticker": "BRIS.JK", "name": "Bank Syariah Indonesia Tbk", "sector": "Finance", "sub_sector": "Islamic Bank", "base_price": 2980, "vol": 0.019},
    {"ticker": "BDMN.JK", "name": "Bank Danamon Indonesia Tbk", "sector": "Finance", "sub_sector": "Bank", "base_price": 2650, "vol": 0.014},
    {"ticker": "BBTN.JK", "name": "Bank Tabungan Negara (Persero) Tbk", "sector": "Finance", "sub_sector": "Bank", "base_price": 1380, "vol": 0.017},
    {"ticker": "BTPS.JK", "name": "Bank BTPN Syariah Tbk", "sector": "Finance", "sub_sector": "Bank", "base_price": 1150, "vol": 0.022},
    {"ticker": "BNGA.JK", "name": "Bank CIMB Niaga Tbk", "sector": "Finance", "sub_sector": "Bank", "base_price": 1820, "vol": 0.014},
    {"ticker": "ARTO.JK", "name": "Bank Jago Tbk", "sector": "Finance", "sub_sector": "Digital Bank", "base_price": 2480, "vol": 0.028},
    {"ticker": "PNBN.JK", "name": "Bank Pan Indonesia Tbk", "sector": "Finance", "sub_sector": "Bank", "base_price": 1420, "vol": 0.018},
    {"ticker": "MEGA.JK", "name": "Bank Mega Tbk", "sector": "Finance", "sub_sector": "Bank", "base_price": 5100, "vol": 0.011},

    # Energy, Oil & Coal
    {"ticker": "ADRO.JK", "name": "Alamtri Resources Indonesia Tbk", "sector": "Energy", "sub_sector": "Coal", "base_price": 2350, "vol": 0.020},
    {"ticker": "PTBA.JK", "name": "Bukit Asam Tbk", "sector": "Energy", "sub_sector": "Coal", "base_price": 2740, "vol": 0.017},
    {"ticker": "PGAS.JK", "name": "Perusahaan Gas Negara Tbk", "sector": "Energy", "sub_sector": "Oil & Gas Distribution", "base_price": 1530, "vol": 0.015},
    {"ticker": "MEDC.JK", "name": "Medco Energi Internasional Tbk", "sector": "Energy", "sub_sector": "Oil & Gas Exploration", "base_price": 1260, "vol": 0.022},
    {"ticker": "BUMI.JK", "name": "Bumi Resources Tbk", "sector": "Energy", "sub_sector": "Coal", "base_price": 142, "vol": 0.038},
    {"ticker": "INDY.JK", "name": "Indika Energy Tbk", "sector": "Energy", "sub_sector": "Coal & Energy Solutions", "base_price": 1480, "vol": 0.024},
    {"ticker": "ITMG.JK", "name": "Indo Tambangraya Megah Tbk", "sector": "Energy", "sub_sector": "Coal", "base_price": 25800, "vol": 0.016},
    {"ticker": "HRUM.JK", "name": "Harum Energy Tbk", "sector": "Energy", "sub_sector": "Coal & Nickel", "base_price": 1240, "vol": 0.023},
    {"ticker": "AKRA.JK", "name": "AKR Corporindo Tbk", "sector": "Energy", "sub_sector": "Fuel & Chemical Logistics", "base_price": 1450, "vol": 0.016},
    {"ticker": "ENRG.JK", "name": "Energi Mega Persada Tbk", "sector": "Energy", "sub_sector": "Oil & Gas", "base_price": 210, "vol": 0.032},
    {"ticker": "RAJA.JK", "name": "Rukun Raharja Tbk", "sector": "Energy", "sub_sector": "Oil & Gas Infrastructure", "base_price": 1380, "vol": 0.025},
    {"ticker": "ELSA.JK", "name": "Elnusa Tbk", "sector": "Energy", "sub_sector": "Energy Services", "base_price": 460, "vol": 0.019},
    {"ticker": "PGEO.JK", "name": "Pertamina Geothermal Energy Tbk", "sector": "Energy", "sub_sector": "Renewable Energy", "base_price": 1120, "vol": 0.018},
    {"ticker": "DOID.JK", "name": "Delta Dunia Makmur Tbk", "sector": "Energy", "sub_sector": "Mining Contracting", "base_price": 620, "vol": 0.026},

    # Mining, Gold & Metals
    {"ticker": "ANTM.JK", "name": "Aneka Tambang Tbk", "sector": "Basic Materials", "sub_sector": "Metals & Mining", "base_price": 1540, "vol": 0.020},
    {"ticker": "INCO.JK", "name": "Vale Indonesia Tbk", "sector": "Basic Materials", "sub_sector": "Metals & Mining", "base_price": 3760, "vol": 0.021},
    {"ticker": "MDKA.JK", "name": "Merdeka Copper Gold Tbk", "sector": "Basic Materials", "sub_sector": "Metals & Mining", "base_price": 2240, "vol": 0.024},
    {"ticker": "AMMN.JK", "name": "Amman Mineral Internasional Tbk", "sector": "Basic Materials", "sub_sector": "Metals & Mining", "base_price": 9350, "vol": 0.022},
    {"ticker": "TINS.JK", "name": "Timah Tbk", "sector": "Basic Materials", "sub_sector": "Tin Mining", "base_price": 1020, "vol": 0.025},
    {"ticker": "NCKL.JK", "name": "Trimegah Bangun Persada Tbk", "sector": "Basic Materials", "sub_sector": "Nickel", "base_price": 840, "vol": 0.021},
    {"ticker": "MBMA.JK", "name": "Merdeka Battery Materials Tbk", "sector": "Basic Materials", "sub_sector": "EV Battery Raw Materials", "base_price": 520, "vol": 0.027},
    {"ticker": "BRMS.JK", "name": "Bumi Resources Minerals Tbk", "sector": "Basic Materials", "sub_sector": "Gold Mining", "base_price": 380, "vol": 0.035},
    {"ticker": "PSAB.JK", "name": "J Resources Asia Pasifik Tbk", "sector": "Basic Materials", "sub_sector": "Gold Mining", "base_price": 290, "vol": 0.030},

    # Telco & Technology
    {"ticker": "TLKM.JK", "name": "Telkom Indonesia (Persero) Tbk", "sector": "Infrastructure", "sub_sector": "Telecommunication", "base_price": 3150, "vol": 0.014},
    {"ticker": "GOTO.JK", "name": "GoTo Gojek Tokopedia Tbk", "sector": "Technology", "sub_sector": "Software & IT Services", "base_price": 62, "vol": 0.035},
    {"ticker": "ISAT.JK", "name": "Indosat Ooredoo Hutchison Tbk", "sector": "Infrastructure", "sub_sector": "Telecommunication", "base_price": 2350, "vol": 0.018},
    {"ticker": "EXCL.JK", "name": "XL Axiata Tbk", "sector": "Infrastructure", "sub_sector": "Telecommunication", "base_price": 2240, "vol": 0.017},
    {"ticker": "EMTK.JK", "name": "Elang Mahkota Teknologi Tbk", "sector": "Technology", "sub_sector": "Tech Holding", "base_price": 430, "vol": 0.026},
    {"ticker": "BUKA.JK", "name": "Bukalapak.com Tbk", "sector": "Technology", "sub_sector": "E-Commerce", "base_price": 125, "vol": 0.030},
    {"ticker": "MTDL.JK", "name": "Metrodata Electronics Tbk", "sector": "Technology", "sub_sector": "IT Distribution & Solutions", "base_price": 640, "vol": 0.018},
    {"ticker": "WIRG.JK", "name": "WIR ASIA Tbk", "sector": "Technology", "sub_sector": "AR & Metaverse Solutions", "base_price": 110, "vol": 0.034},

    # Consumer Non-Cyclicals & F&B
    {"ticker": "UNVR.JK", "name": "Unilever Indonesia Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Household Products", "base_price": 2720, "vol": 0.018},
    {"ticker": "ICBP.JK", "name": "Indofood CBP Sukses Makmur Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Processed Food", "base_price": 11800, "vol": 0.011},
    {"ticker": "INDF.JK", "name": "Indofood Sukses Makmur Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Food Products", "base_price": 7100, "vol": 0.012},
    {"ticker": "CPIN.JK", "name": "Charoen Pokphand Indonesia Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Farming & Feed", "base_price": 4920, "vol": 0.016},
    {"ticker": "JPFA.JK", "name": "JAPFA Comfeed Indonesia Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Poultry & Feed", "base_price": 1640, "vol": 0.020},
    {"ticker": "MYOR.JK", "name": "Mayora Indah Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Food & Beverages", "base_price": 2550, "vol": 0.014},
    {"ticker": "CMRY.JK", "name": "Cisarua Mountain Dairy Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Dairy & Sausages", "base_price": 5250, "vol": 0.016},
    {"ticker": "HMSP.JK", "name": "HM Sampoerna Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Tobacco", "base_price": 680, "vol": 0.017},
    {"ticker": "GGRM.JK", "name": "Gudang Garam Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Tobacco", "base_price": 13800, "vol": 0.018},

    # Retail & Consumer Discretionary
    {"ticker": "ACES.JK", "name": "Aspirasi Hidup Indonesia Tbk", "sector": "Consumer Discretionary", "sub_sector": "Retail", "base_price": 820, "vol": 0.017},
    {"ticker": "MAPI.JK", "name": "Mitra Adiperkasa Tbk", "sector": "Consumer Discretionary", "sub_sector": "Fashion & Lifestyle Retail", "base_price": 1680, "vol": 0.020},
    {"ticker": "MAPA.JK", "name": "MAP Aktif Adiperkasa Tbk", "sector": "Consumer Discretionary", "sub_sector": "Sports Retail", "base_price": 950, "vol": 0.019},
    {"ticker": "ERAA.JK", "name": "Erajaya Swasembada Tbk", "sector": "Consumer Discretionary", "sub_sector": "Gadget Retail", "base_price": 420, "vol": 0.022},
    {"ticker": "AMRT.JK", "name": "Sumber Alfaria Trijaya Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Minimarket Retail", "base_price": 2880, "vol": 0.013},
    {"ticker": "MIDI.JK", "name": "Midi Utama Indonesia Tbk", "sector": "Consumer Non-Cyclicals", "sub_sector": "Minimarket Retail", "base_price": 410, "vol": 0.017},
    {"ticker": "RALS.JK", "name": "Ramayana Lestari Sentosa Tbk", "sector": "Consumer Discretionary", "sub_sector": "Department Store", "base_price": 460, "vol": 0.019},

    # Healthcare & Pharmaceuticals
    {"ticker": "KLBF.JK", "name": "Kalbe Farma Tbk", "sector": "Healthcare", "sub_sector": "Pharmaceuticals", "base_price": 1580, "vol": 0.014},
    {"ticker": "MIKA.JK", "name": "Mitra Keluarga Karyasehat Tbk", "sector": "Healthcare", "sub_sector": "Hospital", "base_price": 2840, "vol": 0.015},
    {"ticker": "HEAL.JK", "name": "Medikaloka Hermina Tbk", "sector": "Healthcare", "sub_sector": "Hospital", "base_price": 1380, "vol": 0.016},
    {"ticker": "SILO.JK", "name": "Siloam International Hospitals Tbk", "sector": "Healthcare", "sub_sector": "Hospital", "base_price": 2720, "vol": 0.015},
    {"ticker": "SIDO.JK", "name": "Industri Jamu Dan Farmasi Sido Muncul Tbk", "sector": "Healthcare", "sub_sector": "Herbal Medicine", "base_price": 630, "vol": 0.017},
    {"ticker": "KAEF.JK", "name": "Kimia Farma Tbk", "sector": "Healthcare", "sub_sector": "Pharmaceuticals", "base_price": 680, "vol": 0.024},

    # Basic Materials, Chemicals & Cement
    {"ticker": "SMGR.JK", "name": "Semen Indonesia (Persero) Tbk", "sector": "Basic Materials", "sub_sector": "Building Materials", "base_price": 3820, "vol": 0.018},
    {"ticker": "INTP.JK", "name": "Indocement Tunggal Prakarsa Tbk", "sector": "Basic Materials", "sub_sector": "Cement", "base_price": 6800, "vol": 0.016},
    {"ticker": "BRPT.JK", "name": "Barito Pacific Tbk", "sector": "Basic Materials", "sub_sector": "Petrochemicals", "base_price": 980, "vol": 0.026},
    {"ticker": "TPIA.JK", "name": "Chandra Asri Pacific Tbk", "sector": "Basic Materials", "sub_sector": "Petrochemicals", "base_price": 7200, "vol": 0.022},
    {"ticker": "ESSA.JK", "name": "Essa Industries Indonesia Tbk", "sector": "Basic Materials", "sub_sector": "Ammonia & LPG", "base_price": 890, "vol": 0.023},
    {"ticker": "AVIA.JK", "name": "Avia Avian Tbk", "sector": "Basic Materials", "sub_sector": "Paints & Coatings", "base_price": 490, "vol": 0.015},

    # Automotive & Heavy Industrials
    {"ticker": "ASII.JK", "name": "Astra International Tbk", "sector": "Consumer Discretionary", "sub_sector": "Automotive", "base_price": 5050, "vol": 0.013},
    {"ticker": "AUTO.JK", "name": "Astra Otoparts Tbk", "sector": "Consumer Discretionary", "sub_sector": "Auto Components", "base_price": 2200, "vol": 0.018},
    {"ticker": "UNTR.JK", "name": "United Tractors Tbk", "sector": "Industrials", "sub_sector": "Heavy Machinery & Mining", "base_price": 26800, "vol": 0.015},
    {"ticker": "HEXA.JK", "name": "Hexindo Adiperkasa Tbk", "sector": "Industrials", "sub_sector": "Heavy Equipment", "base_price": 6400, "vol": 0.016},

    # Property & Real Estate
    {"ticker": "CTRA.JK", "name": "Ciputra Development Tbk", "sector": "Properties & Real Estate", "sub_sector": "Property Development", "base_price": 1280, "vol": 0.018},
    {"ticker": "BSDE.JK", "name": "Bumi Serpong Damai Tbk", "sector": "Properties & Real Estate", "sub_sector": "Property Development", "base_price": 1190, "vol": 0.017},
    {"ticker": "PWON.JK", "name": "Pakuwon Jati Tbk", "sector": "Properties & Real Estate", "sub_sector": "Malls & Property", "base_price": 460, "vol": 0.016},
    {"ticker": "SMRA.JK", "name": "Summarecon Agung Tbk", "sector": "Properties & Real Estate", "sub_sector": "Property Development", "base_price": 620, "vol": 0.020},
    {"ticker": "ASRI.JK", "name": "Alam Sutera Realty Tbk", "sector": "Properties & Real Estate", "sub_sector": "Property Development", "base_price": 210, "vol": 0.024},
    {"ticker": "DILD.JK", "name": "Intiland Development Tbk", "sector": "Properties & Real Estate", "sub_sector": "Property Development", "base_price": 175, "vol": 0.025},

    # Infrastructure, Toll & Logistics
    {"ticker": "JSMR.JK", "name": "Jasa Marga (Persero) Tbk", "sector": "Infrastructure", "sub_sector": "Toll Roads", "base_price": 4850, "vol": 0.015},
    {"ticker": "TOWR.JK", "name": "Sarana Menara Nusantara Tbk", "sector": "Infrastructure", "sub_sector": "Telecom Towers", "base_price": 780, "vol": 0.017},
    {"ticker": "TBIG.JK", "name": "Tower Bersama Infrastructure Tbk", "sector": "Infrastructure", "sub_sector": "Telecom Towers", "base_price": 1780, "vol": 0.016},
    {"ticker": "SMDR.JK", "name": "Samudera Indonesia Tbk", "sector": "Transportation & Logistics", "sub_sector": "Shipping & Logistics", "base_price": 310, "vol": 0.022},
    {"ticker": "TMAS.JK", "name": "Temas Tbk", "sector": "Transportation & Logistics", "sub_sector": "Shipping", "base_price": 160, "vol": 0.026},
    {"ticker": "ASSA.JK", "name": "Adi Sarana Armada Tbk", "sector": "Transportation & Logistics", "sub_sector": "Logistics & Car Rental", "base_price": 730, "vol": 0.025},
    {"ticker": "BIRD.JK", "name": "Blue Bird Tbk", "sector": "Transportation & Logistics", "sub_sector": "Taxi & Transport", "base_price": 1940, "vol": 0.016},
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
