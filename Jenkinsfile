pipeline {
    agent any

    // Scheduled to run automatically:
    // 1) Sesi 1 Pagi: 09:30 WIB (02:30 UTC)
    // 2) Sesi Tutup Sore: 18:00 WIB (11:00 UTC)
    // Senin - Jumat (Libur bursa otomatis diskip oleh script)
    triggers {
        cron('30 2,11 * * 1-5')
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '30'))
    }

    environment {
        PYTHONUNBUFFERED = '1'
        VPS_SYNC_URL = credentials('ATHERIC_VPS_URL') // e.g. http://localhost:5000 or production backend
        VPS_SYNC_KEY = credentials('ATHERIC_SYNC_SECRET_KEY')
        GENESIS_ENCRYPTION_KEY = credentials('ATHERIC_GENESIS_ENCRYPTION_KEY')
        MARKET_DB_PATH = "${WORKSPACE}/BE/data/idx_scraped_data.db"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup Python Environment') {
            steps {
                sh '''
                    python3 -m venv venv
                    . venv/bin/activate
                    pip install --upgrade pip
                    pip install -r genesis_service/requirements.txt
                    pip install yfinance requests || true
                '''
            }
        }

        stage('Execute Daily Market Scraper') {
            steps {
                sh '''
                    . venv/bin/activate
                    python scripts/daily_scrap_sync.py
                '''
            }
        }

        stage('Verify Database & Synced Deltas') {
            steps {
                sh '''
                    . venv/bin/activate
                    python -c "
import sqlite3
conn = sqlite3.connect('${MARKET_DB_PATH}')
cur = conn.cursor()
cur.execute('SELECT COUNT(*) FROM raw_teknikal')
count = cur.fetchone()[0]
print(f'[CI/CD HEALTH CHECK] Total raw_teknikal rows: {count}')
assert count > 0, 'Database contains zero rows!'
conn.close()
"
                '''
            }
        }
    }

    post {
        success {
            echo "✅ [SUCCESS] Daily IDX Scraping & Database Sync completed successfully!"
        }
        failure {
            echo "❌ [FAILURE] Daily Market Scraping failed. Check logs above."
        }
        always {
            cleanWs deleteDirs: true, notFailBuild: true, patterns: [[pattern: 'venv/**', type: 'EXCLUDE']]
        }
    }
}
