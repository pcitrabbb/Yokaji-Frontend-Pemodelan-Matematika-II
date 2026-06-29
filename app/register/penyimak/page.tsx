'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

type Status = 'idle' | 'loading' | 'success' | 'duplicate_email' | 'error';
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'not_found';
// not_found = admin hapus langsung tanpa reject → perlakukan sama seperti rejected

export default function RegisterPenyimakPage() {
  const [form, setForm] = useState({
    nama: '', email: '', password: '', jenis_kelamin: 'Akhwat', no_hp: '',
  });
  const [status, setStatus]             = useState<Status>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [approval, setApproval]         = useState<ApprovalStatus>('pending');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await api.post('/register-penyimak', form);
      localStorage.setItem('register_email', form.email);
      // Simpan semua data profil untuk ditampilkan di dashboard & halaman profil
      localStorage.setItem('penyimak_profile', JSON.stringify({
        nama: form.nama,
        email: form.email,
        no_hp: form.no_hp,
        jenis_kelamin: form.jenis_kelamin,
      }));
      setStatus('success');
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      if (errors?.email) setStatus('duplicate_email');
      else setStatus('error');
    }
  };

  useEffect(() => {
    if (status !== 'success') return;
    const email = localStorage.getItem('register_email') ?? '';
    if (!email) return;

    const check = async () => {
      try {
        const res = await api.get(`/check-status?email=${encodeURIComponent(email)}`);
        const s: ApprovalStatus = res.data?.status ?? 'pending';
        setApproval(s);
        if (s === 'approved' || s === 'rejected' || s === 'not_found') {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch { /* diam, lanjut polling */ }
    };

    check();
    intervalRef.current = setInterval(check, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [status]);

  const approved = approval === 'approved';
  const rejected = approval === 'rejected' || approval === 'not_found';
  const polling  = approval === 'pending';

  const steps = [
    { label: 'Form pendaftaran terisi',   desc: 'Data kamu sudah kami terima',                                                                                   done: true     },
    { label: 'Menunggu verifikasi Admin', desc: approved ? 'Admin sudah menyetujui akunmu ✓' : rejected ? 'Admin menolak pendaftaranmu' : 'Admin akan meninjau akunmu segera', done: approved, rejected: rejected },
    { label: 'Akun aktif & bisa login',   desc: approved ? 'Kamu sekarang bisa login!'        : rejected ? 'Pendaftaran tidak dapat dilanjutkan' : 'Kamu akan bisa login setelah disetujui', done: approved, rejected: rejected && false },
  ];

  /* ─────────────────────────────────────────────────────────────────
     CSS bersama — dipakai oleh kedua state (success & form)
  ───────────────────────────────────────────────────────────────── */
  const sharedStyle = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
    * { box-sizing: border-box; }

    /* ── Left panel ── */
    .peny-left {
      width: 420px; min-height: 100vh; background: #1B4332;
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 2.5rem 2.5rem 2rem; position: relative; overflow: hidden; flex-shrink: 0;
    }

    /* ── Right panel ── */
    .peny-right {
      flex: 1; display: flex; align-items: flex-start;
      justify-content: center; padding: 2.5rem 2rem; overflow-y: auto;
    }
    .peny-right-center {
      flex: 1; display: flex; align-items: center;
      justify-content: center; padding: 2.5rem 2rem;
    }

    /* ── Mobile ── */
    @media (max-width: 768px) {
      .peny-left { display: none; }
      .peny-right, .peny-right-center {
        padding: 0 !important;
        align-items: stretch !important;
      }
      .peny-card {
        padding: 2rem 1.4rem 2.5rem !important;
        min-height: 100vh;
      }
      .mobile-brand { display: flex !important; }
    }

    /* ── Card pembungkus ── */
    .peny-card {
      width: 100%;
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

    /* Ornamen */
    .ornament   { position: absolute; bottom: -60px; right: -60px; width: 320px; height: 320px; border: 1.5px solid rgba(201,168,76,0.18); border-radius: 50%; }
    .ornament2  { position: absolute; bottom: -20px; right: -20px; width: 220px; height: 220px; border: 1.5px solid rgba(201,168,76,0.12); border-radius: 50%; }
    .ornament-top { position: absolute; top: -80px; left: -80px; width: 280px; height: 280px; border: 1.5px solid rgba(201,168,76,0.10); border-radius: 50%; }

    /* ── Input ── */
    .peny-input {
      width: 100%; border: 1.5px solid #E2E0D6; border-radius: 10px;
      padding: .72rem 1rem; font-size: .875rem; background: #FAFAF7;
      font-family: inherit; color: #1C1C1C; outline: none;
      transition: border-color .2s, box-shadow .2s;
      appearance: none; -webkit-appearance: none;
    }
    .peny-input:focus { border-color: #1B4332; box-shadow: 0 0 0 3px rgba(27,67,50,0.12); background: #fff; }

    /* ── Submit button ── */
    .peny-btn {
      width: 100%; background: #1B4332; color: #fff; border: none;
      border-radius: 10px; padding: .82rem; font-size: .9rem; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: background .2s, transform .15s; letter-spacing: .01em;
    }
    .peny-btn:hover:not(:disabled) { background: #2D6A4F; transform: translateY(-1px); }
    .peny-btn:disabled { opacity: .55; cursor: not-allowed; }

    /* ── Tampilkan / sembunyikan password ── */
    .show-btn {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      font-size: .72rem; color: #6B7280; font-family: inherit; font-weight: 600;
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

    /* Jenis Kelamin + No HP row */
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }

    @keyframes spin  { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
  `;

  /* Logo SVG — dipakai ulang di beberapa tempat */
  const LogoSVG = ({ size = 40 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 38 38" fill="none">
      <rect width="38" height="38" rx="9" fill="rgba(255,255,255,0.12)"/>
      <path d="M19 7 C13 12 10 16 10 21 C10 26 14 30 19 31 C24 30 28 26 28 21 C28 16 25 12 19 7Z" fill="#40916C"/>
      <path d="M15 20 Q19 14 23 20" stroke="#C9A84C" strokeWidth="1.5" fill="none"/>
      <line x1="19" y1="18" x2="19" y2="28" stroke="#C9A84C" strokeWidth="1.5"/>
    </svg>
  );

  /* Panel kiri — sama untuk kedua state */
  const LeftPanel = ({ title, subtitle }: { title: React.ReactNode; subtitle: string }) => (
    <div className="peny-left">
      <div className="ornament" /><div className="ornament2" /><div className="ornament-top" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '3.5rem' }}>
          <LogoSVG />
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', letterSpacing: '.01em' }}>YoKaji</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.72rem' }}>UKM Tahfidzul Quran · Unair</div>
          </div>
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#fff', fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.35, margin: '0 0 1rem' }}>
          {title}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '.85rem', lineHeight: 1.75, margin: 0 }}>
          {subtitle}
        </p>
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ borderLeft: '3px solid rgba(201,168,76,0.5)', paddingLeft: 14, color: 'rgba(255,255,255,0.45)', fontSize: '.75rem', lineHeight: 1.7, fontStyle: 'italic' }}>
          &ldquo;Sebaik-baik kalian adalah orang yang mempelajari Al-Qur&apos;an dan mengajarkannya.&rdquo;
          <div style={{ marginTop: 4, fontStyle: 'normal', color: 'rgba(201,168,76,0.7)', fontWeight: 600 }}>HR. Bukhari</div>
        </div>
      </div>
    </div>
  );

  /* Brand strip mobile — sama untuk kedua state */
  const MobileBrand = () => (
    <div className="mobile-brand">
      <LogoSVG size={34} />
      <div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '.92rem' }}>YoKaji</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.68rem' }}>UKM Tahfidzul Quran · Unair</div>
      </div>
    </div>
  );

  /* ── SUCCESS STATE ── */
  if (status === 'success') {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F5F0', display: 'flex', fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
        <style>{sharedStyle}</style>

        <LeftPanel
          title={approved ? 'Akun Kamu\nDisetujui! 🎉' : rejected ? 'Pendaftaran\nDitolak' : 'Selamat Datang,\nPenyimak Baru!'}
          subtitle={approved
            ? 'Akunmu sudah disetujui Admin. Sekarang kamu sudah bisa login!'
            : rejected
            ? 'Maaf, pendaftaranmu belum bisa diterima saat ini. Kamu bisa mencoba mendaftar ulang.'
            : 'Akun kamu telah terdaftar dan sedang menunggu verifikasi dari Admin.'
          }
        />

        <div className="peny-right-center">
          <div className="peny-card" style={{ maxWidth: 440, textAlign: 'center' }}>

            {/* Brand mobile */}
            <MobileBrand />

            {/* Icon */}
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: approved ? '#D1FAE5' : rejected ? '#FEE2E2' : '#D8F3DC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', transition: 'background .5s' }}>
              {rejected ? (
                <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
                  <path d="M8 8l16 16M24 8L8 24" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
                  <path d="M6 16l7 7 13-13" stroke="#40916C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>

            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', color: rejected ? '#991B1B' : '#1B4332', margin: '0 0 .75rem' }}>
              {approved ? 'Akun Disetujui! 🎉' : rejected ? 'Pendaftaran Ditolak' : 'Pendaftaran Berhasil! 🎉'}
            </h2>
            <p style={{ fontSize: '.9rem', color: '#6B7280', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              {approved
                ? 'Akunmu sudah diapprove oleh Admin. Sekarang kamu bisa login!'
                : rejected
                ? <>Maaf, pendaftaranmu sebagai Penyimak <strong style={{ color: '#991B1B' }}>tidak disetujui</strong> oleh Admin. Kamu bisa menghubungi pengurus atau mencoba mendaftar ulang.</>
                : <>Akun Penyimak kamu sudah terdaftar dan sedang menunggu{' '}
                    <strong style={{ color: '#1B4332' }}>persetujuan Admin</strong>.
                    Kamu baru bisa login setelah akun disetujui.</>
              }
            </p>

            {/* Status box */}
            <div style={{ background: rejected ? '#FEF2F2' : '#F0FDF4', borderRadius: 14, padding: '1.2rem 1.4rem', marginBottom: '1.6rem', textAlign: 'left' }}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, color: '#6B7280', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                STATUS PENDAFTARAN
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {steps.map((step, i) => {
                  const isActive = !step.done && !step.rejected && (i === 0 || steps[i - 1].done);
                  const isRejected = step.rejected;
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                        background: step.done ? '#40916C' : isRejected ? '#DC2626' : 'transparent',
                        border: step.done ? 'none' : isRejected ? 'none' : isActive ? '2px solid #C9A84C' : '2px solid #D1D5DB',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .5s',
                      }}>
                        {step.done ? (
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <path d="M1.5 5.5l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : isRejected ? (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 2l6 6M8 2L2 8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        ) : isActive ? (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A84C', animation: 'pulse 1.4s ease-in-out infinite' }} />
                        ) : (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D1D5DB' }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '.85rem', fontWeight: 600, color: step.done ? '#1B4332' : isRejected ? '#991B1B' : isActive ? '#92400E' : '#9CA3AF', transition: 'color .5s' }}>
                          {step.label}
                        </div>
                        <div style={{ fontSize: '.74rem', color: '#9CA3AF', marginTop: 2 }}>{step.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {polling && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #40916C', borderTopColor: 'transparent', animation: 'spin .85s linear infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: '.72rem', color: '#6B7280' }}>Mengecek status secara otomatis...</span>
                </div>
              )}

              {rejected && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(220,53,69,0.15)', fontSize: '.78rem', color: '#991B1B', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0 }}>💡</span>
                  <span>Untuk informasi lebih lanjut, hubungi pengurus UKM Tahfidzul Qur'an Unair.</span>
                </div>
              )}
            </div>

            {rejected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link href="/register/penyimak" style={{ display: 'block', background: '#1B4332', color: '#fff', padding: '.85rem', borderRadius: 10, fontWeight: 600, fontSize: '.9rem', textDecoration: 'none', textAlign: 'center' }}>
                  Daftar Ulang
                </Link>
                <Link href="/" style={{ display: 'block', background: 'transparent', color: '#6B7280', padding: '.75rem', borderRadius: 10, fontWeight: 500, fontSize: '.85rem', textDecoration: 'none', textAlign: 'center', border: '1px solid #E5E7EB' }}>
                  Kembali ke Beranda
                </Link>
              </div>
            ) : (
              <Link href="/login" style={{ display: 'block', background: '#1B4332', color: '#fff', padding: '.85rem', borderRadius: 10, fontWeight: 600, fontSize: '.9rem', textDecoration: 'none', textAlign: 'center' }}>
                {approved ? 'Login Sekarang' : 'Ke Halaman Login'}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── MAIN FORM ── */
  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F0', display: 'flex', fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
      <style>{sharedStyle}</style>

      {/* Panel Kiri */}
      <div className="peny-left">
        <div className="ornament" /><div className="ornament2" /><div className="ornament-top" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '3.5rem' }}>
            <LogoSVG />
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', letterSpacing: '.01em' }}>YoKaji</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.72rem' }}>UKM Tahfidzul Quran · Unair</div>
            </div>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#fff', fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.35, margin: '0 0 1rem' }}>
            Jadilah Penyimak<br />yang Amanah
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '.85rem', lineHeight: 1.75, margin: 0 }}>
            Bantu santri berkembang dengan menyimak dan membimbing hafalan mereka secara terstruktur.
          </p>
          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { num: '01', label: 'Daftarkan akun penyimak', desc: 'Isi data diri dan kontak kamu' },
              { num: '02', label: 'Tunggu verifikasi Admin',  desc: 'Admin memverifikasi identitasmu' },
              { num: '03', label: 'Mulai menyimak hafalan',   desc: 'Kelola sesi setoran santri binaanmu' },
            ].map(step => (
              <div key={step.num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '.65rem', fontWeight: 700, color: 'rgba(201,168,76,0.8)', letterSpacing: '.05em' }}>
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

      {/* Panel Kanan */}
      <div className="peny-right">
        <div className="peny-card" style={{ maxWidth: 440 }}>

          {/* Brand mobile */}
          <MobileBrand />

          {/* Kembali */}
          <div style={{ marginBottom: '1.75rem' }}>
            <Link href="/" className="back-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Kembali
            </Link>
          </div>

          {/* Header */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.65rem', color: '#1B4332', margin: '0 0 .3rem', fontWeight: 700 }}>
              Daftar sebagai Penyimak 🎙️
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

          {/* Error states */}
          {status === 'duplicate_email' && (
            <div style={{ background: '#FEF2F2', border: '1px solid rgba(220,53,69,.2)', borderRadius: 10, padding: '.75rem 1rem', fontSize: '.82rem', color: '#991B1B', marginBottom: '1.1rem', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <div>
                <strong>Email sudah terdaftar.</strong> Akunmu mungkin sedang menunggu approval atau sudah aktif.{' '}
                <Link href="/login" className="link-green">Login di sini</Link>
              </div>
            </div>
          )}
          {status === 'error' && (
            <div style={{ background: '#FEF2F2', border: '1px solid rgba(220,53,69,.2)', borderRadius: 10, padding: '.75rem 1rem', fontSize: '.82rem', color: '#991B1B', marginBottom: '1.1rem', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <span>Registrasi gagal. Periksa kembali data kamu dan coba lagi.</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>Nama Lengkap</label>
              <input className="peny-input" type="text" placeholder="Nama lengkap" required
                value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} />
            </div>
            <div className="form-row">
              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>Jenis Kelamin</label>
                <select className="peny-input" value={form.jenis_kelamin} onChange={e => setForm({ ...form, jenis_kelamin: e.target.value })}>
                  <option value="Akhwat">Akhwat</option>
                  <option value="Ikhwan">Ikhwan</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>No. HP</label>
                <input className="peny-input" type="tel" placeholder="08xxxxxxxxxx" required
                  value={form.no_hp} onChange={e => setForm({ ...form, no_hp: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>Email</label>
              <input className="peny-input" type="email" placeholder="email@gmail.com" required
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input className="peny-input" type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter" required
                  style={{ paddingRight: '5.5rem' }}
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <button type="button" className="show-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
            </div>
            <button className="peny-btn" type="submit" disabled={status === 'loading'} style={{ marginTop: '.25rem' }}>
              {status === 'loading' ? 'Memproses...' : 'Daftar Sekarang'}
            </button>
          </form>

          <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '1.4rem 0 1.1rem' }} />
          <p style={{ textAlign: 'center', fontSize: '.82rem', color: '#6B7280', margin: '0 0 .4rem' }}>
            Sudah punya akun?{' '}<Link href="/login" className="link-green">Login di sini</Link>
          </p>
          <p style={{ textAlign: 'center', fontSize: '.82rem', color: '#6B7280', margin: 0 }}>
            Daftar sebagai Santri?{' '}<Link href="/register/santri" className="link-green">Klik di sini</Link>
          </p>
        </div>
      </div>
    </div>
  );
}