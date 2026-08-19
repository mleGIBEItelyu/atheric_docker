#!/usr/bin/env python3
"""
Model Artifact Auto-Sync Utility.
Synchronizes the latest trained ML artifacts (.pkl, .keras, metadata)
from TrainerProduksiML into the dedicated Python interface runtime directory.
"""

import os
import shutil
import glob
import json
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = CURRENT_DIR / "artifacts"

# Possible paths to TrainerProduksiML releases
SOURCE_CANDIDATES = [
    CURRENT_DIR.parent / "TrainerProduksiML" / "engine" / "artifacts" / "releases",
    Path("d:/Kodingan/!Group/Gibei/athericweb/TrainerProduksiML/engine/artifacts/releases"),
    Path("/app/TrainerProduksiML/engine/artifacts/releases"),
]

def find_latest_release():
    for base in SOURCE_CANDIDATES:
        if base.exists():
            releases = [d for d in base.iterdir() if d.is_dir() and not d.name.startswith(".")]
            if releases:
                # Sort by modification time or version name
                releases.sort(key=lambda x: x.stat().st_mtime, reverse=True)
                return releases[0]
    return None

def sync_artifacts():
    print("=" * 60)
    print("[SYNC] Atheric Genesis Model Auto-Sync")
    print("=" * 60)

    latest_dir = find_latest_release()
    if not latest_dir:
        print("[SYNC WARN] Tidak ditemukan folder rilis di TrainerProduksiML/engine/artifacts/releases/")
        print("[SYNC INFO] Memeriksa apakah artifacts bawaan sudah ada di:", ARTIFACTS_DIR)
        if (ARTIFACTS_DIR / "release.json").exists():
            print("[SYNC OK] Menggunakan artifacts yang sudah ada di service.")
            return True
        return False

    print(f"[SYNC] Menemukan rilis terbaru: {latest_dir.name} ({latest_dir})")
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Sync .pkl files (scaler.pkl, reference_distribution.pkl, model.pkl, etc.)
    for pkl_file in latest_dir.glob("*.pkl"):
        dest = ARTIFACTS_DIR / pkl_file.name
        shutil.copy2(pkl_file, dest)
        print(f"[SYNC COPY] {pkl_file.name} -> {dest}")

    # 2. Sync metadata JSON & YAML
    for meta_file in ["release.json", "metrics.json", "run_config.yaml"]:
        src = latest_dir / meta_file
        if src.exists():
            dest = ARTIFACTS_DIR / meta_file
            shutil.copy2(src, dest)
            print(f"[SYNC COPY] {meta_file} -> {dest}")

    # 3. Sync model weights (.keras / .pkl / .h5)
    model_sub = latest_dir / "model"
    if model_sub.exists() and model_sub.is_dir():
        dest_model = ARTIFACTS_DIR / "model"
        dest_model.mkdir(parents=True, exist_ok=True)
        for m_file in model_sub.iterdir():
            if m_file.is_file():
                dest = dest_model / m_file.name
                shutil.copy2(m_file, dest)
                print(f"[SYNC COPY] model/{m_file.name} -> {dest}")

    # 4. Create top-level reference pointers
    if (ARTIFACTS_DIR / "release.json").exists():
        shutil.copy2(ARTIFACTS_DIR / "release.json", CURRENT_DIR / "release.json")
    if (ARTIFACTS_DIR / "metrics.json").exists():
        shutil.copy2(ARTIFACTS_DIR / "metrics.json", CURRENT_DIR / "metrics.json")

    print("[SYNC SUCCESS] Model artifacts (.pkl & metadata) berhasil disinkronisasi ke genesis_service!")
    return True

if __name__ == "__main__":
    sync_artifacts()
