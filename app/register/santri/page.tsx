'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

const FAKULTAS_PRODI: Record<string, string[]> = {
  'Fakultas Kedokteran': ['Kedokteran', 'Kebidanan'],
  'Fakultas Kedokteran Gigi': ['Kedokteran Gigi'],
  'Fakultas Hukum': ['Hukum'],
  'Fakultas Ekonomi dan Bisnis': ['Manajemen', 'Akuntansi', 'Ilmu Ekonomi', 'Ekonomi Islam'],
  'Fakultas Kedokteran Hewan': ['Kedokteran Hewan'],
  'Fakultas Ilmu Sosial dan Ilmu Politik': ['Administrasi Publik', 'Ilmu Politik', 'Sosiologi', 'Ilmu Hubungan Internasional', 'Ilmu Komunikasi', 'Ilmu Informasi dan Perpustakaan', 'Antropologi'],
  'Fakultas Sains dan Teknologi': ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Statistika', 'Sistem Informasi', 'Teknik Lingkungan', 'Teknik Biomedis'],
  'Fakultas Psikologi': ['Psikologi'],
  'Fakultas Ilmu Budaya': ['Bahasa dan Sastra Indonesia', 'Bahasa dan Sastra Inggris', 'Bahasa dan Sastra Jepang', 'Ilmu Sejarah'],
  'Fakultas Kesehatan Masyarakat': ['Kesehatan Masyarakat', 'Gizi'],
  'Fakultas Farmasi': ['Farmasi'],
  'Fakultas Perikanan dan Kelautan': ['Akuakultur', 'Teknologi Hasil Perikanan'],
  'Fakultas Teknologi Maju dan Multidisiplin': ['Teknik Industri', 'Teknik Elektro', 'Rekayasa Nanoteknologi', 'Teknik Robotika dan Kecerdasan Buatan', 'Teknologi Sains Data'],
  'FIKKIA Banyuwangi': ['Kedokteran Hewan (FIKKIA Banyuwangi)', 'Kesehatan Masyarakat (FIKKIA Banyuwangi)', 'Akuakultur (FIKKIA Banyuwangi)', 'Kedokteran (FIKKIA Banyuwangi)'],
  'Fakultas Keperawatan': ['Ilmu Keperawatan'],
  'Fakultas Vokasi': ['D3 Bahasa Inggris', 'D3 Manajemen Pemasaran', 'D3 Perpajakan', 'D3 Akuntansi', 'D3 Keperawatan', 'D4 Akuntansi Bisnis Digital', 'D4 Manajemen Komunikasi Pemasaran', 'D4 Teknik Informatika', 'D4 Manajemen Perkantoran Digital', 'D4 Keselamatan dan Kesehatan Kerja', 'D4 Teknologi Rekayasa Instrumentasi dan Kontrol', 'D4 Perbankan dan Keuangan', 'D4 Destinasi Pariwisata', 'D4 Manajemen Perhotelan', 'D4 Teknologi Radiologi Pencitraan', 'D4 Fisioterapi', 'D4 Pengobatan Tradisional', 'D4 Teknologi Laboratorium Medik', 'D4 Teknologi Kesehatan Gigi', 'Teknologi Veteriner'],
};

export default function RegisterSantriPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nama: '',
    nim: '',
    jenis_kelamin: 'Ikhwan',
    fakultas: '',
    prodi: '',
    email: '',
    password: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // State setelah submit berhasil
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore dari localStorage saat mount (agar halaman status tidak hilang setelah refresh)
  useEffect(() => {
    const savedEmail = localStorage.getItem('yokaji_reg_email');
    if (savedEmail) {
      setRegisteredEmail(savedEmail);
      setRegistered(true);
      checkStatusOnce(savedEmail);
      startPolling(savedEmail);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // Cek status sekali (immediate, tanpa menunggu interval)
  const checkStatusOnce = async (email: string) => {
    try {
      const res = await api.get(`/check-status?email=${encodeURIComponent(email)}&role=santri`);
      const status = res.data?.status as 'pending' | 'approved' | 'rejected';
      if (status === 'approved' || status === 'rejected') {
        setApprovalStatus(status);
        if (pollingRef.current) clearInterval(pollingRef.current);
        localStorage.removeItem('yokaji_reg_email');
      }
    } catch {
      // silent — tetap polling
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'fakultas') {
      setForm({ ...form, fakultas: value, prodi: '' });
    } else {
      setForm({ ...form, [name]: value });
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/register', { ...form, role: 'santri' });
      localStorage.setItem('yokaji_reg_email', form.email);
      setRegisteredEmail(form.email);
      setRegistered(true);
      await checkStatusOnce(form.email); // cek langsung, tidak tunggu 10 detik
      startPolling(form.email);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Pendaftaran gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (email: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current); // hindari double interval
    // Cek status setiap 10 detik
    pollingRef.current = setInterval(() => checkStatusOnce(email), 10000);
  };

  const prodiList = form.fakultas ? FAKULTAS_PRODI[form.fakultas] ?? [] : [];

  // ── Halaman sukses setelah daftar ─────────────────────────────────────────
  if (registered) {
    const steps = [
      {
        key: 'submitted',
        label: 'Form pendaftaran terisi',
        desc: 'Data kamu sudah kami terima',
        doneWhen: ['pending', 'approved', 'rejected'],
      },
      {
        key: 'waiting',
        label: approvalStatus === 'rejected' ? 'Pendaftaran ditolak' : 'Menunggu verifikasi Admin',
        desc: approvalStatus === 'rejected'
          ? 'Hubungi pengurus UKM untuk info lebih lanjut'
          : 'Admin akan meninjau akunmu segera',
        doneWhen: ['approved', 'rejected'],
        activeWhen: ['pending'],
        isRejected: approvalStatus === 'rejected',
      },
      {
        key: 'active',
        label: 'Akun aktif & bisa login',
        desc: 'Kamu akan bisa login setelah disetujui',
        doneWhen: ['approved'],
        activeWhen: [] as string[],
      },
    ];

    const getStepState = (step: typeof steps[0]) => {
      if (step.isRejected) return 'rejected';
      if (step.doneWhen.includes(approvalStatus)) return 'done';
      if ('activeWhen' in step && (step.activeWhen as string[]).includes(approvalStatus)) return 'active';
      return 'pending';
    };

    return (
      <div style={{ minHeight: '100vh', background: '#F5F5F0', display: 'flex', fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
          * { box-sizing: border-box; }
          .reg-left { width:420px; min-height:100vh; background:#1B4332; display:flex; flex-direction:column; justify-content:space-between; padding:2.5rem 2.5rem 2rem; position:relative; overflow:hidden; flex-shrink:0; }
          .ornament { position:absolute; bottom:-60px; right:-60px; width:320px; height:320px; border:1.5px solid rgba(201,168,76,0.18); border-radius:50%; }
          .ornament2 { position:absolute; bottom:-20px; right:-20px; width:220px; height:220px; border:1.5px solid rgba(201,168,76,0.12); border-radius:50%; }
          .ornament-top { position:absolute; top:-80px; left:-80px; width:280px; height:280px; border:1.5px solid rgba(201,168,76,0.1); border-radius:50%; }
          @keyframes spin { to { transform:rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
          .spin { animation: spin 1.2s linear infinite; }
          .pulse-dot { animation: pulse 1.8s ease-in-out infinite; }
          @media (max-width:768px) { .reg-left { display:none; } }
        `}</style>

        {/* Panel Kiri */}
        <div className="reg-left">
          <div className="ornament" /><div className="ornament2" /><div className="ornament-top" />
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'3.5rem' }}>
              <svg width="40" height="40" viewBox="0 0 38 38" fill="none">
                <rect width="38" height="38" rx="9" fill="rgba(255,255,255,0.12)"/>
                <path d="M19 7 C13 12 10 16 10 21 C10 26 14 30 19 31 C24 30 28 26 28 21 C28 16 25 12 19 7Z" fill="#40916C"/>
                <path d="M15 20 Q19 14 23 20" stroke="#C9A84C" strokeWidth="1.5" fill="none"/>
                <line x1="19" y1="18" x2="19" y2="28" stroke="#C9A84C" strokeWidth="1.5"/>
              </svg>
              <div>
                <div style={{ color:'#fff', fontWeight:700, fontSize:'1rem' }}>YoKaji</div>
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'.72rem' }}>UKM Tahfidzul Quran · Unair</div>
              </div>
            </div>
            <h2 style={{ fontFamily:"'Playfair Display', serif", color:'#fff', fontSize:'1.8rem', fontWeight:700, lineHeight:1.35, margin:'0 0 1rem' }}>
              Selamat Datang,<br />Santri Baru!
            </h2>
            <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'.85rem', lineHeight:1.75, margin:0 }}>
              Akunmu telah terdaftar dan sedang menunggu verifikasi dari Admin.
            </p>
          </div>
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ borderLeft:'3px solid rgba(201,168,76,0.5)', paddingLeft:14, color:'rgba(255,255,255,0.45)', fontSize:'.75rem', lineHeight:1.7, fontStyle:'italic' }}>
              &ldquo;Sebaik-baik kalian adalah orang yang mempelajari Al-Qur&apos;an dan mengajarkannya.&rdquo;
              <div style={{ marginTop:4, fontStyle:'normal', color:'rgba(201,168,76,0.7)', fontWeight:600 }}>HR. Bukhari</div>
            </div>
          </div>
        </div>

        {/* Panel Kanan — status */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'2.5rem 2rem', overflowY:'auto' }}>
          <div style={{ width:'100%', maxWidth:480 }}>
            {/* Icon */}
            <div style={{ display:'flex', justifyContent:'center', marginBottom:'1.5rem' }}>
              <div style={{
                width:72, height:72, borderRadius:'50%',
                background: approvalStatus === 'rejected' ? '#FEE2E2' : '#D1FAE5',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                {approvalStatus === 'rejected' ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
            </div>

            {/* Judul */}
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'1.6rem', fontWeight:700, color:'#1C1C1C', textAlign:'center', marginBottom:'.75rem' }}>
              {approvalStatus === 'approved' && 'Akun Disetujui! 🎉'}
              {approvalStatus === 'rejected' && 'Pendaftaran Ditolak'}
              {approvalStatus === 'pending' && 'Pendaftaran Berhasil! 🎓'}
            </h2>
            <p style={{ textAlign:'center', fontSize:'.88rem', color:'#6B7280', lineHeight:1.7, marginBottom:'1.75rem' }}>
              {approvalStatus === 'approved' && <>Akunmu sudah <strong style={{ color:'#1B4332' }}>disetujui Admin</strong>. Kamu sekarang bisa login dan mulai setoran hafalan.</>}
              {approvalStatus === 'rejected' && 'Pendaftaranmu tidak disetujui. Silakan hubungi pengurus UKM untuk informasi lebih lanjut.'}
              {approvalStatus === 'pending' && <>Akun Santri kamu sudah terdaftar dan sedang menunggu <strong>persetujuan Admin</strong>. Kamu baru bisa login setelah akun disetujui.</>}
            </p>

            {/* Status tracker */}
            <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'1.25rem 1.5rem', marginBottom:'1.25rem' }}>
              <div style={{ fontSize:'.7rem', fontWeight:700, color:'#9CA3AF', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:'1rem' }}>
                STATUS PENDAFTARAN
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {steps.map((step, i) => {
                  const state = getStepState(step);
                  const isLast = i === steps.length - 1;

                  const circleColor =
                    state === 'done' ? '#1B4332' :
                    state === 'rejected' ? '#DC2626' :
                    state === 'active' ? '#D97706' : '#D1D5DB';
                  const labelColor =
                    state === 'done' ? '#1B4332' :
                    state === 'rejected' ? '#DC2626' :
                    state === 'active' ? '#D97706' : '#9CA3AF';

                  return (
                    <div key={step.key} style={{ display:'flex', gap:14, alignItems:'stretch' }}>
                      {/* Circle + connector */}
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0, width:28 }}>
                        <div style={{
                          width:28, height:28, borderRadius:'50%',
                          background: state === 'done' ? '#1B4332' : state === 'rejected' ? '#DC2626' : 'transparent',
                          border: state === 'done' || state === 'rejected' ? 'none' : `2px solid ${circleColor}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          flexShrink:0,
                        }}>
                          {state === 'done' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                          {state === 'rejected' && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          )}
                          {state === 'active' && (
                            <div className="pulse-dot" style={{ width:10, height:10, borderRadius:'50%', background:'#D97706' }} />
                          )}
                          {state === 'pending' && (
                            <div style={{ width:8, height:8, borderRadius:'50%', background:'#D1D5DB' }} />
                          )}
                        </div>
                        {!isLast && (
                          <div style={{
                            width:2, flex:1, minHeight:20, marginTop:2, marginBottom:2,
                            background: state === 'done' ? '#1B4332' : state === 'rejected' ? '#FCA5A5' : '#E5E7EB',
                            borderRadius:2,
                          }} />
                        )}
                      </div>
                      {/* Label */}
                      <div style={{ paddingBottom: isLast ? 0 : 16, paddingTop:3 }}>
                        <div style={{ fontSize:'.85rem', fontWeight:600, color: labelColor, marginBottom:2 }}>
                          {step.label}
                        </div>
                        <div style={{ fontSize:'.75rem', color:'#9CA3AF' }}>{step.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Polling indicator */}
            {approvalStatus === 'pending' && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'.65rem 1rem', background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10, marginBottom:'1.25rem' }}>
                <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                <span style={{ fontSize:'.78rem', color:'#6B7280' }}>Mengecek status secara otomatis...</span>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={() => router.push('/login')}
              style={{
                width:'100%', background:'#1B4332', color:'#fff', border:'none',
                borderRadius:10, padding:'.82rem', fontSize:'.9rem', fontWeight:600,
                cursor:'pointer', fontFamily:'inherit', transition:'background .2s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = '#2D6A4F')}
              onMouseOut={e => (e.currentTarget.style.background = '#1B4332')}
            >
              Ke Halaman Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  // ── End halaman sukses ──────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F5F0',
      display: 'flex',
      fontFamily: "'Inter', 'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }

        /* ── Left panel ── */
        .reg-left {
          width: 420px;
          min-height: 100vh;
          background: #1B4332;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2.5rem 2.5rem 2rem;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        /* ── Right panel ── */
        .reg-right {
          flex: 1;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 2.5rem 2rem;
          overflow-y: auto;
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .reg-left { display: none; }
          .reg-right {
            padding: 0 !important;
            align-items: stretch !important;
          }
          .reg-card {
            padding: 2rem 1.4rem 2.5rem !important;
            min-height: 100vh;
          }
          .mobile-brand { display: flex !important; }
        }

        /* ── Card pembungkus form ── */
        .reg-card {
          width: 100%;
          max-width: 480px;
          padding-top: 0.5rem;
          padding-bottom: 2rem;
        }

        /* Brand strip khusus mobile */
        .mobile-brand {
          display: none;
          align-items: center;
          gap: 10px;
          margin-bottom: 2rem;
          padding: 1rem 1.4rem;
          background: #1B4332;
          border-radius: 14px;
        }

        /* Ornamen dekoratif */
        .ornament { position: absolute; bottom: -60px; right: -60px; width: 320px; height: 320px; border: 1.5px solid rgba(201,168,76,0.18); border-radius: 50%; }
        .ornament2 { position: absolute; bottom: -20px; right: -20px; width: 220px; height: 220px; border: 1.5px solid rgba(201,168,76,0.12); border-radius: 50%; }
        .ornament-top { position: absolute; top: -80px; left: -80px; width: 280px; height: 280px; border: 1.5px solid rgba(201,168,76,0.1); border-radius: 50%; }

        /* ── Input ── */
        .reg-input {
          width: 100%;
          border: 1.5px solid #E2E0D6;
          border-radius: 10px;
          padding: .72rem 1rem;
          font-size: .875rem;
          background: #FAFAF7;
          font-family: inherit;
          color: #1C1C1C;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
          appearance: none;
          -webkit-appearance: none;
        }
        .reg-input:focus {
          border-color: #1B4332;
          box-shadow: 0 0 0 3px rgba(27,67,50,0.12);
          background: #fff;
        }
        .reg-input:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Submit button ── */
        .reg-btn {
          width: 100%;
          background: #1B4332;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: .82rem;
          font-size: .9rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background .2s, transform .15s;
          letter-spacing: .01em;
        }
        .reg-btn:hover:not(:disabled) { background: #2D6A4F; transform: translateY(-1px); }
        .reg-btn:disabled { opacity: .55; cursor: not-allowed; }

        /* ── Tampilkan / sembunyikan password ── */
        .show-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          font-size: .72rem; color: #6B7280;
          font-family: inherit; font-weight: 600;
          padding: 4px 6px; border-radius: 4px; transition: color .15s;
        }
        .show-btn:hover { color: #1B4332; }

        .link-green { color: #1B4332; font-weight: 600; text-decoration: none; transition: color .15s; }
        .link-green:hover { color: #40916C; }

        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          color: #6B7280; font-size: .8rem; font-weight: 500;
          text-decoration: none; padding: 6px 0; transition: color .15s;
          font-family: inherit; background: none; border: none; cursor: pointer;
        }
        .back-btn:hover { color: #1B4332; }

        /* NIM + Jenis Kelamin row */
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }
      `}</style>

      {/* ── Panel Kiri (hanya desktop) ── */}
      <div className="reg-left">
        <div className="ornament" /><div className="ornament2" /><div className="ornament-top" />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '3.5rem' }}>
            <svg width="40" height="40" viewBox="0 0 38 38" fill="none">
              <rect width="38" height="38" rx="9" fill="rgba(255,255,255,0.12)"/>
              <path d="M19 7 C13 12 10 16 10 21 C10 26 14 30 19 31 C24 30 28 26 28 21 C28 16 25 12 19 7Z" fill="#40916C"/>
              <path d="M15 20 Q19 14 23 20" stroke="#C9A84C" strokeWidth="1.5" fill="none"/>
              <line x1="19" y1="18" x2="19" y2="28" stroke="#C9A84C" strokeWidth="1.5"/>
            </svg>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', letterSpacing: '.01em' }}>YoKaji</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.72rem' }}>UKM Tahfidzul Quran · Unair</div>
            </div>
          </div>

          <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#fff', fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.35, margin: '0 0 1rem' }}>
            Bergabung &amp; Mulai<br />Perjalanan Hafalan
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '.85rem', lineHeight: 1.75, margin: 0 }}>
            Daftarkan diri kamu sebagai santri dan mulai catat progres hafalan bersama komunitas Tahfidz Unair.
          </p>

          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { num: '01', label: 'Isi form pendaftaran', desc: 'Lengkapi data diri dan akademikmu' },
              { num: '02', label: 'Tunggu persetujuan', desc: 'Admin akan memverifikasi akunmu' },
              { num: '03', label: 'Mulai setoran hafalan', desc: 'Login dan pantau progres harianmu' },
            ].map((step) => (
              <div key={step.num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  border: '1.5px solid rgba(201,168,76,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: '.65rem', fontWeight: 700,
                  color: 'rgba(201,168,76,0.8)', letterSpacing: '.05em',
                }}>
                  {step.num}
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: '.83rem', fontWeight: 600, marginBottom: 2 }}>{step.label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.75rem' }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ borderLeft: '3px solid rgba(201,168,76,0.5)', paddingLeft: 14, color: 'rgba(255,255,255,0.45)', fontSize: '.75rem', lineHeight: 1.7, fontStyle: 'italic' }}>
            &ldquo;Sebaik-baik kalian adalah orang yang mempelajari Al-Qur&apos;an dan mengajarkannya.&rdquo;
            <div style={{ marginTop: 4, fontStyle: 'normal', color: 'rgba(201,168,76,0.7)', fontWeight: 600 }}>HR. Bukhari</div>
          </div>
        </div>
      </div>

      {/* ── Panel Kanan (form) ── */}
      <div className="reg-right">
        <div className="reg-card">

          {/* Brand mini khusus mobile */}
          <div className="mobile-brand">
            <svg width="34" height="34" viewBox="0 0 38 38" fill="none">
              <rect width="38" height="38" rx="9" fill="rgba(255,255,255,0.12)"/>
              <path d="M19 7 C13 12 10 16 10 21 C10 26 14 30 19 31 C24 30 28 26 28 21 C28 16 25 12 19 7Z" fill="#40916C"/>
              <path d="M15 20 Q19 14 23 20" stroke="#C9A84C" strokeWidth="1.5" fill="none"/>
              <line x1="19" y1="18" x2="19" y2="28" stroke="#C9A84C" strokeWidth="1.5"/>
            </svg>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '.92rem' }}>YoKaji</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.68rem' }}>UKM Tahfidzul Quran · Unair</div>
            </div>
          </div>

          {/* Kembali */}
          <div style={{ marginBottom: '1.75rem' }}>
            <Link href="/register/pilih" className="back-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Kembali
            </Link>
          </div>

          {/* Header */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.65rem', color: '#1B4332', margin: '0 0 .3rem', fontWeight: 700 }}>
              Daftar sebagai Santri 🎓
            </h1>
            <p style={{ fontSize: '.83rem', color: '#6B7280', margin: 0 }}>
              UKM Tahfidzul Qur&apos;an · Universitas Airlangga
            </p>
          </div>

          {/* Info banner */}
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '.75rem 1rem', fontSize: '.82rem', color: '#1E40AF', marginBottom: '1.4rem', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>ℹ️</span>
            <span>Setelah mendaftar, akun kamu akan <strong>menunggu persetujuan Admin</strong> sebelum bisa login.</span>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid rgba(220,53,69,.2)', borderRadius: 10, padding: '.75rem 1rem', fontSize: '.82rem', color: '#991B1B', marginBottom: '1.1rem', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>Nama Lengkap</label>
              <input className="reg-input" name="nama" type="text" required placeholder="Nama lengkap sesuai KTM" value={form.nama} onChange={handleChange} />
            </div>

            <div className="form-row">
              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>NIM</label>
                <input className="reg-input" name="nim" type="text" required placeholder="NIM Unair" value={form.nim} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>Jenis Kelamin</label>
                <select className="reg-input" name="jenis_kelamin" value={form.jenis_kelamin} onChange={handleChange}>
                  <option value="Ikhwan">Ikhwan</option>
                  <option value="Akhwat">Akhwat</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>Fakultas</label>
              <select className="reg-input" name="fakultas" required value={form.fakultas} onChange={handleChange}>
                <option value="">-- Pilih Fakultas --</option>
                {Object.keys(FAKULTAS_PRODI).map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>Program Studi</label>
              <select className="reg-input" name="prodi" required value={form.prodi} onChange={handleChange} disabled={!form.fakultas}>
                <option value="">-- Pilih Program Studi --</option>
                {prodiList.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>Email</label>
              <input className="reg-input" name="email" type="email" required placeholder="email@gmail.com" value={form.email} onChange={handleChange} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input className="reg-input" name="password" type={showPass ? 'text' : 'password'} required placeholder="Minimal 8 karakter" value={form.password} onChange={handleChange} style={{ paddingRight: '5.5rem' }} />
                <button type="button" className="show-btn" onClick={() => setShowPass(!showPass)}>
                  {showPass ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
            </div>

            <button className="reg-btn" type="submit" disabled={loading} style={{ marginTop: '.25rem' }}>
              {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
            </button>
          </form>

          <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '1.4rem 0 1.1rem' }} />

          <p style={{ textAlign: 'center', fontSize: '.82rem', color: '#6B7280', margin: 0 }}>
            Sudah punya akun?{' '}
            <Link href="/login" className="link-green">Masuk sekarang</Link>
          </p>

        </div>
      </div>
    </div>
  );
}