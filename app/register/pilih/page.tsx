'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PilihRolePage() {
  const router = useRouter();

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
        .pilih-left {
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
        .pilih-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 2rem;
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .pilih-left { display: none; }
          .pilih-right {
            padding: 0 !important;
            align-items: stretch !important;
          }
          .pilih-card {
            min-height: 100vh;
            padding: 2rem 1.4rem 2.5rem !important;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .mobile-brand { display: flex !important; }
        }

        /* ── Card pembungkus form ── */
        .pilih-card {
          width: 100%;
          max-width: 420px;
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

        /* Ornamen dekoratif panel kiri */
        .ornament { position: absolute; bottom: -60px; right: -60px; width: 320px; height: 320px; border: 1.5px solid rgba(201,168,76,0.18); border-radius: 50%; }
        .ornament2 { position: absolute; bottom: -20px; right: -20px; width: 220px; height: 220px; border: 1.5px solid rgba(201,168,76,0.12); border-radius: 50%; }
        .ornament-top { position: absolute; top: -80px; left: -80px; width: 280px; height: 280px; border: 1.5px solid rgba(201,168,76,0.1); border-radius: 50%; }

        /* ── Role card ── */
        .role-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #FAFAF7;
          border: 1.5px solid #E2E0D6;
          border-radius: 14px;
          padding: 1.2rem 1.4rem;
          cursor: pointer;
          text-align: left;
          width: 100%;
          transition: border-color .2s, box-shadow .2s, background .2s;
          font-family: inherit;
        }
        .role-card:hover {
          border-color: #1B4332;
          background: #F0FDF4;
          box-shadow: 0 4px 20px rgba(27,67,50,0.10);
        }

        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          color: #6B7280; font-size: .8rem; font-weight: 500;
          text-decoration: none; padding: 6px 0; transition: color .15s;
          font-family: inherit;
        }
        .back-btn:hover { color: #1B4332; }

        .link-green { color: #1B4332; font-weight: 600; text-decoration: none; transition: color .15s; }
        .link-green:hover { color: #40916C; }
      `}</style>

      {/* ── Panel Kiri (hanya desktop) ── */}
      <div className="pilih-left">
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
            Mulai Perjalanan<br />Hafalan Kamu
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '.85rem', lineHeight: 1.75, margin: 0 }}>
            Pilih peran kamu untuk bergabung bersama komunitas Tahfidz Universitas Airlangga.
          </p>

          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { icon: '🎓', title: 'Santri', desc: 'Daftar, booking jadwal, dan pantau progres hafalan kamu setiap hari.' },
              { icon: '🎙️', title: 'Penyimak / Guru', desc: 'Kelola jadwal, input penilaian, dan bimbing santri binaanmu.' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: '.83rem', fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.75rem', lineHeight: 1.5 }}>{item.desc}</div>
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

      {/* ── Panel Kanan (pilih role) ── */}
      <div className="pilih-right">
        <div className="pilih-card">

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
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.65rem', color: '#1B4332', margin: '0 0 .3rem', fontWeight: 700 }}>
              Daftar ke YoKaji 🌿
            </h1>
            <p style={{ fontSize: '.83rem', color: '#6B7280', margin: 0 }}>
              Pilih peran kamu untuk memulai pendaftaran
            </p>
          </div>

          {/* Role cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Santri */}
            <button className="role-card" onClick={() => router.push('/register/santri')}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#D8F3DC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                🎓
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem', color: '#1B4332' }}>Santri</div>
                <div style={{ fontSize: '.78rem', color: '#6B7280', marginTop: 3, lineHeight: 1.5 }}>
                  Booking jadwal &amp; pantau riwayat hafalan
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            {/* Penyimak */}
            <button className="role-card" onClick={() => router.push('/register/penyimak')}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#D8F3DC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                🎙️
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem', color: '#1B4332' }}>Guru / Penyimak</div>
                <div style={{ fontSize: '.78rem', color: '#6B7280', marginTop: 3, lineHeight: 1.5 }}>
                  Input penilaian &amp; kelola jadwal santri
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '1.6rem 0 1.2rem' }} />

          <p style={{ textAlign: 'center', fontSize: '.82rem', color: '#6B7280', margin: 0 }}>
            Sudah punya akun?{' '}
            <Link href="/login" className="link-green">Masuk sekarang</Link>
          </p>

        </div>
      </div>
    </div>
  );
}