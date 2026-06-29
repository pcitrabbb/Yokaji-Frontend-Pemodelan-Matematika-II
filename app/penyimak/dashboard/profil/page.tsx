'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';


interface PenyimakProfile {
  id: number;
  nama: string;
  email: string;
  no_hp: string;
  jenis_kelamin: string;
  status: string;
  created_at: string;
}


// ─── Cache helpers ────────────────────────────────────────────────────────────
// Kunci yang sama dipakai dashboard agar saling berbagi data profil
const PROFILE_CACHE_KEY = 'penyimak_profile_cache';
const DASHBOARD_CACHE_KEY = 'dashboard_penyimak_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 jam


function readProfileCache(): PenyimakProfile | null {
  try {
    // Coba profile cache dulu
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts < CACHE_TTL) return parsed.data as PenyimakProfile;
    }
    // Fallback: ambil user dari dashboard cache
    const dash = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (dash) {
      const parsed = JSON.parse(dash);
      if (Date.now() - parsed.ts < CACHE_TTL && parsed.data?.user) return parsed.data.user as PenyimakProfile;
    }
  } catch { /* abaikan */ }
  return null;
}


function writeProfileCache(data: PenyimakProfile) {
  try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch { /* abaikan */ }
}


// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfilPenyimakPage() {
  const router  = useRouter();
  const [profile, setProfile] = useState<PenyimakProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);


  useEffect(() => {
    // 1. Tampilkan cache langsung — UI instan, tidak perlu tunggu network
    const cached = readProfileCache();
    if (cached) {
      setProfile(cached);
      setLoading(false);
    }


    // 2. Revalidate di background — perbarui data tanpa blokir UI
    (async () => {
      try {
        const res = await api.get('/penyimak/profile');
        const data = res.data.data as PenyimakProfile;


        // Jika jenis_kelamin kosong di DB, ambil dari localStorage (data waktu registrasi)
        if (!data.jenis_kelamin) {
          try {
            const local = JSON.parse(localStorage.getItem('penyimak_profile') ?? '{}');
            if (local?.jenis_kelamin) data.jenis_kelamin = local.jenis_kelamin;
          } catch { /* abaikan */ }
        }


        setProfile(data);
        writeProfileCache(data);
      } catch {
        if (!cached) setError(true); // hanya tampilkan error kalau cache juga kosong
      } finally {
        if (!cached) setLoading(false);
      }
    })();
  }, []);


  const isIkhwan = profile?.jenis_kelamin?.toLowerCase() === 'ikhwan';
  const sapaan   = isIkhwan ? 'Ustadz' : 'Ustadzah';
  const avatar   = isIkhwan ? '👳' : '🧕';


  const fields = profile ? [
    { label: 'Nama Lengkap',  value: profile.nama,                  icon: '👤' },
    { label: 'Email',          value: profile.email,                 icon: '📧' },
    { label: 'No. HP',         value: profile.no_hp      || '—',    icon: '📱' },
    { label: 'Jenis Kelamin',  value: profile.jenis_kelamin || '—', icon: '🏷️' },
    { label: 'Status Akun',    value: profile.status     || '—',    icon: '✅' },
  ] : [];


  return (
    <div style={{
      minHeight: '100vh', background: '#F4F5F0',
      fontFamily: "'Inter', sans-serif", padding: '2rem 1rem',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .profil-wrap { max-width: 480px; margin: 0 auto; }
        .profil-card {
          background: #fff; border-radius: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.04); overflow: hidden;
        }
        .field-row {
          display: flex; align-items: center; gap: 14px;
          padding: 1rem 1.25rem; border-bottom: 1px solid #F3F4F6;
        }
        .field-row:last-child { border-bottom: none; }
        .field-icon {
          width: 38px; height: 38px; border-radius: 10px;
          background: #F0FDF4; display: flex; align-items: center;
          justify-content: center; font-size: 1.05rem; flex-shrink: 0;
        }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          color: #6B7280; font-size: .82rem; font-weight: 500;
          background: none; border: none; cursor: pointer;
          margin-bottom: 1.25rem; padding: 0; font-family: inherit;
          transition: color .15s;
        }
        .back-btn:hover { color: #1B4332; }
      `}</style>


      <div className="profil-wrap">
        <button className="back-btn" onClick={() => router.back()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Kembali ke Dashboard
        </button>


        <div className="profil-card">
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
            padding: '2rem 1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', border: '1.5px solid rgba(201,168,76,0.15)' }} />
            <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', border: '1.5px solid rgba(201,168,76,0.10)' }} />
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', margin: '0 auto 1rem', position: 'relative', zIndex: 1,
            }}>
              {loading ? '👤' : avatar}
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ color: '#fff', fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 700, marginBottom: '.3rem' }}>
                {loading ? 'Memuat...' : error ? '—' : `${sapaan} ${profile?.nama}`}
              </div>
              <span style={{
                display: 'inline-block', background: 'rgba(255,255,255,0.15)',
                color: '#fff', fontSize: '.72rem', fontWeight: 600,
                borderRadius: 20, padding: '3px 14px',
                border: '1px solid rgba(255,255,255,0.25)',
              }}>
                Penyimak
              </span>
            </div>
          </div>


          {/* Fields */}
          <div>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '.85rem' }}>Memuat data profil...</div>
            ) : error ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#EF4444', fontSize: '.85rem' }}>Gagal memuat profil. Coba refresh halaman.</div>
            ) : (
              fields.map((f, i) => (
                <div key={i} className="field-row">
                  <div className="field-icon">{f.icon}</div>
                  <div>
                    <div style={{ fontSize: '.68rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: '.9rem', fontWeight: 500, color: '#1C1C1C' }}>{f.value}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

