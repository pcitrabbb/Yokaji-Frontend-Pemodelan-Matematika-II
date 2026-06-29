'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface User {
  nama: string;
  email: string;
  jenis_kelamin: string;
  no_hp: string;
  role: string;
}

interface Penilaian {
  id: number;
  santri_nama: string;
  setoran: string;
  nilai: number;
  status: string;
  tanggal: string;
}

interface Santri {
  id: number;
  nama: string;
  juz_aktif: string;
  progres: number;
}

interface Stats {
  total_penilaian: number;
  rata_rata_nilai: number;
  santri_aktif: number;
  progres_bulan: number;
  selesai: number;
  proses: number;
  belum: number;
  total_bulan: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'sangat bagus': return { bg: '#D1FAE5', color: '#065F46' };
    case 'bagus':        return { bg: '#DBEAFE', color: '#1E40AF' };
    case 'baik':         return { bg: '#E0F2FE', color: '#0369A1' };
    case 'cukup':        return { bg: '#FEF3C7', color: '#92400E' };
    case 'kurang':       return { bg: '#FEE2E2', color: '#991B1B' };
    default:             return { bg: '#F3F4F6', color: '#374151' };
  }
}

function getProgresColor(p: number) {
  if (p >= 80) return '#2D6A4F';
  if (p >= 60) return '#F59E0B';
  return '#EF4444';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Nav ─────────────────────────────────────────────────────────────────────
const NAV = [
  { href: '/dashboard',          label: 'Dashboard' },
  { href: '/penilaian-santri',   label: 'Penilaian Santri' },
  { href: '/cari-santri',        label: 'Cari Santri' },
  { href: '/data-santri',        label: 'Data Santri' },
  { href: '/history-penilaian',  label: 'History Penilaian' },
  { href: '/profil',             label: 'Profil' },
  { href: '/pengaturan',         label: 'Pengaturan' },
];

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ pct, selesai, proses, belum, total }: {
  pct: number; selesai: number; proses: number; belum: number; total: number;
}) {
  const r = 52, circ = 2 * Math.PI * r, gap = 3;
  const s = (selesai / total) * (circ - gap * 3);
  const p = (proses  / total) * (circ - gap * 3);
  const b = (belum   / total) * (circ - gap * 3);
  return (
    <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14"/>
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="14"
          strokeDasharray={`${b} ${circ}`} strokeDashoffset={-(s + p + gap * 2)}
          strokeLinecap="round" transform="rotate(-90 65 65)"/>
        <circle cx="65" cy="65" r={r} fill="none" stroke="#F59E0B" strokeWidth="14"
          strokeDasharray={`${p} ${circ}`} strokeDashoffset={-(s + gap)}
          strokeLinecap="round" transform="rotate(-90 65 65)"/>
        <circle cx="65" cy="65" r={r} fill="none" stroke="#52B788" strokeWidth="14"
          strokeDasharray={`${s} ${circ}`} strokeDashoffset={0}
          strokeLinecap="round" transform="rotate(-90 65 65)"/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.5rem', lineHeight: 1 }}>{pct}%</div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '.65rem', marginTop: 2 }}>{selesai} / {total}</div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPenyimak() {
  const [user, setUser]                         = useState<User | null>(null);
  const [stats, setStats]                       = useState<Stats | null>(null);
  const [penilaianTerbaru, setPenilaianTerbaru] = useState<Penilaian[]>([]);
  const [santriAktif, setSantriAktif]           = useState<Santri[]>([]);
  const [catatan, setCatatan]                   = useState('');
  const [loading, setLoading]                   = useState(true);
  const [sidebarOpen, setSidebarOpen]           = useState(false);
  const [form, setForm] = useState({ santri_id: '', setoran: '', nilai: '', status: '', catatan: '' });
  const [saveStatus, setSaveStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');

  useEffect(() => {
    (async () => {
      try {
        const [meRes, statsRes, pRes, sRes, cRes] = await Promise.all([
          api.get('/me'),
          api.get('/penyimak/dashboard/stats'),
          api.get('/penyimak/penilaian?limit=5'),
          api.get('/penyimak/santri-aktif?limit=4'),
          api.get('/penyimak/catatan-hari-ini'),
        ]);
        setUser(meRes.data);
        setStats(statsRes.data);
        setPenilaianTerbaru(pRes.data.data ?? pRes.data);
        setSantriAktif(sRes.data.data ?? sRes.data);
        setCatatan(cRes.data.isi ?? '');
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSimpan = async () => {
    setSaveStatus('loading');
    try {
      await api.post('/penyimak/penilaian', form);
      setForm({ santri_id: '', setoran: '', nilai: '', status: '', catatan: '' });
      const [pRes, sRes] = await Promise.all([
        api.get('/penyimak/penilaian?limit=5'),
        api.get('/penyimak/dashboard/stats'),
      ]);
      setPenilaianTerbaru(pRes.data.data ?? pRes.data);
      setStats(sRes.data);
      setSaveStatus('success');
    } catch {
      setSaveStatus('error');
    } finally {
      setTimeout(() => setSaveStatus('idle'), 2500);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const gelar = user?.jenis_kelamin === 'Ikhwan' ? 'Ust.' : 'Usth.';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif", background: '#F4F5F0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.12);border-radius:99px}
        .sidebar{width:220px;min-height:100vh;background:#1B4332;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:50;overflow-y:auto;transition:transform .25s ease}
        @media(max-width:900px){.sidebar{transform:translateX(-100%)}.sidebar.open{transform:translateX(0)}.main-wrap{margin-left:0!important}.hamburger{display:flex!important}}
        .nav-item{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:9px;cursor:pointer;text-decoration:none;color:rgba(255,255,255,0.55);font-size:.83rem;font-weight:500;transition:background .15s,color .15s;margin:1px 0}
        .nav-item:hover{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.85)}
        .nav-item.active{background:#2D6A4F;color:#fff}
        .stat-card{background:#fff;border-radius:14px;padding:1.25rem 1rem;display:flex;flex-direction:column;align-items:center;gap:6px;border:1px solid rgba(0,0,0,0.04);box-shadow:0 1px 4px rgba(0,0,0,0.04)}
        table{width:100%;border-collapse:collapse}
        thead th{text-align:left;font-size:.72rem;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:.04em;padding:.6rem 0;border-bottom:1px solid #E5E7EB}
        tbody tr{border-bottom:1px solid #F3F4F6}tbody tr:last-child{border-bottom:none}
        tbody td{padding:.75rem 0;font-size:.83rem;color:#374151;vertical-align:middle}
        .dash-input{width:100%;padding:.55rem .8rem;border:1px solid #E5E7EB;border-radius:9px;font-size:.83rem;color:#1F2937;background:#FAFAFA;outline:none;transition:border .15s}
        .dash-input:focus{border-color:#2D6A4F;background:#fff}
        .btn-primary{display:inline-flex;align-items:center;gap:7px;background:#1B4332;color:#fff;border:none;border-radius:10px;padding:.7rem 1.25rem;font-size:.85rem;font-weight:600;cursor:pointer;transition:background .15s}
        .btn-primary:hover{background:#2D6A4F}.btn-primary:disabled{opacity:.6;cursor:not-allowed}
        .btn-outline{display:inline-flex;align-items:center;gap:7px;background:transparent;color:#1B4332;border:1.5px solid #1B4332;border-radius:10px;padding:.65rem 1.1rem;font-size:.83rem;font-weight:600;cursor:pointer;transition:background .15s;text-decoration:none}
        .btn-outline:hover{background:#F0FDF4}
        .progress-track{height:6px;background:#E5E7EB;border-radius:99px;overflow:hidden;flex:1}
        .progress-fill{height:100%;border-radius:99px;transition:width .4s ease}
        .overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:40}
        @media(max-width:900px){.overlay.open{display:block}}
        .hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px}
        .card{background:#fff;border-radius:16px;padding:1.4rem;border:1px solid rgba(0,0,0,0.04);box-shadow:0 1px 4px rgba(0,0,0,0.04)}
      `}</style>

      {/* Overlay mobile */}
      <div className={`overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 260, height: 260, border: '1.5px solid rgba(201,168,76,0.15)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 160, height: 160, border: '1.5px solid rgba(201,168,76,0.1)', borderRadius: '50%', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ padding: '1.6rem 1.25rem 1rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 38 38" fill="none">
                <path d="M19 4C12 10 8 15 8 22C8 28 13 33 19 34C25 33 30 28 30 22C30 15 26 10 19 4Z" fill="#40916C"/>
                <path d="M14 21Q19 14 24 21" stroke="#C9A84C" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                <line x1="19" y1="19" x2="19" y2="30" stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '.88rem', letterSpacing: '.02em' }}>UKM TAFISUL QURAN</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.62rem' }}>UNIVERSITAS AIRLANGGA</div>
            </div>
          </div>
        </div>

        {/* Profile mini */}
        <div style={{ margin: '0 1.25rem 1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.07)', borderRadius: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#2D6A4F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '.85rem', flexShrink: 0 }}>
              {user ? getInitials(user.nama) : '?'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.nama ?? '—'}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '.68rem' }}>Penyimak Aktif</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 .75rem', position: 'relative', zIndex: 1 }}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-item ${item.href === '/dashboard' ? 'active' : ''}`}>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Quote */}
        <div style={{ margin: '1.5rem 1.25rem', borderLeft: '2.5px solid rgba(201,168,76,0.45)', paddingLeft: 12, position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '.68rem', lineHeight: 1.75, fontStyle: 'italic' }}>
            &ldquo;Sesungguhnya Al-Qur&apos;an ini memberi petunjuk kepada jalan yang lebih lurus.&rdquo;
          </p>
          <p style={{ color: 'rgba(201,168,76,0.65)', fontSize: '.65rem', fontWeight: 600, marginTop: 4 }}>QS. Al-Isra&apos;: 9</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-wrap" style={{ marginLeft: 220, flex: 1, minHeight: '100vh', overflow: 'auto' }}>

        {/* Topbar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(244,245,240,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '.85rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Notif */}
            <button style={{ position: 'relative', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: '#EF4444', borderRadius: '50%', border: '1.5px solid #F4F5F0' }} />
            </button>
            {/* Chat */}
            <button style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </button>
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '5px 10px 5px 6px', cursor: 'pointer' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '.72rem' }}>
                {user ? getInitials(user.nama) : '?'}
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: '.78rem', fontWeight: 600, color: '#1F2937', maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.nama ?? '—'}</div>
                <div style={{ fontSize: '.65rem', color: '#9CA3AF' }}>Penyimak</div>
              </div>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.75rem 1.75rem 3rem' }}>

          {/* Welcome */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', color: '#1B4332', fontWeight: 700, marginBottom: '.3rem' }}>
              {greeting}, {gelar} {user?.nama ?? '...'} 👋
            </h1>
            <p style={{ color: '#9CA3AF', fontSize: '.85rem' }}>
              Semangat menyimak dan membimbing, semoga setiap ayat yang dibaca menjadi cahaya di dunia dan akhirat.
            </p>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', marginBottom: '1.25rem' }}>

            {/* Stats card */}
            <div className="card">
              <h2 style={{ fontWeight: 700, fontSize: '.95rem', color: '#1F2937', marginBottom: '1.2rem' }}>Ringkasan Penilaian Saya</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem' }}>
                {[
                  { icon: '📖', value: stats?.total_penilaian ?? '—', label: 'Total Penilaian' },
                  { icon: '⭐', value: stats?.rata_rata_nilai ?? '—', label: 'Rata-rata Nilai' },
                  { icon: '✅', value: stats?.santri_aktif ?? '—', label: 'Santri Aktif' },
                  { icon: '📈', value: stats ? `${stats.progres_bulan}%` : '—', label: 'Progres Bulan Ini' },
                ].map((s) => (
                  <div key={s.label} className="stat-card">
                    <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.5rem', color: '#1B4332' }}>{s.value}</div>
                    <div style={{ fontSize: '.72rem', color: '#9CA3AF', textAlign: 'center' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Donut card */}
            <div style={{ background: '#1B4332', borderRadius: 16, padding: '1.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h2 style={{ fontWeight: 700, fontSize: '.9rem', color: '#fff' }}>Progres Penilaian Bulan Ini</h2>
                <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: '.72rem', cursor: 'pointer' }}>Lihat Detail</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
                {stats ? (
                  <DonutChart pct={stats.progres_bulan} selesai={stats.selesai} proses={stats.proses} belum={stats.belum} total={stats.total_bulan} />
                ) : (
                  <div style={{ width: 130, height: 130, borderRadius: '50%', border: '14px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.75rem' }}>...</span>
                  </div>
                )}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { dot: '#52B788', label: 'Selesai', val: stats?.selesai ?? 0 },
                    { dot: '#F59E0B', label: 'Proses',  val: stats?.proses  ?? 0 },
                    { dot: 'rgba(255,255,255,0.35)', label: 'Belum', val: stats?.belum ?? 0 },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.78rem' }}>{item.label}</span>
                      </div>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '.82rem' }}>{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Input Nilai */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '.95rem', color: '#1F2937' }}>Masukkan Nilai &amp; Catatan</h2>
                <p style={{ fontSize: '.78rem', color: '#9CA3AF', marginTop: 2 }}>Cari santri dan berikan penilaian</p>
              </div>
              <button className="btn-outline">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
                Pindai QR Santri
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.2fr 1.5fr 2fr', gap: '.75rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: '#6B7280', marginBottom: '.3rem' }}>Santri</label>
                <select className="dash-input" value={form.santri_id} onChange={e => setForm({ ...form, santri_id: e.target.value })}>
                  <option value="">Pilih atau cari santri</option>
                  {santriAktif.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: '#6B7280', marginBottom: '.3rem' }}>Setoran</label>
                <input className="dash-input" placeholder="Contoh: Juz 5 Hal. 87-93" value={form.setoran} onChange={e => setForm({ ...form, setoran: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: '#6B7280', marginBottom: '.3rem' }}>Nilai</label>
                <input className="dash-input" type="number" min="0" max="100" placeholder="0-100" value={form.nilai} onChange={e => setForm({ ...form, nilai: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: '#6B7280', marginBottom: '.3rem' }}>Status</label>
                <select className="dash-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="">Pilih status</option>
                  <option>Sangat Bagus</option><option>Bagus</option><option>Baik</option><option>Cukup</option><option>Kurang</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: '#6B7280', marginBottom: '.3rem' }}>Catatan</label>
                <input className="dash-input" placeholder="Catatan untuk santri (opsional)" value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: '1rem' }}>
              {saveStatus === 'success' && <span style={{ color: '#065F46', fontSize: '.8rem', fontWeight: 500 }}>✓ Nilai berhasil disimpan</span>}
              {saveStatus === 'error'   && <span style={{ color: '#991B1B', fontSize: '.8rem', fontWeight: 500 }}>✗ Gagal menyimpan, coba lagi</span>}
              <button className="btn-primary" disabled={saveStatus === 'loading'} onClick={handleSimpan}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                </svg>
                {saveStatus === 'loading' ? 'Menyimpan...' : 'Simpan Nilai'}
              </button>
            </div>
          </div>

          {/* Bottom grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem' }}>

            {/* Penilaian Terbaru */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontWeight: 700, fontSize: '.95rem', color: '#1F2937' }}>Penilaian Terbaru</h2>
                <Link href="/history-penilaian" style={{ color: '#2D6A4F', fontSize: '.78rem', fontWeight: 600, textDecoration: 'none' }}>Lihat Semua</Link>
              </div>
              {loading ? (
                <p style={{ color: '#9CA3AF', fontSize: '.83rem', textAlign: 'center', padding: '2rem 0' }}>Memuat data...</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Santri</th><th>Setoran</th><th>Nilai</th><th>Status</th><th>Tanggal</th><th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {penilaianTerbaru.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF', padding: '2rem 0' }}>Belum ada penilaian</td></tr>
                    ) : penilaianTerbaru.map((p) => {
                      const sc = getStatusColor(p.status);
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 700, color: '#6B7280', flexShrink: 0 }}>
                                {getInitials(p.santri_nama)}
                              </div>
                              <span style={{ fontWeight: 500 }}>{p.santri_nama}</span>
                            </div>
                          </td>
                          <td style={{ color: '#6B7280' }}>{p.setoran}</td>
                          <td style={{ fontWeight: 700, color: '#1B4332' }}>{p.nilai}</td>
                          <td>
                            <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 99, fontSize: '.72rem', fontWeight: 600 }}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ color: '#9CA3AF', whiteSpace: 'nowrap' }}>{formatDate(p.tanggal)}</td>
                          <td>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {penilaianTerbaru.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '1.1rem', paddingTop: '1rem', borderTop: '1px solid #F3F4F6' }}>
                  <Link href="/history-penilaian" style={{ color: '#2D6A4F', fontSize: '.8rem', fontWeight: 600, textDecoration: 'none' }}>
                    Lihat Semua Penilaian →
                  </Link>
                </div>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Santri Aktif */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontWeight: 700, fontSize: '.9rem', color: '#1F2937' }}>Santri Aktif Dibimbing</h2>
                  <Link href="/data-santri" style={{ color: '#2D6A4F', fontSize: '.75rem', fontWeight: 600, textDecoration: 'none' }}>Lihat Semua</Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {loading ? (
                    <p style={{ color: '#9CA3AF', fontSize: '.8rem', textAlign: 'center' }}>Memuat...</p>
                  ) : santriAktif.length === 0 ? (
                    <p style={{ color: '#9CA3AF', fontSize: '.8rem', textAlign: 'center' }}>Belum ada santri aktif</p>
                  ) : santriAktif.map((s) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 700, color: '#6B7280', flexShrink: 0 }}>
                        {getInitials(s.nama)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '.8rem', fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nama}</span>
                          <span style={{ fontSize: '.75rem', color: '#6B7280', flexShrink: 0, marginLeft: 6 }}>{s.juz_aktif}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${s.progres}%`, background: getProgresColor(s.progres) }} />
                          </div>
                          <span style={{ fontSize: '.72rem', fontWeight: 600, color: getProgresColor(s.progres), flexShrink: 0 }}>{s.progres}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catatan Hari Ini */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontWeight: 700, fontSize: '.9rem', color: '#1F2937' }}>Catatan Hari Ini</h2>
                  <button style={{ background: 'none', border: 'none', color: '#2D6A4F', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer' }}>Tambah Catatan</button>
                </div>
                <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '1rem', minHeight: 80 }}>
                  <p style={{ fontSize: '.82rem', color: '#374151', lineHeight: 1.7 }}>
                    {catatan || 'Belum ada catatan hari ini.'}
                  </p>
                  {catatan && (
                    <p style={{ fontSize: '.7rem', color: '#9CA3AF', marginTop: 8, textAlign: 'right' }}>
                      {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}