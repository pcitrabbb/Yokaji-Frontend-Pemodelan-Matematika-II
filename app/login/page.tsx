'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type LoginError = '' | 'pending' | 'invalid' | 'error';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<LoginError>('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/login', form);
      const data = res.data;

      const token = data?.token ?? data?.access_token;
      if (token) localStorage.setItem('token', token);

      const role: string = (
        data?.user?.role ??
        data?.role ??
        data?.data?.role ??
        data?.data?.user?.role ??
        ''
      ).toString().trim().toLowerCase();

      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else if (role === 'penyimak') {
        router.push('/penyimak/dashboard');
      } else {
        router.push('/santri/dashboard');
      }
    } catch (err: any) {
      const msg: string = err.response?.data?.message ?? '';
      if (
        msg.toLowerCase().includes('pending') ||
        msg.toLowerCase().includes('approval') ||
        msg.toLowerCase().includes('belum disetujui')
      ) {
        setError('pending');
      } else if (
        err.response?.status === 401 ||
        msg.toLowerCase().includes('credentials') ||
        msg.toLowerCase().includes('password')
      ) {
        setError('invalid');
      } else {
        setError('error');
      }
    }
    setLoading(false);
  };

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
        .login-left {
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
        .login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 2rem;
        }

        /* ── Mobile: sembunyikan panel kiri, full-width form ── */
        @media (max-width: 768px) {
          .login-left { display: none; }
          .login-right {
            padding: 0 !important;
            align-items: stretch !important;
          }
          .login-card {
            border-radius: 0 !important;
            min-height: 100vh;
            padding: 2rem 1.4rem 2.5rem !important;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          /* Tampilkan mini-header brand di mobile */
          .mobile-brand { display: flex !important; }
        }

        /* ── Card pembungkus form ── */
        .login-card {
          width: 100%;
          max-width: 400px;
          background: transparent;
          padding: 0;
        }

        /* Brand strip khusus mobile (disembunyikan di desktop) */
        .mobile-brand {
          display: none;
          align-items: center;
          gap: 10px;
          margin-bottom: 2rem;
          padding: 1rem 1.4rem;
          background: #1B4332;
          border-radius: 14px;
        }

        /* Ornamen dekoratif panel kiri */
        .ornament {
          position: absolute;
          bottom: -60px; right: -60px;
          width: 320px; height: 320px;
          border: 1.5px solid rgba(201,168,76,0.18);
          border-radius: 50%;
        }
        .ornament2 {
          position: absolute;
          bottom: -20px; right: -20px;
          width: 220px; height: 220px;
          border: 1.5px solid rgba(201,168,76,0.12);
          border-radius: 50%;
        }
        .ornament-top {
          position: absolute;
          top: -80px; left: -80px;
          width: 280px; height: 280px;
          border: 1.5px solid rgba(201,168,76,0.1);
          border-radius: 50%;
        }

        /* ── Input ── */
        .login-input {
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
        }
        .login-input:focus {
          border-color: #1B4332;
          box-shadow: 0 0 0 3px rgba(27,67,50,0.12);
          background: #fff;
        }

        /* ── Submit button ── */
        .login-btn {
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
        .login-btn:hover:not(:disabled) {
          background: #2D6A4F;
          transform: translateY(-1px);
        }
        .login-btn:disabled { opacity: .55; cursor: not-allowed; }

        /* ── Tampilkan / sembunyikan password ── */
        .show-btn {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer;
          font-size: .72rem; color: #6B7280;
          font-family: inherit; font-weight: 600;
          padding: 4px 6px; border-radius: 4px;
          transition: color .15s;
        }
        .show-btn:hover { color: #1B4332; }

        .link-green {
          color: #1B4332; font-weight: 600;
          text-decoration: none;
          transition: color .15s;
        }
        .link-green:hover { color: #40916C; }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #6B7280;
          font-size: .8rem;
          font-weight: 500;
          text-decoration: none;
          padding: 6px 0;
          transition: color .15s;
          font-family: inherit;
          background: none;
          border: none;
          cursor: pointer;
        }
        .back-btn:hover { color: #1B4332; }
      `}</style>

      {/* ── Panel Kiri (hanya desktop) ── */}
      <div className="login-left">
        <div className="ornament" />
        <div className="ornament2" />
        <div className="ornament-top" />

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

          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            color: '#fff',
            fontSize: '1.8rem',
            fontWeight: 700,
            lineHeight: 1.35,
            margin: '0 0 1rem',
          }}>
            Platform Manajemen<br />Tahfidz Digital
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '.85rem', lineHeight: 1.75, margin: 0 }}>
            Pantau progres hafalan santri, kelola setoran, dan bimbing dengan lebih terstruktur.
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            borderLeft: '3px solid rgba(201,168,76,0.5)',
            paddingLeft: 14,
            color: 'rgba(255,255,255,0.45)',
            fontSize: '.75rem',
            lineHeight: 1.7,
            fontStyle: 'italic',
          }}>
            &ldquo;Sesungguhnya Al-Qur&apos;an ini memberi petunjuk kepada jalan yang lebih lurus.&rdquo;
            <div style={{ marginTop: 4, fontStyle: 'normal', color: 'rgba(201,168,76,0.7)', fontWeight: 600 }}>
              QS. Al-Isra&apos; : 9
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel Kanan (form) ── */}
      <div className="login-right">
        <div className="login-card">

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

          {/* Kembali ke beranda */}
          <div style={{ marginBottom: '1.75rem' }}>
            <Link href="/" className="back-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Kembali ke Beranda
            </Link>
          </div>

          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.65rem',
              color: '#1B4332',
              margin: '0 0 .3rem',
              fontWeight: 700,
            }}>
              Assalamu&apos;alaikum 👋
            </h1>
            <p style={{ fontSize: '.83rem', color: '#6B7280', margin: 0 }}>
              Masuk ke akun YoKaji kamu · Universitas Airlangga
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>
                Email
              </label>
              <input
                className="login-input"
                type="email"
                placeholder="email@gmail.com"
                required
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password kamu"
                  required
                  style={{ paddingRight: '5.5rem' }}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <button type="button" className="show-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: '-.4rem' }}>
              <Link href="/forgot-password" style={{ fontSize: '.76rem', color: '#6B7280', textDecoration: 'none', fontWeight: 500 }}>
                Lupa password?
              </Link>
            </div>

            {error === 'pending' && (
              <div style={{ background: '#FFFBEB', border: '1px solid rgba(201,168,76,.3)', borderRadius: 10, padding: '.75rem 1rem', fontSize: '.82rem', color: '#92400E', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}>⏳</span>
                <span>Akunmu <strong>sedang menunggu persetujuan Admin</strong>. Pantau email kamu untuk notifikasi.</span>
              </div>
            )}
            {error === 'invalid' && (
              <div style={{ background: '#FEF2F2', border: '1px solid rgba(220,53,69,.2)', borderRadius: 10, padding: '.75rem 1rem', fontSize: '.82rem', color: '#991B1B', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
                <span>Email atau password salah. Coba lagi.</span>
              </div>
            )}
            {error === 'error' && (
              <div style={{ background: '#FEF2F2', border: '1px solid rgba(220,53,69,.2)', borderRadius: 10, padding: '.75rem 1rem', fontSize: '.82rem', color: '#991B1B', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
                <span>Terjadi kesalahan. Coba beberapa saat lagi.</span>
              </div>
            )}

            <button className="login-btn" type="submit" disabled={loading} style={{ marginTop: '.25rem' }}>
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '1.4rem 0 1.1rem' }} />

          <p style={{ textAlign: 'center', fontSize: '.82rem', color: '#6B7280', margin: 0 }}>
            Belum punya akun?{' '}
            <Link href="/register/pilih" className="link-green">Daftar di sini</Link>
          </p>

        </div>
      </div>
    </div>
  );
}