import type { NavItem, Glossary } from '@/types'

export const NAV_ITEMS: NavItem[] = [
  { id: 'ranking', label: 'Ranking Model', icon: 'bars', href: '/' },
  { id: 'watchlists', label: 'Watchlists', icon: 'eye', href: '/watchlist' },
  { id: 'evaluasi', label: 'Evaluasi Model', icon: 'clipboard', href: '/evaluasi' },
]

export const NAV_FOOTER: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: 'gear', href: '/settings' },
  { id: 'support', label: 'Support', icon: 'help', href: '/support' },
]

export const GLOSSARY: Glossary = {
  'P/E': 'Seberapa mahal saham dibandingkan laba tahunannya - semakin tinggi berarti semakin mahal.',
  'EPS': 'Laba bersih perusahaan per lembar saham selama setahun terakhir.',
  'Div Yield': 'Dividen tahunan yang dibayarkan sebagai persentase dari harga saham.',
  '90% CI': 'Model memperkirakan harga akan berada di dalam rentang ini sekitar 9 dari 10 kali.',
}
