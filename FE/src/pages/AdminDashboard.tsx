import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { adminGetUsersApi, adminUpdateUserApi, adminUpdateRoleApi, adminToggleStatusApi, adminDeleteUserApi, adminCreateUserApi, adminGetActivityLogsApi } from "@/services/api"

interface AdminActivityLog {
  id: number
  userId: number
  username: string
  role: string
  action: string
  details: string
  ip: string
  userAgent: string
  createdAt: string
}

interface TrafficStats {
  timestamp?: string
  serverStatus?: string
  uptimeSeconds?: number
  uptime?: string
  activeUsers?: number
  activeConnections?: number
  totalRequests?: number
  blockedBots?: number
  requestsPerMin?: number
  requestsLast1Min?: number
  requestsLast5Min?: number
  requestsLast15Min?: number
  uniqueUsers15Min?: number
  peakRequestsPerMin?: number
  avgLatencyMs?: number
  avgResponseMs?: number
  errorRatePct?: number
  errorRate?: number
  cpuUsagePct?: number
  memoryUsageMb?: number
  memoryUsagePct?: number
  topEndpoints?: { path: string; count: number }[]
  recentLogs?: { id: string; method: string; path: string; status: number; ip: string; latencyMs: number; timestamp: string }[]
  requestHistory?: { time: string; count: number }[]
  serverStatusList?: { name: string; status: "up" | "down" | "warn" }[]
}

interface AdminUser {
  id: number
  username: string
  email: string
  role: string
  isVerified: boolean
  isActive: boolean
  createdAt: string
}

/* ------------------------------------------------------------------ */
/* SVG Icon Components                                                  */
/* ------------------------------------------------------------------ */
const ActivityIcon = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: "inline-block", verticalAlign: "-2px", marginRight: "6px" }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const UsersIcon = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: "inline-block", verticalAlign: "-2px", marginRight: "6px" }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
    style={{
      display: "inline-block", verticalAlign: "-2px", marginRight: "5px",
      animation: spinning ? "spinRotate 0.6s linear infinite" : "none",
    }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const PlusIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: "inline-block", verticalAlign: "-2px", marginRight: "5px" }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
)

const CheckIcon = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#3ecf8e" strokeWidth="2.5" style={{ display: "inline-block", verticalAlign: "-1px" }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

const CrossIcon = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--text-dim)" strokeWidth="2.5" style={{ display: "inline-block", verticalAlign: "-1px" }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
const BASE_URL = import.meta.env.VITE_API_URL ?? (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000` : 'http://localhost:5000')

function formatUptime(seconds?: number): string {
  if (!seconds || seconds <= 0) return "1m"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}j ${m}m`
  if (m > 0) return `${m}m ${s}d`
  return `${s}d`
}

function useWsTraffic() {
  const { token } = useAuth()
  const [stats, setStats] = useState<TrafficStats | null>(null)
  const [connected, setConnected] = useState(false)
  const [history, setHistory] = useState<number[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const wsUrl = BASE_URL.replace(/^http/, "ws") + "/api/ws/monitor"
    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl + (token ? `?token=${token}` : ""))
        wsRef.current = ws
        ws.onopen = () => setConnected(true)
        ws.onmessage = e => {
          try {
            const data: TrafficStats = JSON.parse(e.data)
            setStats(data)
            const count = data.requestsPerMin ?? 0
            setHistory(h => [...h.slice(-59), count])
          } catch { /* ignore */ }
        }
        ws.onclose = () => { setConnected(false); setTimeout(connect, 3000) }
        ws.onerror = () => ws.close()
      } catch { /* ignore */ }
    }
    connect()
    return () => { wsRef.current?.close() }
  }, [token])

  return { stats, connected, history }
}

/* ------------------------------------------------------------------ */
/* Mini SVG line chart                                                  */
/* ------------------------------------------------------------------ */
function SparkLine({ data, color = "#4f7dff" }: { data: number[]; color?: string }) {
  const validData = data.filter(n => typeof n === "number" && !isNaN(n) && isFinite(n))
  if (validData.length < 2) return null
  const W = 300, H = 70, pad = 4
  const max = Math.max(...validData) || 1
  const pts = validData.map((v, i) => {
    const x = pad + (i / (validData.length - 1 || 1)) * (W - pad * 2)
    const y = H - pad - ((v / max) * (H - pad * 2))
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const polyline = pts.join(" ")
  const area = `${pad.toFixed(1)},${(H - pad).toFixed(1)} ${polyline} ${(W - pad).toFixed(1)},${(H - pad).toFixed(1)}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "70px" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sg)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Stat card                                                            */
/* ------------------------------------------------------------------ */
function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: "var(--panel)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "18px 20px", flex: "1", minWidth: "140px",
    }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: 800, color: accent || "var(--text)", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: "11.5px", color: "var(--text-dim)", marginTop: "4px" }}>{sub}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Server status badge                                                  */
/* ------------------------------------------------------------------ */
function StatusDot({ status }: { status: "up" | "down" | "warn" }) {
  const c = status === "up" ? "#3ecf8e" : status === "warn" ? "#f5a623" : "#f0564b"
  return <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: c, marginRight: 7, boxShadow: `0 0 6px ${c}` }} />
}

/* ------------------------------------------------------------------ */
/* Traffic Tab                                                          */
/* ------------------------------------------------------------------ */
function TrafficTab({ stats, connected, history }: { stats: TrafficStats | null; connected: boolean; history: number[] }) {
  const activeConn = stats?.activeUsers ?? stats?.activeConnections ?? 0
  const totReq = stats?.totalRequests ?? 0
  const req1m = stats?.requestsLast1Min ?? stats?.requestsPerMin ?? 0
  const req5m = stats?.requestsLast5Min ?? req1m
  const req15m = stats?.requestsLast15Min ?? req1m
  const unique15m = stats?.uniqueUsers15Min ?? (activeConn > 0 ? 1 : 0)
  const peakReq = stats?.peakRequestsPerMin ?? req1m
  const blockedBots = stats?.blockedBots ?? 0
  const avgLat = Math.round(stats?.avgLatencyMs ?? stats?.avgResponseMs ?? 0)
  const errRate = stats?.errorRatePct ?? stats?.errorRate ?? 0
  const uptimeStr = stats?.uptimeSeconds ? formatUptime(stats.uptimeSeconds) : (stats?.uptime ?? "ONLINE")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      {/* Connection indicator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            display: "inline-block", width: 8, height: 8, borderRadius: "50%",
            background: connected ? "#3ecf8e" : "#f0564b",
            boxShadow: connected ? "0 0 6px #3ecf8e" : "none",
          }} />
          <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
            {connected ? "WebSocket terhubung - stream data realtime" : "WebSocket terputus - mencoba ulang..."}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
          Pengguna Unik 15 Min: <strong style={{ color: "var(--blue)" }}>{unique15m} IP</strong> | Uptime: <strong style={{ color: "var(--green)" }}>{uptimeStr}</strong>
        </div>
      </div>

      {/* Exactly 4 Key Info Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", width: "100%" }}>
        <StatCard label="Pengguna / Koneksi Aktif" value={stats ? activeConn : "-"} sub={unique15m > 0 ? `${unique15m} IP unik aktif (15m)` : "1 sesi terhubung"} accent="#4f7dff" />
        <StatCard label="Total Request HTTP" value={stats ? totReq : "-"} sub={`${req5m} req dalam 5 menit terakhir`} />
        <StatCard label="Kecepatan Trafik" value={stats ? `${req1m} req/m` : "-"} sub={`Peak: ${peakReq} req/m (${req15m} req/15m)`} />
        <StatCard label="Bot Dicegah" value={stats ? blockedBots : "-"} sub="Script & spam login/register diblokir" accent={blockedBots > 0 ? "#f0564b" : "#3ecf8e"} />
      </div>

      {/* Request history chart */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div style={{ fontSize: "13.5px", fontWeight: 700 }}>Riwayat Request & Trafik Pengguna (60 Detik Terakhir)</div>
            <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>
              Stream statistik real-time interval 1 detik dari WebSocket Backend Go
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--text-dim)", background: "rgba(255,255,255,0.03)", padding: "6px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            <span>1 Min: <strong style={{ color: "var(--blue)" }}>{req1m} req</strong></span>
            <span>5 Min: <strong style={{ color: "var(--text)" }}>{req5m} req</strong></span>
            <span>15 Min: <strong style={{ color: "var(--text)" }}>{req15m} req</strong></span>
            <span>Puncak: <strong style={{ color: "var(--green)" }}>{peakReq} req/m</strong></span>
          </div>
        </div>
        {history.length >= 2 ? (
          <SparkLine data={history} />
        ) : (
          <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: "13px" }}>
            Menunggu stream data realtime...
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {/* Top endpoints */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px", flex: "1", minWidth: "240px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "14px" }}>Endpoint Terpakai</div>
          {(() => {
            const topEps = stats?.topEndpoints ?? []
            if (topEps.length === 0) return <div style={{ color: "var(--text-dim)", fontSize: "13px" }}>Belum ada data.</div>
            const max = topEps[0]?.count || 1
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {topEps.slice(0, 6).map((ep, i) => {
                  const pct = Math.round((ep.count / max) * 100)
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                        <span style={{ color: "var(--text-dim)", fontFamily: "monospace" }}>{ep.path}</span>
                        <span style={{ fontWeight: 600 }}>{ep.count}</span>
                      </div>
                      <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "var(--blue)", borderRadius: 2, transition: "width .5s" }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* Server status */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px", flex: "1", minWidth: "200px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "14px" }}>Status Server</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {(() => {
              const serverSt: "up" | "warn" | "down" = stats?.serverStatus === "DEGRADED" ? "warn" : stats?.serverStatus === "OFFLINE" ? "down" : "up"
              const wsSt: "up" | "warn" | "down" = connected ? "up" : "warn"
              const statusList: { name: string; s: "up" | "warn" | "down" }[] = [
                { name: "API Server", s: serverSt },
                { name: "Database", s: "up" },
                { name: "WebSocket", s: wsSt }
              ]
              return statusList.map((x, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", fontSize: "13px" }}>
                  <StatusDot status={x.s} />
                  <span style={{ flex: 1 }}>{x.name}</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: x.s === "up" ? "#3ecf8e" : x.s === "warn" ? "#f5a623" : "#f0564b" }}>{x.s}</span>
                </div>
              ))
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Users Tab                                                            */
/* ------------------------------------------------------------------ */
function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "USER" })
  const [creating, setCreating] = useState(false)

  // Confirmation Modals State
  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null)
  const [deleteModalUser, setDeleteModalUser] = useState<AdminUser | null>(null)
  const [editModalUser, setEditModalUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({ username: "", email: "", role: "USER", isActive: true, password: "" })

  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try { setUsers(await adminGetUsersApi()) } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Handle Role Change
  async function confirmRoleChange() {
    if (!roleModalUser) return
    setSubmitting(true)
    const nextRole = roleModalUser.role === "ADMIN" ? "USER" : "ADMIN"
    try {
      await adminUpdateRoleApi(roleModalUser.id, nextRole)
      setUsers(u => u.map(x => x.id === roleModalUser.id ? { ...x, role: nextRole } : x))
      setRoleModalUser(null)
    } catch (e: any) {
      alert(e.message)
    }
    setSubmitting(false)
  }

  // Handle Delete User
  async function confirmDeleteUser() {
    if (!deleteModalUser) return
    setSubmitting(true)
    try {
      await adminDeleteUserApi(deleteModalUser.id)
      setUsers(u => u.filter(x => x.id !== deleteModalUser.id))
      setDeleteModalUser(null)
    } catch (e: any) {
      alert(e.message)
    }
    setSubmitting(false)
  }

  // Handle Edit User Submit
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editModalUser) return
    if (editForm.username.trim().length < 3) {
      alert("Username minimal 3 karakter.")
      return
    }
    if (editForm.password && editForm.password.trim().length < 6) {
      alert("Password baru minimal 6 karakter.")
      return
    }
    setSubmitting(true)
    try {
      const updated = await adminUpdateUserApi(editModalUser.id, editForm)
      setUsers(u => u.map(x => x.id === editModalUser.id ? { ...x, username: updated.username || editForm.username, email: updated.email || editForm.email, role: updated.role || editForm.role, isActive: updated.isActive ?? editForm.isActive } : x))
      setEditModalUser(null)
    } catch (e: any) {
      alert(e.message)
    }
    setSubmitting(false)
  }

  // Handle Create User
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (newUser.username.trim().length < 3) {
      alert("Username minimal 3 karakter.")
      return
    }
    if (newUser.password.trim().length < 6) {
      alert("Password minimal 6 karakter.")
      return
    }
    setCreating(true)
    try {
      await adminCreateUserApi(newUser)
      setShowCreate(false); setNewUser({ username: "", email: "", password: "", role: "USER" }); await load()
    } catch (e: any) { alert(e.message) }
    setCreating(false)
  }

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const inp: React.CSSProperties = {
    padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--bg)",
    border: "1px solid var(--border-strong)", color: "var(--text)", fontSize: "13px", outline: "none",
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ ...inp, flex: "1", minWidth: "200px" }} placeholder="Cari username / email..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={load} style={{ ...inp, cursor: "pointer", whiteSpace: "nowrap" }}><RefreshIcon spinning={loading} /> Refresh</button>
        <button onClick={() => setShowCreate(true)} style={{
          ...inp, cursor: "pointer", background: "var(--blue)", color: "#fff",
          border: "none", fontWeight: 700, whiteSpace: "nowrap",
        }}><PlusIcon /> Tambah User</button>
      </div>

      {err && <div style={{ color: "var(--red)", fontSize: "13px", padding: "10px 14px", background: "rgba(240,86,75,0.1)", borderRadius: "var(--radius-sm)" }}>{err}</div>}

      {/* Table */}
      <div style={{
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        width: "100%",
        maxWidth: "100%",
        display: "block",
      }}>
        <table style={{ width: "100%", minWidth: "820px", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
              {["ID User", "Username", "Email", "Role", "Verified", "Status", "Dibuat", "Aksi"].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>Tidak ada user ditemukan.</td></tr>
            ) : filtered.map((u, idx) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                <td style={{ padding: "12px 14px", color: "var(--blue)", fontWeight: 700, fontFamily: "monospace" }}>#{u.id}</td>
                <td style={{ padding: "12px 14px", fontWeight: 600 }}>{u.username}</td>
                <td style={{ padding: "12px 14px", color: "var(--text-dim)" }}>{u.email}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 700,
                    background: u.role === "ADMIN" ? "rgba(79,125,255,0.18)" : "rgba(138,147,166,0.15)",
                    color: u.role === "ADMIN" ? "var(--blue)" : "var(--text-dim)",
                  }}>{u.role}</span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  {u.isVerified ? <CheckIcon /> : <CrossIcon />}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 700,
                    background: u.isActive ? "rgba(62,207,142,0.15)" : "rgba(240,86,75,0.12)",
                    color: u.isActive ? "#3ecf8e" : "#f0564b",
                  }}>{u.isActive ? "Aktif" : "Nonaktif"}</span>
                </td>
                <td style={{ padding: "12px 14px", color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString("id-ID") : "-"}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {/* Role Button */}
                    <button onClick={() => setRoleModalUser(u)} style={{
                      padding: "5px 12px", borderRadius: "var(--radius-sm)", fontSize: "11px", fontWeight: 700,
                      background: "rgba(79,125,255,0.15)", color: "var(--blue)", border: "1px solid rgba(79,125,255,0.3)", cursor: "pointer",
                    }}>Role</button>

                    {/* Edit Button */}
                    <button onClick={() => {
                      setEditModalUser(u)
                      setEditForm({ username: u.username, email: u.email, role: u.role, isActive: u.isActive, password: "" })
                    }} style={{
                      padding: "5px 12px", borderRadius: "var(--radius-sm)", fontSize: "11px", fontWeight: 700,
                      background: "rgba(255,255,255,0.06)", color: "var(--text)", border: "1px solid var(--border-strong)", cursor: "pointer",
                    }}>Edit</button>

                    {/* Hapus Button */}
                    <button onClick={() => setDeleteModalUser(u)} style={{
                      padding: "5px 12px", borderRadius: "var(--radius-sm)", fontSize: "11px", fontWeight: 700,
                      background: "rgba(240,86,75,0.12)", color: "#f0564b", border: "1px solid rgba(240,86,75,0.3)", cursor: "pointer",
                    }}>Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
        Total: {filtered.length} user{search ? " (filtered)" : ""}
      </div>

      {/* 1. Modal Konfirmasi Role */}
      {roleModalUser && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
        }} onClick={e => e.target === e.currentTarget && setRoleModalUser(null)}>
          <div style={{
            background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "28px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}>
            <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "12px" }}>Konfirmasi Perubahan Role</div>
            <div style={{ fontSize: "13.5px", color: "var(--text-dim)", lineHeight: 1.5, marginBottom: "20px" }}>
              Apakah Anda yakin ingin mengubah role akun <strong style={{ color: "var(--text)" }}>{roleModalUser.username}</strong> dari{" "}
              <strong style={{ color: "var(--blue)" }}>{roleModalUser.role}</strong> menjadi{" "}
              <strong style={{ color: roleModalUser.role === "ADMIN" ? "var(--text-dim)" : "var(--blue)" }}>
                {roleModalUser.role === "ADMIN" ? "USER" : "ADMIN"}
              </strong>?
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setRoleModalUser(null)} style={{
                padding: "10px 18px", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border)", color: "var(--text)", fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}>Batal</button>
              <button onClick={confirmRoleChange} disabled={submitting} style={{
                padding: "10px 18px", borderRadius: "var(--radius-sm)", background: "var(--blue)",
                border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1,
              }}>{submitting ? "Memproses..." : "Ubah Role"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Edit User */}
      {editModalUser && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
        }} onClick={e => e.target === e.currentTarget && setEditModalUser(null)}>
          <div style={{
            background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "28px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}>
            <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "6px" }}>Edit Data Pengguna #{editModalUser.id}</div>
            <div style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "20px" }}>
              Perbarui profil, email, role, atau password terenkripsi.
            </div>
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "6px" }}>Username</label>
                <input style={{ ...inp, width: "100%", boxSizing: "border-box" }} required
                  value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "6px" }}>Email</label>
                <input type="email" style={{ ...inp, width: "100%", boxSizing: "border-box" }} required
                  value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "6px" }}>Role</label>
                  <select style={{ ...inp, width: "100%", boxSizing: "border-box" }}
                    value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "6px" }}>Status</label>
                  <select style={{ ...inp, width: "100%", boxSizing: "border-box" }}
                    value={editForm.isActive ? "true" : "false"} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.value === "true" }))}>
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "6px" }}>Password Baru (Opsional)</label>
                <input type="password" style={{ ...inp, width: "100%", boxSizing: "border-box" }}
                  placeholder="Biarkan kosong jika tidak diubah"
                  value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setEditModalUser(null)} style={{
                  flex: 1, padding: "12px", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--border)", color: "var(--text)", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                }}>Batal</button>
                <button type="submit" disabled={submitting} style={{
                  flex: 1, padding: "12px", borderRadius: "var(--radius-sm)", background: "var(--blue)",
                  border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1,
                }}>{submitting ? "Menyimpan..." : "Simpan Perubahan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Konfirmasi Hapus */}
      {deleteModalUser && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
        }} onClick={e => e.target === e.currentTarget && setDeleteModalUser(null)}>
          <div style={{
            background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "28px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#f0564b", marginBottom: "12px" }}>Konfirmasi Hapus Akun</div>
            <div style={{ fontSize: "13.5px", color: "var(--text-dim)", lineHeight: 1.5, marginBottom: "20px" }}>
              Tindakan ini tidak dapat dibatalkan! Apakah Anda yakin ingin menghapus akun <strong style={{ color: "var(--text)" }}>{deleteModalUser.username}</strong> ({deleteModalUser.email}) secara permanen dari database?
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteModalUser(null)} style={{
                padding: "10px 18px", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border)", color: "var(--text)", fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}>Batal</button>
              <button onClick={confirmDeleteUser} disabled={submitting} style={{
                padding: "10px 18px", borderRadius: "var(--radius-sm)", background: "#f0564b",
                border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1,
              }}>{submitting ? "Menghapus..." : "Hapus Akun"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Tambah User */}
      {showCreate && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
        }} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={{
            background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "28px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}>
            <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "20px" }}>Tambah User Baru</div>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "6px" }}>Username</label>
                <input type="text" minLength={3} required placeholder="Minimal 3 karakter"
                  style={{ ...inp, width: "100%", boxSizing: "border-box" }}
                  value={newUser.username} onChange={e => setNewUser(n => ({ ...n, username: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "6px" }}>Email</label>
                <input type="email" required placeholder="contoh: user@domain.com"
                  style={{ ...inp, width: "100%", boxSizing: "border-box" }}
                  value={newUser.email} onChange={e => setNewUser(n => ({ ...n, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "6px" }}>Password</label>
                <input type="password" minLength={6} required placeholder="Minimal 6 karakter"
                  style={{ ...inp, width: "100%", boxSizing: "border-box" }}
                  value={newUser.password} onChange={e => setNewUser(n => ({ ...n, password: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "6px" }}>Role (Strict: USER / ADMIN)</label>
                <select style={{ ...inp, width: "100%", boxSizing: "border-box" }}
                  value={newUser.role} onChange={e => setNewUser(n => ({ ...n, role: e.target.value }))}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{
                  flex: 1, padding: "12px", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--border)", color: "var(--text)", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                }}>Batal</button>
                <button type="submit" disabled={creating} style={{
                  flex: 1, padding: "12px", borderRadius: "var(--radius-sm)", background: "var(--blue)",
                  border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", opacity: creating ? 0.7 : 1,
                }}>{creating ? "Memproses..." : "Tambah User"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Activity Logs Tab (Read-Only Audit Trail)                          */
/* ------------------------------------------------------------------ */
function ActivityLogsTab() {
  const [logs, setLogs] = useState<AdminActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try { setLogs(await adminGetActivityLogsApi()) } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = logs.filter(l =>
    (l.username || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.action || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.details || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.ip || "").includes(search)
  )

  const inp: React.CSSProperties = {
    padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--bg)",
    border: "1px solid var(--border-strong)", color: "var(--text)", fontSize: "13px", outline: "none",
  }

  function getActionBadge(action: string) {
    let bg = "rgba(138,147,166,0.15)", color = "var(--text-dim)"
    if (action.includes("LOGIN") || action.includes("REGISTER")) { bg = "rgba(62,207,142,0.15)"; color = "#3ecf8e" }
    else if (action.includes("ROLE") || action.includes("ADMIN")) { bg = "rgba(79,125,255,0.18)"; color = "var(--blue)" }
    else if (action.includes("DELETE") || action.includes("BOT")) { bg = "rgba(240,86,75,0.15)"; color = "#f0564b" }
    else if (action.includes("STATUS") || action.includes("EDIT")) { bg = "rgba(245,166,35,0.15)"; color = "#f5a623" }

    return (
      <span style={{
        padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 700,
        background: bg, color, letterSpacing: ".02em", whiteSpace: "nowrap",
      }}>{action}</span>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      {/* Header Info & Lock Badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 800 }}>Audit Trail & Log Aktivitas Pengguna</div>
          <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>
            Catatan permanen riwayat aksi pengguna & administrator di platform (Read-Only / Non-editable)
          </div>
        </div>
        <div style={{
          padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: "11.5px", fontWeight: 700,
          background: "rgba(255,255,255,0.04)", color: "var(--text-dim)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: "6px",
        }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          LOGS TERKUNCI (READ-ONLY)
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ ...inp, flex: "1", minWidth: "220px" }} placeholder="Cari username, jenis aksi, detail, IP..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={load} style={{ ...inp, cursor: "pointer", whiteSpace: "nowrap" }}><RefreshIcon spinning={loading} /> Refresh Log</button>
      </div>

      {err && <div style={{ color: "var(--red)", fontSize: "13px", padding: "10px 14px", background: "rgba(240,86,75,0.1)", borderRadius: "var(--radius-sm)" }}>{err}</div>}

      {/* Read-Only Table */}
      <div className="ad-animate" style={{
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        width: "100%",
        maxWidth: "100%",
        display: "block",
      }}>
        <table style={{ width: "100%", minWidth: "750px", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
              {["Waktu", "User", "Role", "Jenis Aksi", "Detail Aktivitas", "IP Address"].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: 14, height: 14, border: "2px solid var(--blue)", borderTopColor: "transparent", borderRadius: "50%", animation: "spinRotate 0.6s linear infinite" }} />
                    Memuat log aktivitas...
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>Belum ada log aktivitas tercatat.</td></tr>
            ) : filtered.map((l, idx) => (
              <tr key={l.id} style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                <td style={{ padding: "12px 14px", color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                  {l.createdAt ? new Date(l.createdAt).toLocaleString("id-ID") : "-"}
                </td>
                <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--text)" }}>{l.username || "System"}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: l.role === "ADMIN" ? "var(--blue)" : "var(--text-dim)" }}>{l.role || "USER"}</span>
                </td>
                <td style={{ padding: "12px 14px" }}>{getActionBadge(l.action)}</td>
                <td style={{ padding: "12px 14px", color: "var(--text)", lineHeight: 1.4 }}>{l.details}</td>
                <td style={{ padding: "12px 14px", color: "var(--text-dim)", fontFamily: "monospace", fontSize: "12px" }}>{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
        Total: {filtered.length} log tercatat
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main AdminDashboard                                                  */
/* ------------------------------------------------------------------ */
export function AdminDashboard() {
  const { user, isAdmin } = useAuth()
  const [tab, setTab] = useState<"traffic" | "users" | "logs">("traffic")
  const { stats, connected, history } = useWsTraffic()

  if (!isAdmin) {
    return (
      <div style={{
        minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 24px", textAlign: "center", fontFamily: "var(--font)",
      }}>
        <div style={{
          width: "64px", height: "64px", borderRadius: "50%", background: "rgba(240,86,75,0.12)",
          color: "#f0564b", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px",
          border: "1px solid rgba(240,86,75,0.25)",
        }}>
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div style={{ fontSize: "22px", fontWeight: 900, color: "var(--text)", marginBottom: "8px" }}>
          Akses Ditolak - Role-Based Access Control (RBAC)
        </div>
        <div style={{ fontSize: "14px", color: "var(--text-dim)", maxWidth: "460px", lineHeight: 1.5, marginBottom: "24px" }}>
          Halaman dan fitur <strong>Admin Portal</strong> dilindungi secara ketat oleh sistem RBAC. Akun Anda (<strong>{user?.username || "USER"}</strong>) tidak memiliki hak akses <code>ADMIN</code>.
        </div>
        <a href="/markets" style={{
          padding: "10px 20px", borderRadius: "var(--radius-sm)", background: "var(--blue)", color: "#fff",
          fontSize: "13.5px", fontWeight: 700, textDecoration: "none", display: "inline-block",
        }}>Kembali ke Halaman Utama</a>
      </div>
    )
  }

  return (
    <div style={{ padding: "20px 24px", width: "100%", boxSizing: "border-box", fontFamily: "var(--font)" }}>
      <style>{`
        @keyframes spinRotate { to { transform: rotate(360deg); } }
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ad-animate { animation: tabFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .ad-tab{cursor:pointer;padding:10px 18px;font-size:13.5px;font-weight:700;border-radius:var(--radius-sm) var(--radius-sm) 0 0;border:none;background:transparent;color:var(--text-dim);transition:.15s;border-bottom:2px solid transparent;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}
        .ad-tab.active{color:var(--blue);border-bottom-color:var(--blue);background:rgba(79,125,255,0.06)}
        .ad-tab:hover:not(.active){color:var(--text)}
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "-0.01em" }}>Admin Portal</div>
          <div style={{ fontSize: "13px", color: "var(--text-dim)", marginTop: "3px" }}>
            Logged in as <strong style={{ color: "var(--blue)" }}>{user?.username}</strong>
          </div>
        </div>
        <div style={{
          padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 700,
          background: "rgba(79,125,255,0.12)", color: "var(--blue)", border: "1px solid rgba(79,125,255,0.2)",
          display: "flex", alignItems: "center", gap: "6px",
        }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          ADMIN
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        borderBottom: "1px solid var(--border)",
        marginBottom: "24px",
        gap: "4px",
        paddingBottom: "2px",
      }}>
        <button className={`ad-tab${tab === "traffic" ? " active" : ""}`} onClick={() => setTab("traffic")}>
          <ActivityIcon /> Monitor Trafik
        </button>
        <button className={`ad-tab${tab === "users" ? " active" : ""}`} onClick={() => setTab("users")}>
          <UsersIcon /> Manajemen Akun
        </button>
        <button className={`ad-tab${tab === "logs" ? " active" : ""}`} onClick={() => setTab("logs")}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Log Aktivitas
        </button>
      </div>

      <div className="ad-animate">
        {tab === "traffic" && <TrafficTab stats={stats} connected={connected} history={history} />}
        {tab === "users" && <UsersTab />}
        {tab === "logs" && <ActivityLogsTab />}
      </div>
    </div>
  )
}
