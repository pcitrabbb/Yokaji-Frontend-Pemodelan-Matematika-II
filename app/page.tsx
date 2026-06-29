'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

// Hook: fade-in saat elemen masuk viewport
function useFadeIn(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

// Hook: animasi counter angka
function useCountUp(target: number, duration = 1800, started = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  return val;
}

export default function Home() {
  const [konten, setKonten] = useState<any>(null);
  const [galeriList, setGaleriList] = useState<any[]>([]);
  const [loadingGaleri, setLoadingGaleri] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  // Refs untuk fade-in sections
  const heroRef = useFadeIn(0.1);
  const statsWrapRef = useFadeIn(0.2);
  const kegiatanRef = useFadeIn(0.1);
  const galeriRef = useFadeIn(0.1);
  const tentangRef = useFadeIn(0.1);
  const ctaRef = useFadeIn(0.2);

  // Counter values
  const count300 = useCountUp(300, 1600, statsVisible);
  const count12 = useCountUp(12, 1200, statsVisible);
  const count6 = useCountUp(6, 900, statsVisible);

  useEffect(() => {
    api.get('/konten').then(r => setKonten(r.data)).catch(() => setKonten({}));
    api.get('/galeri').then(r => { setGaleriList(r.data); setLoadingGaleri(false); }).catch(() => setLoadingGaleri(false));
  }, []);

  // Trigger counter saat stats masuk viewport
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStatsVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const c = (key: string, fallback = '') => konten?.[key] ?? fallback;

  return (
    <main style={{ fontFamily: "'DM Sans', sans-serif", background: "#FAFAF7", color: "#1C1C1C", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #FAFAF7; }
        ::-webkit-scrollbar-thumb { background: #2D6A4F; border-radius: 3px; }
        .nav-link { font-size: .88rem; font-weight: 500; color: #5A5A5A; text-decoration: none; position: relative; padding-bottom: 4px; transition: color .2s; }
        .nav-link::after { content: ''; position: absolute; bottom: 0; left: 0; width: 0; height: 2px; background: #C9A84C; transition: width .25s; }
        .nav-link:hover { color: #1B4332; }
        .nav-link:hover::after { width: 100%; }
        .btn-hero-primary { display: inline-flex; align-items: center; gap: 10px; background: #1B4332; color: #fff; padding: .8rem 1.8rem; border-radius: 10px; font-weight: 600; font-size: .95rem; text-decoration: none; transition: background .2s, transform .15s, box-shadow .2s; box-shadow: 0 4px 20px rgba(27,67,50,.3); }
        .btn-hero-primary:hover { background: #2D6A4F; transform: translateY(-2px); }
        .btn-hero-secondary { display: inline-flex; align-items: center; gap: 10px; border: 1.5px solid #ccc; color: #1C1C1C; padding: .8rem 1.6rem; border-radius: 10px; font-weight: 600; font-size: .95rem; text-decoration: none; transition: border-color .2s, transform .15s; }
        .btn-hero-secondary:hover { border-color: #1B4332; transform: translateY(-2px); }
        .stat-item { padding: 1.8rem 1.5rem; display: flex; align-items: center; gap: 1.1rem; border-right: 1px solid rgba(0,0,0,0.07); transition: background .2s; }
        .stat-item:last-child { border-right: none; }
        .stat-item:hover { background: #D8F3DC; }
        .kegiatan-card { background: #fff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.07); padding: 1.5rem 1.3rem 1.2rem; display: flex; flex-direction: column; gap: .65rem; transition: box-shadow .2s, transform .2s; }
        .kegiatan-card:hover { box-shadow: 0 8px 30px rgba(27,67,50,.12); transform: translateY(-3px); }
        .galeri-item { border-radius: 14px; overflow: hidden; position: relative; cursor: pointer; aspect-ratio: 4/3; }
        .galeri-img { width: 100%; height: 100%; object-fit: cover; transition: transform .35s ease; display: block; }
        .galeri-item:hover .galeri-img { transform: scale(1.06); }
        .galeri-overlay { position: absolute; inset: 0; background: rgba(10,34,24,.5); opacity: 0; transition: opacity .25s; display: flex; align-items: flex-end; padding: 1rem; }
        .galeri-item:hover .galeri-overlay { opacity: 1; }
        .btn-gold { flex-shrink: 0; background: #C9A84C; color: #1B4332; padding: .9rem 2rem; border-radius: 10px; font-weight: 700; font-size: .95rem; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; white-space: nowrap; transition: background .2s, transform .15s, box-shadow .2s; box-shadow: 0 4px 20px rgba(201,168,76,.35); }
        .btn-gold:hover { background: #F0D78C; transform: translateY(-2px); }
        .footer-link { color: rgba(255,255,255,.5); text-decoration: none; font-size: .8rem; transition: color .2s; }
        .footer-link:hover { color: #F0D78C; }
        .pengumuman-bar { background: #1B4332; color: #fff; padding: .6rem 5%; font-size: .83rem; display: flex; align-items: center; gap: 10px; }
        .skeleton { background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .badge-dot { width: 7px; height: 7px; border-radius: 50%; background: #40916C; animation: pulse 2s infinite; display: inline-block; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }

        /* ── MOTION ── */
        @keyframes fadeUp { from { opacity:0; transform: translateY(32px); } to { opacity:1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes scaleIn { from { opacity:0; transform: scale(.93); } to { opacity:1; transform: scale(1); } }
        @keyframes slideLeft { from { opacity:0; transform: translateX(-28px); } to { opacity:1; transform: translateX(0); } }
        @keyframes slideRight { from { opacity:0; transform: translateX(28px); } to { opacity:1; transform: translateX(0); } }
        @keyframes heroFloat { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-10px); } }
        @keyframes navSlideDown { from { opacity:0; transform: translateY(-100%); } to { opacity:1; transform: translateY(0); } }

        /* Navbar entrance */
        nav { animation: navSlideDown .5s ease both; }

        /* Fade-in container (for Intersection Observer) */
        .fade-section { opacity: 0; transform: translateY(30px); transition: opacity .65s ease, transform .65s ease; }
        .fade-section.visible { opacity: 1; transform: translateY(0); }

        /* Hero entrance */
        .hero-text-enter { animation: slideLeft .8s .1s ease both; }
        .hero-image-enter { animation: slideRight .8s .2s ease both; }

        /* Pengumuman bar */
        .pengumuman-bar { animation: fadeIn .5s ease both; }

        /* Stats counter row */
        .stats-enter { animation: fadeUp .6s ease both; }

        /* Staggered cards */
        .kegiatan-card:nth-child(1) { animation: fadeUp .5s .05s ease both; }
        .kegiatan-card:nth-child(2) { animation: fadeUp .5s .12s ease both; }
        .kegiatan-card:nth-child(3) { animation: fadeUp .5s .19s ease both; }
        .kegiatan-card:nth-child(4) { animation: fadeUp .5s .26s ease both; }
        .kegiatan-card:nth-child(5) { animation: fadeUp .5s .33s ease both; }
        .kegiatan-card:nth-child(6) { animation: fadeUp .5s .40s ease both; }
        .kegiatan-card { animation-play-state: paused; }
        .fade-section.visible .kegiatan-card { animation-play-state: running; }

        /* Galeri stagger */
        .galeri-item:nth-child(1) { animation: scaleIn .5s .05s ease both; }
        .galeri-item:nth-child(2) { animation: scaleIn .5s .12s ease both; }
        .galeri-item:nth-child(3) { animation: scaleIn .5s .19s ease both; }
        .galeri-item:nth-child(4) { animation: scaleIn .5s .26s ease both; }
        .galeri-item:nth-child(5) { animation: scaleIn .5s .33s ease both; }
        .galeri-item:nth-child(6) { animation: scaleIn .5s .40s ease both; }
        .galeri-item { animation-play-state: paused; }
        .fade-section.visible .galeri-item { animation-play-state: running; }

        /* CTA entrance */
        .cta-enter { animation: scaleIn .7s ease both; }

        /* Hero image floating */
        .hero-float { animation: heroFloat 5s ease-in-out infinite; }

        /* Stat items */
        .stat-item { animation: fadeUp .5s ease both; animation-play-state: paused; }
        .fade-section.visible .stat-item:nth-child(1) { animation-delay: .05s; animation-play-state: running; }
        .fade-section.visible .stat-item:nth-child(2) { animation-delay: .18s; animation-play-state: running; }
        .fade-section.visible .stat-item:nth-child(3) { animation-delay: .31s; animation-play-state: running; }

        /* Tentang grid items stagger */
        .tentang-item { opacity: 0; transform: translateY(20px); transition: opacity .6s ease, transform .6s ease; }
        .fade-section.visible .tentang-item:nth-child(1) { opacity:1; transform:none; transition-delay: .05s; }
        .fade-section.visible .tentang-item:nth-child(2) { opacity:1; transform:none; transition-delay: .18s; }
        .fade-section.visible .tentang-item:nth-child(3) { opacity:1; transform:none; transition-delay: .31s; }
        .fade-section.visible .tentang-item:nth-child(4) { opacity:1; transform:none; transition-delay: .44s; }

        /* Hamburger button */
        .hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; background: none; border: none; padding: 6px; }
        .hamburger span { width: 24px; height: 2px; background: #1B4332; border-radius: 2px; transition: all .25s; display: block; }
        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        /* Mobile menu drawer */
        .mobile-menu { display: none; position: fixed; top: 72px; left: 0; right: 0; background: rgba(255,255,255,0.97); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(27,67,50,0.1); z-index: 199; flex-direction: column; padding: 1.2rem 5%; gap: .2rem; box-shadow: 0 8px 30px rgba(0,0,0,.08); }
        .mobile-menu.open { display: flex; }
        .mobile-menu .nav-link { font-size: 1rem; padding: .75rem 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .mobile-menu .nav-link:last-of-type { border-bottom: none; }
        .mobile-menu-actions { display: flex; gap: .75rem; margin-top: .75rem; }

        /* ── RESPONSIVE ── */

        /* Tablet */
        @media (max-width: 900px) {
          .nav-links { display: none !important; }
          .nav-actions { display: none !important; }
          .hamburger { display: flex !important; }

          .hero-grid { grid-template-columns: 1fr !important; gap: 2.5rem !important; padding: 4rem 5% 3rem !important; }
          .hero-image-wrap { display: none; }

          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .stat-item { border-right: none !important; border-bottom: 1px solid rgba(0,0,0,0.07); }
          .stat-item:nth-child(odd) { border-right: 1px solid rgba(0,0,0,0.07) !important; }

          .tentang-grid { grid-template-columns: 1fr !important; gap: 1.5rem !important; }

          .galeri-static-grid { grid-template-columns: repeat(2,1fr) !important; }
          .galeri-loading-grid { grid-template-columns: repeat(2,1fr) !important; }

          .cta-box { flex-direction: column !important; align-items: flex-start !important; padding: 2.5rem 2rem !important; }

          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 2rem !important; }
          .footer-brand { grid-column: 1 / -1; }
        }

        /* Mobile */
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .galeri-static-grid { grid-template-columns: repeat(2,1fr) !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
          .footer-brand { grid-column: auto; }
          .cta-box { padding: 2rem 1.4rem !important; }
          .cta-box h2 { font-size: 1.3rem !important; }
        }
      `}</style>

      {/* Banner Pengumuman */}
      {konten?.pengumuman_aktif && konten?.pengumuman && (
        <div className="pengumuman-bar">
          <span>📢</span><span>{konten.pengumuman}</span>
        </div>
      )}

      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5%", height: 72, background: "rgba(255,255,255,0.93)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(27,67,50,0.1)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
            <rect width="38" height="38" rx="9" fill="#1B4332"/>
            <path d="M19 7 C13 12 10 16 10 21 C10 26 14 30 19 31 C24 30 28 26 28 21 C28 16 25 12 19 7Z" fill="#40916C"/>
            <path d="M15 20 Q19 14 23 20" stroke="#C9A84C" strokeWidth="1.5" fill="none"/>
            <line x1="19" y1="18" x2="19" y2="28" stroke="#C9A84C" strokeWidth="1.5"/>
          </svg>
          <div style={{ lineHeight: 1.2 }}>
            <strong style={{ fontSize: ".95rem", color: "#1B4332", display: "block" }}>UKM Tahfidzul Qur'an</strong>
            <span style={{ fontSize: ".68rem", color: "#5A5A5A", letterSpacing: ".05em", textTransform: "uppercase" }}>Universitas Airlangga</span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="nav-links" style={{ display: "flex", gap: "2rem" }}>
          {[["Beranda","#"],["Tentang Kami","#tentang-kami"],["Kegiatan","#kegiatan"],["Galeri","#galeri"],["Kontak","#kontak"]].map(([label, href]) => (
            <a key={label} href={href} className="nav-link">{label}</a>
          ))}
        </div>

        {/* Desktop action buttons */}
        <div className="nav-actions" style={{ display: "flex", gap: ".75rem" }}>
          <Link href="/login" style={{ padding: ".45rem 1.1rem", border: "1.5px solid #1B4332", borderRadius: 8, fontSize: ".85rem", fontWeight: 600, color: "#1B4332", textDecoration: "none" }}>Login</Link>
          <Link href="/register/pilih" style={{ padding: ".45rem 1.2rem", background: "#1B4332", border: "none", borderRadius: 8, fontSize: ".85rem", fontWeight: 600, color: "#fff", textDecoration: "none" }}>Daftar Sekarang</Link>
        </div>

        {/* Hamburger button (mobile) */}
        <button className={`hamburger${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
          <span/><span/><span/>
        </button>
      </nav>

      {/* Mobile Drawer Menu */}
      <div className={`mobile-menu${menuOpen ? " open" : ""}`}>
        {[["Beranda","#"],["Tentang Kami","#tentang-kami"],["Kegiatan","#kegiatan"],["Galeri","#galeri"],["Kontak","#kontak"]].map(([label, href]) => (
          <a key={label} href={href} className="nav-link" onClick={() => setMenuOpen(false)}>{label}</a>
        ))}
        <div className="mobile-menu-actions">
          <Link href="/login" onClick={() => setMenuOpen(false)} style={{ flex: 1, textAlign: "center", padding: ".55rem 1rem", border: "1.5px solid #1B4332", borderRadius: 8, fontSize: ".88rem", fontWeight: 600, color: "#1B4332", textDecoration: "none" }}>Login</Link>
          <Link href="/register/pilih" onClick={() => setMenuOpen(false)} style={{ flex: 1, textAlign: "center", padding: ".55rem 1rem", background: "#1B4332", borderRadius: 8, fontSize: ".88rem", fontWeight: 600, color: "#fff", textDecoration: "none" }}>Daftar Sekarang</Link>
        </div>
      </div>

      {/* Hero */}
      <section ref={heroRef} className="hero-grid fade-section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", gap: "4rem", padding: "7rem 5% 5rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -120, right: -120, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(216,243,220,.55) 0%, transparent 70%)", pointerEvents: "none" }}/>
        <div className="hero-text-enter">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#D8F3DC", color: "#2D6A4F", fontSize: ".72rem", fontWeight: 700, padding: ".35rem 1rem", borderRadius: 999, marginBottom: "1.5rem", letterSpacing: ".05em", textTransform: "uppercase" }}>
            <span className="badge-dot"/> UKM Tahfidzul Qur&apos;an UNAIR
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 3.8vw, 3.1rem)", lineHeight: 1.17, color: "#1B4332", marginBottom: "1.2rem" }}>
            {c('hero_judul') || <>{`Membumikan `}<em style={{ color: "#C9A84C", fontStyle: "normal" }}>Al-Qur&apos;an,</em><br/>Membentuk Generasi<br/>Berilmu dan Berakhlak</>}
          </h1>
          {c('hero_subjudul') && <p style={{ fontSize: ".88rem", fontWeight: 600, color: "#40916C", marginBottom: ".5rem" }}>{c('hero_subjudul')}</p>}
          <p style={{ fontSize: ".97rem", lineHeight: 1.8, color: "#5A5A5A", maxWidth: 440, marginBottom: "2.2rem" }}>
            {c('hero_deskripsi') || "UKM Tahfidzul Qur'an Universitas Airlangga adalah wadah bagi mahasiswa untuk menghafal, memahami, dan mengamalkan Al-Qur'an melalui pembinaan rutin dan program terstruktur."}
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/register/pilih" className="btn-hero-primary">👤 Gabung Sekarang</Link>
          </div>
        </div>
        <div className="hero-image-wrap hero-image-enter" style={{ position: "relative" }}>
          <div className="hero-float" style={{ borderRadius: 20, overflow: "hidden", aspectRatio: "4/3", background: "linear-gradient(135deg, #2D6A4F 0%, #1B4332 55%, #0A2218 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 24px 70px rgba(0,0,0,.2)", position: "relative" }}>
            <div style={{ textAlign: "center", color: "rgba(255,255,255,.18)", fontSize: "2.8rem", lineHeight: 1.5, zIndex: 1, padding: "0 2rem" }}>
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </div>
            <div style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,.12)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 12, padding: ".8rem 1rem", color: "#fff", fontSize: ".78rem", fontWeight: 600, textAlign: "center" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: 700, display: "block", color: "#F0D78C" }}>300+</span>
              Santri Aktif
            </div>
          </div>
          <div style={{ position: "absolute", bottom: "-2rem", left: "-2.5rem", background: "#1B4332", color: "#fff", padding: "1.3rem 1.5rem", borderRadius: 16, maxWidth: 280, fontSize: ".82rem", lineHeight: 1.65, boxShadow: "0 10px 40px rgba(0,0,0,.25)", borderLeft: "3px solid #C9A84C" }}>
            <span style={{ fontSize: "2.5rem", lineHeight: 0, verticalAlign: "-.5rem", color: "#C9A84C" }}>&ldquo;</span>
            {" "}(Al-Qur&apos;an) ini adalah kitab yang Kami turunkan kepadamu penuh dengan berkah.
            <cite style={{ display: "block", marginTop: ".6rem", fontSize: ".73rem", color: "#F0D78C", fontStyle: "normal", fontWeight: 700 }}>– QS. Sad : 29</cite>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div ref={(el) => { (statsWrapRef as any).current = el; (statsRef as any).current = el; }} className="stats-grid fade-section" style={{ margin: "5rem 5% 3rem", background: "#fff", borderRadius: 16, boxShadow: "0 4px 30px rgba(0,0,0,.07)", display: "grid", gridTemplateColumns: "repeat(3,1fr)", border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
        {[
          { icon: "🎓", num: count300, suffix: "+", label: "Santri Terdaftar" },
          { icon: "📖", num: count12,  suffix: "",   label: "Penyimak" },
          { icon: "📅", num: count6,   suffix: "",   label: "Program Rutin" },
        ].map(s => (
          <div key={s.label} className="stat-item">
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#D8F3DC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: "1.7rem", fontWeight: 700, color: "#1B4332", lineHeight: 1 }}>{s.num}{s.suffix}</div>
              <div style={{ fontSize: ".78rem", color: "#5A5A5A", marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Kegiatan */}
      <section ref={kegiatanRef} id="kegiatan" className="fade-section" style={{ padding: "3rem 5%" }}>
        <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#40916C", marginBottom: ".5rem", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 24, height: 2, background: "#C9A84C", borderRadius: 2, display: "inline-block" }}/>Program
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", color: "#1B4332", marginBottom: "2rem" }}>Kegiatan Utama Kami</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px,1fr))", gap: "1.2rem" }}>
          {[
            { icon: "📖", title: "Setoran Hafalan",    desc: "Setoran hafalan bersama musyrif secara rutin setiap pekan.", badge: "Senin – Kamis" },
            { icon: "🌙", title: "Khataman Al-Qur'an", desc: "Khataman bersama setiap minggu bersama seluruh anggota.",    badge: "1x / Minggu" },
            { icon: "📜", title: "Sertifikasi",        desc: "Evaluasi bacaan dan hafalan komprehensif setiap semester.",   badge: "1x / Semester" },
            { icon: "🎓", title: "Dauroh Tahfidz",     desc: "Program intensif untuk meningkatkan kualitas hafalan.",       badge: "1x / Semester" },
            { icon: "🎤", title: "Tasmi' Bil Ghaib",   desc: "Tasmi' hafalan tanpa melihat mushaf di hadapan majelis.",    badge: "3x / Tahun" },
            { icon: "🏆", title: "Wisuda Santri",      desc: "Apresiasi untuk santri berprestasi dan khatam.",              badge: "1x / Tahun" },
          ].map(k => (
            <div key={k.title} className="kegiatan-card">
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#D8F3DC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>{k.icon}</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: ".95rem", color: "#1B4332" }}>{k.title}</h3>
              <p style={{ fontSize: ".79rem", color: "#5A5A5A", lineHeight: 1.55, flex: 1 }}>{k.desc}</p>
              <span style={{ display: "inline-block", fontSize: ".7rem", fontWeight: 700, color: "#2D6A4F", background: "#D8F3DC", padding: ".25rem .75rem", borderRadius: 999, width: "fit-content" }}>{k.badge}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Galeri */}
      <section ref={galeriRef} id="galeri" className="fade-section" style={{ padding: "3rem 5%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#40916C", marginBottom: ".4rem", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 24, height: 2, background: "#C9A84C", borderRadius: 2, display: "inline-block" }}/>Galeri
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", color: "#1B4332", margin: 0 }}>Dokumentasi Kegiatan</h2>
          </div>
        </div>

        {loadingGaleri ? (
          <div className="galeri-loading-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ aspectRatio: "4/3", borderRadius: 14 }}/>)}
          </div>
        ) : galeriList.length === 0 ? (
          <div className="galeri-static-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
            {["Setoran Hafalan","Khataman Bersama","Wisuda Santri","Dauroh Tahfidz"].map((label, i) => (
              <div key={i} className="galeri-item" style={{ background: `linear-gradient(135deg, #2D6A4F, #0A2218)` }}>
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "2rem", opacity: .22 }}>🖼️</span>
                </div>
                <div className="galeri-overlay"><span style={{ color: "#fff", fontSize: ".82rem", fontWeight: 600 }}>{label}</span></div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: "1rem" }}>
            {galeriList.map((g: any) => (
              <div key={g.id} className="galeri-item">
                <img
                  src={g.url_foto.replace('http://localhost:8000', '')}
                  alt={g.judul}
                  className="galeri-img"
                  onError={e => { (e.currentTarget.parentElement as HTMLElement).style.background = 'linear-gradient(135deg,#2D6A4F,#1B4332)'; e.currentTarget.style.display = 'none'; }}
                />
                {g.kategori && (
                  <span style={{ position: "absolute", top: 10, left: 10, background: "rgba(27,67,50,0.85)", color: "#fff", fontSize: ".65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>{g.kategori}</span>
                )}
                <div className="galeri-overlay">
                  <div>
                    <div style={{ color: "#fff", fontSize: ".83rem", fontWeight: 600 }}>{g.judul}</div>
                    {g.keterangan && <div style={{ color: "rgba(255,255,255,.75)", fontSize: ".75rem", marginTop: 2 }}>{g.keterangan}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tentang */}
      <section ref={tentangRef} id="tentang-kami" className="fade-section" style={{ padding: "3rem 5%" }}>
        <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#40916C", marginBottom: ".5rem", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 24, height: 2, background: "#C9A84C", borderRadius: 2, display: "inline-block" }}/>Tentang Kami
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", color: "#1B4332", marginBottom: "1.5rem" }}>
          Tentang UKM Tahfidzul Qur&apos;an
        </h2>

        {/* Deskripsi Utama */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "start", marginBottom: "2.5rem" }} className="tentang-grid">
          <p className="tentang-item" style={{ fontSize: ".97rem", lineHeight: 1.9, color: "#5A5A5A", margin: 0 }}>
            UKM Tahfidzul Qur&apos;an merupakan UKM divisi khusus di lingkungan Universitas Airlangga yang memiliki fokus utama untuk pengembangan minat mahasiswa Universitas Airlangga di bidang hafalan kitab suci Al-Quran. UKM-TQ juga menjadi wadah kondusif untuk menjaga dan menambah hafalan Al-Quran mahasiswa Universitas Airlangga.
          </p>
          {/* Selayang Pandang */}
          <div className="tentang-item" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "1.4rem 1.6rem", borderLeft: "3px solid #C9A84C" }}>
            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#C9A84C", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: ".7rem" }}>Selayang Pandang UKMTQ</div>
            <p style={{ fontSize: ".87rem", color: "#5A5A5A", lineHeight: 1.75, margin: 0 }}>
              Unit Kegiatan Mahasiswa Tahfidzul Quran (UKM-TQ) berdiri pada tanggal <strong style={{ color: "#1B4332" }}>12 Rabiul Awal 1438 H</strong> yang bertepatan dengan <strong style={{ color: "#1B4332" }}>12 Desember 2016 M</strong>. UKM-TQ resmi menjadi UKM ke-38 di Universitas Airlangga sejak terbitnya Surat Keputusan Rektor Universitas Airlangga Nomor 01/UN3/2017 tentang Pembentukan Unit Kegiatan Mahasiswa Tahfidzul Quran Universitas Airlangga.
            </p>
          </div>
        </div>

        {/* Visi & Misi */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2.5rem" }} className="tentang-grid">
          {/* Visi */}
          <div className="tentang-item" style={{ background: "#D8F3DC", borderRadius: 14, padding: "1.5rem 1.6rem" }}>
            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#2D6A4F", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: ".7rem" }}>Visi</div>
            <p style={{ fontSize: ".9rem", color: "#1B4332", lineHeight: 1.75, margin: 0 }}>
              Menjadi wadah yang kondusif untuk menjaga dan menambah hafalan Al-Quran mahasiswa Universitas Airlangga menuju generasi Qurani yang beriman dan bertakwa kepada Allah SWT.
            </p>
          </div>
          {/* Misi */}
          <div className="tentang-item" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "1.5rem 1.6rem" }}>
            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#2D6A4F", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: ".9rem" }}>Misi</div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              {[
                "Mengembangkan potensi mahasiswa Universitas Airlangga di bidang Al-Quran",
                "Mengoptimalkan silaturrahim mahasiswa penghafal Al-Quran Universitas Airlangga",
                "Mewujudkan kepengurusan yang harmonis dan amanah dengan suasana kekeluargaan",
                "Menyelenggarakan kegiatan syiar Al-Quran di Universitas Airlangga",
                "Meningkatkan wawasan dan kecintaan mahasiswa Universitas Airlangga terhadap Al-Quran",
                "Menyelenggarakan kegiatan untuk muroja'ah, setoran, ujian dan khataman Al-Quran secara terstruktur dan istiqamah di kampus A, B dan C Universitas Airlangga",
              ].map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#D8F3DC", color: "#1B4332", fontSize: ".7rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                  <p style={{ fontSize: ".84rem", color: "#5A5A5A", lineHeight: 1.6, margin: 0 }}>{m}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Departemen */}
        <div>
          <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#40916C", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 24, height: 2, background: "#C9A84C", borderRadius: 2, display: "inline-block" }}/>Departemen
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: "1rem" }}>
            {[
              { nama: "Kelas Tahfidz",  deskripsi: "Departemen yang bertanggung jawab pada kegiatan inti dari UKM Tahfidzul Qur'an UNAIR, yaitu setoran hafalan Al-Qur'an.", icon: "📖" },
              { nama: "Munaqosyah",     deskripsi: "Departemen yang bergerak dalam bidang pengembangan dan penjagaan hafalan Al-Qur'an mahasiswa khususnya santri UKM Tahfidzul Qur'an.", icon: "📜" },
              { nama: "Mudarosah",      deskripsi: "Departemen yang berfokus pada pengajaran dan pembinaan dalam persiapan santri untuk mengikuti perlombaan dan musabaqoh.", icon: "🏆" },
              { nama: "Ukhuwah",        deskripsi: "Departemen yang bergerak menjadi fasilitator atau penghubung dalam membangun jejaring dan kerjasama yang baik dengan pihak internal maupun eksternal UKM.", icon: "🤝" },
              { nama: "Syiar",          deskripsi: "Departemen yang bertanggungjawab mensyiarkan dan mempublikasikan segalanya tentang UKM-TQ dan kegiatannya.", icon: "📢" },
            ].map(d => (
              <div key={d.nama} className="kegiatan-card">
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#D8F3DC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>{d.icon}</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: ".95rem", color: "#1B4332", margin: 0 }}>{d.nama}</h3>
                <p style={{ fontSize: ".79rem", color: "#5A5A5A", lineHeight: 1.6, margin: 0 }}>{d.deskripsi}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div ref={ctaRef} className="cta-box fade-section" style={{ margin: "3rem 5% 4rem", background: "linear-gradient(135deg, #1B4332 0%, #0A2218 100%)", borderRadius: 20, padding: "3.5rem 4rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "2rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", border: "40px solid rgba(201,168,76,.12)", pointerEvents: "none" }}/>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.65rem", color: "#fff", marginBottom: ".65rem" }}>
            Siap menjadi bagian dari keluarga besar UKM Tahfidzul Qur&apos;an UNAIR?
          </h2>
          <p style={{ fontSize: ".9rem", color: "rgba(255,255,255,.62)", maxWidth: 420, lineHeight: 1.7 }}>
            Daftarkan diri Anda dan mulai perjalanan berkah bersama Al-Qur&apos;an.
          </p>
        </div>
        <Link href="/register/pilih" className="btn-gold">Daftar Sekarang →</Link>
      </div>

      {/* Footer */}
      <footer id="kontak" style={{ background: "#1B4332", padding: "2.5rem 5%", color: "#fff" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "3rem", marginBottom: "2rem" }}>
          <div className="footer-brand">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
              <svg width="32" height="32" viewBox="0 0 38 38" fill="none">
                <rect width="38" height="38" rx="9" fill="rgba(255,255,255,0.1)"/>
                <path d="M19 7 C13 12 10 16 10 21 C10 26 14 30 19 31 C24 30 28 26 28 21 C28 16 25 12 19 7Z" fill="#40916C"/>
                <path d="M15 20 Q19 14 23 20" stroke="#C9A84C" strokeWidth="1.5" fill="none"/>
                <line x1="19" y1="18" x2="19" y2="28" stroke="#C9A84C" strokeWidth="1.5"/>
              </svg>
              <div>
                <strong style={{ color: "#fff", display: "block", fontSize: ".92rem" }}>UKM Tahfidzul Qur'an</strong>
                <span style={{ color: "rgba(255,255,255,.5)", fontSize: ".72rem" }}>Universitas Airlangga</span>
              </div>
            </div>
            <p style={{ color: "rgba(255,255,255,.55)", fontSize: ".82rem", lineHeight: 1.7, maxWidth: 300, margin: 0 }}>
              {c('hero_deskripsi') || "Wadah mahasiswa Universitas Airlangga untuk menghafal, memahami, dan mengamalkan Al-Qur'an."}
            </p>
          </div>
          <div>
            <div style={{ color: "#F0D78C", fontWeight: 700, fontSize: ".75rem", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "1rem" }}>Navigasi</div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              {[["Beranda","#"],["Tentang Kami","#tentang-kami"],["Kegiatan","#kegiatan"],["Galeri","#galeri"]].map(([label, href]) => (
                <a key={label} href={href} className="footer-link">{label}</a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ color: "#F0D78C", fontWeight: 700, fontSize: ".75rem", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "1rem" }}>Hubungi Kami</div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
              {c('kontak_email') && <a href={`mailto:${c('kontak_email')}`} className="footer-link" style={{ display: "flex", alignItems: "center", gap: 8 }}><span>✉️</span> {c('kontak_email')}</a>}
              {c('kontak_wa') && <a href={`https://wa.me/${c('kontak_wa')}`} target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: "flex", alignItems: "center", gap: 8 }}><span>📱</span> WhatsApp</a>}
              {c('kontak_instagram') && <a href={`https://instagram.com/${c('kontak_instagram').replace('@','')}`} target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: "flex", alignItems: "center", gap: 8 }}><span>📸</span> {c('kontak_instagram')}</a>}
              {c('kontak_alamat') && <div style={{ color: "rgba(255,255,255,.5)", fontSize: ".8rem", display: "flex", alignItems: "flex-start", gap: 8 }}><span style={{ flexShrink: 0 }}>📍</span> {c('kontak_alamat')}</div>}
              {!c('kontak_email') && !c('kontak_wa') && !c('kontak_instagram') && (
                <p style={{ color: "rgba(255,255,255,.35)", fontSize: ".8rem", margin: 0 }}>Info kontak belum diatur.</p>
              )}
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <span style={{ color: "rgba(255,255,255,.4)", fontSize: ".8rem" }}>© 2026 UKM Tahfidzul Qur'an UNAIR. All rights reserved.</span>
          <Link href="/admin" style={{ color: "rgba(255,255,255,.25)", fontSize: ".72rem", textDecoration: "none" }}>Admin Panel</Link>
        </div>
      </footer>
    </main>
  );
}