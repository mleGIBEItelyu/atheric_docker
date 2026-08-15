import type { Stock, ForecastData, TargetData, SentimentItem, SynthesisData, NewsItem, KeyLevel, RankingHighlight, RankingRow, IndexData, NavItem, Glossary } from '@/types'

export const NAV_ITEMS: NavItem[] = [
  { id: 'ranking', label: 'Ranking Model', icon: 'bars', href: '/' },
  { id: 'watchlists', label: 'Watchlists', icon: 'eye', href: '/watchlist' },
  { id: 'evaluasi', label: 'Evaluasi Model', icon: 'clipboard', href: '/evaluasi' },
]

export const NAV_FOOTER: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: 'gear', href: '#' },
  { id: 'support', label: 'Support', icon: 'help', href: '#' },
]

export const INDICES: IndexData[] = [
  { label: 'IHSG', value: '7.342,15', dir: 'up' },
  { label: 'USD/IDR', value: '15.750', dir: 'down' },
  { label: 'GOLD/IDR', value: '976.500', dir: 'up' },
  { label: 'SILVER/IDR', value: '12.650', dir: 'up' },
]

export const GLOSSARY: Glossary = {
  'P/E': 'Seberapa mahal saham dibandingkan laba tahunannya - semakin tinggi berarti semakin mahal.',
  'EPS': 'Laba bersih perusahaan per lembar saham selama setahun terakhir.',
  'Div Yield': 'Dividen tahunan yang dibayarkan sebagai persentase dari harga saham.',
  '90% CI': 'Model memperkirakan harga akan berada di dalam rentang ini sekitar 9 dari 10 kali.',
}

export const RANKING_HIGHLIGHTS: RankingHighlight[] = [
  { ticker: 'BBCA', rank: 1, name: 'Bank Central Asia Tbk', score: '98,5', ret: '+10,5%', dir: 'up' },
  { ticker: 'BBRI', rank: 2, name: 'Bank Rakyat Indonesia', score: '96,2', ret: '+8,3%', dir: 'up' },
  { ticker: 'TLKM', rank: 3, name: 'Telkom Indonesia', score: '94,8', ret: '+6,7%', dir: 'up' },
]

export const RANKING_ROWS: RankingRow[] = [
  { rank: 1, ticker: 'BBCA', company: 'Bank Central Asia Tbk', score: '98,5', ret: '+10,5%', dir: 'up', conf: 'High', confPct: 92, rec: 'BUY', cap: 'Rp 1.170T' },
  { rank: 2, ticker: 'BBRI', company: 'Bank Rakyat Indonesia', score: '96,2', ret: '+8,3%', dir: 'up', conf: 'High', confPct: 88, rec: 'BUY', cap: 'Rp 685T' },
  { rank: 3, ticker: 'TLKM', company: 'Telkom Indonesia', score: '94,8', ret: '+6,7%', dir: 'up', conf: 'Med', confPct: 72, rec: 'BUY', cap: 'Rp 213T' },
  { rank: 4, ticker: 'ASII', company: 'Astra International', score: '92,1', ret: '+5,4%', dir: 'up', conf: 'Med', confPct: 61, rec: 'HOLD', cap: 'Rp 218T' },
  { rank: 5, ticker: 'GOTO', company: 'GoTo Gojek Tokopedia', score: '88,4', ret: '-3,2%', dir: 'down', conf: 'Low', confPct: 38, rec: 'SELL', cap: 'Rp 47T' },
]

// Map data per ticker
const TICKER_DB: Record<string, {
  name: string;
  price: string;
  change: string;
  dir: 'up' | 'down';
  ohlc: { label: string; value: string }[];
  ratios: { label: string; value: string }[];
  actual: number[];
  forecast: number[];
  ciUpper: number[];
  ciLower: number[];
  yMin: number;
  yMax: number;
  yTicks: number[];
  targetPrice: string;
  rec: 'BUY' | 'HOLD' | 'SELL';
  upside: string;
  sliderPct: number;
  stopLoss: string;
  riskReward: string;
  confidence: string;
  sentiment: SentimentItem[];
  synthesis: string[];
  news: NewsItem[];
}> = {
  BBCA: {
    name: 'Bank Central Asia Tbk',
    price: 'Rp 9.500',
    change: '+1,8%',
    dir: 'up',
    ohlc: [
      { label: 'Prev', value: '9.325' },
      { label: 'Vol', value: '12,4M' },
    ],
    ratios: [
      { label: 'Mkt Cap', value: '1.170 T' },
      { label: 'P/E', value: '24,5' },
      { label: 'EPS', value: '388' },
      { label: 'Div Yield', value: '1,2%' },
    ],
    actual: [8650, 8580, 8720, 8850, 8780, 8720, 8900, 9150, 9350, 9500],
    forecast: [9500, 9680, 9850, 10100, 10320, 10500],
    ciUpper: [9500, 9850, 10200, 10580, 10820, 11000],
    ciLower: [9500, 9480, 9420, 9550, 9680, 9800],
    yMin: 8500,
    yMax: 11000,
    yTicks: [11000, 10500, 10000, 9500, 9000],
    targetPrice: 'Rp 10.500',
    rec: 'BUY',
    upside: '+10,5% Potensi Kenaikan',
    sliderPct: 82,
    stopLoss: 'Rp 8.750',
    riskReward: '1 : 2,1',
    confidence: '86%',
    sentiment: [
      { label: 'Lokal', value: 78, tone: 'green', verdict: 'Bullish', source: 'Tren IHSG, aliran dana asing' },
      { label: 'Global', value: 71, tone: 'cyan', verdict: 'Bullish', source: 'Ekspektasi Fed, DXY' },
    ],
    synthesis: [
      'BBCA saat ini berada dalam fase akumulasi dengan momentum teknikal yang kuat. Saham berhasil menembus resistensi kunci di Rp 9.250 didukung volume di atas rata-rata, mengkonfirmasi minat beli institusional. MACD menunjukkan sinyal bullish crossover, sementara RSI berada di zona netral-bullish dengan ruang yang cukup sebelum mencapai overbought. Target teknikal berikutnya terletak di Rp 10.000, dengan potensi ekstensi menuju Rp 10.500 apabila momentum terjaga.',
      'Secara fundamental, BBCA mencatat pertumbuhan laba bersih 12% YoY dengan NIM terjaga di 5,9% dan NPL gross terkendali di 1,7% - angka yang melampaui rata-rata industri perbankan nasional. Risiko utama datang dari kebijakan suku bunga Bank Indonesia di kuartal mendatang yang berpotensi menekan margin intermediasi. Valuasi P/E 24,5x masih dapat dipertahankan selama pertumbuhan kredit tetap di atas 12% YoY dan kualitas aset tidak memburuk signifikan.',
    ],
    news: [
      { headline: 'BBCA Cetak Laba Bersih Rp 48,6 T di Kuartal III 2024', source: 'Bisnis.com', time: '10:42', tag: 'High', tone: 'green' },
      { headline: 'OJK Longgarkan Aturan Modal Minimum Perbankan Nasional', source: 'Kontan', time: '09:15', tag: 'High', tone: 'green' },
      { headline: 'Analis Naikkan Target Harga BBCA ke Rp 10.500', source: 'CNBC Indonesia', time: '08:30', tag: 'Medium', tone: 'amber' },
    ]
  },
  BBRI: {
    name: 'Bank Rakyat Indonesia Tbk',
    price: 'Rp 4.700',
    change: '+0,8%',
    dir: 'up',
    ohlc: [
      { label: 'Prev', value: '4.660' },
      { label: 'Vol', value: '45,2M' },
    ],
    ratios: [
      { label: 'Mkt Cap', value: '712 T' },
      { label: 'P/E', value: '12,4' },
      { label: 'EPS', value: '379' },
      { label: 'Div Yield', value: '6,1%' },
    ],
    actual: [4300, 4250, 4400, 4520, 4480, 4420, 4500, 4550, 4620, 4700],
    forecast: [4700, 4800, 4880, 4950, 5030, 5100],
    ciUpper: [4700, 4900, 5050, 5180, 5300, 5450],
    ciLower: [4700, 4650, 4600, 4680, 4720, 4750],
    yMin: 4000,
    yMax: 5600,
    yTicks: [5600, 5200, 4800, 4400, 4000],
    targetPrice: 'Rp 5.100',
    rec: 'BUY',
    upside: '+8,5% Potensi Kenaikan',
    sliderPct: 78,
    stopLoss: 'Rp 4.350',
    riskReward: '1 : 1,9',
    confidence: '82%',
    sentiment: [
      { label: 'Lokal', value: 72, tone: 'green', verdict: 'Bullish', source: 'Kredit mikro tumbuh, restrukturisasi turun' },
      { label: 'Global', value: 65, tone: 'cyan', verdict: 'Bullish', source: 'Suku bunga obligasi stabil' },
    ],
    synthesis: [
      'BBRI terus memimpin di sektor perbankan mikro. Setelah konsolidasi di area Rp 4.400 - Rp 4.500, saham ini berhasil memantul kembali dengan pola Higher Low. Indikator Stochastic menunjukkan tanda golden cross di area oversold, mengindikasikan tekanan jual mulai mereda dan digantikan momentum akumulasi.',
      'Kualitas aset BBRI menunjukkan perbaikan signifikan dengan LAR (Loan at Risk) yang terus menurun. Penyaluran kredit mikro Kupedes menjadi motor penggerak utama pertumbuhan margin. Rasio pembagian dividen yang diproyeksikan tetap tinggi (~70-80% Payout Ratio) menjadi penopang utama daya tarik saham ini bagi investor jangka panjang.',
    ],
    news: [
      { headline: 'Kredit Mikro BBRI Tumbuh 10,2% YoY pada Kuartal III 2024', source: 'Kontan', time: '11:15', tag: 'High', tone: 'green' },
      { headline: 'BBRI Targetkan Pembagian Dividen Interim Lebih Cepat', source: 'CNBC Indonesia', time: '09:20', tag: 'High', tone: 'green' },
      { headline: 'Sentimen Global Bayangi Saham Perbankan Big Cap', source: 'Bisnis.com', time: '07:45', tag: 'Medium', tone: 'amber' },
    ]
  },
  TLKM: {
    name: 'Telkom Indonesia Tbk',
    price: 'Rp 3.500',
    change: '-1,2%',
    dir: 'down',
    ohlc: [
      { label: 'Prev', value: '3.540' },
      { label: 'Vol', value: '32,1M' },
    ],
    ratios: [
      { label: 'Mkt Cap', value: '346 T' },
      { label: 'P/E', value: '14,2' },
      { label: 'EPS', value: '246' },
      { label: 'Div Yield', value: '4,8%' },
    ],
    actual: [3850, 3780, 3700, 3620, 3580, 3650, 3550, 3610, 3540, 3500],
    forecast: [3500, 3550, 3600, 3680, 3720, 3780],
    ciUpper: [3500, 3680, 3780, 3900, 3980, 4100],
    ciLower: [3500, 3420, 3350, 3400, 3420, 3450],
    yMin: 3200,
    yMax: 4200,
    yTicks: [4200, 3950, 3700, 3455, 3200],
    targetPrice: 'Rp 3.780',
    rec: 'BUY',
    upside: '+8,0% Potensi Kenaikan',
    sliderPct: 75,
    stopLoss: 'Rp 3.320',
    riskReward: '1 : 1,6',
    confidence: '78%',
    sentiment: [
      { label: 'Lokal', value: 68, tone: 'cyan', verdict: 'Bullish', source: 'Penetrasi IndiHome, data center baru' },
      { label: 'Global', value: 58, tone: 'amber', verdict: 'Neutral', source: 'Kenaikan belanja modal industri telekomunikasi' },
    ],
    synthesis: [
      'TLKM saat ini mengalami koreksi sehat jangka pendek akibat rebalancing portofolio asing. Level Rp 3.450 bertindak sebagai support historis kuat. RSI berada di area jenuh jual (28), yang historisnya selalu memicu pemulihan harga (*technical rebound*) menuju MA-50 di Rp 3.650.',
      'Strategi integrasi fixed-mobile convergence (FMC) mulai membuahkan hasil efisiensi biaya operasional. Segmen bisnis Data Center (*NeuCentrIX*) mencatatkan pertumbuhan pendapatan *double-digit* dan diproyeksikan menjadi pilar bisnis baru. Valuasi saat ini menawarkan dividen yield yang atraktif di kisaran 4,8%.'
    ],
    news: [
      { headline: 'Telkom Bangun Data Center Ramah Lingkungan Baru di Batam', source: 'Bisnis.com', time: '14:22', tag: 'Medium', tone: 'green' },
      { headline: 'Asing Catat Net Sell Rp 150 M di Saham TLKM Kemarin', source: 'Investor Daily', time: '10:05', tag: 'Medium', tone: 'amber' },
      { headline: 'Rasio Konsolidasi Industri Telko RI Pasca Integrasi FMC', source: 'Kontan', time: '08:12', tag: 'Low', tone: 'green' },
    ]
  },
  ASII: {
    name: 'Astra International Tbk',
    price: 'Rp 5.200',
    change: '+2,1%',
    dir: 'up',
    ohlc: [
      { label: 'Prev', value: '5.090' },
      { label: 'Vol', value: '15,6M' },
    ],
    ratios: [
      { label: 'Mkt Cap', value: '210 T' },
      { label: 'P/E', value: '6,8' },
      { label: 'EPS', value: '765' },
      { label: 'Div Yield', value: '7,2%' },
    ],
    actual: [4900, 4820, 4750, 4850, 4920, 4880, 5000, 5050, 5100, 5200],
    forecast: [5200, 5280, 5350, 5420, 5480, 5550],
    ciUpper: [5200, 5450, 5600, 5750, 5880, 6000],
    ciLower: [5200, 5100, 5000, 5050, 5080, 5100],
    yMin: 4500,
    yMax: 6200,
    yTicks: [6200, 5750, 5300, 4850, 4500],
    targetPrice: 'Rp 5.500',
    rec: 'HOLD',
    upside: '+5,7% Potensi Kenaikan',
    sliderPct: 62,
    stopLoss: 'Rp 4.950',
    riskReward: '1 : 1,2',
    confidence: '68%',
    sentiment: [
      { label: 'Lokal', value: 55, tone: 'amber', verdict: 'Neutral', source: 'Penjualan mobil melemah, komoditas batubara stabil' },
      { label: 'Global', value: 60, tone: 'cyan', verdict: 'Bullish', source: 'Arus investasi manufaktur otomotif global' },
    ],
    synthesis: [
      'ASII menunjukkan tanda-tanda pembalikan arah setelah menyentuh support kuat di Rp 4.800. Volume perdagangan meningkat signifikan pada kenaikan hari ini, mengindikasikan adanya akumulasi dari investor domestik. Saham saat ini tertahan di resistance MA-200.',
      'Meskipun pangsa pasar otomotif domestik mengalami tekanan dari mobil listrik (EV) China, lini bisnis jasa keuangan dan alat berat (United Tractors) milik Astra menjadi penyeimbang yang kokoh. Rasio pembayaran dividen final ASII diproyeksikan tetap tinggi, menawarkan dividen yield sebesar 7,2%.'
    ],
    news: [
      { headline: 'GIIAS 2024 Dongkrak Surat Pemesanan Kendaraan Grup Astra', source: 'CNBC Indonesia', time: '16:40', tag: 'High', tone: 'green' },
      { headline: 'Penjualan Alat Berat UNTR Meningkat di Sektor Nikel', source: 'Kontan', time: '13:10', tag: 'Medium', tone: 'green' },
      { headline: 'Analisis Valuasi ASII Menghadapi Serbuan EV Murah', source: 'Bisnis.com', time: '11:25', tag: 'Low', tone: 'amber' },
    ]
  },
  GOTO: {
    name: 'GoTo Gojek Tokopedia Tbk',
    price: 'Rp 52',
    change: '-3,8%',
    dir: 'down',
    ohlc: [
      { label: 'Prev', value: '54' },
      { label: 'Vol', value: '380M' },
    ],
    ratios: [
      { label: 'Mkt Cap', value: '62 T' },
      { label: 'P/E', value: 'Negatif' },
      { label: 'EPS', value: '-12' },
      { label: 'Div Yield', value: '0%' },
    ],
    actual: [65, 62, 60, 58, 59, 57, 55, 54, 54, 52],
    forecast: [52, 51, 50, 49, 48, 47],
    ciUpper: [52, 56, 58, 62, 65, 68],
    ciLower: [52, 48, 45, 42, 40, 38],
    yMin: 35,
    yMax: 70,
    yTicks: [70, 60, 50, 40],
    targetPrice: 'Rp 45',
    rec: 'SELL',
    upside: '-13,4% Potensi Penurunan',
    sliderPct: 22,
    stopLoss: 'Rp 58',
    riskReward: '1.2 : 1',
    confidence: '55%',
    sentiment: [
      { label: 'Lokal', value: 38, tone: 'red', verdict: 'Bearish', source: 'Persaingan e-commerce ketat, daya beli turun' },
      { label: 'Global', value: 45, tone: 'amber', verdict: 'Neutral', source: 'Aliran dana modal ventura startup Asia' },
    ],
    synthesis: [
      'GOTO kembali mendekati level gocap (Rp 50) dengan tren bearish yang kuat. Volume transaksi harian didominasi oleh aksi jual asing. Secara teknikal, indikator RSI dan MACD menunjukkan momentum penurunan yang masih berlanjut tanpa adanya tanda-tanda divergensi positif.',
      'Langkah efisiensi biaya dan pelepasan Tokopedia ke TikTok berhasil mengurangi EBITDA operasional yang negatif, namun tantangan menuju profitabilitas bottom-line yang bersih masih sangat berat di tengah persaingan ketat ride-hailing dengan Grab dan in-drive.'
    ],
    news: [
      { headline: 'GOTO Tekankan Fokus Menuju Profitabilitas Laba Bersih di 2025', source: 'CNBC Indonesia', time: '17:15', tag: 'High', tone: 'amber' },
      { headline: 'TikTok Shop Kuasai Pangsa Pasar E-Commerce Pasca Akuisisi Tokopedia', source: 'Kontan', time: '12:45', tag: 'High', tone: 'green' },
      { headline: 'Aksi Jual Bersih Asing Tekan Indeks Teknologi Pekan Ini', source: 'Bisnis.com', time: '09:30', tag: 'Medium', tone: 'red' },
    ]
  }
}

// Fallback dynamic generator for other tickers
function generateFallbackData(ticker: string): typeof TICKER_DB['BBCA'] {
  const cleanTicker = ticker.toUpperCase()
  // deterministic random based on ticker string
  let hash = 0
  for (let i = 0; i < cleanTicker.length; i++) {
    hash = cleanTicker.charCodeAt(i) + ((hash << 5) - hash)
  }
  const isUp = hash % 2 === 0
  const basePrice = Math.abs(hash % 9000) + 1000
  const changePct = ((Math.abs(hash % 40) + 5) / 10).toFixed(1)

  return {
    name: `PT ${cleanTicker} Indonesia Tbk`,
    price: `Rp ${basePrice.toLocaleString('id-ID')}`,
    change: `${isUp ? '+' : '-'}${changePct}%`,
    dir: isUp ? 'up' : 'down',
    ohlc: [
      { label: 'Prev', value: (basePrice * (isUp ? 0.98 : 1.02)).toFixed(0) },
      { label: 'Vol', value: `${(Math.abs(hash % 80) + 10).toFixed(1)}M` },
    ],
    ratios: [
      { label: 'Mkt Cap', value: `${(Math.abs(hash % 900) + 10)} T` },
      { label: 'P/E', value: `${(Math.abs(hash % 25) + 8).toFixed(1)}` },
      { label: 'EPS', value: `${Math.abs(hash % 400) + 20}` },
      { label: 'Div Yield', value: `${(Math.abs(hash % 6) + 1).toFixed(1)}%` },
    ],
    actual: Array.from({ length: 10 }, (_, i) => Math.round(basePrice * (0.9 + i * 0.01 + Math.sin(i) * 0.03))),
    forecast: Array.from({ length: 6 }, (_, i) => Math.round(basePrice * (1.0 + i * (isUp ? 0.015 : -0.01) + Math.cos(i) * 0.01))),
    ciUpper: Array.from({ length: 6 }, (_, i) => Math.round(basePrice * (1.0 + i * (isUp ? 0.025 : -0.005) + 0.04 + i * 0.01))),
    ciLower: Array.from({ length: 6 }, (_, i) => Math.round(basePrice * (1.0 + i * (isUp ? 0.005 : -0.015) - 0.04 - i * 0.01))),
    yMin: Math.round(basePrice * 0.8),
    yMax: Math.round(basePrice * 1.2),
    yTicks: [Math.round(basePrice * 1.2), Math.round(basePrice * 1.1), Math.round(basePrice * 1.0), Math.round(basePrice * 0.9), Math.round(basePrice * 0.8)],
    targetPrice: `Rp ${Math.round(basePrice * (isUp ? 1.12 : 0.93)).toLocaleString('id-ID')}`,
    rec: isUp ? 'BUY' : 'HOLD',
    upside: `${isUp ? '+' : '-'}${Math.abs(isUp ? 12 : -7)}% Potensi Kenaikan`,
    sliderPct: isUp ? 78 : 45,
    stopLoss: `Rp ${Math.round(basePrice * (isUp ? 0.9 : 0.95)).toLocaleString('id-ID')}`,
    riskReward: isUp ? '1 : 2,0' : '1 : 1,1',
    confidence: `${Math.abs(hash % 20) + 70}%`,
    sentiment: [
      { label: 'Lokal', value: Math.abs(hash % 30) + 50, tone: isUp ? 'green' : 'amber', verdict: isUp ? 'Bullish' : 'Neutral', source: 'Aliran dana pasar domestik' },
      { label: 'Global', value: Math.abs(hash % 20) + 60, tone: 'cyan', verdict: 'Bullish', source: 'Kondisi makro ekonomi global' },
    ],
    synthesis: [
      `Saham ${cleanTicker} menunjukkan pola pergerakan konsolidasi jangka menengah. Terjadi peningkatan volume beli di kisaran area support kunci. Indikator MACD bersiap melakukan crossover, membuka potensi penguatan lebih lanjut jika berhasil menembus resistensi terdekat.`,
      `Dari perspektif fundamental, kinerja keuangan ${cleanTicker} menunjukkan performa yang cukup stabil di tengah volatilitas industri. Pertumbuhan pendapatan ditopang peningkatan margin operasi dan kontrol biaya yang efisien. Risiko utama mencakup perubahan regulasi lokal dan sentimen sektoral.`
    ],
    news: [
      { headline: `Rilis Laporan Keuangan Tahunan ${cleanTicker} Menunjukkan Kenaikan Laba`, source: 'Bisnis.com', time: '13:42', tag: 'High', tone: 'green' },
      { headline: `Analis Sektoral Meninjau Kembali Target Harga ${cleanTicker}`, source: 'Kontan', time: '10:15', tag: 'Medium', tone: 'amber' },
      { headline: `Sentimen Industri Mempengaruhi Pergerakan Saham ${cleanTicker}`, source: 'CNBC Indonesia', time: '08:30', tag: 'Low', tone: 'amber' },
    ]
  }
}

// Data Getters
export function getDummyStock(ticker: string): Stock {
  const clean = (ticker || '').toUpperCase()
  const db = TICKER_DB[clean] ?? generateFallbackData(clean)
  return {
    ticker: clean,
    initial: clean ? clean[0] : '?',
    name: db.name,
    price: db.price,
    change: db.change,
    dir: db.dir,
    ohlc: db.ohlc,
    ratios: db.ratios,
  }
}

export function getDummyForecast(ticker: string, range: string): ForecastData {
  const clean = (ticker || '').toUpperCase()
  const db = TICKER_DB[clean] ?? generateFallbackData(clean)
  return {
    title: 'Generative AI Forecast',
    caption: '',
    ranges: ['3M', '1Y'],
    activeRange: range,
    yMin: db.yMin,
    yMax: db.yMax,
    yTicks: db.yTicks,
    xLabels: range === '1Y'
      ? ['Jan', 'Mar', 'Mei', 'Today', 'Agt', 'Okt', 'Des']
      : ['Jan', 'Feb', 'Mar', 'Today', 'Apr', 'Mei'],
    actual: db.actual,
    forecast: db.forecast,
    ciUpper: db.ciUpper,
    ciLower: db.ciLower,
    volume: Array.from({ length: 10 }, (_, i) => ({
      v: Math.abs((i + 1) * 7 + ((clean ? clean.charCodeAt(0) : 0) % 20)) % 100,
      dir: i % 2 === 0 ? 'up' : 'down'
    }))
  }
}

export function getDummyTarget(ticker: string): TargetData {
  const clean = (ticker || '').toUpperCase()
  const db = TICKER_DB[clean] ?? generateFallbackData(clean)
  return {
    title: 'Target Harga AI (30H)',
    price: db.targetPrice,
    rec: db.rec,
    upside: db.upside,
    sliderPct: db.sliderPct,
    stats: [
      { label: 'Stop-Loss', value: db.stopLoss },
      { label: 'Risk / Reward', value: db.riskReward },
      { label: 'Confidence', value: db.confidence },
    ],
    disclaimer: 'Untuk riset saja - bukan saran investasi.',
  }
}

export function getDummyKeyLevels(ticker: string): KeyLevel[] {
  const clean = (ticker || '').toUpperCase()
  const db = TICKER_DB[clean] ?? generateFallbackData(clean)
  const basePriceNum = parseInt(db.price.replace(/[^\d]/g, ''))
  return [
    { label: 'Bollinger Up', value: `Rp ${(basePriceNum * 1.05).toLocaleString('id-ID')}`, tone: 'up' },
    { label: 'Current', value: db.price, tone: 'flat' },
    { label: 'Bollinger Down', value: `Rp ${(basePriceNum * 0.95).toLocaleString('id-ID')}`, tone: 'down' },
  ]
}

export function getDummySentiment(ticker: string): SentimentItem[] {
  const clean = (ticker || '').toUpperCase()
  const db = TICKER_DB[clean] ?? generateFallbackData(clean)
  return db.sentiment
}

export function getDummySynthesis(ticker: string): SynthesisData {
  const clean = (ticker || '').toUpperCase()
  const db = TICKER_DB[clean] ?? generateFallbackData(clean)
  return {
    title: 'AI Synthesis',
    paragraphs: db.synthesis,
  }
}

export function getDummyNews(ticker: string): NewsItem[] {
  const clean = (ticker || '').toUpperCase()
  const db = TICKER_DB[clean] ?? generateFallbackData(clean)
  return db.news
}
