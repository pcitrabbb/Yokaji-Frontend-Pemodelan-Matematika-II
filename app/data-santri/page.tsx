'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface SantriDetail {
  id: number;
  nama: string;
  juz_aktif: string;
  progres: number;
  no_hp?: string;
  email?: string;
  jenis_kelamin?: string;
  tanggal_masuk?: string;
}

interface RiwayatSetoran {
  id: number;
  setoran: string;
  nilai: number;
  status: string;
  tanggal: string;
  catatan?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
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
function getProgresColor(p: number) { return p >= 80 ? '#2D6A4F' : p >= 60 ? '#F59E0B' : '#EF4444'; }
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Shared Sidebar style ────────────────────────────────────────────────────
const SHARED_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.12);border-radius:99px}
  .sidebar{width:220px;min-height:100vh;background:#1B4332;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:50;overflow-y:auto}
  .nav-item{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:9px;cursor:pointer;text-decoration:none;color:rgba(255,255,255,0.55);font-size:.83rem;font-weight:500;transition:background .15s,color .15s;margin:1px 0;width:100%;background:none;border:none;text-align:left}
  .nav-item:hover{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.85)}
  .nav-item.active{background:#2D6A4F;color:#fff}
  .card{background:#fff;border-radius:16px;padding:1.4rem;border:1px solid rgba(0,0,0,0.04);box-shadow:0 1px 4px rgba(0,0,0,0.04)}
  .progress-track{height:6px;background:#E5E7EB;border-radius:99px;overflow:hidden;flex:1}
  .progress-fill{height:100%;border-radius:99px;transition:width .4s ease}
  .icon-btn{background:none;border:none;cursor:pointer;padding:5px;border-radius:7px;display:flex;align-items:center;justify-content:center;transition:background .15s}
  .icon-btn:hover{background:#F3F4F6}
  .search-input{width:100%;padding:.6rem 1rem .6rem 2.4rem;border:1.5px solid #E5E7EB;border-radius:10px;font-size:.85rem;color:#1F2937;background:#FAFAFA;outline:none;transition:border .15s}
  .search-input:focus{border-color:#2D6A4F;background:#fff}
  table{width:100%;border-collapse:collapse}
  thead th{text-align:left;font-size:.72rem;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:.04em;padding:.6rem 0;border-bottom:1px solid #E5E7EB}
  tbody tr{border-bottom:1px solid #F3F4F6}tbody tr:last-child{border-bottom:none}
  tbody td{padding:.75rem 0;font-size:.83rem;color:#374151;vertical-align:middle}
  @media(max-width:900px){.sidebar{display:none}.main-wrap{margin-left:0!important}}
`;

// ── FIX: href History Penilaian diubah ke path yang benar ────────────────────
const NAV_ITEMS = [
  { label: 'Dashboard',          href: '/penyimak/dashboard' },
  { label: 'Penilaian Santri',   href: '/penyimak/penilaian-santri' },
  { label: 'Data Santri',        href: '/data-santri' },
  { label: 'History Penilaian',  href: '/penyimak/dashboard' },
  { label: 'Profil',             href: '/penyimak/dashboard/profil' },
  { label: 'Pengaturan',         href: '/penyimak/dashboard#section-pengaturan' },
];

// ─── Sidebar Component ────────────────────────────────────────────────────────
function Sidebar({ active, onNav }: { active: string; onNav: (href: string) => void }) {
  return (
    <aside className="sidebar">
      <div style={{ padding: '1.6rem 1.25rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 38 38" fill="none">
              <path d="M19 4C12 10 8 15 8 22C8 28 13 33 19 34C25 33 30 28 30 22C30 15 26 10 19 4Z" fill="#40916C"/>
              <path d="M14 21Q19 14 24 21" stroke="#C9A84C" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
              <line x1="19" y1="19" x2="19" y2="30" stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '.88rem' }}>UKM TAHFIDZUL QUR'AN</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.62rem' }}>UNIVERSITAS AIRLANGGA</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '0 .75rem' }}>
        {NAV_ITEMS.map(item => (
          <button key={item.label} onClick={() => onNav(item.href)}
            className={`nav-item ${active === item.label ? 'active' : ''}`}>
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ margin: '1.5rem 1.25rem', borderLeft: '2.5px solid rgba(201,168,76,0.45)', paddingLeft: 12 }}>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '.68rem', lineHeight: 1.75, fontStyle: 'italic' }}>&ldquo;Sesungguhnya Al-Qur&apos;an ini memberi petunjuk kepada jalan yang lebih lurus.&rdquo;</p>
        <p style={{ color: 'rgba(201,168,76,0.65)', fontSize: '.65rem', fontWeight: 600, marginTop: 4 }}>QS. Al-Isra&apos;: 9</p>
      </div>
    </aside>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: LIST SEMUA SANTRI  →  /data-santri
// ══════════════════════════════════════════════════════════════════════════════
export function DataSantriListPage() {
  const router = useRouter();
  const [santriList, setSantriList] = useState<SantriDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/penyimak/santri-aktif')
      .then(r => setSantriList(r.data.data ?? r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = santriList.filter(s =>
    s.nama.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif", background: '#F4F5F0' }}>
      <style>{SHARED_STYLES}</style>
      <Sidebar active="Data Santri" onNav={href => router.push(href)} />

      <main className="main-wrap" style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }}>
        {/* Topbar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(244,245,240,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '.85rem 1.75rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/penyimak/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: '.83rem', fontWeight: 500 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Dashboard
          </button>
          <span style={{ color: '#D1D5DB' }}>/</span>
          <span style={{ fontWeight: 600, color: '#1B4332', fontSize: '.83rem' }}>Data Santri</span>
          <div style={{ flex: 1 }} />
          <button onClick={async () => { try { await api.post('/logout'); } catch {} router.push('/login'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', color: '#DC2626', fontWeight: 600, fontSize: '.8rem' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Keluar
          </button>
        </div>

        <div style={{ padding: '1.75rem' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '1.25rem', maxWidth: 380 }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="search-input" placeholder="Cari nama santri..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="card">
            {loading ? (
              <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '2rem 0', fontSize: '.85rem' }}>Memuat data santri...</p>
            ) : filtered.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '2rem 0', fontSize: '.85rem' }}>
                {search ? 'Santri tidak ditemukan' : 'Belum ada santri'}
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th style={{ textAlign: 'center', width: 100 }}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.68rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {getInitials(s.nama)}
                          </div>
                          <span style={{ fontWeight: 600, color: '#1F2937' }}>{s.nama}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            title="Lihat Detail"
                            onClick={() => router.push(`/data-santri/${s.id}`)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', color: '#2D6A4F', fontWeight: 600, fontSize: '.75rem' }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            Lihat
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: DETAIL SANTRI  →  /data-santri/[id]
// ══════════════════════════════════════════════════════════════════════════════
export function DataSantriDetailPage() {
  const router = useRouter();
  const params = useParams();
  const santriId = params?.id as string;

  const [santri, setSantri] = useState<SantriDetail | null>(null);
  const [riwayat, setRiwayat] = useState<RiwayatSetoran[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!santriId) return;
    Promise.allSettled([
      api.get(`/penyimak/santri/${santriId}`),
      api.get(`/penyimak/santri/${santriId}/riwayat-setoran`),
    ]).then(([sRes, rRes]) => {
      if (sRes.status === 'fulfilled') setSantri(sRes.value.data.data ?? sRes.value.data);
      if (rRes.status === 'fulfilled') setRiwayat(rRes.value.data.data ?? rRes.value.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [santriId]);

  const filteredRiwayat = riwayat.filter(r =>
    r.setoran.toLowerCase().includes(search.toLowerCase()) ||
    r.status.toLowerCase().includes(search.toLowerCase())
  );

  const rataRata = riwayat.length
    ? Math.round(riwayat.reduce((sum, r) => sum + r.nilai, 0) / riwayat.length)
    : null;

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(27, 67, 50);
    doc.rect(0, 0, pageWidth, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text("UKM TAHFIDZUL QUR'AN", 14, 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Universitas Airlangga', 14, 21);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Riwayat Setoran Santri', 14, 30);

    // Info santri
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(santri?.nama ?? '', 14, 48);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    const infoY = 55;
    if (santri?.email)         doc.text('Email: ' + santri.email, 14, infoY);
    if (santri?.no_hp)         doc.text('No. HP: ' + santri.no_hp, 14, infoY + 6);
    if (santri?.tanggal_masuk) doc.text('Bergabung: ' + formatDate(santri.tanggal_masuk), 14, infoY + 12);

    // Stat boxes
    const statY = 74;
    const statItems = [
      { label: 'Total Setoran', value: String(riwayat.length) },
      { label: 'Rata-rata Nilai', value: rataRata !== null ? String(rataRata) : '-' },
      { label: 'Setoran Terakhir', value: riwayat.length > 0 ? formatDate(riwayat[0].tanggal) : '-' },
    ];
    const boxW = (pageWidth - 28) / 3;
    statItems.forEach((s, i) => {
      const x = 14 + i * boxW;
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(x, statY, boxW - 4, 18, 3, 3, 'F');
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(s.label, x + 4, statY + 6);
      doc.setTextColor(27, 67, 50);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(s.value, x + 4, statY + 14);
    });

    // Divider
    doc.setDrawColor(229, 231, 235);
    doc.line(14, statY + 24, pageWidth - 14, statY + 24);

    // Table title
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Riwayat Setoran', 14, statY + 33);

    const tableData = filteredRiwayat.map((r, i) => [
      String(i + 1),
      r.setoran,
      String(r.nilai),
      r.status,
      formatDate(r.tanggal),
      r.catatan || '-',
    ]);

    autoTable(doc, {
      startY: statY + 37,
      head: [['#', 'Setoran', 'Nilai', 'Status', 'Tanggal', 'Catatan']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', textColor: [55, 65, 81] },
      headStyles: { fillColor: [27, 67, 50], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'center', cellWidth: 16 },
        3: { halign: 'center', cellWidth: 28 },
        4: { cellWidth: 34 },
      },
      margin: { left: 14, right: 14 },
    });

    // Footer per page
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.setFont('helvetica', 'normal');
      doc.text('Dicetak: ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), 14, doc.internal.pageSize.getHeight() - 8);
      doc.text('Halaman ' + i + ' dari ' + pageCount, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }

    doc.save('Riwayat_Setoran_' + (santri?.nama ?? 'santri').replace(/\s+/g, '_') + '.pdf');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif", background: '#F4F5F0' }}>
      <style>{SHARED_STYLES}</style>
      <Sidebar active="Data Santri" onNav={href => router.push(href)} />

      <main className="main-wrap" style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }}>
        {/* Topbar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(244,245,240,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '.85rem 1.75rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/data-santri')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: '.83rem', fontWeight: 500 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Data Santri
          </button>
          <span style={{ color: '#D1D5DB' }}>/</span>
          <span style={{ fontWeight: 600, color: '#1B4332', fontSize: '.83rem' }}>{santri?.nama ?? '...'}</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleExportPDF}
            disabled={loading || !santri}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1B4332', border: 'none', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: '.8rem', opacity: loading || !santri ? 0.5 : 1 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export PDF
          </button>
          <button onClick={async () => { try { await api.post('/logout'); } catch {} router.push('/login'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', color: '#DC2626', fontWeight: 600, fontSize: '.8rem' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Keluar
          </button>
        </div>

        <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '3rem 0', fontSize: '.85rem' }}>Memuat data...</p>
          ) : !santri ? (
            <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '3rem 0', fontSize: '.85rem' }}>Santri tidak ditemukan.</p>
          ) : (
            <>
              {/* Profil santri */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
                    {getInitials(santri.nama)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1F2937', marginBottom: 4 }}>{santri.nama}</h2>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      {santri.no_hp && <span style={{ fontSize: '.8rem', color: '#6B7280' }}>📱 {santri.no_hp}</span>}
                      {santri.email && <span style={{ fontSize: '.8rem', color: '#6B7280' }}>✉️ {santri.email}</span>}
                      {santri.tanggal_masuk && <span style={{ fontSize: '.8rem', color: '#6B7280' }}>📅 Bergabung {formatDate(santri.tanggal_masuk)}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat ringkas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {[
                  { icon: '📋', value: riwayat.length, label: 'Total Setoran' },
                  { icon: '⭐', value: rataRata !== null ? rataRata : '—', label: 'Rata-rata Nilai' },
                  { icon: '📅', value: riwayat.length > 0 ? formatDate(riwayat[0].tanggal) : '—', label: 'Setoran Terakhir' },
                ].map(s => (
                  <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1B4332' }}>{s.value}</div>
                    <div style={{ fontSize: '.72rem', color: '#9CA3AF', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Riwayat setoran */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontWeight: 700, fontSize: '.95rem', color: '#1F2937' }}>Riwayat Setoran</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={handleExportPDF}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1B4332', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: '.75rem' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Export PDF
                    </button>
                  <div style={{ position: 'relative' }}>
                    <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                      style={{ paddingLeft: '1.8rem', paddingRight: '.75rem', paddingTop: '.45rem', paddingBottom: '.45rem', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: '.78rem', outline: 'none', width: 200, background: '#FAFAFA' }}
                      placeholder="Cari setoran..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  </div>
                </div>

                {filteredRiwayat.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '2rem 0', fontSize: '.83rem' }}>
                    {search ? 'Tidak ada hasil' : 'Belum ada riwayat setoran'}
                  </p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Setoran</th>
                        <th>Nilai</th>
                        <th>Status</th>
                        <th>Tanggal</th>
                        <th>Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRiwayat.map(r => {
                        const sc = getStatusColor(r.status);
                        return (
                          <tr key={r.id}>
                            <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.setoran}</td>
                            <td style={{ fontWeight: 700, color: '#1B4332' }}>{r.nilai}</td>
                            <td>
                              <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 99, fontSize: '.72rem', fontWeight: 600 }}>
                                {r.status}
                              </span>
                            </td>
                            <td style={{ color: '#9CA3AF', whiteSpace: 'nowrap', fontSize: '.8rem' }}>{formatDate(r.tanggal)}</td>
                            <td style={{ color: '#6B7280', fontSize: '.8rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.catatan || <span style={{ color: '#D1D5DB' }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Default export sesuai kebutuhan routing Next.js
// Untuk /data-santri → pakai DataSantriListPage
// Untuk /data-santri/[id] → pakai DataSantriDetailPage
export default DataSantriListPage;