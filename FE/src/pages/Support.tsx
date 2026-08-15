import { useState } from 'react'
import { Select } from '@/components/common/Select'
import { useToast } from '@/components/common/Toast'

const SUPPORT_EMAIL = 'mlegibeitelu@gmail.com'

const CATEGORY_LABELS: Record<string, string> = {
  bug:     'Laporan Masalah Sistem (Bug Report)',
  model:   'Akurasi Prediksi AI Model',
  data:    'Kesalahan Data Keuangan (Market Data)',
  suggest: 'Saran Peningkatan Fitur (Suggestion)',
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))

import { submitSupportTicketApi } from '@/services/api'

export function Support() {
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('bug')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const subject = `[Atheric AI Support] ${CATEGORY_LABELS[category]} - dari ${name}`
    
    try {
      // Send to Backend DB
      await submitSupportTicketApi({
        name,
        email,
        subject,
        category: CATEGORY_LABELS[category] || category,
        message,
      })
      toast.success('Tiket terisi!', 'Tiket bantuan berhasil dicatat di Backend database Atheric AI.')
    } catch (err: any) {
      toast.error('Gagal simpan ke DB', err.message || 'Gagal terhubung ke backend')
    }

    const body = [
      `Kategori  : ${CATEGORY_LABELS[category]}`,
      `Nama      : ${name}`,
      `Email     : ${email}`,
      ``,
      `--- Pesan ---`,
      message,
      ``,
      `---`,
      `Dikirim melalui Atheric AI Terminal Support Form`,
    ].join('\n')

    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto

    setSubmitted(true)
    setSubmitting(false)
    setTimeout(() => {
      setSubmitted(false)
      setName('')
      setEmail('')
      setMessage('')
    }, 4000)
  }

  const faqs = [
    { q: 'Bagaimana model AI memprediksi harga saham?', a: 'Model kami melatih data historis pergerakan harga 10 tahun ke belakang dikombinasikan dengan sentimen rilis berita emiten menggunakan jaringan saraf LSTM dan algoritma transformer.' },
    { q: 'Seberapa sering model ramalan diperbarui?', a: 'Sintesis analisis AI diperbarui setiap 15 menit, sedangkan kurva grafik ramalan harga diperbarui sekali sehari setelah penutupan bursa (pukul 16:00 WIB).' },
    { q: 'Apakah prediksi ini dijamin akurat?', a: 'Sama sekali tidak. Ramalan ini murni produk pemodelan statistik dan sentimen untuk tujuan riset. Ini bukan saran investasi keuangan.' }
  ]

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-2)',
    border: '1px solid var(--border-strong)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    transition: 'border-color .15s',
    fontFamily: 'inherit',
  }

  return (
    <div className="content">
      <div className="page-head">
        <div className="page-title">PUSAT BANTUAN</div>
        <div className="page-sub">Kirim kendala teknis, masukan perbaikan model, atau tanyakan perihal integrasi API.</div>
      </div>

      <div className="support-layout">
        {/* Left Side: Status & FAQ */}
        <div className="support-sidebar">
          {/* Status Box */}
          <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-label" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Status Sistem</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '3px' }}>Terminal Operational</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="live-dot" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--green)' }}>Normal</span>
            </div>
          </div>

          {/* FAQ */}
          <div className="card" style={{ padding: '18px' }}>
            <div className="card-title" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: '16px' }}>FAQ Populer</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  style={{
                    paddingBottom: '14px',
                    marginBottom: i < faqs.length - 1 ? '14px' : 0,
                    borderBottom: i < faqs.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, marginBottom: '5px' }}>{faq.q}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', lineHeight: 1.6 }}>{faq.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Ticket Form */}
        <div className="card support-form">
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', paddingBottom: '12px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
            Kirim Tiket Masukan
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="support-form-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <label className="stat-label" style={{ fontSize: '11.5px', fontWeight: 600 }}>Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ketik nama Anda..."
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <label className="stat-label" style={{ fontSize: '11.5px', fontWeight: 600 }}>Alamat Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@domain.com"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="stat-label" style={{ fontSize: '11.5px', fontWeight: 600 }}>Kategori Laporan</label>
              <Select value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="stat-label" style={{ fontSize: '11.5px', fontWeight: 600 }}>Deskripsi Pesan</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tulis pesan lengkap perihal kendala atau masukan Anda..."
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
              />
            </div>

            <div style={{ marginTop: '8px' }}>
              {submitted ? (
                <div className="pill buy" style={{ display: 'block', textAlign: 'center', padding: '12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', lineHeight: 1.5 }}>
                  ✓ Email klien Anda terbuka - periksa dan klik Kirim untuk menyelesaikan laporan.
                </div>
              ) : (
                <button
                  type="submit"
                  className="stock-btn primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Kirim Laporan via Email
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
