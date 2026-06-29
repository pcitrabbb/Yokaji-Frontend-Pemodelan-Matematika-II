'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

type Tab = 'santri' | 'penyimak' | 'jadwal' | 'galeri';

// ── Panduan untuk santri dashboard ──
// Copy fungsi isJadwalSelesai ke file dashboard santri, lalu filter:
// const jadwalTersedia = jadwalList.filter(j => !isJadwalSelesai(j));
// Tampilkan hanya jadwalTersedia di pilihan booking santri.
const BULAN_SINGKAT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
function fmtTanggal(tgl: string): string {
  if (!tgl) return '—';
  const s = tgl.split('T')[0]; // ambil bagian tanggal saja, buang jam
  const parts = s.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    return `${d} ${BULAN_SINGKAT[m - 1]} ${y}`;
  }
  return tgl;
}

// Cek apakah sesi sudah selesai (lewat waktu_selesai / waktu_mulai + 1 menit)
function isJadwalSelesai(j: any): boolean {
  if (!j.tanggal) return false;
  const tglStr = j.tanggal.split('T')[0];
  const waktu  = j.waktu_selesai || j.waktu_mulai;
  if (!waktu) return false;
  const [jam, menit] = waktu.split(':').map(Number);
  const selesai = new Date(`${tglStr}T${String(jam).padStart(2,'0')}:${String((menit || 0) + (j.waktu_selesai ? 0 : 1)).padStart(2,'0')}:00`);
  return Date.now() > selesai.getTime();
}

// Apakah jadwal sudah lewat lebih dari 1 hari penuh
function isJadwalKadaluarsa(j: any): boolean {
  if (!j.tanggal) return false;
  const tglStr = j.tanggal.split('T')[0];
  const waktu  = j.waktu_selesai || j.waktu_mulai;
  if (!waktu) return false;
  const [jam, menit] = waktu.split(':').map(Number);
  const selesai = new Date(`${tglStr}T${String(jam).padStart(2,'0')}:${String(menit || 0).padStart(2,'0')}:00`);
  return Date.now() > selesai.getTime() + 24 * 60 * 60 * 1000;
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('santri');
  const [pesan, setPesan] = useState('');
  const [pesanType, setPesanType] = useState<'ok' | 'err'>('ok');

  const [santriList, setSantriList] = useState<any[]>([]);
  const [loadingSantri, setLoadingSantri] = useState(false);
  const [detailSantri, setDetailSantri] = useState<any>(null);

  const [penyimakList, setPenyimakList] = useState<any[]>([]);
  const [loadingPenyimak, setLoadingPenyimak] = useState(false);
  const [detailPenyimak, setDetailPenyimak] = useState<any>(null);

  const [jadwalList, setJadwalList] = useState<any[]>([]);
  const [loadingJadwal, setLoadingJadwal] = useState(false);
  const [formJadwal, setFormJadwal] = useState({
    judul: '', tanggal: '', waktu_mulai: '', waktu_selesai: '',
    tempat: '', tag: '', kuota: '15', kampus: '', penyimak_id: '',
    jenis_kelamin: 'Semua',
  });
  const [showFormJadwal, setShowFormJadwal] = useState(false);
  const [savingJadwal, setSavingJadwal] = useState(false);
  const [editJadwal, setEditJadwal] = useState<any>(null);

  const [pesertaModal, setPesertaModal] = useState<any>(null);
  const [pesertaList, setPesertaList] = useState<any[]>([]);
  const [loadingPeserta, setLoadingPeserta] = useState(false);

  const [galeriList, setGaleriList] = useState<any[]>([]);
  const [loadingGaleri, setLoadingGaleri] = useState(false);
  const [formGaleri, setFormGaleri] = useState({ judul: '', keterangan: '', kategori: '' });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [showFormGaleri, setShowFormGaleri] = useState(false);
  const [savingGaleri, setSavingGaleri] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const ADMIN_PASSWORD = 'semangatpm2yah';
  const KAMPUS_LIST = ['Kampus A', 'Kampus B', 'Kampus C'];

  useEffect(() => {
    if (sessionStorage.getItem('admin_unlocked') === 'true') {
      setUnlocked(true);
      fetchAll();
    }
  }, []);

  const fetchAll = () => { fetchSantri(); fetchPenyimak(); fetchJadwal(); fetchGaleri(); };

  // Auto-hapus jadwal yang sudah lewat > 1 hari dari server
  const autoHapusKadaluarsa = async (list: any[]) => {
    const kadaluarsa = list.filter(isJadwalKadaluarsa);
    for (const j of kadaluarsa) {
      try { await api.delete(`/admin/jadwal/${j.id}`); } catch { /* abaikan error individual */ }
    }
    if (kadaluarsa.length > 0) fetchJadwal();
  };

  const showPesan = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setPesan(msg); setPesanType(type);
    setTimeout(() => setPesan(''), 4000);
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_unlocked', 'true');
      setUnlocked(true); fetchAll();
    } else { setPasswordError('Password salah. Coba lagi.'); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_unlocked');
    setUnlocked(false);
    setSantriList([]); setPenyimakList([]); setJadwalList([]); setGaleriList([]);
  };

  // ── Santri ──
  const fetchSantri = async () => {
    setLoadingSantri(true);
    try {
      const res = await api.get('/admin/santri');
      setSantriList(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      showPesan(`Gagal memuat data santri: ${err?.response?.data?.message || err?.message || 'Error'}`, 'err');
    }
    setLoadingSantri(false);
  };
  const handleApproveSantri = async (id: any) => {
    try {
      await api.put(`/admin/santri/${id}/approve`);
      showPesan('Santri berhasil disetujui!');
      setDetailSantri(null); fetchSantri();
    } catch (err: any) {
      showPesan(`Gagal approve: ${err?.response?.data?.message || err?.message || 'Error'}`, 'err');
    }
  };
  const handleHapusSantri = async (id: any) => {
    if (!confirm('Yakin ingin menghapus santri ini?')) return;
    try {
      await api.delete(`/admin/santri/${id}`);
      showPesan('Santri dihapus.');
      setDetailSantri(null); fetchSantri();
    } catch (err: any) {
      showPesan(`Gagal hapus: ${err?.response?.data?.message || err?.message || 'Error'}`, 'err');
    }
  };

  // ── Penyimak ──
  const fetchPenyimak = async () => {
    setLoadingPenyimak(true);
    try {
      const res = await api.get('/admin/penyimak');
      setPenyimakList(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      showPesan(`Gagal memuat data penyimak: ${err?.response?.data?.message || err?.message || 'Error'}`, 'err');
    }
    setLoadingPenyimak(false);
  };
  const handleApprovePenyimak = async (id: any) => {
    try {
      await api.put(`/admin/penyimak/${id}/approve`);
      showPesan('Penyimak berhasil disetujui!');
      setDetailPenyimak(null); fetchPenyimak();
    } catch (err: any) {
      showPesan(`Gagal approve: ${err?.response?.data?.message || err?.message || 'Error'}`, 'err');
    }
  };
  const handleHapusPenyimak = async (id: any) => {
    if (!confirm('Yakin ingin menghapus penyimak ini?')) return;
    try {
      await api.delete(`/admin/penyimak/${id}`);
      showPesan('Penyimak dihapus.');
      setDetailPenyimak(null); fetchPenyimak();
    } catch (err: any) {
      showPesan(`Gagal hapus: ${err?.response?.data?.message || err?.message || 'Error'}`, 'err');
    }
  };

  // ── Jadwal ──
  // FIX: fetchJadwal tidak perlu tunggu penyimak karena backend sudah return penyimak_nama
  // langsung di response. fetchPenyimak tetap dijalankan paralel untuk form dropdown.
  const fetchJadwal = async () => {
    setLoadingJadwal(true);
    try {
      const res = await api.get('/admin/jadwal');
      const list = Array.isArray(res.data) ? res.data : [];
      setJadwalList(list);
      // Langsung cek & hapus yang sudah > 1 hari setelah data masuk
      setTimeout(() => autoHapusKadaluarsa(list), 0);
    } catch (err: any) {
      showPesan(`Gagal memuat jadwal: ${err?.response?.data?.message || err?.message || 'Error'}`, 'err');
    }
    setLoadingJadwal(false);
  };
  const handleSimpanJadwal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJadwal.tanggal)     { showPesan('Tanggal wajib diisi.', 'err'); return; }
    if (!formJadwal.waktu_mulai) { showPesan('Waktu mulai wajib diisi.', 'err'); return; }
    if (!formJadwal.kampus)      { showPesan('Pilih kampus terlebih dahulu.', 'err'); return; }
    if (!formJadwal.penyimak_id) { showPesan('Pilih penyimak terlebih dahulu.', 'err'); return; }
    setSavingJadwal(true);
    try {
      const payload = { ...formJadwal, kuota: Number(formJadwal.kuota) || 15, penyimak_id: Number(formJadwal.penyimak_id) };
      if (editJadwal) {
        await api.put(`/admin/jadwal/${editJadwal.id}`, payload);
        showPesan('Jadwal berhasil diperbarui!');
      } else {
        await api.post('/admin/jadwal', payload);
        showPesan('Jadwal berhasil ditambahkan!');
      }
      setFormJadwal({ judul: '', tanggal: '', waktu_mulai: '', waktu_selesai: '', tempat: '', tag: '', kuota: '15', kampus: '', penyimak_id: '', jenis_kelamin: 'Semua' });
      setShowFormJadwal(false); setEditJadwal(null); fetchJadwal();
    } catch (err: any) {
      showPesan(`Gagal menyimpan jadwal: ${err?.response?.data?.message || err?.message || 'Error'}`, 'err');
    }
    setSavingJadwal(false);
  };
  const handleEditJadwal = (j: any) => {
    setEditJadwal(j);
    setFormJadwal({
      judul: j.judul || '', tanggal: j.tanggal ? j.tanggal.split('T')[0] : '',
      waktu_mulai: j.waktu_mulai || '', waktu_selesai: j.waktu_selesai || '',
      tempat: j.tempat || '', tag: j.tag || '', kuota: String(j.kuota ?? 15),
      kampus: j.kampus || '', penyimak_id: String(j.penyimak_id || ''),
      jenis_kelamin: j.jenis_kelamin || 'Semua',
    });
    setShowFormJadwal(true);
    setTimeout(() => document.getElementById('form-jadwal')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };
  const handleHapusJadwal = async (id: any) => {
    if (!confirm('Yakin hapus jadwal ini?')) return;
    try {
      await api.delete(`/admin/jadwal/${id}`);
      showPesan('Jadwal dihapus.'); fetchJadwal();
    } catch (err: any) {
      showPesan(`Gagal hapus: ${err?.response?.data?.message || err?.message || 'Error'}`, 'err');
    }
  };

  // ── Peserta Booking ──
  const handleLihatPeserta = async (jadwal: any) => {
    setPesertaModal(jadwal); setLoadingPeserta(true); setPesertaList([]);
    try {
      const res = await api.get(`/admin/jadwal/${jadwal.id}/peserta`);
      setPesertaList(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch (err: any) {
      showPesan(`Gagal memuat peserta: ${err?.response?.data?.message || err?.message || 'Error'}`, 'err');
    }
    setLoadingPeserta(false);
  };
  const handleHapusPeserta = async (bookingId: any) => {
    if (!confirm('Yakin hapus peserta ini dari sesi?')) return;
    try {
      await api.delete(`/admin/booking/${bookingId}`);
      showPesan('Peserta dihapus dari sesi.');
      if (pesertaModal) handleLihatPeserta(pesertaModal);
      fetchJadwal();
    } catch (err: any) {
      showPesan(`Gagal hapus peserta: ${err?.response?.data?.message || err?.message || 'Error'}`, 'err');
    }
  };

  // ── Galeri ──
  const fetchGaleri = async () => {
    setLoadingGaleri(true);
    try {
      const res = await api.get('/galeri');
      setGaleriList(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      showPesan(`Gagal memuat galeri: ${err?.response?.data?.message || err?.message || 'Error'}`, 'err');
    }
    setLoadingGaleri(false);
  };
  const handlePilihFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showPesan('File harus berupa gambar.', 'err'); return; }
    if (file.size > 5 * 1024 * 1024) { showPesan('Ukuran file maksimal 5 MB.', 'err'); return; }
    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setFotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };
  const handleSimpanGaleri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGaleri.judul.trim()) { showPesan('Judul foto wajib diisi.', 'err'); return; }
    if (!fotoFile) { showPesan('Pilih file foto terlebih dahulu.', 'err'); return; }
    setSavingGaleri(true); setUploadProgress(10);
    try {
      const fd = new FormData();
      fd.append('foto', fotoFile);
      fd.append('judul', formGaleri.judul);
      fd.append('keterangan', formGaleri.keterangan);
      fd.append('kategori', formGaleri.kategori);
      setUploadProgress(40);
      await api.post('/galeri', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e: any) => {
          const pct = Math.round((e.loaded * 80) / (e.total || 1));
          setUploadProgress(10 + pct);
        },
      });
      setUploadProgress(100);
      showPesan('Foto berhasil diunggah!');
      setFormGaleri({ judul: '', keterangan: '', kategori: '' });
      setFotoFile(null); setFotoPreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowFormGaleri(false); fetchGaleri();
    } catch (err: any) {
      showPesan(`Gagal upload foto: ${err?.response?.data?.message || err?.message || 'Cek koneksi & backend'}`, 'err');
    }
    setSavingGaleri(false); setUploadProgress(0);
  };
  const handleHapusGaleri = async (id: any) => {
    if (!confirm('Yakin hapus foto ini?')) return;
    try {
      await api.delete(`/galeri/${id}`);
      showPesan('Foto dihapus.'); fetchGaleri();
    } catch (err: any) {
      showPesan(`Gagal hapus: ${err?.response?.data?.message || err?.message || 'Error'}`, 'err');
    }
  };



  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'santri',   label: 'Santri',   emoji: '🎒' },
    { key: 'penyimak', label: 'Penyimak', emoji: '🏫' },
    { key: 'jadwal',   label: 'Jadwal',   emoji: '📅' },
    { key: 'galeri',   label: 'Galeri',   emoji: '🖼️' },
  ];

  const pendingSantri    = santriList.filter((s: any) => s.status === 'pending' || !s.approved);
  const approvedSantri   = santriList.filter((s: any) => s.status === 'approved' || s.approved);
  const pendingPenyimak  = penyimakList.filter((p: any) => p.status === 'pending' || !p.approved);
  const approvedPenyimak = penyimakList.filter((p: any) => p.status === 'approved' || p.approved);

  // Jadwal dipisah: belum selesai vs sudah selesai
  const jadwalMendatang   = jadwalList.filter((j: any) => !isJadwalSelesai(j));
  const jadwalTerlaksana  = jadwalList.filter((j: any) =>  isJadwalSelesai(j));

  const thStyle = { padding: '8px 12px', textAlign: 'left' as const, color: '#6B7280', fontWeight: 600, fontSize: '.75rem', textTransform: 'uppercase' as const, letterSpacing: '.04em' };
  const tdStyle = (bold?: boolean) => ({ padding: '10px 12px', color: bold ? '#1C1C1C' : '#6B7280', fontWeight: bold ? 500 : 400 });

  const infoRow = (label: string, val: any) => val ? (
    <div style={{ display: 'flex', gap: 10, fontSize: '.83rem', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <span style={{ color: '#6B7280', minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#1C1C1C', fontWeight: 500, wordBreak: 'break-all' }}>{val}</span>
    </div>
  ) : null;

  // FIX: resolvePenyimakNama — prioritas penyimak_nama dari backend (sudah di-inject controller)
  // fallback ke lookup lokal jika penyimakList sudah terisi
  const getNamaPenyimak = (p: any) => p.nama || p.name || '-';
  const resolvePenyimakNama = (j: any): string => {
    // Prioritas 1: field penyimak_nama langsung dari response /admin/jadwal
    if (j.penyimak_nama && j.penyimak_nama !== '—') return j.penyimak_nama;
    // Prioritas 2: nested object dari eager load (jika ada)
    if (j.penyimak?.nama) return j.penyimak.nama;
    if (j.penyimak?.name) return j.penyimak.name;
    if (j.penyimak?.user?.nama) return j.penyimak.user.nama;
    if (j.penyimak?.user?.name) return j.penyimak.user.name;
    // Prioritas 3: lookup dari state penyimakList (race condition fallback)
    if (j.penyimak_id && penyimakList.length > 0) {
      const pid   = Number(j.penyimak_id);
      const found = penyimakList.find((p: any) => Number(p.id) === pid);
      if (found) return getNamaPenyimak(found);
    }
    return '—';
  };

  // helper badge ikhwan/akhwat
  const BadgeJK = ({ jk, size = 'md' }: { jk?: string; size?: 'md' | 'sm' }) => {
    if (!jk || jk === 'Semua') return <span style={{ color: '#9CA3AF', fontSize: '.75rem' }}>Semua</span>;
    const isIkhwan = jk === 'Ikhwan';
    return (
      <span style={{
        background: isIkhwan ? '#EFF6FF' : '#FDF2F8',
        color: isIkhwan ? '#1D4ED8' : '#9D174D',
        borderRadius: 20,
        padding: size === 'sm' ? '1px 8px' : '2px 10px',
        fontSize: size === 'sm' ? '.7rem' : '.72rem',
        fontWeight: 700, whiteSpace: 'nowrap' as const,
        border: `1px solid ${isIkhwan ? 'rgba(29,78,216,0.2)' : 'rgba(157,23,77,0.2)'}`,
      }}>
        {isIkhwan ? '♂ Ikhwan' : '♀ Akhwat'}
      </span>
    );
  };

  const globalCss = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
    *{box-sizing:border-box;}
    .adm-input{width:100%;border:1.5px solid #E2E0D6;border-radius:10px;padding:.65rem 1rem;font-size:.85rem;background:#FAFAF7;font-family:inherit;color:#1C1C1C;outline:none;transition:border-color .2s,box-shadow .2s;}
    .adm-input:focus{border-color:#1B4332;box-shadow:0 0 0 3px rgba(27,67,50,0.12);background:#fff;}
    .adm-select{width:100%;border:1.5px solid #E2E0D6;border-radius:10px;padding:.65rem 1rem;font-size:.85rem;background:#FAFAF7;font-family:inherit;color:#1C1C1C;outline:none;transition:border-color .2s,box-shadow .2s;appearance:none;cursor:pointer;}
    .adm-select:focus{border-color:#1B4332;box-shadow:0 0 0 3px rgba(27,67,50,0.12);background:#fff;}
    .adm-textarea{width:100%;border:1.5px solid #E2E0D6;border-radius:10px;padding:.65rem 1rem;font-size:.85rem;background:#FAFAF7;font-family:inherit;color:#1C1C1C;outline:none;transition:border-color .2s,box-shadow .2s;resize:vertical;min-height:90px;}
    .adm-textarea:focus{border-color:#1B4332;box-shadow:0 0 0 3px rgba(27,67,50,0.12);background:#fff;}
    .adm-btn-primary{background:#1B4332;color:#fff;border:none;border-radius:10px;padding:.65rem 1.25rem;font-size:.85rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background .2s,transform .15s;}
    .adm-btn-primary:hover:not(:disabled){background:#2D6A4F;transform:translateY(-1px);}
    .adm-btn-primary:disabled{opacity:.55;cursor:not-allowed;}
    .adm-btn-outline{background:#fff;color:#1B4332;border:1.5px solid #1B4332;border-radius:10px;padding:.6rem 1.1rem;font-size:.82rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap;}
    .adm-btn-outline:hover{background:#1B4332;color:#fff;}
    .adm-btn-danger{background:#FEF2F2;color:#991B1B;border:1px solid rgba(220,53,69,.2);border-radius:8px;padding:.4rem .85rem;font-size:.78rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s;white-space:nowrap;}
    .adm-btn-danger:hover{background:#FEE2E2;}
    .adm-btn-approve{background:rgba(27,67,50,0.07);color:#1B4332;border:1px solid rgba(27,67,50,0.2);border-radius:8px;padding:.4rem .85rem;font-size:.78rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s;white-space:nowrap;}
    .adm-btn-approve:hover{background:rgba(27,67,50,0.14);}
    .adm-btn-edit{background:#EFF6FF;color:#1D4ED8;border:1px solid rgba(59,130,246,.2);border-radius:8px;padding:.4rem .85rem;font-size:.78rem;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;}
    .adm-btn-edit:hover{background:#DBEAFE;}
    .adm-btn-info{background:#F5F3FF;color:#6B21A8;border:1px solid rgba(139,92,246,.2);border-radius:8px;padding:.4rem .85rem;font-size:.78rem;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;}
    .adm-btn-info:hover{background:#EDE9FE;}
    .tab-btn{display:flex;align-items:center;gap:6px;padding:.6rem .9rem;border:none;background:transparent;border-radius:10px;cursor:pointer;font-family:inherit;font-size:.82rem;font-weight:500;color:#6B7280;transition:all .15s;white-space:nowrap;flex-shrink:0;}
    .tab-btn:hover{background:rgba(27,67,50,0.06);color:#1B4332;}
    .tab-btn.active{background:#1B4332;color:#fff;font-weight:600;}
    .sub-tab-btn{padding:.5rem .85rem;border:none;background:transparent;border-radius:8px;cursor:pointer;font-family:inherit;font-size:.8rem;font-weight:500;color:#6B7280;transition:all .15s;white-space:nowrap;}
    .sub-tab-btn:hover{background:rgba(27,67,50,0.06);color:#1B4332;}
    .sub-tab-btn.active{background:rgba(27,67,50,0.1);color:#1B4332;font-weight:600;}
    .card{background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);padding:1.5rem;}
    .toast{position:fixed;bottom:1.5rem;right:1.25rem;padding:.8rem 1.25rem;border-radius:12px;font-size:.85rem;font-weight:500;font-family:inherit;display:flex;align-items:center;gap:8px;z-index:9999;animation:slideUp .25s ease;box-shadow:0 4px 20px rgba(0,0,0,0.12);max-width:calc(100vw - 2.5rem);}
    .toast.ok{background:#1B4332;color:#fff;}
    .toast.err{background:#991B1B;color:#fff;}
    @keyframes slideUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
    .row-hover:hover{background:#FAFAF7;}
    .section-divider{height:1px;background:rgba(0,0,0,0.06);margin:.85rem 0;}
    .toggle-switch{position:relative;display:inline-block;width:44px;height:24px;}
    .toggle-switch input{opacity:0;width:0;height:0;}
    .toggle-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#D1D5DB;border-radius:24px;transition:.3s;}
    .toggle-slider:before{position:absolute;content:"";height:18px;width:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.3s;}
    input:checked+.toggle-slider{background:#1B4332;}
    input:checked+.toggle-slider:before{transform:translateX(20px);}
    .upload-zone{border:2px dashed #D1D5DB;border-radius:12px;padding:2rem;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;background:#FAFAF7;}
    .upload-zone:hover{border-color:#1B4332;background:rgba(27,67,50,0.03);}
    .upload-zone.has-file{border-color:#1B4332;border-style:solid;background:rgba(27,67,50,0.04);}
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;}
    .modal-box{background:#fff;border-radius:18px;padding:1.75rem;width:100%;max-width:520px;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);}
    .modal-box-wide{background:#fff;border-radius:18px;padding:1.75rem;width:100%;max-width:700px;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);}
    .progress-bar{height:6px;border-radius:3px;background:#D1D5DB;overflow:hidden;margin-top:8px;}
    .progress-fill{height:100%;background:#1B4332;border-radius:3px;transition:width .3s;}
    .kampus-btn{padding:.55rem .9rem;border-radius:8px;border:1.5px solid #E2E0D6;background:#FAFAF7;cursor:pointer;font-family:inherit;font-size:.82rem;font-weight:500;color:#6B7280;transition:all .15s;}
    .kampus-btn.selected{border-color:#1B4332;background:#F0FDF4;color:#1B4332;font-weight:700;}
    .jadwal-table-wrap{overflow-x:auto;}
    .jadwal-cards{display:none;flex-direction:column;gap:.75rem;}
    .approved-table-wrap{overflow-x:auto;}
    .approved-cards{display:none;flex-direction:column;gap:.75rem;}
    .kontak-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
    .admin-header-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:60px;padding:0 2rem;}
    .admin-header-title{display:flex;flex-direction:column;}
    .admin-header-subtitle{display:block;}
    .tab-bar{display:flex;gap:6px;background:#fff;border-radius:14px;padding:6px;border:1px solid rgba(0,0,0,0.06);margin-bottom:1.75rem;overflow-x:auto;-webkit-overflow-scrolling:touch;}
    .tab-bar::-webkit-scrollbar{height:0;}
    .action-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;}
    .action-row-btns{display:flex;gap:8px;flex-shrink:0;}
    .form-jadwal-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
    .sub-tab-bar{display:flex;gap:4px;background:rgba(27,67,50,0.05);border-radius:12px;padding:4px;overflow-x:auto;-webkit-overflow-scrolling:touch;width:fit-content;max-width:100%;}
    .sub-tab-bar::-webkit-scrollbar{height:0;}
    @media(max-width:900px){
      .admin-header-inner{padding:0 1.25rem;}
      .admin-header-subtitle{display:none;}
      .main-wrap{padding:1.25rem 1.25rem 3rem!important;}
    }
    @media(max-width:640px){
      .admin-header-inner{padding:0 1rem;height:54px;}
      .main-wrap{padding:1rem 1rem 3rem!important;}
      .stats-grid{grid-template-columns:1fr 1fr!important;}
      .tab-btn{padding:.55rem .75rem;font-size:.78rem;}
      .tab-label{display:none;}
      .action-row{flex-direction:column;align-items:flex-start;}
      .action-row-btns{width:100%;justify-content:flex-end;}
      .pending-row{flex-direction:column!important;align-items:flex-start!important;gap:10px!important;}
      .pending-row-btns{width:100%;display:flex;gap:8px;}
      .pending-row-btns button{flex:1;padding:.5rem;text-align:center;}
      .approved-table-wrap{display:none;}
      .approved-cards{display:flex;}
      .jadwal-table-wrap{display:none;}
      .jadwal-cards{display:flex;}
      .form-jadwal-grid{grid-template-columns:1fr!important;}
      .form-jadwal-grid [style*="span 2"]{grid-column:span 1!important;}
      .galeri-form-grid{grid-template-columns:1fr!important;}
      .galeri-form-grid [style*="span 2"]{grid-column:span 1!important;}
      .sub-tab-bar{width:100%;}
      .sub-tab-btn{flex:1;text-align:center;}
      .kontak-grid{grid-template-columns:1fr!important;}
      .card{padding:1rem;}
      .modal-box,.modal-box-wide{padding:1.25rem;border-radius:14px;}
    }
    @media(max-width:380px){
      .stats-grid{grid-template-columns:1fr!important;}
    }
  `;

  if (!unlocked) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', fontFamily: "'Inter','DM Sans',sans-serif" }}>
        <style>{`
          ${globalCss}
          .adm-input{width:100%;border:1.5px solid #E2E0D6;border-radius:10px;padding:.72rem 1rem;font-size:.875rem;background:#FAFAF7;font-family:inherit;color:#1C1C1C;outline:none;transition:border-color .2s,box-shadow .2s;}
          .adm-input:focus{border-color:#1B4332;box-shadow:0 0 0 3px rgba(27,67,50,0.12);background:#fff;}
          .adm-btn-primary{width:100%;background:#1B4332;color:#fff;border:none;border-radius:10px;padding:.82rem;font-size:.9rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background .2s,transform .15s;}
          .adm-btn-primary:hover:not(:disabled){background:#2D6A4F;transform:translateY(-1px);}
          .show-btn{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:.72rem;color:#6B7280;font-family:inherit;font-weight:600;padding:4px 6px;border-radius:4px;}
          .show-btn:hover{color:#1B4332;}
        `}</style>
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 30px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.06)', width: '100%', maxWidth: 400, padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: 56, height: 56, background: 'rgba(27,67,50,0.08)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.6rem' }}>🔒</div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', color: '#1B4332', margin: '0 0 .3rem', fontWeight: 700 }}>Panel Admin</h1>
            <p style={{ fontSize: '.83rem', color: '#6B7280', margin: 0 }}>YoKaji · UKM Tahfidzul Qur'an Unair</p>
          </div>
          <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>Password Admin</label>
              <div style={{ position: 'relative' }}>
                <input className="adm-input" type={showPass ? 'text' : 'password'} placeholder="Masukkan password" required
                  style={{ paddingRight: '5.5rem' }}
                  value={passwordInput} onChange={e => { setPasswordInput(e.target.value); setPasswordError(''); }} />
                <button type="button" className="show-btn" onClick={() => setShowPass(!showPass)}>
                  {showPass ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
              {passwordError && <p style={{ marginTop: 6, fontSize: '.78rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: 5 }}><span>⚠️</span> {passwordError}</p>}
            </div>
            <button className="adm-btn-primary" type="submit">Masuk</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F0', fontFamily: "'Inter','DM Sans',sans-serif" }}>
      <style>{globalCss}</style>

      {pesan && (
        <div className={`toast ${pesanType}`}>
          <span style={{ flexShrink: 0 }}>{pesanType === 'ok' ? '✓' : '⚠'}</span>
          <span>{pesan}</span>
        </div>
      )}

      {/* Modal Detail Santri */}
      {detailSantri && (
        <div className="modal-overlay" onClick={() => setDetailSantri(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", color: '#1B4332', margin: 0, fontWeight: 700 }}>Detail Pendaftar Santri</h3>
              <button onClick={() => setDetailSantri(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6B7280', padding: '4px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: '1.5rem' }}>
              {infoRow('Nama', detailSantri.nama || detailSantri.name)}
              {infoRow('Email', detailSantri.email)}
              {infoRow('NIM', detailSantri.nim)}
              {infoRow('No. HP', detailSantri.no_hp || detailSantri.phone)}
              {infoRow('Jurusan', detailSantri.jurusan || detailSantri.prodi)}
              {infoRow('Angkatan', detailSantri.angkatan)}
              {infoRow('Juz Hafalan', detailSantri.juz_hafalan)}
              {infoRow('Jadwal Dipilih', detailSantri.jadwal_id ? `Sesi #${detailSantri.jadwal_id}` : '-')}
              {infoRow('Motivasi', detailSantri.motivasi)}
              {infoRow('Status', detailSantri.status || (detailSantri.approved ? 'approved' : 'pending'))}
              {infoRow('Daftar pada', detailSantri.created_at ? new Date(detailSantri.created_at).toLocaleString('id-ID') : undefined)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(!detailSantri.approved && detailSantri.status !== 'approved') && (
                <button className="adm-btn-approve" style={{ flex: 1, padding: '.65rem' }} onClick={() => handleApproveSantri(detailSantri.id)}>✓ Setujui</button>
              )}
              <button className="adm-btn-danger" style={{ flex: 1, padding: '.65rem' }} onClick={() => handleHapusSantri(detailSantri.id)}>Hapus / Tolak</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Penyimak */}
      {detailPenyimak && (
        <div className="modal-overlay" onClick={() => setDetailPenyimak(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", color: '#1B4332', margin: 0, fontWeight: 700 }}>Detail Pendaftar Penyimak</h3>
              <button onClick={() => setDetailPenyimak(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6B7280', padding: '4px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: '1.5rem' }}>
              {infoRow('Nama', detailPenyimak.nama || detailPenyimak.name)}
              {infoRow('Email', detailPenyimak.email)}
              {infoRow('No. HP', detailPenyimak.no_hp || detailPenyimak.phone)}
              {infoRow('Gelar / Jabatan', detailPenyimak.gelar)}
              {infoRow('Hafalan', detailPenyimak.hafalan)}
              {infoRow('Pengalaman', detailPenyimak.pengalaman)}
              {infoRow('Ketersediaan', detailPenyimak.ketersediaan)}
              {infoRow('Status', detailPenyimak.status || (detailPenyimak.approved ? 'approved' : 'pending'))}
              {infoRow('Daftar pada', detailPenyimak.created_at ? new Date(detailPenyimak.created_at).toLocaleString('id-ID') : undefined)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(!detailPenyimak.approved && detailPenyimak.status !== 'approved') && (
                <button className="adm-btn-approve" style={{ flex: 1, padding: '.65rem' }} onClick={() => handleApprovePenyimak(detailPenyimak.id)}>✓ Setujui</button>
              )}
              <button className="adm-btn-danger" style={{ flex: 1, padding: '.65rem' }} onClick={() => handleHapusPenyimak(detailPenyimak.id)}>Hapus / Tolak</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Peserta Booking */}
      {pesertaModal && (
        <div className="modal-overlay" onClick={() => { setPesertaModal(null); setPesertaList([]); }}>
          <div className="modal-box-wide" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', gap: 12 }}>
              <div>
                <h3 style={{ fontFamily: "'Playfair Display',serif", color: '#1B4332', margin: '0 0 4px', fontWeight: 700 }}>👥 Peserta Sesi</h3>
                <div style={{ fontSize: '.8rem', color: '#6B7280', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {/* FIX: format tanggal di modal peserta */}
                  <span>📅 {fmtTanggal(pesertaModal.tanggal)}</span>
                  <span>🕐 {pesertaModal.waktu_mulai}{pesertaModal.waktu_selesai ? ` – ${pesertaModal.waktu_selesai}` : ''}</span>
                  {pesertaModal.kampus && <span>🏫 {pesertaModal.kampus}</span>}
                  <span>👤 {resolvePenyimakNama(pesertaModal)}</span>
                  <BadgeJK jk={pesertaModal.jenis_kelamin} size="sm" />
                </div>
              </div>
              <button onClick={() => { setPesertaModal(null); setPesertaList([]); }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6B7280', padding: '4px', flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '.83rem', color: '#1B4332', fontWeight: 600 }}>
                Terisi: {pesertaList.length} / {pesertaModal.kuota ?? 15} orang
              </span>
              <div style={{ flex: 1, minWidth: 80, maxWidth: 160, background: '#D1D5DB', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 20, background: pesertaList.length >= (pesertaModal.kuota ?? 15) ? '#EF4444' : '#1B4332', width: `${Math.min(100, (pesertaList.length / (pesertaModal.kuota ?? 15)) * 100)}%`, transition: 'width .3s' }} />
              </div>
            </div>
            {loadingPeserta ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280', fontSize: '.85rem' }}>Memuat daftar peserta...</div>
            ) : pesertaList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '.85rem' }}>Belum ada santri yang booking sesi ini.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {pesertaList.map((p: any, i: number) => (
                  <div key={p.id ?? p.booking_id ?? i}>
                    {i > 0 && <div style={{ height: 1, background: 'rgba(0,0,0,0.05)' }} />}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '.75rem 0', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(27,67,50,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.82rem', color: '#1B4332', flexShrink: 0 }}>
                          {(p.nama || p.name || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '.85rem', color: '#1C1C1C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nama || p.name || '-'}</div>
                          <div style={{ fontSize: '.75rem', color: '#6B7280', marginTop: 1 }}>
                            {p.nim ? `NIM ${p.nim}` : ''}{p.email ? (p.nim ? ' · ' : '') + p.email : ''}
                            {p.created_at ? <span style={{ marginLeft: p.nim || p.email ? 8 : 0, color: '#9CA3AF' }}>Booking: {new Date(p.created_at).toLocaleDateString('id-ID')}</span> : ''}
                          </div>
                        </div>
                      </div>
                      <button className="adm-btn-danger" onClick={() => handleHapusPeserta(p.booking_id ?? p.id)} style={{ flexShrink: 0 }}>Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: '#1B4332', padding: '0' }}>
        <div className="admin-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="30" height="30" viewBox="0 0 38 38" fill="none">
              <rect width="38" height="38" rx="8" fill="rgba(255,255,255,0.12)" />
              <path d="M19 7 C13 12 10 16 10 21 C10 26 14 30 19 31 C24 30 28 26 28 21 C28 16 25 12 19 7Z" fill="#40916C" />
              <path d="M15 20 Q19 14 23 20" stroke="#C9A84C" strokeWidth="1.5" fill="none" />
              <line x1="19" y1="18" x2="19" y2="28" stroke="#C9A84C" strokeWidth="1.5" />
            </svg>
            <div className="admin-header-title">
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '.95rem' }}>YoKaji</span>
              <span className="admin-header-subtitle" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '.75rem' }}>Panel Admin</span>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '.4rem .9rem', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
            Keluar
          </button>
        </div>
      </div>

      <div className="main-wrap" style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>

        {/* Stats */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Santri Pending',   value: pendingSantri.length,    color: '#92400E', bg: '#FFFBEB',              border: 'rgba(201,168,76,.25)',  emoji: '⏳' },
            { label: 'Santri Aktif',     value: approvedSantri.length,   color: '#1B4332', bg: 'rgba(27,67,50,0.07)', border: 'rgba(27,67,50,0.18)',   emoji: '🎒' },
            { label: 'Penyimak Pending', value: pendingPenyimak.length,  color: '#92400E', bg: '#FFFBEB',              border: 'rgba(201,168,76,.25)',  emoji: '⏳' },
            { label: 'Penyimak Aktif',   value: approvedPenyimak.length, color: '#1B4332', bg: 'rgba(27,67,50,0.07)', border: 'rgba(27,67,50,0.18)',   emoji: '🏫' },
            { label: 'Jadwal Aktif',     value: jadwalMendatang.length,  color: '#1D4ED8', bg: '#EFF6FF',              border: 'rgba(59,130,246,.2)',   emoji: '📅' },
            { label: 'Foto Galeri',      value: galeriList.length,       color: '#6B21A8', bg: '#F5F3FF',              border: 'rgba(139,92,246,.2)',   emoji: '🖼️' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.3rem' }}>{s.emoji}</span>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '.72rem', color: '#6B7280', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {tabs.map(t => (
            <button key={t.key} className={`tab-btn${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
              <span>{t.emoji}</span>
              <span className="tab-label">{t.label}</span>
              {t.key === 'santri'   && pendingSantri.length   > 0 && <span style={{ background: '#C9A84C', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: '.7rem', fontWeight: 700, marginLeft: 2 }}>{pendingSantri.length}</span>}
              {t.key === 'penyimak' && pendingPenyimak.length > 0 && <span style={{ background: '#C9A84C', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: '.7rem', fontWeight: 700, marginLeft: 2 }}>{pendingPenyimak.length}</span>}
            </button>
          ))}
        </div>

        {/* ══ TAB SANTRI ══ */}
        {activeTab === 'santri' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="action-row">
              <div>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.25rem', color: '#1B4332', margin: '0 0 2px', fontWeight: 700 }}>Approve Santri</h2>
                <p style={{ fontSize: '.8rem', color: '#6B7280', margin: 0 }}>{pendingSantri.length} menunggu · {approvedSantri.length} aktif · Klik nama untuk detail</p>
              </div>
              <div className="action-row-btns">
                <button className="adm-btn-outline" onClick={fetchSantri}>↻ Refresh</button>
              </div>
            </div>
            {loadingSantri ? (
              <div className="card" style={{ textAlign: 'center', color: '#6B7280', padding: '3rem' }}>Memuat data santri...</div>
            ) : (
              <>
                {pendingSantri.length > 0 && (
                  <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                      <span style={{ background: '#FFFBEB', border: '1px solid rgba(201,168,76,.3)', borderRadius: 8, padding: '4px 10px', fontSize: '.78rem', fontWeight: 700, color: '#92400E' }}>⏳ Menunggu Persetujuan · {pendingSantri.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {pendingSantri.map((s: any, i: number) => (
                        <div key={s.id}>
                          {i > 0 && <div className="section-divider" />}
                          <div className="pending-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setDetailSantri(s)}>
                              <div style={{ fontWeight: 600, fontSize: '.88rem', color: '#1C1C1C' }}>{s.nama || s.name || '-'}</div>
                              <div style={{ fontSize: '.75rem', color: '#6B7280', marginTop: 2 }}>{s.email} {s.nim ? `· NIM ${s.nim}` : ''}</div>
                              {s.created_at && <div style={{ fontSize: '.72rem', color: '#9CA3AF', marginTop: 1 }}>Daftar: {new Date(s.created_at).toLocaleDateString('id-ID')}</div>}
                            </div>
                            <div className="pending-row-btns" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                              <button className="adm-btn-approve" onClick={() => handleApproveSantri(s.id)}>✓ Setujui</button>
                              <button className="adm-btn-danger"  onClick={() => handleHapusSantri(s.id)}>Tolak</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                    <span style={{ background: 'rgba(27,67,50,0.08)', border: '1px solid rgba(27,67,50,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: '.78rem', fontWeight: 700, color: '#1B4332' }}>✓ Sudah Disetujui · {approvedSantri.length}</span>
                  </div>
                  {approvedSantri.length === 0 ? (
                    <p style={{ color: '#6B7280', fontSize: '.85rem', textAlign: 'center', padding: '1rem 0' }}>Belum ada santri yang disetujui.</p>
                  ) : (
                    <>
                      <div className="approved-table-wrap">
                        <table style={{ width: '100%', fontSize: '.83rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: 'rgba(27,67,50,0.04)' }}>
                              {['Nama', 'Email', 'NIM', 'Aksi'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {approvedSantri.map((s: any) => (
                              <tr key={s.id} className="row-hover" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer' }} onClick={() => setDetailSantri(s)}>
                                <td style={tdStyle(true)}>{s.nama || s.name || '-'}</td>
                                <td style={tdStyle()}>{s.email || '-'}</td>
                                <td style={tdStyle()}>{s.nim || '-'}</td>
                                <td style={tdStyle()} onClick={e => e.stopPropagation()}>
                                  <button className="adm-btn-danger" onClick={() => handleHapusSantri(s.id)}>Hapus</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="approved-cards">
                        {approvedSantri.map((s: any) => (
                          <div key={s.id} style={{ background: '#FAFAF7', borderRadius: 12, padding: '.9rem 1rem', border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer' }} onClick={() => setDetailSantri(s)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '.88rem', color: '#1B4332', marginBottom: 3 }}>{s.nama || s.name || '-'}</div>
                                <div style={{ fontSize: '.75rem', color: '#6B7280' }}>{s.email || '-'}</div>
                                {s.nim && <div style={{ fontSize: '.75rem', color: '#9CA3AF', marginTop: 2 }}>NIM {s.nim}</div>}
                              </div>
                              <button className="adm-btn-danger" onClick={e => { e.stopPropagation(); handleHapusSantri(s.id); }}>Hapus</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {santriList.length === 0 && <div className="card" style={{ textAlign: 'center', color: '#6B7280', padding: '3rem' }}>Belum ada data santri.</div>}
              </>
            )}
          </div>
        )}

        {/* ══ TAB PENYIMAK ══ */}
        {activeTab === 'penyimak' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="action-row">
              <div>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.25rem', color: '#1B4332', margin: '0 0 2px', fontWeight: 700 }}>Approve Penyimak</h2>
                <p style={{ fontSize: '.8rem', color: '#6B7280', margin: 0 }}>{pendingPenyimak.length} menunggu · {approvedPenyimak.length} aktif · Klik nama untuk detail</p>
              </div>
              <div className="action-row-btns">
                <button className="adm-btn-outline" onClick={fetchPenyimak}>↻ Refresh</button>
              </div>
            </div>
            {loadingPenyimak ? (
              <div className="card" style={{ textAlign: 'center', color: '#6B7280', padding: '3rem' }}>Memuat data penyimak...</div>
            ) : (
              <>
                {pendingPenyimak.length > 0 && (
                  <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                      <span style={{ background: '#FFFBEB', border: '1px solid rgba(201,168,76,.3)', borderRadius: 8, padding: '4px 10px', fontSize: '.78rem', fontWeight: 700, color: '#92400E' }}>⏳ Menunggu Persetujuan · {pendingPenyimak.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {pendingPenyimak.map((p: any, i: number) => (
                        <div key={p.id}>
                          {i > 0 && <div className="section-divider" />}
                          <div className="pending-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setDetailPenyimak(p)}>
                              <div style={{ fontWeight: 600, fontSize: '.88rem', color: '#1C1C1C' }}>{getNamaPenyimak(p)}</div>
                              <div style={{ fontSize: '.75rem', color: '#6B7280', marginTop: 2 }}>{p.email}</div>
                              {p.gelar && <div style={{ fontSize: '.72rem', color: '#9CA3AF', marginTop: 1 }}>{p.gelar}</div>}
                            </div>
                            <div className="pending-row-btns" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                              <button className="adm-btn-approve" onClick={() => handleApprovePenyimak(p.id)}>✓ Setujui</button>
                              <button className="adm-btn-danger"  onClick={() => handleHapusPenyimak(p.id)}>Tolak</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                    <span style={{ background: 'rgba(27,67,50,0.08)', border: '1px solid rgba(27,67,50,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: '.78rem', fontWeight: 700, color: '#1B4332' }}>✓ Sudah Disetujui · {approvedPenyimak.length}</span>
                  </div>
                  {approvedPenyimak.length === 0 ? (
                    <p style={{ color: '#6B7280', fontSize: '.85rem', textAlign: 'center', padding: '1rem 0' }}>Belum ada penyimak yang disetujui.</p>
                  ) : (
                    <>
                      <div className="approved-table-wrap">
                        <table style={{ width: '100%', fontSize: '.83rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: 'rgba(27,67,50,0.04)' }}>
                              {['Nama', 'Email', 'Aksi'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {approvedPenyimak.map((p: any) => (
                              <tr key={p.id} className="row-hover" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer' }} onClick={() => setDetailPenyimak(p)}>
                                <td style={tdStyle(true)}>{getNamaPenyimak(p)}</td>
                                <td style={tdStyle()}>{p.email || '-'}</td>
                                <td style={tdStyle()} onClick={e => e.stopPropagation()}>
                                  <button className="adm-btn-danger" onClick={() => handleHapusPenyimak(p.id)}>Hapus</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="approved-cards">
                        {approvedPenyimak.map((p: any) => (
                          <div key={p.id} style={{ background: '#FAFAF7', borderRadius: 12, padding: '.9rem 1rem', border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer' }} onClick={() => setDetailPenyimak(p)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '.88rem', color: '#1B4332', marginBottom: 3 }}>{getNamaPenyimak(p)}</div>
                                <div style={{ fontSize: '.75rem', color: '#6B7280' }}>{p.email || '-'}</div>
                                {p.gelar && <div style={{ fontSize: '.75rem', color: '#9CA3AF', marginTop: 2 }}>{p.gelar}</div>}
                              </div>
                              <button className="adm-btn-danger" onClick={e => { e.stopPropagation(); handleHapusPenyimak(p.id); }}>Hapus</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {penyimakList.length === 0 && <div className="card" style={{ textAlign: 'center', color: '#6B7280', padding: '3rem' }}>Belum ada data penyimak.</div>}
              </>
            )}
          </div>
        )}

        {/* ══ TAB JADWAL ══ */}
        {activeTab === 'jadwal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="action-row">
              <div>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.25rem', color: '#1B4332', margin: '0 0 2px', fontWeight: 700 }}>Jadwal Sesi Setoran</h2>
                <p style={{ fontSize: '.8rem', color: '#6B7280', margin: 0 }}>Kuota max 15 per sesi · santri pilih dari slot yang tersedia</p>
              </div>
              <div className="action-row-btns">
                <button className="adm-btn-outline" onClick={fetchJadwal}>↻ Refresh</button>
                <button className="adm-btn-primary" onClick={() => {
                  setShowFormJadwal(!showFormJadwal);
                  setEditJadwal(null);
                  setFormJadwal({ judul: '', tanggal: '', waktu_mulai: '', waktu_selesai: '', tempat: '', tag: '', kuota: '15', kampus: '', penyimak_id: '', jenis_kelamin: 'Semua' });
                }}>
                  {showFormJadwal && !editJadwal ? '✕ Batal' : '+ Tambah'}
                </button>
              </div>
            </div>

            {showFormJadwal && (
              <div className="card" id="form-jadwal">
                <h3 style={{ fontWeight: 700, color: '#1B4332', margin: '0 0 1.25rem', fontSize: '.95rem' }}>
                  {editJadwal ? '✏️ Edit Jadwal' : '📅 Tambah Jadwal Sesi Baru'}
                </h3>
                <form onSubmit={handleSimpanJadwal}>
                  <div className="form-jadwal-grid">
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '.77rem', fontWeight: 600, color: '#374151', marginBottom: '.45rem' }}>Kampus * <span style={{ color: '#6B7280', fontWeight: 400 }}>(pilih lokasi sesi)</span></label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {KAMPUS_LIST.map(k => (
                          <button key={k} type="button" className={`kampus-btn${formJadwal.kampus === k ? ' selected' : ''}`} onClick={() => setFormJadwal({ ...formJadwal, kampus: k })}>
                            🏫 {k}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '.77rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Penyimak *</label>
                      {approvedPenyimak.length === 0 ? (
                        <div style={{ background: '#FFFBEB', border: '1px solid rgba(201,168,76,.3)', borderRadius: 10, padding: '.75rem 1rem', fontSize: '.82rem', color: '#92400E' }}>
                          ⚠️ Belum ada penyimak yang disetujui. Approve penyimak di tab Penyimak terlebih dahulu.
                        </div>
                      ) : (
                        <select className="adm-select" value={formJadwal.penyimak_id} onChange={e => setFormJadwal({ ...formJadwal, penyimak_id: e.target.value })} required>
                          <option value="">-- Pilih Penyimak --</option>
                          {approvedPenyimak.map((p: any) => (
                            <option key={p.id} value={p.id}>{getNamaPenyimak(p)}{p.gelar ? ` · ${p.gelar}` : ''}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '.77rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Tanggal *</label>
                      <input className="adm-input" type="date" required value={formJadwal.tanggal} onChange={e => setFormJadwal({ ...formJadwal, tanggal: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '.77rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Tag / Kategori</label>
                      <input className="adm-input" type="text" placeholder="cth: SETORAN / KHATAMAN" value={formJadwal.tag} onChange={e => setFormJadwal({ ...formJadwal, tag: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '.77rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Waktu Mulai *</label>
                      <input className="adm-input" type="time" required value={formJadwal.waktu_mulai} onChange={e => setFormJadwal({ ...formJadwal, waktu_mulai: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '.77rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Waktu Selesai</label>
                      <input className="adm-input" type="time" value={formJadwal.waktu_selesai} onChange={e => setFormJadwal({ ...formJadwal, waktu_selesai: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '.77rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Kuota Sesi <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(maks. 15)</span></label>
                      <input className="adm-input" type="number" min="1" max="15" value={formJadwal.kuota} onChange={e => setFormJadwal({ ...formJadwal, kuota: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '.77rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Judul / Keterangan Sesi</label>
                      <input className="adm-input" type="text" placeholder="cth: Setoran Hafalan Mingguan" value={formJadwal.judul} onChange={e => setFormJadwal({ ...formJadwal, judul: e.target.value })} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '.77rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Tempat / Ruangan <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(opsional)</span></label>
                      <input className="adm-input" type="text" placeholder="cth: Aula Kahuripan Lt. 3" value={formJadwal.tempat} onChange={e => setFormJadwal({ ...formJadwal, tempat: e.target.value })} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '.77rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Diperuntukkan</label>
                      <select className="adm-select" value={formJadwal.jenis_kelamin} onChange={e => setFormJadwal({ ...formJadwal, jenis_kelamin: e.target.value })}>
                        <option value="Semua">Semua (Ikhwan & Akhwat)</option>
                        <option value="Ikhwan">Ikhwan saja</option>
                        <option value="Akhwat">Akhwat saja</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: 'span 2', display: 'flex', gap: 10 }}>
                      <button className="adm-btn-primary" type="submit" disabled={savingJadwal} style={{ flex: 1 }}>
                        {savingJadwal ? 'Menyimpan...' : editJadwal ? '💾 Perbarui Jadwal' : '💾 Simpan Jadwal'}
                      </button>
                      <button type="button" className="adm-btn-outline" onClick={() => { setShowFormJadwal(false); setEditJadwal(null); }}>Batal</button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {loadingJadwal ? (
                <p style={{ textAlign: 'center', color: '#6B7280', padding: '3rem' }}>Memuat jadwal...</p>
              ) : jadwalList.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6B7280', padding: '3rem' }}>Belum ada jadwal. Klik "+ Tambah".</p>
              ) : (
                <>
                  {/* ── SECTION: Jadwal Mendatang ── */}
                  <div style={{ padding: '1rem 1.25rem .6rem', borderBottom: jadwalMendatang.length > 0 ? '1px solid rgba(0,0,0,0.06)' : undefined }}>
                    <span style={{ background: 'rgba(27,67,50,0.08)', border: '1px solid rgba(27,67,50,0.18)', borderRadius: 8, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, color: '#1B4332' }}>
                      📅 Jadwal Mendatang · {jadwalMendatang.length}
                    </span>
                  </div>
                  {jadwalMendatang.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '1.5rem', fontSize: '.85rem' }}>Tidak ada jadwal mendatang.</p>
                  ) : (
                    <>
                      {/* Desktop table mendatang */}
                      <div className="jadwal-table-wrap">
                        <table style={{ width: '100%', fontSize: '.83rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: 'rgba(27,67,50,0.04)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                              {['Kampus', 'Penyimak', 'Untuk', 'Tanggal', 'Waktu', 'Tempat', 'Kuota', 'Aksi'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {jadwalMendatang.map((j: any) => {
                              const terisi = j.terisi ?? 0;
                              const kuota  = j.kuota  ?? 15;
                              const penuh  = terisi >= kuota;
                              return (
                                <tr key={j.id} className="row-hover" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                  <td style={{ padding: '11px 12px' }}>
                                    {j.kampus
                                      ? <span style={{ background: 'rgba(27,67,50,0.08)', color: '#1B4332', borderRadius: 20, padding: '2px 10px', fontSize: '.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>🏫 {j.kampus}</span>
                                      : <span style={{ color: '#9CA3AF' }}>—</span>}
                                  </td>
                                  <td style={{ padding: '11px 12px' }}>
                                    <div style={{ fontWeight: 500, color: '#1C1C1C', fontSize: '.82rem' }}>{resolvePenyimakNama(j)}</div>
                                    {j.judul && <div style={{ fontSize: '.72rem', color: '#9CA3AF', marginTop: 1 }}>{j.tag ? `[${j.tag}] ` : ''}{j.judul}</div>}
                                  </td>
                                  <td style={{ padding: '11px 12px' }}><BadgeJK jk={j.jenis_kelamin} /></td>
                                  <td style={tdStyle()}>{fmtTanggal(j.tanggal)}</td>
                                  <td style={tdStyle()}>{j.waktu_mulai}{j.waktu_selesai ? ` – ${j.waktu_selesai}` : ''}</td>
                                  <td style={tdStyle()}>{j.tempat || '-'}</td>
                                  <td style={{ padding: '11px 12px' }}>
                                    <span style={{ background: penuh ? '#FEF2F2' : 'rgba(27,67,50,0.08)', color: penuh ? '#991B1B' : '#1B4332', borderRadius: 20, padding: '2px 10px', fontSize: '.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                      {terisi}/{kuota}{penuh ? ' · penuh' : ''}
                                    </span>
                                  </td>
                                  <td style={{ padding: '11px 12px' }}>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button className="adm-btn-info"   onClick={() => handleLihatPeserta(j)}>👥 {terisi}</button>
                                      <button className="adm-btn-edit"   onClick={() => handleEditJadwal(j)}>Edit</button>
                                      <button className="adm-btn-danger" onClick={() => handleHapusJadwal(j.id)}>Hapus</button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {/* Mobile cards mendatang */}
                      <div className="jadwal-cards" style={{ padding: '1rem' }}>
                        {jadwalMendatang.map((j: any) => {
                          const terisi = j.terisi ?? 0;
                          const kuota  = j.kuota  ?? 15;
                          const penuh  = terisi >= kuota;
                          return (
                            <div key={j.id} style={{ background: '#FAFAF7', borderRadius: 12, padding: '1rem', border: '1px solid rgba(0,0,0,0.06)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                                    {j.kampus && <span style={{ background: 'rgba(27,67,50,0.08)', color: '#1B4332', borderRadius: 20, padding: '2px 10px', fontSize: '.72rem', fontWeight: 700 }}>🏫 {j.kampus}</span>}
                                    <BadgeJK jk={j.jenis_kelamin} size="sm" />
                                  </div>
                                  <div style={{ fontWeight: 600, fontSize: '.88rem', color: '#1C1C1C', marginBottom: 2 }}>👤 {resolvePenyimakNama(j)}</div>
                                  {j.judul && <div style={{ fontSize: '.75rem', color: '#9CA3AF' }}>{j.judul}</div>}
                                </div>
                                <span style={{ background: penuh ? '#FEF2F2' : 'rgba(27,67,50,0.08)', color: penuh ? '#991B1B' : '#1B4332', borderRadius: 20, padding: '3px 10px', fontSize: '.75rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {terisi}/{kuota}
                                </span>
                              </div>
                              <div style={{ fontSize: '.78rem', color: '#6B7280', marginBottom: 10 }}>
                                📅 {fmtTanggal(j.tanggal)} · 🕐 {j.waktu_mulai}{j.waktu_selesai ? ` – ${j.waktu_selesai}` : ''}
                                {j.tempat && <span> · 📍 {j.tempat}</span>}
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="adm-btn-info"   onClick={() => handleLihatPeserta(j)} style={{ flex: 1, textAlign: 'center' as const }}>👥 Peserta ({terisi})</button>
                                <button className="adm-btn-edit"   onClick={() => handleEditJadwal(j)}   style={{ flex: 1, textAlign: 'center' as const }}>Edit</button>
                                <button className="adm-btn-danger" onClick={() => handleHapusJadwal(j.id)} style={{ flex: 1, textAlign: 'center' as const }}>Hapus</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* ── SECTION: Riwayat Terlaksana ── */}
                  {jadwalTerlaksana.length > 0 && (
                    <>
                      <div style={{ padding: '1.25rem 1.25rem .6rem', borderTop: '2px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <span style={{ background: '#F0FDF4', border: '1px solid rgba(34,197,94,.25)', borderRadius: 8, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, color: '#15803D' }}>
                          ✅ Sudah Terlaksana · {jadwalTerlaksana.length}
                        </span>
                        <span style={{ marginLeft: 10, fontSize: '.72rem', color: '#9CA3AF' }}>Otomatis terhapus setelah 24 jam</span>
                      </div>
                      {/* Desktop table terlaksana */}
                      <div className="jadwal-table-wrap">
                        <table style={{ width: '100%', fontSize: '.83rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: 'rgba(34,197,94,0.04)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                              {['Kampus', 'Penyimak', 'Untuk', 'Tanggal', 'Waktu', 'Tempat', 'Peserta', 'Aksi'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {jadwalTerlaksana.map((j: any) => {
                              const terisi = j.terisi ?? 0;
                              const kuota  = j.kuota  ?? 15;
                              return (
                                <tr key={j.id} className="row-hover" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', opacity: 0.75 }}>
                                  <td style={{ padding: '11px 12px' }}>
                                    {j.kampus
                                      ? <span style={{ background: 'rgba(27,67,50,0.08)', color: '#1B4332', borderRadius: 20, padding: '2px 10px', fontSize: '.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>🏫 {j.kampus}</span>
                                      : <span style={{ color: '#9CA3AF' }}>—</span>}
                                  </td>
                                  <td style={{ padding: '11px 12px' }}>
                                    <div style={{ fontWeight: 500, color: '#1C1C1C', fontSize: '.82rem' }}>{resolvePenyimakNama(j)}</div>
                                    {j.judul && <div style={{ fontSize: '.72rem', color: '#9CA3AF', marginTop: 1 }}>{j.tag ? `[${j.tag}] ` : ''}{j.judul}</div>}
                                  </td>
                                  <td style={{ padding: '11px 12px' }}><BadgeJK jk={j.jenis_kelamin} /></td>
                                  <td style={tdStyle()}>{fmtTanggal(j.tanggal)}</td>
                                  <td style={tdStyle()}>{j.waktu_mulai}{j.waktu_selesai ? ` – ${j.waktu_selesai}` : ''}</td>
                                  <td style={tdStyle()}>{j.tempat || '-'}</td>
                                  <td style={{ padding: '11px 12px' }}>
                                    <span style={{ background: 'rgba(27,67,50,0.08)', color: '#1B4332', borderRadius: 20, padding: '2px 10px', fontSize: '.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                      {terisi}/{kuota}
                                    </span>
                                  </td>
                                  <td style={{ padding: '11px 12px' }}>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button className="adm-btn-info"   onClick={() => handleLihatPeserta(j)}>👥 {terisi}</button>
                                      <button className="adm-btn-danger" onClick={() => handleHapusJadwal(j.id)}>Hapus</button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {/* Mobile cards terlaksana */}
                      <div className="jadwal-cards" style={{ padding: '1rem' }}>
                        {jadwalTerlaksana.map((j: any) => {
                          const terisi = j.terisi ?? 0;
                          const kuota  = j.kuota  ?? 15;
                          return (
                            <div key={j.id} style={{ background: '#F0FDF4', borderRadius: 12, padding: '1rem', border: '1px solid rgba(34,197,94,0.2)', opacity: 0.85 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                                    {j.kampus && <span style={{ background: 'rgba(27,67,50,0.08)', color: '#1B4332', borderRadius: 20, padding: '2px 10px', fontSize: '.72rem', fontWeight: 700 }}>🏫 {j.kampus}</span>}
                                    <span style={{ background: '#DCFCE7', color: '#15803D', borderRadius: 20, padding: '1px 8px', fontSize: '.7rem', fontWeight: 700 }}>✅ Selesai</span>
                                  </div>
                                  <div style={{ fontWeight: 600, fontSize: '.88rem', color: '#1C1C1C', marginBottom: 2 }}>👤 {resolvePenyimakNama(j)}</div>
                                  {j.judul && <div style={{ fontSize: '.75rem', color: '#9CA3AF' }}>{j.judul}</div>}
                                </div>
                                <span style={{ background: 'rgba(27,67,50,0.08)', color: '#1B4332', borderRadius: 20, padding: '3px 10px', fontSize: '.75rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {terisi}/{kuota}
                                </span>
                              </div>
                              <div style={{ fontSize: '.78rem', color: '#6B7280', marginBottom: 10 }}>
                                📅 {fmtTanggal(j.tanggal)} · 🕐 {j.waktu_mulai}{j.waktu_selesai ? ` – ${j.waktu_selesai}` : ''}
                                {j.tempat && <span> · 📍 {j.tempat}</span>}
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="adm-btn-info"   onClick={() => handleLihatPeserta(j)} style={{ flex: 1, textAlign: 'center' as const }}>👥 Lihat Peserta</button>
                                <button className="adm-btn-danger" onClick={() => handleHapusJadwal(j.id)} style={{ flex: 1, textAlign: 'center' as const }}>Hapus</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB GALERI ══ */}
        {activeTab === 'galeri' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="action-row">
              <div>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.25rem', color: '#1B4332', margin: '0 0 2px', fontWeight: 700 }}>Galeri Foto</h2>
                <p style={{ fontSize: '.8rem', color: '#6B7280', margin: 0 }}>{galeriList.length} foto · tampil di landing page publik</p>
              </div>
              <div className="action-row-btns">
                <button className="adm-btn-primary" onClick={() => { setShowFormGaleri(!showFormGaleri); setFormGaleri({ judul: '', keterangan: '', kategori: '' }); setFotoFile(null); setFotoPreview(''); }}>
                  {showFormGaleri ? '✕ Batal' : '+ Tambah Foto'}
                </button>
              </div>
            </div>
            {showFormGaleri && (
              <div className="card">
                <h3 style={{ fontWeight: 700, color: '#1B4332', margin: '0 0 1.25rem', fontSize: '.95rem' }}>🖼️ Upload Foto Baru</h3>
                <form onSubmit={handleSimpanGaleri} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="galeri-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '.77rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Judul Foto *</label>
                      <input className="adm-input" type="text" placeholder="cth: Khataman Al-Qur'an 2025" required value={formGaleri.judul} onChange={e => setFormGaleri({ ...formGaleri, judul: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '.77rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Kategori</label>
                      <input className="adm-input" type="text" placeholder="cth: Khataman / Setoran / Dauroh" value={formGaleri.kategori} onChange={e => setFormGaleri({ ...formGaleri, kategori: e.target.value })} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '.77rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Keterangan (opsional)</label>
                      <input className="adm-input" type="text" placeholder="Deskripsi singkat foto" value={formGaleri.keterangan} onChange={e => setFormGaleri({ ...formGaleri, keterangan: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '.77rem', fontWeight: 600, color: '#374151', marginBottom: '.5rem' }}>File Foto * (maks. 5 MB)</label>
                    <div className={`upload-zone${fotoFile ? ' has-file' : ''}`} onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const ev = { target: { files: [f] } } as any; handlePilihFile(ev); } }}>
                      {fotoPreview ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <img src={fotoPreview} alt="preview" style={{ width: 90, height: 65, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, fontSize: '.85rem', color: '#1B4332' }}>{fotoFile?.name}</div>
                            <div style={{ fontSize: '.75rem', color: '#6B7280' }}>{fotoFile ? (fotoFile.size / 1024 / 1024).toFixed(2) + ' MB' : ''}</div>
                            <button type="button" style={{ marginTop: 6, fontSize: '.75rem', color: '#991B1B', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 600 }} onClick={e => { e.stopPropagation(); setFotoFile(null); setFotoPreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}>✕ Hapus</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '1.8rem', marginBottom: '.5rem' }}>📁</div>
                          <div style={{ fontWeight: 600, fontSize: '.87rem', color: '#374151' }}>Klik atau drag & drop foto di sini</div>
                          <div style={{ fontSize: '.75rem', color: '#9CA3AF', marginTop: 4 }}>JPG, PNG, WEBP — maksimal 5 MB</div>
                        </div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePilihFile} />
                  </div>
                  {savingGaleri && uploadProgress > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: '#6B7280', marginBottom: 4 }}>
                        <span>Mengunggah foto...</span><span>{uploadProgress}%</span>
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${uploadProgress}%` }} /></div>
                    </div>
                  )}
                  <button className="adm-btn-primary" type="submit" disabled={savingGaleri || !fotoFile} style={{ width: '100%' }}>
                    {savingGaleri ? `Mengunggah... ${uploadProgress}%` : '⬆ Upload & Simpan Foto'}
                  </button>
                </form>
              </div>
            )}
            {loadingGaleri ? (
              <div className="card" style={{ textAlign: 'center', color: '#6B7280', padding: '3rem' }}>Memuat galeri...</div>
            ) : galeriList.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: '#6B7280', padding: '3rem' }}>Belum ada foto. Klik "+ Tambah Foto".</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '1rem' }}>
                {galeriList.map((g: any) => (
                  <div key={g.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    {g.url && <img src={g.url} alt={g.judul} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: '.75rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '.83rem', color: '#1C1C1C', marginBottom: 2 }}>{g.judul}</div>
                      {g.kategori && <div style={{ fontSize: '.72rem', color: '#6B7280', marginBottom: 6 }}>{g.kategori}</div>}
                      <button className="adm-btn-danger" onClick={() => handleHapusGaleri(g.id)} style={{ width: '100%', padding: '.4rem' }}>Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


      </div>
    </div>
  );
}