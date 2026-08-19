#!/bin/sh
set -e

echo "=== [GENESIS SERVICE STARTUP] ==="

# 1. Sync latest artifacts if TrainerProduksiML exists
python sync_model.py || true

# 2. Auto-generate SQLite database if not present or initialize universe
echo "[GENESIS] Checking and generating database..."
python generate_db.py || true

# 3. Start the FastAPI server
echo "[GENESIS] Starting Uvicorn API Server on port 8000..."
exec uvicorn server:app --host 0.0.0.0 --port 8000
