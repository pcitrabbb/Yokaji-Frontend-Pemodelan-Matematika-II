'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

// ─── Cache helpers (stale-while-revalidate) ───────────────────────────────────
const CACHE_KEY = 'dashboard_penyimak_cache';
const PROFILE_CACHE_KEY = 'penyimak_profile_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 jam — bertahan antar tab & refresh

// Sesi semester — key menyertakan jenis+tahun akademik → otomatis beda tiap semester
function _getSesiCacheKey() {
  const m = new Date().getMonth() + 1, y = new Date().getFullYear();
  const isGenap = m >= 2 && m <= 7;
  return `penyimak_sesi_${isGenap ? 'genap' : 'ganjil'}_${isGenap ? `${y-1}-${y}` : `${y}-${y+1}`}`;
}
const SESI_CACHE_KEY = _getSesiCacheKey();
const SESI_CACHE_TTL = 30 * 60 * 1000; // 30 menit
function readSesiCache(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESI_CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return Date.now() - p.ts > SESI_CACHE_TTL ? null : (p.total as number);
  } catch { return null; }
}
function writeSesiCache(total: number) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(SESI_CACHE_KEY, JSON.stringify({ ts: Date.now(), total })); } catch {}
}

function readCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.data;
  } catch { return null; }
}
function writeCache(data: object) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
}
function clearDashboardCache() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(PROFILE_CACHE_KEY);
    localStorage.removeItem(SESI_CACHE_KEY);
  } catch {}
}
// Cache khusus profil — dipakai juga oleh halaman profil agar tidak fetch ulang.
// Untuk halaman profil (/penyimak/dashboard/profil/page.tsx), gunakan PROFILE_CACHE_KEY
// yang sama ('penyimak_profile_cache') dan baca/tulis dengan pola yang sama.
function readProfileCache(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.data as User;
  } catch { return null; }
}
function writeProfileCache(user: User) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: user })); } catch {}
}

// ─── Quran Data ───────────────────────────────────────────────────────────────
const SURAT_LIST = [
  { no: 1, nama: 'Al-Fatihah', ayat: 7 }, { no: 2, nama: 'Al-Baqarah', ayat: 286 },
  { no: 3, nama: 'Ali Imran', ayat: 200 }, { no: 4, nama: "An-Nisa'", ayat: 176 },
  { no: 5, nama: 'Al-Maidah', ayat: 120 }, { no: 6, nama: "Al-An'am", ayat: 165 },
  { no: 7, nama: "Al-A'raf", ayat: 206 }, { no: 8, nama: 'Al-Anfal', ayat: 75 },
  { no: 9, nama: 'At-Taubah', ayat: 129 }, { no: 10, nama: 'Yunus', ayat: 109 },
  { no: 11, nama: 'Hud', ayat: 123 }, { no: 12, nama: 'Yusuf', ayat: 111 },
  { no: 13, nama: "Ar-Ra'd", ayat: 43 }, { no: 14, nama: 'Ibrahim', ayat: 52 },
  { no: 15, nama: 'Al-Hijr', ayat: 99 }, { no: 16, nama: 'An-Nahl', ayat: 128 },
  { no: 17, nama: "Al-Isra'", ayat: 111 }, { no: 18, nama: 'Al-Kahfi', ayat: 110 },
  { no: 19, nama: 'Maryam', ayat: 98 }, { no: 20, nama: 'Taha', ayat: 135 },
  { no: 21, nama: 'Al-Anbiya', ayat: 112 }, { no: 22, nama: 'Al-Hajj', ayat: 78 },
  { no: 23, nama: "Al-Mu'minun", ayat: 118 }, { no: 24, nama: 'An-Nur', ayat: 64 },
  { no: 25, nama: 'Al-Furqan', ayat: 77 }, { no: 26, nama: "Asy-Syu'ara'", ayat: 227 },
  { no: 27, nama: 'An-Naml', ayat: 93 }, { no: 28, nama: 'Al-Qasas', ayat: 88 },
  { no: 29, nama: 'Al-Ankabut', ayat: 69 }, { no: 30, nama: 'Ar-Rum', ayat: 60 },
  { no: 31, nama: 'Luqman', ayat: 34 }, { no: 32, nama: 'As-Sajdah', ayat: 30 },
  { no: 33, nama: 'Al-Ahzab', ayat: 73 }, { no: 34, nama: "Saba'", ayat: 54 },
  { no: 35, nama: 'Fatir', ayat: 45 }, { no: 36, nama: 'Ya-Sin', ayat: 83 },
  { no: 37, nama: 'As-Saffat', ayat: 182 }, { no: 38, nama: 'Sad', ayat: 88 },
  { no: 39, nama: 'Az-Zumar', ayat: 75 }, { no: 40, nama: 'Ghafir', ayat: 85 },
  { no: 41, nama: 'Fussilat', ayat: 54 }, { no: 42, nama: 'Asy-Syura', ayat: 53 },
  { no: 43, nama: 'Az-Zukhruf', ayat: 89 }, { no: 44, nama: 'Ad-Dukhan', ayat: 59 },
  { no: 45, nama: 'Al-Jasiyah', ayat: 37 }, { no: 46, nama: 'Al-Ahqaf', ayat: 35 },
  { no: 47, nama: 'Muhammad', ayat: 38 }, { no: 48, nama: 'Al-Fath', ayat: 29 },
  { no: 49, nama: 'Al-Hujurat', ayat: 18 }, { no: 50, nama: 'Qaf', ayat: 45 },
  { no: 51, nama: 'Az-Zariyat', ayat: 60 }, { no: 52, nama: 'At-Tur', ayat: 49 },
  { no: 53, nama: 'An-Najm', ayat: 62 }, { no: 54, nama: 'Al-Qamar', ayat: 55 },
  { no: 55, nama: 'Ar-Rahman', ayat: 78 }, { no: 56, nama: "Al-Waqi'ah", ayat: 96 },
  { no: 57, nama: 'Al-Hadid', ayat: 29 }, { no: 58, nama: 'Al-Mujadilah', ayat: 22 },
  { no: 59, nama: 'Al-Hasyr', ayat: 24 }, { no: 60, nama: 'Al-Mumtahanah', ayat: 13 },
  { no: 61, nama: 'As-Saf', ayat: 14 }, { no: 62, nama: "Al-Jumu'ah", ayat: 11 },
  { no: 63, nama: 'Al-Munafiqun', ayat: 11 }, { no: 64, nama: 'At-Tagabun', ayat: 18 },
  { no: 65, nama: 'At-Talaq', ayat: 12 }, { no: 66, nama: 'At-Tahrim', ayat: 12 },
  { no: 67, nama: 'Al-Mulk', ayat: 30 }, { no: 68, nama: 'Al-Qalam', ayat: 52 },
  { no: 69, nama: 'Al-Haqqah', ayat: 52 }, { no: 70, nama: "Al-Ma'arij", ayat: 44 },
  { no: 71, nama: 'Nuh', ayat: 28 }, { no: 72, nama: 'Al-Jin', ayat: 28 },
  { no: 73, nama: 'Al-Muzzammil', ayat: 20 }, { no: 74, nama: 'Al-Muddassir', ayat: 56 },
  { no: 75, nama: 'Al-Qiyamah', ayat: 40 }, { no: 76, nama: 'Al-Insan', ayat: 31 },
  { no: 77, nama: 'Al-Mursalat', ayat: 50 }, { no: 78, nama: "An-Naba'", ayat: 40 },
  { no: 79, nama: "An-Nazi'at", ayat: 46 }, { no: 80, nama: 'Abasa', ayat: 42 },
  { no: 81, nama: 'At-Takwir', ayat: 29 }, { no: 82, nama: 'Al-Infitar', ayat: 19 },
  { no: 83, nama: 'Al-Mutaffifin', ayat: 36 }, { no: 84, nama: 'Al-Insyiqaq', ayat: 25 },
  { no: 85, nama: 'Al-Buruj', ayat: 22 }, { no: 86, nama: 'At-Tariq', ayat: 17 },
  { no: 87, nama: "Al-A'la", ayat: 19 }, { no: 88, nama: 'Al-Gasyiyah', ayat: 26 },
  { no: 89, nama: 'Al-Fajr', ayat: 30 }, { no: 90, nama: 'Al-Balad', ayat: 20 },
  { no: 91, nama: 'Asy-Syams', ayat: 15 }, { no: 92, nama: 'Al-Lail', ayat: 21 },
  { no: 93, nama: 'Ad-Duha', ayat: 11 }, { no: 94, nama: 'Al-Insyirah', ayat: 8 },
  { no: 95, nama: 'At-Tin', ayat: 8 }, { no: 96, nama: "Al-'Alaq", ayat: 19 },
  { no: 97, nama: 'Al-Qadr', ayat: 5 }, { no: 98, nama: 'Al-Bayyinah', ayat: 8 },
  { no: 99, nama: 'Az-Zalzalah', ayat: 8 }, { no: 100, nama: "Al-'Adiyat", ayat: 11 },
  { no: 101, nama: "Al-Qari'ah", ayat: 11 }, { no: 102, nama: 'At-Takasur', ayat: 8 },
  { no: 103, nama: 'Al-Asr', ayat: 3 }, { no: 104, nama: 'Al-Humazah', ayat: 9 },
  { no: 105, nama: 'Al-Fil', ayat: 5 }, { no: 106, nama: 'Quraisy', ayat: 4 },
  { no: 107, nama: "Al-Ma'un", ayat: 7 }, { no: 108, nama: 'Al-Kausar', ayat: 3 },
  { no: 109, nama: 'Al-Kafirun', ayat: 6 }, { no: 110, nama: 'An-Nasr', ayat: 3 },
  { no: 111, nama: 'Al-Masad', ayat: 5 }, { no: 112, nama: 'Al-Ikhlas', ayat: 4 },
  { no: 113, nama: 'Al-Falaq', ayat: 5 }, { no: 114, nama: 'An-Nas', ayat: 6 },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface User { id?: number; nama: string; email: string; jenis_kelamin: string; no_hp: string; role: string; penyimak_id?: number; }
interface Penilaian { id: number; santri_nama: string; santri?: string; nama?: string; setoran: string; nilai: number; status: string; tanggal: string; catatan?: string; }
interface Santri { id: number; nama: string; juz_aktif: string; progres: number; }
interface Stats {
  total_penilaian: number; rata_rata_nilai: number; santri_aktif: number;
  sudah_setor: number; belum_setor: number; total_santri: number;
}
interface DonutStats { sudah_setor: number; belum_setor: number; total_santri: number; }
interface SantriSetor { id: number; nama: string; tanggal_setor?: string; }
interface DonutDetail { sudah: SantriSetor[]; belum: SantriSetor[]; loading: boolean; }
interface SetoranItem { suratNo: number; ayatDari: number; ayatSampai: number; }
interface PrestasiSantri {
  id: number; nama: string;
  frekuensi_bulanan: (number | null)[];
  total_ayat_bulanan: (number | null)[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name: string) { return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); }
function getSantriNama(p: Penilaian) { return p.santri_nama || p.santri || p.nama || '—'; }
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
function formatDate(d: string) { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
function hitungNilai(kesalahan: number) { return Math.max(0, 100 - kesalahan * 5); }
function getStatusDariNilai(nilai: number) {
  if (nilai >= 95) return 'Sangat Bagus';
  if (nilai >= 85) return 'Bagus';
  if (nilai >= 75) return 'Baik';
  if (nilai >= 60) return 'Cukup';
  return 'Kurang';
}
function totalAyatSetoran(items: SetoranItem[]) {
  return items.reduce((sum, s) => sum + Math.max(0, s.ayatSampai - s.ayatDari + 1), 0);
}
function labelSetoran(items: SetoranItem[]) {
  if (!items.length) return '';
  return items.map(s => {
    const surat = SURAT_LIST.find(x => x.no === s.suratNo);
    return `${surat?.nama ?? ''} ${s.ayatDari}-${s.ayatSampai}`;
  }).join(', ');
}

// ─── Nav ─────────────────────────────────────────────────────────────────────
const NAV = [
  { href: '/dashboard', label: 'Dashboard', scrollTo: 'section-stats', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { href: '/dashboard', label: 'Penilaian Santri', scrollTo: 'section-penilaian', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
  { href: '/data-santri', label: 'Data Santri', scrollTo: null, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  { href: '/dashboard', label: 'History Penilaian', scrollTo: null, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { href: '/penyimak/dashboard/profil', label: 'Profil', scrollTo: null, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { href: '/penyimak/dashboard', label: 'Pengaturan', scrollTo: 'section-pengaturan', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
];

// Semester Genap = Feb(1)–Jul(6), Semester Ganjil = Agt(7)–Jan(0)
function getSemesterInfo() {
  const bulan = new Date().getMonth() + 1; // 1-12
  const tahun = new Date().getFullYear();
  const isGenap = bulan >= 2 && bulan <= 7;
  // Semester Genap: Feb-Jul | Ganjil: Agt-Jan
  const bulanIndeks = isGenap
    ? [1, 2, 3, 4, 5, 6]   // Feb=1, Mar=2, ..., Jul=6 (0-indexed)
    : [7, 8, 9, 10, 11, 0]; // Agt=7, Sep=8, ..., Jan=0
  const labelPendek = isGenap
    ? ['Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul']
    : ['Agt', 'Sep', 'Okt', 'Nov', 'Des', 'Jan'];
  const labelPanjang = isGenap
    ? ['Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli']
    : ['Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari'];
  const jenis = isGenap ? 'Genap' : 'Ganjil';
  const tahunLabel = isGenap ? `${tahun - 1}/${tahun}` : `${tahun}/${tahun + 1}`;
  const rentangLabel = isGenap
    ? `Februari–Juli ${tahun}`
    : `Agustus ${tahun}–Januari ${tahun + 1}`;
  return { isGenap, bulanIndeks, labelPendek, labelPanjang, jenis, tahunLabel, rentangLabel };
}
const SEM = getSemesterInfo();
const BULAN = SEM.labelPendek;
const BULAN_FULL = SEM.labelPanjang;

// Rentang tanggal awal–akhir semester aktif (untuk filter penilaian di klien)
function getSemesterDateRange() {
  const m = new Date().getMonth() + 1, y = new Date().getFullYear();
  const isGenap = m >= 2 && m <= 7;
  if (isGenap) {
    return { start: new Date(y, 1, 1), end: new Date(y, 6, 31, 23, 59, 59) };
  }
  const ys = m >= 8 ? y : y - 1;
  return { start: new Date(ys, 7, 1), end: new Date(ys + 1, 0, 31, 23, 59, 59) };
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ sudah, belum, total }: { sudah: number; belum: number; total: number }) {
  const r = 52, circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.round((sudah / total) * 100) : 0;
  const s = total > 0 ? (sudah / total) * (circ - 4) : 0;
  return (
    <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14"/>
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="14"
          strokeDasharray={`${circ - s - 4} ${circ}`} strokeDashoffset={-(s + 4)}
          strokeLinecap="round" transform="rotate(-90 65 65)"/>
        <circle cx="65" cy="65" r={r} fill="none" stroke="#52B788" strokeWidth="14"
          strokeDasharray={`${s} ${circ}`} strokeDashoffset={0}
          strokeLinecap="round" transform="rotate(-90 65 65)"/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.5rem', lineHeight: 1 }}>{pct}%</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.6rem', marginTop: 2 }}>{sudah}/{total}</div>
      </div>
    </div>
  );
}

// ─── Input Setoran Surat ──────────────────────────────────────────────────────
function InputSetoran({ value, onChange }: { value: SetoranItem[]; onChange: (v: SetoranItem[]) => void }) {
  const [addingSurat, setAddingSurat] = useState(false);
  const [selectedSurat, setSelectedSurat] = useState<number>(0);
  const [ayatDari, setAyatDari] = useState<number | null>(null);
  const [ayatSampai, setAyatSampai] = useState<number | null>(null);

  const suratTerpilih = SURAT_LIST.find(s => s.no === selectedSurat);
  const maxAyat = suratTerpilih?.ayat ?? 0;
  const sudahDipilih = new Set(value.map(v => v.suratNo));

  const handleAyatClick = (ayat: number) => {
    if (ayatDari === null) {
      setAyatDari(ayat);
      setAyatSampai(null);
    } else if (ayatSampai === null) {
      if (ayat < ayatDari) { setAyatDari(ayat); setAyatSampai(null); }
      else setAyatSampai(ayat);
    } else {
      setAyatDari(ayat); setAyatSampai(null);
    }
  };

  const isInRange = (ayat: number) => {
    if (ayatDari === null) return false;
    if (ayatSampai === null) return ayat === ayatDari;
    return ayat >= ayatDari && ayat <= ayatSampai;
  };
  const isStart = (ayat: number) => ayat === ayatDari;
  const isEnd = (ayat: number) => ayat === ayatSampai;

  const handleTambah = () => {
    if (!selectedSurat || ayatDari === null || ayatSampai === null) return;
    onChange([...value, { suratNo: selectedSurat, ayatDari, ayatSampai }]);
    setAddingSurat(false);
    setSelectedSurat(0); setAyatDari(null); setAyatSampai(null);
  };

  const handleHapus = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      {/* List setoran yang sudah dipilih */}
      {value.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {value.map((item, i) => {
            const s = SURAT_LIST.find(x => x.no === item.suratNo);
            const jumlah = item.ayatSampai - item.ayatDari + 1;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #D1FAE5' }}>
                <span style={{ fontSize: '.75rem', fontWeight: 600, color: '#1B4332', flex: 1 }}>
                  {s?.nama} · ayat {item.ayatDari}–{item.ayatSampai}
                </span>
                <span style={{ fontSize: '.7rem', color: '#2D6A4F', background: '#D1FAE5', padding: '2px 7px', borderRadius: 99, fontWeight: 600 }}>{jumlah} ayat</span>
                <button onClick={() => handleHapus(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1rem', lineHeight: 1, padding: '0 2px' }}>✕</button>
              </div>
            );
          })}
          <div style={{ fontSize: '.75rem', color: '#2D6A4F', fontWeight: 700, padding: '2px 0 0 2px' }}>
            Total: {totalAyatSetoran(value)} ayat
          </div>
        </div>
      )}

      {/* Form tambah surat */}
      {addingSurat ? (
        <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 10, padding: '1rem', background: '#FAFFFE' }}>
          {/* Pilih surat */}
          <div style={{ marginBottom: '.75rem' }}>
            <label style={{ fontSize: '.72rem', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Pilih Surat</label>
            <select className="dash-input" value={selectedSurat} onChange={e => { setSelectedSurat(Number(e.target.value)); setAyatDari(null); setAyatSampai(null); }}>
              <option value={0}>— Pilih surat —</option>
              {SURAT_LIST.map(s => (
                <option key={s.no} value={s.no} disabled={sudahDipilih.has(s.no)}>
                  {s.no}. {s.nama} ({s.ayat} ayat){sudahDipilih.has(s.no) ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Pilih ayat */}
          {selectedSurat > 0 && (
            <div style={{ marginBottom: '.75rem' }}>
              <label style={{ fontSize: '.72rem', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                Pilih Ayat
                {ayatDari !== null && ayatSampai === null && <span style={{ color: '#2D6A4F', marginLeft: 8 }}>Dari ayat {ayatDari} → pilih ayat akhir</span>}
                {ayatDari !== null && ayatSampai !== null && <span style={{ color: '#2D6A4F', marginLeft: 8 }}>Ayat {ayatDari}–{ayatSampai} ({ayatSampai - ayatDari + 1} ayat)</span>}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 160, overflowY: 'auto', padding: 4 }}>
                {Array.from({ length: maxAyat }, (_, i) => i + 1).map(ayat => {
                  const inRange = isInRange(ayat);
                  const start = isStart(ayat);
                  const end = isEnd(ayat);
                  return (
                    <button
                      key={ayat}
                      onClick={() => handleAyatClick(ayat)}
                      style={{
                        width: 32, height: 32, borderRadius: start || end ? 8 : inRange ? 4 : 6,
                        border: inRange ? 'none' : '1px solid #E5E7EB',
                        background: start || end ? '#1B4332' : inRange ? '#D1FAE5' : '#fff',
                        color: start || end ? '#fff' : inRange ? '#065F46' : '#374151',
                        fontWeight: inRange ? 700 : 400,
                        fontSize: '.72rem', cursor: 'pointer', transition: 'all .1s',
                        flexShrink: 0,
                      }}>
                      {ayat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setAddingSurat(false); setSelectedSurat(0); setAyatDari(null); setAyatSampai(null); }}
              className="btn-outline" style={{ fontSize: '.78rem', padding: '.45rem .85rem' }}>Batal</button>
            <button onClick={handleTambah} className="btn-primary"
              disabled={!selectedSurat || ayatDari === null || ayatSampai === null}
              style={{ fontSize: '.78rem', padding: '.45rem .85rem' }}>
              Tambah Surat
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingSurat(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
          border: '1.5px dashed #A7C4B5', borderRadius: 9, background: 'transparent',
          color: '#2D6A4F', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
          width: '100%', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {value.length === 0 ? 'Tambah Surat Setoran' : 'Tambah Surat Lagi'}
        </button>
      )}
    </div>
  );
}

// ─── Modal Detail ─────────────────────────────────────────────────────────────
function ModalDetail({ p, onClose }: { p: Penilaian; onClose: () => void }) {
  const sc = getStatusColor(p.status);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '1.75rem', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#1F2937' }}>Detail Penilaian</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.25rem', padding: 4 }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem', padding: '1rem', background: '#F9FAFB', borderRadius: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '.9rem', flexShrink: 0 }}>{getInitials(getSantriNama(p))}</div>
          <div>
            <div style={{ fontWeight: 700, color: '#1F2937' }}>{getSantriNama(p)}</div>
            <div style={{ fontSize: '.78rem', color: '#6B7280', marginTop: 2 }}>{formatDate(p.tanggal)}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ padding: '1rem', background: '#F0FDF4', borderRadius: 10 }}>
            <div style={{ fontSize: '.72rem', color: '#6B7280', marginBottom: 4 }}>Setoran</div>
            <div style={{ fontWeight: 600, color: '#1F2937', fontSize: '.85rem' }}>{p.setoran}</div>
          </div>
          <div style={{ padding: '1rem', background: '#F0FDF4', borderRadius: 10 }}>
            <div style={{ fontSize: '.72rem', color: '#6B7280', marginBottom: 4 }}>Nilai</div>
            <div style={{ fontWeight: 700, color: '#1B4332', fontSize: '1.4rem' }}>{p.nilai}</div>
          </div>
        </div>
        <div style={{ padding: '.75rem 1rem', borderRadius: 10, background: sc.bg, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color }} />
          <span style={{ color: sc.color, fontWeight: 600, fontSize: '.85rem' }}>Status: {p.status}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Edit ───────────────────────────────────────────────────────────────
function ModalEdit({ p, onClose, onSave }: { p: Penilaian; onClose: () => void; onSave: (u: Penilaian) => void }) {
  const [nilai, setNilai] = useState(String(p.nilai));
  const [status, setStatus] = useState(p.status);
  const [kesalahan, setKesalahan] = useState('');
  const [saving, setSaving] = useState(false);

  const handleK = (v: string) => {
    setKesalahan(v);
    const k = parseInt(v);
    if (!isNaN(k) && k >= 0) { const n = hitungNilai(k); setNilai(String(n)); setStatus(getStatusDariNilai(n)); }
  };
  const handleSave = async () => {
    setSaving(true);
    try { await api.put(`/penyimak/penilaian/${p.id}`, { nilai: parseInt(nilai), status }); onSave({ ...p, nilai: parseInt(nilai), status }); }
    catch { /* err */ } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '1.75rem', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#1F2937' }}>Edit Penilaian — {getSantriNama(p)}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.25rem', padding: 4 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: '#6B7280', marginBottom: '.3rem' }}>Evaluasi</label>
            <input className="dash-input" type="number" min="0" placeholder="Masukkan Evaluasi" value={kesalahan} onChange={e => handleK(e.target.value)} />
            {kesalahan !== '' && <div style={{ marginTop: 6, padding: '.5rem .75rem', background: '#F0FDF4', borderRadius: 8, fontSize: '.78rem', color: '#065F46', fontWeight: 600 }}>→ Nilai: {nilai} | Status: {status}</div>}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: '#6B7280', marginBottom: '.3rem' }}>Nilai (manual)</label>
            <input className="dash-input" type="number" min="0" max="100" value={nilai} onChange={e => { setNilai(e.target.value); setStatus(getStatusDariNilai(parseInt(e.target.value) || 0)); }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: '#6B7280', marginBottom: '.3rem' }}>Status</label>
            <select className="dash-input" value={status} onChange={e => setStatus(e.target.value)}>
              <option>Sangat Bagus</option><option>Bagus</option><option>Baik</option><option>Cukup</option><option>Kurang</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-outline" style={{ fontSize: '.83rem' }}>Batal</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Setoran Detail (Donut) ─────────────────────────────────────────────
function ModalSetoranDetail({ detail, onClose, bulanLabel }: { detail: DonutDetail; onClose: () => void; bulanLabel: string }) {
  const [tab, setTab] = useState<'sudah' | 'belum'>('sudah');
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 72px rgba(0,0,0,0.22)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', padding: '1.4rem 1.75rem', position: 'relative' }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: '1.2rem' }}>📊</span>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>Detail Setoran Bulan Ini</h2>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '.8rem' }}>{bulanLabel} · Seluruh santri &amp; penyimak</p>
        </div>

        {/* Tab buttons */}
        <div style={{ display: 'flex', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
          <button
            onClick={() => setTab('sudah')}
            style={{ flex: 1, padding: '.85rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '.85rem', color: tab === 'sudah' ? '#1B4332' : '#9CA3AF', borderBottom: tab === 'sudah' ? '2px solid #1B4332' : '2px solid transparent', transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#52B788', flexShrink: 0 }} />
            Sudah Setor
            <span style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 99, padding: '1px 8px', fontSize: '.75rem', fontWeight: 700 }}>
              {detail.loading ? '…' : detail.sudah.length}
            </span>
          </button>
          <button
            onClick={() => setTab('belum')}
            style={{ flex: 1, padding: '.85rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '.85rem', color: tab === 'belum' ? '#1B4332' : '#9CA3AF', borderBottom: tab === 'belum' ? '2px solid #1B4332' : '2px solid transparent', transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E5E7EB', flexShrink: 0 }} />
            Belum Setor
            <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 99, padding: '1px 8px', fontSize: '.75rem', fontWeight: 700 }}>
              {detail.loading ? '…' : detail.belum.length}
            </span>
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.75rem' }}>
          {detail.loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9CA3AF', fontSize: '.85rem' }}>Memuat data...</div>
          ) : (
            <>
              {tab === 'sudah' && (
                detail.sudah.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9CA3AF', fontSize: '.85rem' }}>Belum ada santri yang setor bulan ini</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detail.sudah.map((s, i) => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '.75rem 1rem', background: '#F0FDF4', borderRadius: 12, border: '1px solid #D1FAE5' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '.65rem', flexShrink: 0 }}>{getInitials(s.nama)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#1F2937', fontSize: '.88rem' }}>{s.nama}</div>
                          {s.tanggal_setor && <div style={{ fontSize: '.72rem', color: '#6B7280', marginTop: 1 }}>{formatDate(s.tanggal_setor)}</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#D1FAE5', borderRadius: 99, padding: '3px 10px' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#065F46' }}>Sudah</span>
                        </div>
                        <span style={{ color: '#9CA3AF', fontSize: '.75rem', minWidth: 20, textAlign: 'right' }}></span>
                      </div>
                    ))}
                  </div>
                )
              )}
              {tab === 'belum' && (
                detail.belum.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9CA3AF', fontSize: '.85rem' }}>Semua santri sudah setor bulan ini 🎉</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detail.belum.map((s, i) => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '.75rem 1rem', background: '#FFFBEB', borderRadius: 12, border: '1px solid #FDE68A' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#92400E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '.65rem', flexShrink: 0 }}>{getInitials(s.nama)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#1F2937', fontSize: '.88rem' }}>{s.nama}</div>
                          <div style={{ fontSize: '.72rem', color: '#9CA3AF', marginTop: 1 }}>Belum ada setoran bulan ini</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FEF3C7', borderRadius: 99, padding: '3px 10px' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#92400E' }}>Belum</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


function PrestasiCard({ emoji, label, nama, sub }: { emoji: string; label: string; nama: string | null; sub: string }) {
  return (
    <div style={{ flex: 1, padding: '1rem', background: '#F9FAFB', borderRadius: 12, border: '1px solid #F3F4F6' }}>
      <div style={{ fontSize: '.7rem', fontWeight: 600, color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      {nama ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 700, color: '#6B7280', flexShrink: 0 }}>{getInitials(nama)}</div>
            <span style={{ fontWeight: 700, color: '#1F2937', fontSize: '.9rem' }}>{nama}</span>
          </div>
          <div style={{ fontSize: '.78rem', color: '#2D6A4F', fontWeight: 600 }}>{emoji} {sub}</div>
        </>
      ) : (
        <div style={{ color: '#9CA3AF', fontSize: '.82rem' }}>Belum ada data</div>
      )}
    </div>
  );
}

// ─── Modal History Penilaian (Penyimak) ─────────────────────────────────────
interface HistoryPenilaianModalProps {
  onClose: () => void;
  penilaianList: Penilaian[];
  loading: boolean;
}
function HistoryPenilaianModal({ onClose, penilaianList, loading }: HistoryPenilaianModalProps) {
  const [search, setSearch] = useState('');
  const filtered = penilaianList.filter(p =>
    getSantriNama(p).toLowerCase().includes(search.toLowerCase()) ||
    p.setoran.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 780, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 72px rgba(0,0,0,0.22)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', padding: '1.5rem 1.75rem', position: 'relative' }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>📋</span>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>History Penilaian</h2>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.8rem' }}>
            Semua riwayat penilaian · Semester {SEM.jenis} {SEM.tahunLabel}
          </p>
          <div style={{ marginTop: '1rem', display: 'inline-block', background: '#C9A84C', color: '#fff', fontWeight: 700, fontSize: '.78rem', padding: '.35rem .9rem', borderRadius: 99 }}>
            Semester {SEM.jenis} {SEM.tahunLabel}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '1rem 1.75rem', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              style={{ width: '100%', padding: '.55rem .8rem .55rem 2.2rem', border: '1px solid #E5E7EB', borderRadius: 9, fontSize: '.83rem', outline: 'none', background: '#FAFAFA' }}
              placeholder="Cari nama santri atau setoran..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Subtitle */}
        <div style={{ padding: '.6rem 1.75rem', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: '.78rem', color: '#6B7280' }}>{filtered.length} penilaian · Semester {SEM.jenis} {SEM.tahunLabel}</span>
        </div>

        {/* Table */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 1.75rem 1.5rem' }}>
          {loading ? (
            <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '3rem 0', fontSize: '.85rem' }}>Memuat data...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '3rem 0', fontSize: '.85rem' }}>Belum ada data penilaian</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr>
                  {['Tanggal', 'Santri', 'Setoran', 'Nilai', 'Status', 'Catatan'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: '.72rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.04em', padding: '.6rem 0', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const sc = getStatusColor(p.status);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '.75rem 0', fontSize: '.8rem', color: '#6B7280', whiteSpace: 'nowrap' }}>{formatDate(p.tanggal)}</td>
                      <td style={{ padding: '.75rem 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 700, color: '#6B7280', flexShrink: 0 }}>{getInitials(getSantriNama(p))}</div>
                          <span style={{ fontWeight: 600, fontSize: '.83rem', color: '#1F2937' }}>{getSantriNama(p)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '.75rem 0', fontSize: '.8rem', color: '#374151', maxWidth: 200 }}>{p.setoran}</td>
                      <td style={{ padding: '.75rem 0' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: p.nilai >= 85 ? '#065F46' : p.nilai >= 70 ? '#0369A1' : '#991B1B' }}>{p.nilai}</span>
                      </td>
                      <td style={{ padding: '.75rem 0' }}>
                        <span style={{ background: sc.bg, color: sc.color, fontWeight: 600, fontSize: '.72rem', padding: '.25rem .65rem', borderRadius: 99 }}>{p.status}</span>
                      </td>
                      <td style={{ padding: '.75rem 0', fontSize: '.78rem', color: '#6B7280', maxWidth: 160 }}>
                        {p.catatan
                          ? <span style={{ color: '#374151', fontStyle: 'italic' }}>{p.catatan}</span>
                          : <span style={{ color: '#D1D5DB' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser]                         = useState<User | null>(null);
  const [stats, setStats]                       = useState<Stats | null>(null);
  const [donutStats, setDonutStats]             = useState<DonutStats | null>(null);
  const [penilaianTerbaru, setPenilaianTerbaru] = useState<Penilaian[]>([]);
  const [santriAktif, setSantriAktif]           = useState<Santri[]>([]);
  const [prestasiData, setPrestasiData]         = useState<PrestasiSantri[]>([]);

  const [loading, setLoading]                   = useState(true);
  const [sidebarOpen, setSidebarOpen]           = useState(false);
  const [bulanAktif, setBulanAktif]             = useState(() => {
    const bulan = new Date().getMonth() + 1;
    const isGenap = bulan >= 2 && bulan <= 7;
    if (isGenap) return bulan - 2;
    return bulan >= 8 ? bulan - 8 : 5;
  });
  const [totalSesiSemester, setTotalSesiSemester] = useState<number | null>(null);

  const [kesalahan, setKesalahan] = useState('');
  const [setoran, setSetoran]     = useState<SetoranItem[]>([]);
  const [form, setForm] = useState({ santri_id: '', nilai: '', status: '', catatan: '' });
  const [saveStatus, setSaveStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');

  const [modalDetail, setModalDetail] = useState<Penilaian | null>(null);
  const [modalEdit, setModalEdit]     = useState<Penilaian | null>(null);
  const [modalHistoryPenilaian, setModalHistoryPenilaian] = useState(false);
  const [allPenilaian, setAllPenilaian] = useState<Penilaian[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showDonutModal, setShowDonutModal] = useState(false);
  const [donutDetail, setDonutDetail] = useState<DonutDetail>({ sudah: [], belum: [], loading: false });

  const [santriSearch, setSantriSearch]         = useState('');
  const [santriDropdownOpen, setSantriDropdownOpen] = useState(false);
  const [selectedSantriNama, setSelectedSantriNama] = useState('');
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [jenisKelamin, setJenisKelamin] = useState('');

  // ── Sesi penilaian: daftar santri & tracking sudah setor ──
  const [santriSudahSetorHariIni, setSantriSudahSetorHariIni] = useState<Set<string>>(new Set());
  const [loadingSesiSantri, setLoadingSesiSantri] = useState(false);
  const [sesiSantriList, setSesiSantriList] = useState<SantriSetor[]>([]);
  const [sesiExpanded, setSesiExpanded] = useState(false);

  // ── Step form penilaian: 'surat' | 'evaluasi' ──
  const [formStep, setFormStep] = useState<'surat' | 'evaluasi'>('surat');

  // ── Pengaturan modals ──
  const [modalUbahPassword, setModalUbahPassword] = useState(false);
  const [modalPrivasi, setModalPrivasi]           = useState(false);
  const [pwLama, setPwLama]       = useState('');
  const [pwBaru, setPwBaru]       = useState('');
  const [pwKonfirm, setPwKonfirm] = useState('');
  const [showPwLama, setShowPwLama]     = useState(false);
  const [showPwBaru, setShowPwBaru]     = useState(false);
  const [showPwKonfirm, setShowPwKonfirm] = useState(false);
  const [pwStatus, setPwStatus]   = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [pwErrMsg, setPwErrMsg]   = useState('');

  // ── Buka modal History Penilaian otomatis jika dari halaman lain (e.g. Data Santri) ──
  useEffect(() => {
    if (searchParams.get('openHistory') === '1') {
      setModalHistoryPenilaian(true);
      setActiveNav('History Penilaian');
      if (allPenilaian.length === 0) {
        setLoadingHistory(true);
        (async () => {
          try {
            const { start, end } = getSemesterDateRange();
            const startStr = start.toISOString().slice(0, 10);
            const endStr   = end.toISOString().slice(0, 10);
            const res = await api.get(`/penyimak/penilaian?limit=500&dari=${startStr}&sampai=${endStr}`);
            const raw: Penilaian[] = res.data.data ?? res.data;
            const filtered = Array.isArray(raw) ? raw.filter(p => {
              const t = new Date(p.tanggal).getTime();
              return t >= start.getTime() && t <= end.getTime();
            }) : raw;
            setAllPenilaian(filtered);
          } catch { /* err */ }
          finally { setLoadingHistory(false); }
        })();
      }
      // Bersihkan query param dari URL tanpa reload
      router.replace('/penyimak/dashboard', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleNavClick = (item: { href: string; label: string; scrollTo: string | null; icon: React.ReactNode }) => {
    setSidebarOpen(false);
    setActiveNav(item.label);
    if (item.label === 'History Penilaian') {
      setModalHistoryPenilaian(true);
      if (allPenilaian.length === 0) {
        setLoadingHistory(true);
        (async () => {
          try {
            const { start, end } = getSemesterDateRange();
            const startStr = start.toISOString().slice(0, 10);
            const endStr   = end.toISOString().slice(0, 10);
            const res = await api.get(`/penyimak/penilaian?limit=500&dari=${startStr}&sampai=${endStr}`);
            const raw: Penilaian[] = res.data.data ?? res.data;
            const filtered = Array.isArray(raw) ? raw.filter(p => {
              const t = new Date(p.tanggal).getTime();
              return t >= start.getTime() && t <= end.getTime();
            }) : raw;
            setAllPenilaian(filtered);
          } catch { /* err */ }
          finally { setLoadingHistory(false); }
        })();
      }
      return;
    }
    if (item.scrollTo) {
      const el = document.getElementById(item.scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        router.push(item.href + '#' + item.scrollTo);
      }
    } else if (item.href !== '/penyimak/dashboard') {
      router.push(item.href);
    }
  };

  const nilaiValid = form.nilai !== '' && !isNaN(parseInt(form.nilai));
  const kesalahanValid = kesalahan !== '' && !isNaN(parseInt(kesalahan));

  useEffect(() => {
    const abortCtrl = new AbortController();
    const signal = abortCtrl.signal;

    // Baca sesi cache di client (tidak bisa di useState init karena localStorage tidak ada di server)
    const cachedSesi = readSesiCache();
    if (cachedSesi !== null) setTotalSesiSemester(cachedSesi);

    // Baca jenis_kelamin dari localStorage di client saja (hindari hydration mismatch)
    try {
      const lp = JSON.parse(localStorage.getItem('penyimak_profile') ?? '{}');
      if (lp?.jenis_kelamin) setJenisKelamin(lp.jenis_kelamin);
    } catch {}

    // 1. Tampilkan cache langsung (stale-while-revalidate) — UI tidak blank
    const cached = readCache();
    if (cached) {
      if (cached.user)      setUser(cached.user as User);
      if (cached.stats)     setStats(cached.stats as Stats);
      if (cached.penilaian) setPenilaianTerbaru(cached.penilaian as Penilaian[]);
      if (cached.santri)    setSantriAktif(cached.santri as Santri[]);
      if (cached.prestasi)  setPrestasiData(cached.prestasi as PrestasiSantri[]);
      if (cached.donut)     setDonutStats(cached.donut as DonutStats);
      setLoading(false);
    } else {
      const cachedProfile = readProfileCache();
      if (cachedProfile) {
        setUser(cachedProfile);
        setLoading(false);
      } else {
        const t = setTimeout(() => { if (!signal.aborted) setLoading(false); }, 200);
        void t;
      }
    }

    // 2. FIX: Pisah fetch kritis (render awal) vs sekunder (background).
    //    UI langsung tampil setelah 4 request kritis selesai, tanpa nunggu
    //    /laporan/semester dan /setoran/global-stats yang bisa lambat.
    (async () => {
      try {
        // — Batch kritis: profil + stats + penilaian + santri —
        const [meRes, statsRes, pRes, sRes] = await Promise.allSettled([
          api.get('/penyimak/profile', { signal }),
          api.get('/penyimak/dashboard/stats', { signal }),
          api.get('/penyimak/penilaian?limit=5', { signal }),
          api.get('/penyimak/santri-aktif?limit=200', { signal }),
        ]);

        if (signal.aborted) return;

        const fresh: Record<string, unknown> = {};

        let freshUser: User | null = null;
        if (meRes.status === 'fulfilled' && meRes.value.status === 200) {
          freshUser = meRes.value.data.data as User;
          setUser(freshUser);
          fresh.user = freshUser;
          writeProfileCache(freshUser);
          if (freshUser.jenis_kelamin) setJenisKelamin(freshUser.jenis_kelamin);
        } else if (cached?.user) {
          fresh.user = cached.user;
        }

        if (statsRes.status === 'fulfilled') {
          const d = statsRes.value.data;
          setStats(d);
          fresh.stats = d;
          // Langsung pakai stats sebagai fallback donut sambil nunggu endpoint global
          // total_santri dari stats lebih akurat dari donut endpoint yang bisa stale
          setDonutStats({
            sudah_setor:  d.sudah_setor  ?? 0,
            belum_setor:  d.belum_setor  ?? 0,
            total_santri: d.total_santri ?? 0,
          });
        }
        if (pRes.status === 'fulfilled') {
          const d = pRes.value.data.data ?? pRes.value.data;
          setPenilaianTerbaru(d);
          fresh.penilaian = d;
        }
        if (sRes.status === 'fulfilled') {
          const d = sRes.value.data.data ?? sRes.value.data;
          setSantriAktif(d);
          fresh.santri = d;
        }

        // UI sudah bisa tampil lengkap dari sini
        if (!signal.aborted) setLoading(false);

        // — Batch sekunder: laporan prestasi global + global stats (background) —
        const [prestRes, donutRes] = await Promise.allSettled([
          api.get('/laporan/prestasi-global', { signal }),
          api.get('/setoran/global-stats/detail', { signal }),
        ]);

        if (signal.aborted) return;

        if (prestRes.status === 'fulfilled') {
          const d = prestRes.value.data ?? [];
          setPrestasiData(d);
          fresh.prestasi = d;
        }
        if (donutRes.status === 'fulfilled') {
          const d = donutRes.value.data?.data ?? donutRes.value.data;
          const sudahArr: { id: number; nama: string; tanggal_setor?: string }[] = d?.sudah ?? [];
          const belumArr: { id: number; nama: string }[] = d?.belum ?? [];
          const donutData = {
            sudah_setor:  d?.sudah_setor  ?? sudahArr.length,
            belum_setor:  d?.belum_setor  ?? belumArr.length,
            total_santri: d?.total_santri ?? (sudahArr.length + belumArr.length),
          };
          setDonutStats(donutData);
          fresh.donut = donutData;
        } else {
          // Fallback: derive donut dari penilaian terbaru + santri aktif (data sudah ada di state saat ini)
          // Dijalankan setelah batch kritis selesai, jadi santriAktif & penilaianTerbaru sudah terisi
          const freshSantri: Santri[] = (sRes.status === 'fulfilled' ? (sRes.value.data.data ?? sRes.value.data) : []) as Santri[];
          const freshPenilaian: Penilaian[] = (pRes.status === 'fulfilled' ? (pRes.value.data.data ?? pRes.value.data) : []) as Penilaian[];
          const now = new Date();
          const bulanIni = now.getMonth();
          const tahunIni = now.getFullYear();
          // Matching pakai NAMA — response penilaian tidak punya santri_id
          const sudahNamaSet = new Set<string>();
          for (const p of freshPenilaian) {
            const tgl = new Date(p.tanggal);
            if (tgl.getMonth() === bulanIni && tgl.getFullYear() === tahunIni) {
              const nama = (p.santri_nama || p.santri || p.nama || '').toLowerCase().trim();
              if (nama) sudahNamaSet.add(nama);
            }
          }
          if (freshSantri.length > 0) {
            const donutData = {
              sudah_setor: freshSantri.filter(s => sudahNamaSet.has(s.nama.toLowerCase().trim())).length,
              belum_setor: freshSantri.filter(s => !sudahNamaSet.has(s.nama.toLowerCase().trim())).length,
              total_santri: freshSantri.length,
            };
            setDonutStats(donutData);
            fresh.donut = donutData;
          }
        }

        if (!signal.aborted) writeCache(fresh);
      } catch (err: unknown) {
        if (signal.aborted) return;
        console.error(err);
        setLoading(false);
      }
    })();

    // 3. FIX: Hitung total sesi — hapus delay 800ms, langsung coba count + limit=1
    //    secara paralel sehingga tidak ada waterfall 3 request.
    (async () => {
      if (readSesiCache() !== null) return;
      if (signal.aborted) return;
      try {
        const { start, end } = getSemesterDateRange();
        const startStr = start.toISOString().slice(0, 10);
        const endStr   = end.toISOString().slice(0, 10);

        // Coba count endpoint dan limit=1 secara paralel — ambil hasil yang paling informatif
        const [countRes, listRes] = await Promise.allSettled([
          api.get(`/penyimak/penilaian/count?dari=${startStr}&sampai=${endStr}`, { signal }),
          api.get(`/penyimak/penilaian?limit=1&dari=${startStr}&sampai=${endStr}`, { signal }),
        ]);

        if (signal.aborted) return;

        // Prioritas 1: endpoint /count langsung kasih total
        if (countRes.status === 'fulfilled' && countRes.value.data?.total !== undefined) {
          const total = Number(countRes.value.data.total);
          setTotalSesiSemester(total);
          writeSesiCache(total);
          return;
        }

        // Prioritas 2: baca meta/pagination dari response limit=1
        if (listRes.status === 'fulfilled') {
          const meta = listRes.value.data?.meta ?? listRes.value.data?.pagination;
          if (meta?.total !== undefined) {
            const total = Number(meta.total);
            setTotalSesiSemester(total);
            writeSesiCache(total);
            return;
          }
        }

        // Fallback terakhir: fetch limit=200 (hanya jika kedua cara di atas gagal)
        const res2 = await api.get(
          `/penyimak/penilaian?limit=200&dari=${startStr}&sampai=${endStr}`,
          { signal }
        );
        if (signal.aborted) return;
        const raw: Penilaian[] = res2.data.data ?? res2.data;
        const total = Array.isArray(raw)
          ? raw.filter(p => { const t = new Date(p.tanggal).getTime(); return t >= start.getTime() && t <= end.getTime(); }).length
          : 0;
        setTotalSesiSemester(total);
        writeSesiCache(total);
      } catch { /* biarkan null */ }
    })();

    return () => abortCtrl.abort();
  }, []);

  const handleOpenHistoryPenilaian = async () => {
    setModalHistoryPenilaian(true);
    if (allPenilaian.length > 0) return;
    setLoadingHistory(true);
    try {
      const { start, end } = getSemesterDateRange();
      const startStr = start.toISOString().slice(0, 10);
      const endStr   = end.toISOString().slice(0, 10);
      const res = await api.get(`/penyimak/penilaian?limit=500&dari=${startStr}&sampai=${endStr}`);
      const raw: Penilaian[] = res.data.data ?? res.data;
      // filter sisi klien juga sebagai pengaman
      const filtered = Array.isArray(raw) ? raw.filter(p => {
        const t = new Date(p.tanggal).getTime();
        return t >= start.getTime() && t <= end.getTime();
      }) : raw;
      setAllPenilaian(filtered);
    } catch { /* err */ }
    finally { setLoadingHistory(false); }
  };

  // Helper: derive sudah/belum dari data lokal (penilaian bulan ini + santriAktif)
  // Matching pakai NAMA karena response /penyimak/penilaian tidak punya santri_id,
  // hanya santri_nama / santri / nama.
  const deriveDonutFromLocal = () => {
    const now = new Date();
    const bulanIni = now.getMonth();
    const tahunIni = now.getFullYear();

    // Gunakan allPenilaian kalau sudah ada (lebih lengkap), fallback ke penilaianTerbaru
    const sumber = allPenilaian.length > 0 ? allPenilaian : penilaianTerbaru;

    // Set nama santri yang sudah setor bulan ini (lowercase untuk case-insensitive)
    const sudahNamaSet = new Set<string>();
    const sudahNamaTanggal = new Map<string, string>(); // nama_lower -> tanggal_setor

    for (const p of sumber) {
      const tgl = new Date(p.tanggal);
      if (tgl.getMonth() === bulanIni && tgl.getFullYear() === tahunIni) {
        const nama = (p.santri_nama || p.santri || p.nama || '').toLowerCase().trim();
        if (nama) {
          sudahNamaSet.add(nama);
          if (!sudahNamaTanggal.has(nama)) sudahNamaTanggal.set(nama, p.tanggal);
        }
      }
    }

    const sudahList: SantriSetor[] = santriAktif
      .filter(s => sudahNamaSet.has(s.nama.toLowerCase().trim()))
      .map(s => ({ id: s.id, nama: s.nama, tanggal_setor: sudahNamaTanggal.get(s.nama.toLowerCase().trim()) }));

    const belumList: SantriSetor[] = santriAktif
      .filter(s => !sudahNamaSet.has(s.nama.toLowerCase().trim()))
      .map(s => ({ id: s.id, nama: s.nama }));

    return { sudahList, belumList };
  };

  const handleOpenDonutModal = async () => {
    setShowDonutModal(true);
    // Selalu refresh agar modal & donut card selalu sinkron
    setDonutDetail({ sudah: [], belum: [], loading: true });
    try {
      const res = await api.get('/setoran/global-stats/detail');
      const d = res.data?.data ?? res.data;

      const sudahList: SantriSetor[] = (d?.sudah ?? []).map((x: { id: number; nama: string; tanggal_setor?: string }) => ({
        id: x.id,
        nama: x.nama,
        tanggal_setor: x.tanggal_setor,
      }));
      const belumList: SantriSetor[] = (d?.belum ?? []).map((x: { id: number; nama: string }) => ({
        id: x.id,
        nama: x.nama,
      }));

      // Sinkronkan donut card dengan sumber data yang sama persis
      setDonutStats({
        sudah_setor:  d?.sudah_setor  ?? sudahList.length,
        belum_setor:  d?.belum_setor  ?? belumList.length,
        total_santri: d?.total_santri ?? (sudahList.length + belumList.length),
      });

      setDonutDetail({ sudah: sudahList, belum: belumList, loading: false });
    } catch {
      // ── Fallback: derive dari data penilaian + santri aktif yang sudah ada ──
      // Jika endpoint /setoran/global-stats/detail gagal atau belum ada,
      // kita fetch data penilaian bulan ini terlebih dahulu, lalu derive sendiri
      try {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const startBulan = `${y}-${m}-01`;
        const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
        const endBulan = `${y}-${m}-${lastDay}`;

        // Fetch penilaian bulan ini kalau allPenilaian belum lengkap
        let sumberPenilaian = allPenilaian.length > 0 ? allPenilaian : penilaianTerbaru;
        if (allPenilaian.length === 0) {
          try {
            const pRes = await api.get(`/penyimak/penilaian?limit=500&dari=${startBulan}&sampai=${endBulan}`);
            const raw: Penilaian[] = pRes.data?.data ?? pRes.data;
            if (Array.isArray(raw)) {
              sumberPenilaian = raw;
              setAllPenilaian(raw); // cache untuk pemakaian berikutnya
            }
          } catch { /* pakai sumberPenilaian yang ada */ }
        }

        const bulanIni = now.getMonth();
        const tahunIni = now.getFullYear();
        // Matching pakai NAMA — response penilaian tidak punya santri_id
        const sudahNamaSet = new Set<string>();
        const sudahNamaTanggal = new Map<string, string>();

        for (const p of sumberPenilaian) {
          const tgl = new Date(p.tanggal);
          if (tgl.getMonth() === bulanIni && tgl.getFullYear() === tahunIni) {
            const nama = (p.santri_nama || p.santri || p.nama || '').toLowerCase().trim();
            if (nama) {
              sudahNamaSet.add(nama);
              if (!sudahNamaTanggal.has(nama)) sudahNamaTanggal.set(nama, p.tanggal);
            }
          }
        }

        const sudahList: SantriSetor[] = santriAktif
          .filter(s => sudahNamaSet.has(s.nama.toLowerCase().trim()))
          .map(s => ({ id: s.id, nama: s.nama, tanggal_setor: sudahNamaTanggal.get(s.nama.toLowerCase().trim()) }));

        const belumList: SantriSetor[] = santriAktif
          .filter(s => !sudahNamaSet.has(s.nama.toLowerCase().trim()))
          .map(s => ({ id: s.id, nama: s.nama }));

        setDonutStats({
          sudah_setor:  sudahList.length,
          belum_setor:  belumList.length,
          total_santri: santriAktif.length,
        });
        setDonutDetail({ sudah: sudahList, belum: belumList, loading: false });
      } catch {
        // Ultimate fallback: pakai derive dari state yang ada
        const { sudahList, belumList } = deriveDonutFromLocal();
        setDonutStats({
          sudah_setor:  sudahList.length,
          belum_setor:  belumList.length,
          total_santri: santriAktif.length,
        });
        setDonutDetail({ sudah: sudahList, belum: belumList, loading: false });
      }
    }
  };
  const handleKesalahan = (v: string) => {
    setKesalahan(v);
    const k = parseInt(v);
    if (!isNaN(k) && k >= 0) {
      const n = hitungNilai(k);
      setForm(f => ({ ...f, nilai: String(n), status: getStatusDariNilai(n) }));
    } else {
      setForm(f => ({ ...f, nilai: '', status: '' }));
    }
  };

  // Fetch daftar santri yang sudah booking ke jadwal penyimak ini hari ini
  const fetchSantriSesi = async () => {
    setLoadingSesiSantri(true);
    try {
      const today = new Date().toISOString().slice(0, 10);

      // Fetch jadwal semua + penilaian hari ini secara paralel
      const [jadwalRes, penilaianHariIniRes] = await Promise.allSettled([
        api.get('/jadwal'),
        api.get(`/penyimak/penilaian?limit=100&dari=${today}&sampai=${today}`),
      ]);

      // 1. Santri yang sudah setor hari ini (dari penilaian)
      const sudahSet = new Set<string>();
      if (penilaianHariIniRes.status === 'fulfilled') {
        const list: Penilaian[] = penilaianHariIniRes.value.data?.data ?? penilaianHariIniRes.value.data ?? [];
        for (const p of list) {
          const nama = (p.santri_nama || p.santri || p.nama || '').toLowerCase().trim();
          if (nama) sudahSet.add(nama);
        }
      }
      setSantriSudahSetorHariIni(sudahSet);

      // 2. Filter jadwal hari ini milik penyimak yang sedang login
      //    Penyimak diidentifikasi lewat user.id atau user.penyimak_id
      if (jadwalRes.status === 'fulfilled') {
        const allJadwal: {
          id: number;
          tanggal: string;
          penyimak_id: number | null;
        }[] = jadwalRes.value.data?.data ?? jadwalRes.value.data ?? [];

        const penyimakId = user?.penyimak_id ?? user?.id;

        // Jadwal hari ini yang penyimak_id-nya cocok dengan penyimak login
        const jadwalHariIni = allJadwal.filter(j =>
          j.tanggal?.slice(0, 10) === today &&
          (penyimakId == null || j.penyimak_id === penyimakId)
        );

        if (jadwalHariIni.length === 0) {
          setSesiSantriList([]);
          setLoadingSesiSantri(false);
          return;
        }

        // 3. Fetch peserta dari semua jadwal hari ini (bisa lebih dari satu sesi)
        const pesertaResults = await Promise.allSettled(
          jadwalHariIni.map(j => api.get(`/jadwal/${j.id}/peserta`))
        );

        const pesertaGabung: SantriSetor[] = [];
        const namaSet = new Set<string>(); // dedup kalau santri booking 2 sesi

        for (const res of pesertaResults) {
          if (res.status === 'fulfilled') {
            const list: { id: number; nama: string }[] =
              res.value.data?.data ?? res.value.data ?? [];
            for (const p of list) {
              const key = (p.nama ?? '').toLowerCase().trim();
              if (key && !namaSet.has(key)) {
                namaSet.add(key);
                pesertaGabung.push({ id: p.id, nama: p.nama });
              }
            }
          }
        }

        setSesiSantriList(pesertaGabung);
      } else {
        // Jadwal gagal diambil — list kosong, jangan fallback ke santri aktif
        // karena kita tidak mau tampilkan santri yang belum daftar
        setSesiSantriList([]);
      }
    } catch {
      setSesiSantriList([]);
    } finally {
      setLoadingSesiSantri(false);
    }
  };

  const handleSimpan = async () => {
    setSaveStatus('loading');
    try {
      // 1. Simpan penilaian — jika ini gagal, baru tampilkan error
      await api.post('/penyimak/penilaian', {
        ...form,
        setoran: labelSetoran(setoran),
        total_ayat: totalAyatSetoran(setoran),
      });

      // 2. Simpan berhasil → reset form & tandai sukses dulu
      setForm({ santri_id: '', nilai: '', status: '', catatan: '' });
      setKesalahan(''); setSetoran([]);
      setFormStep('surat'); // reset ke step awal
      setSantriSearch(''); setSelectedSantriNama('');
      setSaveStatus('success');
      clearDashboardCache();
      // Tandai santri ini sudah setor hari ini
      if (selectedSantriNama) {
        setSantriSudahSetorHariIni(prev => {
          const next = new Set(prev);
          next.add(selectedSantriNama.toLowerCase().trim());
          return next;
        });
      }
      // Reset donutDetail & allPenilaian agar modal akan fetch ulang data terbaru saat dibuka
      setDonutDetail({ sudah: [], belum: [], loading: false });
      setAllPenilaian([]);

      // 3. Refresh data dashboard secara terpisah — error di sini TIDAK mempengaruhi status simpan
      const [pRes, sRes, donutRes2] = await Promise.allSettled([
        api.get('/penyimak/penilaian?limit=5'),
        api.get('/penyimak/dashboard/stats'),
        api.get('/setoran/global-stats/detail'),
      ]);
      if (pRes.status === 'fulfilled') setPenilaianTerbaru(pRes.value.data.data ?? pRes.value.data);
      if (sRes.status === 'fulfilled') setStats(sRes.value.data);
      // Sinkronkan donut card dengan data global terbaru
      if (donutRes2.status === 'fulfilled') {
        const d = donutRes2.value.data?.data ?? donutRes2.value.data;
        const sudahList = d?.sudah ?? [];
        const belumList = d?.belum ?? [];
        setDonutStats({
          sudah_setor:  d?.sudah_setor  ?? sudahList.length,
          belum_setor:  d?.belum_setor  ?? belumList.length,
          total_santri: d?.total_santri ?? (sudahList.length + belumList.length),
        });
      } else if (sRes.status === 'fulfilled') {
        // fallback ke stats jika endpoint global gagal
        const d = sRes.value.data;
        if (d?.sudah_setor !== undefined) {
          setDonutStats({ sudah_setor: d.sudah_setor, belum_setor: d.belum_setor, total_santri: d.total_santri });
        } else {
          // fallback terakhir: derive dari santri aktif + penilaian terbaru
          const freshSantri: Santri[] = santriAktif;
          const freshPenilaian: Penilaian[] = pRes.status === 'fulfilled' ? (pRes.value.data.data ?? pRes.value.data) : penilaianTerbaru;
          const now = new Date();
          const bulanIni = now.getMonth(), tahunIni = now.getFullYear();
          // Matching pakai NAMA — response penilaian tidak punya santri_id
          const sudahNamaSet = new Set<string>();
          for (const p of freshPenilaian) {
            const tgl = new Date(p.tanggal);
            if (tgl.getMonth() === bulanIni && tgl.getFullYear() === tahunIni) {
              const nama = (p.santri_nama || p.santri || p.nama || '').toLowerCase().trim();
              if (nama) sudahNamaSet.add(nama);
            }
          }
          setDonutStats({
            sudah_setor: freshSantri.filter(s => sudahNamaSet.has(s.nama.toLowerCase().trim())).length,
            belum_setor: freshSantri.filter(s => !sudahNamaSet.has(s.nama.toLowerCase().trim())).length,
            total_santri: freshSantri.length,
          });
        }
      }
    } catch {
      // Hanya masuk sini jika POST /penilaian benar-benar gagal
      setSaveStatus('error');
    } finally {
      setTimeout(() => setSaveStatus('idle'), 2500);
    }
  };

  const handleUbahPassword = async () => {
    if (pwBaru !== pwKonfirm) { setPwErrMsg('Password baru tidak cocok'); setPwStatus('error'); return; }
    if (pwBaru.length < 8)    { setPwErrMsg('Password minimal 8 karakter'); setPwStatus('error'); return; }
    setPwStatus('loading'); setPwErrMsg('');
    try {
      await api.post('/penyimak/change-password', { password_lama: pwLama, password_baru: pwBaru });
      setPwStatus('success');
      setTimeout(() => { setModalUbahPassword(false); setPwLama(''); setPwBaru(''); setPwKonfirm(''); setPwStatus('idle'); }, 1800);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal mengubah password';
      setPwErrMsg(msg); setPwStatus('error');
    }
  };

  const handleHapusAkun = async () => {
    if (!confirm('Yakin ingin menghapus akun? Semua data akan hilang permanen.')) return;
    try { await api.delete('/penyimak/account'); router.push('/login'); } catch { alert('Gagal menghapus akun'); }
  };

  // ── Kalkulasi prestasi per bulan ──
  function getPrestasiBulan(bulan: number) {
    // paling rajin = frekuensi terbanyak
    let rajin: PrestasiSantri | null = null;
    for (const s of prestasiData) {
      const f = s.frekuensi_bulanan[bulan];
      if (f !== null && (rajin === null || f > (rajin.frekuensi_bulanan[bulan] ?? 0))) rajin = s;
    }
    const rajinVal = rajin?.frekuensi_bulanan[bulan];
    return { rajin, rajinVal };
  }

  function getPrestasiSemester() {
    let rajin: PrestasiSantri | null = null;
    for (const s of prestasiData) {
      const totalF = s.frekuensi_bulanan.reduce<number>((sum, v) => sum + (v ?? 0), 0);
      const rajinRef = rajin ? rajin.frekuensi_bulanan.reduce<number>((sum, v) => sum + (v ?? 0), 0) : -1;
      if (totalF > rajinRef) rajin = s;
    }
    const totalFRajin = rajin ? rajin.frekuensi_bulanan.reduce<number>((sum, v) => sum + (v ?? 0), 0) : null;
    return { rajin, totalFRajin };
  }

  // jenisKelamin dibaca di useEffect untuk menghindari hydration mismatch
  const isIkhwan     = jenisKelamin.toLowerCase() === 'ikhwan';
  const greeting     = 'Assalamualaikum';
  const gelar        = isIkhwan ? 'Ustadz' : 'Ustadzah';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif", background: '#F4F5F0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.12);border-radius:99px}
        .sidebar{width:220px;min-height:100vh;background:#1B4332;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:50;overflow-y:auto;transition:transform .25s ease}
        @media(max-width:900px){.sidebar{transform:translateX(-100%)}.sidebar.open{transform:translateX(0)}.main-wrap{margin-left:0!important}.hamburger{display:flex!important}}
        .nav-item{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:9px;cursor:pointer;text-decoration:none;color:rgba(255,255,255,0.55);font-size:.83rem;font-weight:500;transition:background .15s,color .15s;margin:1px 0;width:100%;background:none;border:none;text-align:left}
        .nav-item:hover{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.85)}
        .nav-item.active{background:#2D6A4F;color:#fff}
        .stat-card{background:#fff;border-radius:14px;padding:1.25rem 1rem;display:flex;flex-direction:column;align-items:center;gap:6px;border:1px solid rgba(0,0,0,0.04);box-shadow:0 1px 4px rgba(0,0,0,0.04)}
        table{width:100%;border-collapse:collapse}
        thead th{text-align:left;font-size:.72rem;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:.04em;padding:.6rem 0;border-bottom:1px solid #E5E7EB}
        tbody tr{border-bottom:1px solid #F3F4F6}tbody tr:last-child{border-bottom:none}
        tbody td{padding:.75rem 0;font-size:.83rem;color:#374151;vertical-align:middle}
        .dash-input{width:100%;padding:.55rem .8rem;border:1px solid #E5E7EB;border-radius:9px;font-size:.83rem;color:#1F2937;background:#FAFAFA;outline:none;transition:border .15s}
        .dash-input:focus{border-color:#2D6A4F;background:#fff}
        .dash-input:disabled{opacity:.45;cursor:not-allowed;background:#F3F4F6}
        .btn-primary{display:inline-flex;align-items:center;gap:7px;background:#1B4332;color:#fff;border:none;border-radius:10px;padding:.7rem 1.25rem;font-size:.85rem;font-weight:600;cursor:pointer;transition:background .15s}
        .btn-primary:hover{background:#2D6A4F}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-outline{display:inline-flex;align-items:center;gap:7px;background:transparent;color:#1B4332;border:1.5px solid #1B4332;border-radius:10px;padding:.65rem 1.1rem;font-size:.83rem;font-weight:600;cursor:pointer;transition:background .15s;text-decoration:none}
        .btn-outline:hover{background:#F0FDF4}
        .progress-track{height:6px;background:#E5E7EB;border-radius:99px;overflow:hidden;flex:1}
        .progress-fill{height:100%;border-radius:99px;transition:width .4s ease}
        .overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:40}
        @media(max-width:900px){.overlay.open{display:block}}
        .hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px}
        .card{background:#fff;border-radius:16px;padding:1.4rem;border:1px solid rgba(0,0,0,0.04);box-shadow:0 1px 4px rgba(0,0,0,0.04)}
        .icon-btn{background:none;border:none;cursor:pointer;padding:5px;border-radius:7px;display:flex;align-items:center;justify-content:center;transition:background .15s}
        .icon-btn:hover{background:#F3F4F6}
        .icon-btn-white{background:#fff;border:1px solid #E5E7EB;border-radius:10px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s;position:relative}
        .icon-btn-white:hover{background:#F9FAFB}
        .bulan-tab{padding:.45rem .9rem;border-radius:8px;border:1.5px solid #E5E7EB;background:#fff;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .15s;color:#6B7280}
        .bulan-tab.active{background:#1B4332;color:#fff;border-color:#1B4332}
        .bulan-tab:hover:not(.active){background:#F0FDF4;color:#1B4332;border-color:#2D6A4F}
        .popup-dropdown{position:absolute;top:calc(100% + 8px);right:0;background:#fff;border:1px solid #E5E7EB;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.12);z-index:200;min-width:220px;overflow:hidden}
        .popup-item{padding:.7rem 1rem;font-size:.83rem;color:#374151;cursor:pointer;display:flex;align-items:center;gap:9px;transition:background .1s}
        .popup-item:hover{background:#F9FAFB}
        .popup-item.danger{color:#EF4444}
        .field-disabled-hint{font-size:.7rem;color:#F59E0B;font-weight:500;margin-top:3px;display:flex;align-items:center;gap:4px}
      `}</style>

      {modalDetail && <ModalDetail p={modalDetail} onClose={() => setModalDetail(null)} />}
      {modalEdit && <ModalEdit p={modalEdit} onClose={() => setModalEdit(null)} onSave={u => { setPenilaianTerbaru(prev => prev.map(p => p.id === u.id ? u : p)); setModalEdit(null); }} />}
      {modalHistoryPenilaian && (
        <HistoryPenilaianModal
          onClose={() => setModalHistoryPenilaian(false)}
          penilaianList={allPenilaian}
          loading={loadingHistory}
        />
      )}

      <div className={`overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 260, height: 260, border: '1.5px solid rgba(201,168,76,0.15)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 160, height: 160, border: '1.5px solid rgba(201,168,76,0.1)', borderRadius: '50%', pointerEvents: 'none' }} />
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
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '.88rem', letterSpacing: '.02em' }}>UKM TAHFIDZUL QUR'AN</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.62rem' }}>UNIVERSITAS AIRLANGGA</div>
            </div>
          </div>
        </div>
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
        <nav style={{ flex: 1, padding: '0 .75rem', position: 'relative', zIndex: 1 }}>
          {NAV.map(item => (
            <button key={item.label} onClick={() => handleNavClick(item)} className={`nav-item ${activeNav === item.label ? 'active' : ''}`}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
        <div style={{ margin: '1.5rem 1.25rem', borderLeft: '2.5px solid rgba(201,168,76,0.45)', paddingLeft: 12, position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '.68rem', lineHeight: 1.75, fontStyle: 'italic' }}>&ldquo;Sesungguhnya Al-Qur&apos;an ini memberi petunjuk kepada jalan yang lebih lurus.&rdquo;</p>
          <p style={{ color: 'rgba(201,168,76,0.65)', fontSize: '.65rem', fontWeight: 600, marginTop: 4 }}>QS. Al-Isra&apos;: 9</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-wrap" style={{ marginLeft: 220, flex: 1, minHeight: '100vh', overflow: 'auto' }}>

        {/* Topbar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(244,245,240,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '.85rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Tombol Keluar */}
            <button
              onClick={async () => { try { await api.post('/logout'); } catch {} router.push('/login'); }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', color: '#DC2626', fontWeight: 600, fontSize: '.8rem', transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
              onMouseLeave={e => (e.currentTarget.style.background = '#FEF2F2')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Keluar
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.75rem 1.75rem 3rem' }}>

          {/* Welcome */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', color: '#1B4332', fontWeight: 700, marginBottom: '.3rem' }}>
              {greeting}, {gelar} {user?.nama ?? '...'} 👋
            </h1>
            <p style={{ color: '#9CA3AF', fontSize: '.85rem' }}>Semangat menyimak dan membimbing, semoga setiap ayat yang dibaca menjadi cahaya di dunia dan akhirat.</p>
          </div>

          {/* Stats row */}
          <div id="section-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h2 style={{ fontWeight: 700, fontSize: '.95rem', color: '#1F2937', marginBottom: '1.25rem' }}>Ringkasan Penilaian Saya</h2>
              <div
                onClick={handleOpenHistoryPenilaian}
                style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem 1.25rem', background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)', borderRadius: 14, border: '1px solid #BBF7D0', cursor: 'pointer', transition: 'box-shadow .15s, background .15s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(27,67,50,0.12)'; e.currentTarget.style.background = 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)'; }}
                title="Klik untuk lihat history penilaian"
              >
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(27,67,50,0.25)' }}>
                  📖
                </div>
                <div>
                  <div style={{ fontSize: '.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Total Sesi Penyimakan</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1B4332', lineHeight: 1 }}>
                    {totalSesiSemester !== null ? totalSesiSemester : <span style={{ fontSize: '1.5rem', color: '#9CA3AF' }}>—</span>}
                  </div>
                  <div style={{ fontSize: '.75rem', color: '#4B7C5F', marginTop: 5, fontWeight: 500 }}>
                    kali menyimak santri
                  </div>
                  <div style={{ marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#D1FAE5', borderRadius: 99, padding: '2px 8px' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span style={{ fontSize: '.65rem', fontWeight: 700, color: '#065F46' }}>Sem. {SEM.jenis} {SEM.tahunLabel}</span>
                  </div>
                  <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, color: '#9CA3AF', fontSize: '.68rem' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Lihat semua history
                  </div>
                </div>
                {stats?.rata_rata_nilai != null && (
                  <div style={{ marginLeft: 'auto', textAlign: 'center', padding: '0.6rem 1rem', background: '#fff', borderRadius: 10, border: '1px solid #D1FAE5' }}>
                    <div style={{ fontSize: '.68rem', color: '#9CA3AF', fontWeight: 600, marginBottom: 2 }}>Rata-rata Nilai</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2D6A4F' }}>{Math.round(stats.rata_rata_nilai)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Donut: sudah vs belum setor — data global semua penyimak */}
            <div
              onClick={handleOpenDonutModal}
              style={{ background: '#1B4332', borderRadius: 16, padding: '1.4rem', cursor: 'pointer', transition: 'opacity .15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              title="Klik untuk lihat detail santri"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontWeight: 700, fontSize: '.9rem', color: '#fff' }}>Setoran Bulan Ini</h2>
                  <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Seluruh santri &amp; penyimak</div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.7rem' }}>{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
                {donutStats ? (
                  <DonutChart sudah={donutStats.sudah_setor} belum={donutStats.belum_setor} total={donutStats.total_santri} />
                ) : (
                  <div style={{ width: 130, height: 130, borderRadius: '50%', border: '14px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.75rem' }}>...</span>
                  </div>
                )}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#52B788', flexShrink: 0 }} />
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.78rem' }}>Sudah Setor</span>
                    </div>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '.88rem' }}>{donutStats?.sudah_setor ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.28)', flexShrink: 0 }} />
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.78rem' }}>Belum Setor</span>
                    </div>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '.88rem' }}>{donutStats?.belum_setor ?? 0}</span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '.75rem' }}>Total Santri</span>
                    <span style={{ color: '#C9A84C', fontWeight: 700, fontSize: '.88rem' }}>{donutStats?.total_santri ?? 0}</span>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.3)', fontSize: '.68rem' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Klik untuk lihat detail
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Input Nilai ── */}
          <div id="section-penilaian" className="card" style={{ marginBottom: '1.25rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '.95rem', color: '#1F2937' }}>Masukkan Nilai &amp; Catatan</h2>
                <p style={{ fontSize: '.78rem', color: '#9CA3AF', marginTop: 2 }}>Pilih santri → pilih surat → isi evaluasi</p>
              </div>
              {/* Tombol lihat antrian sesi */}
              <button
                onClick={() => { setSesiExpanded(v => !v); if (!sesiExpanded && sesiSantriList.length === 0) fetchSantriSesi(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: sesiExpanded ? '#1B4332' : '#F0FDF4', color: sesiExpanded ? '#fff' : '#1B4332', border: '1.5px solid #1B4332', borderRadius: 9, padding: '.4rem .9rem', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                {sesiExpanded ? 'Sembunyikan Antrian' : 'Lihat Antrian Sesi'}
                {sesiSantriList.length > 0 && (
                  <span style={{ background: sesiExpanded ? 'rgba(255,255,255,0.2)' : '#D1FAE5', color: sesiExpanded ? '#fff' : '#065F46', borderRadius: 99, padding: '1px 7px', fontSize: '.72rem', fontWeight: 700 }}>{sesiSantriList.length}</span>
                )}
              </button>
            </div>

            {/* Daftar santri antrian sesi */}
            {sesiExpanded && (
              <div style={{ marginBottom: '1rem', border: '1.5px solid #D1FAE5', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(90deg, #1B4332 0%, #2D6A4F 100%)', padding: '.65rem 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1rem' }}>📋</span>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '.85rem' }}>Antrian Sesi Hari Ini</span>
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '.75rem', marginLeft: 'auto' }}>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  <button
                    onClick={fetchSantriSesi}
                    title="Refresh"
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 4, fontSize: '.72rem', fontWeight: 600 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                    Refresh
                  </button>
                </div>
                {loadingSesiSantri ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9CA3AF', fontSize: '.82rem' }}>Memuat daftar santri...</div>
                ) : sesiSantriList.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9CA3AF', fontSize: '.82rem' }}>
                    Belum ada santri yang booking sesi hari ini
                  </div>
                ) : (
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {sesiSantriList.map((s, i) => {
                      const sudah = santriSudahSetorHariIni.has(s.nama.toLowerCase().trim());
                      return (
                        <div key={s.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '.6rem 1rem', background: sudah ? '#F0FDF4' : '#fff', borderBottom: '1px solid #F3F4F6' }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: sudah ? '#1B4332' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 700, color: sudah ? '#fff' : '#6B7280', flexShrink: 0 }}>{getInitials(s.nama)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '.83rem', color: '#1F2937' }}>{s.nama}</div>
                          </div>
                          {sudah ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#D1FAE5', color: '#065F46', borderRadius: 99, padding: '3px 10px', fontSize: '.72rem', fontWeight: 700 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              Sudah Setor
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FEF3C7', color: '#92400E', borderRadius: 99, padding: '3px 10px', fontSize: '.72rem', fontWeight: 700 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              Menunggu
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '1.1rem' }}>
              {/* Step 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: form.santri_id && setoran.length > 0 ? '#1B4332' : form.santri_id ? '#2D6A4F' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {(form.santri_id && setoran.length > 0) ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <span style={{ fontSize: '.68rem', fontWeight: 700, color: form.santri_id ? '#fff' : '#9CA3AF' }}>1</span>
                  )}
                </div>
                <span style={{ fontSize: '.75rem', fontWeight: 600, color: form.santri_id ? '#1B4332' : '#9CA3AF' }}>Santri &amp; Surat</span>
              </div>
              <div style={{ flex: 1, height: 2, background: setoran.length > 0 ? '#1B4332' : '#E5E7EB', margin: '0 8px', borderRadius: 99 }} />
              {/* Step 2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: formStep === 'evaluasi' ? '#2D6A4F' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '.68rem', fontWeight: 700, color: formStep === 'evaluasi' ? '#fff' : '#9CA3AF' }}>2</span>
                </div>
                <span style={{ fontSize: '.75rem', fontWeight: 600, color: formStep === 'evaluasi' ? '#1B4332' : '#9CA3AF' }}>Evaluasi</span>
              </div>
            </div>

            {/* ─ STEP 1: Pilih Santri & Surat ─ */}
            {formStep === 'surat' && (
              <>
                {/* Pilih Santri */}
                <div style={{ marginBottom: '.75rem', position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: '#6B7280', marginBottom: '.3rem' }}>Pilih Santri</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="dash-input"
                      type="text"
                      placeholder="Cari nama santri..."
                      value={santriSearch}
                      autoComplete="off"
                      onChange={e => {
                        setSantriSearch(e.target.value);
                        setSantriDropdownOpen(true);
                        if (!e.target.value) {
                          setForm({ ...form, santri_id: '' });
                          setSelectedSantriNama('');
                          setSetoran([]);
                        }
                      }}
                      onFocus={() => setSantriDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setSantriDropdownOpen(false), 150)}
                      style={{ paddingRight: '2rem' }}
                    />
                    <div
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: form.santri_id ? 'auto' : 'none', cursor: form.santri_id ? 'pointer' : 'default' }}
                      onClick={() => { setSantriSearch(''); setSelectedSantriNama(''); setForm({ ...form, santri_id: '' }); setSantriDropdownOpen(false); setSetoran([]); }}
                    >
                      {form.santri_id
                        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      }
                    </div>
                  </div>
                  {santriDropdownOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
                      {santriAktif.filter(s => s.nama.toLowerCase().includes(santriSearch.toLowerCase())).length === 0 ? (
                        <div style={{ padding: '.75rem 1rem', fontSize: '.8rem', color: '#9CA3AF', textAlign: 'center' }}>Santri tidak ditemukan</div>
                      ) : santriAktif.filter(s => s.nama.toLowerCase().includes(santriSearch.toLowerCase())).map(s => {
                        const sudahSetor = santriSudahSetorHariIni.has(s.nama.toLowerCase().trim());
                        return (
                          <div
                            key={s.id}
                            onMouseDown={() => {
                              if (sudahSetor) return; // block klik jika sudah setor
                              setForm({ ...form, santri_id: String(s.id) });
                              setSelectedSantriNama(s.nama);
                              setSantriSearch(s.nama);
                              setSantriDropdownOpen(false);
                              setSetoran([]);
                            }}
                            style={{ padding: '.6rem 1rem', fontSize: '.83rem', cursor: sudahSetor ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #F3F4F6', transition: 'background .1s', background: sudahSetor ? '#F9FAFB' : '#fff', opacity: sudahSetor ? 0.65 : 1 }}
                            onMouseEnter={e => { if (!sudahSetor) e.currentTarget.style.background = '#F0FDF4'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = sudahSetor ? '#F9FAFB' : '#fff'; }}
                          >
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: sudahSetor ? '#D1FAE5' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 700, color: sudahSetor ? '#065F46' : '#6B7280', flexShrink: 0 }}>{getInitials(s.nama)}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: '#1F2937' }}>{s.nama}</div>
                              <div style={{ fontSize: '.7rem', color: '#9CA3AF' }}>{s.juz_aktif}</div>
                            </div>
                            {sudahSetor && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#D1FAE5', color: '#065F46', borderRadius: 99, padding: '2px 8px', fontSize: '.7rem', fontWeight: 700, flexShrink: 0 }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Sudah Setor
                              </span>
                            )}
                            {!sudahSetor && form.santri_id === String(s.id) && (
                              <svg style={{ marginLeft: 'auto' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {selectedSantriNama && !santriDropdownOpen && (
                    <div style={{ marginTop: 4, fontSize: '.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, color: santriSudahSetorHariIni.has(selectedSantriNama.toLowerCase().trim()) ? '#DC2626' : '#2D6A4F' }}>
                      {santriSudahSetorHariIni.has(selectedSantriNama.toLowerCase().trim()) ? (
                        <>⚠ {selectedSantriNama} sudah setor hari ini</>
                      ) : (
                        <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Terpilih: {selectedSantriNama}</>
                      )}
                    </div>
                  )}
                </div>

                {/* Setoran Surat — hanya muncul jika santri sudah dipilih & belum setor */}
                {form.santri_id && !santriSudahSetorHariIni.has(selectedSantriNama.toLowerCase().trim()) && (
                  <div style={{ marginBottom: '.75rem' }}>
                    <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: '#6B7280', marginBottom: '.3rem' }}>Setoran Surat &amp; Ayat</label>
                    <InputSetoran value={setoran} onChange={setSetoran} />
                  </div>
                )}

                {/* Peringatan jika santri sudah setor */}
                {form.santri_id && santriSudahSetorHariIni.has(selectedSantriNama.toLowerCase().trim()) && (
                  <div style={{ marginBottom: '.75rem', padding: '.75rem 1rem', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span style={{ fontSize: '.82rem', color: '#DC2626', fontWeight: 600 }}>{selectedSantriNama} sudah menyetor hari ini dan tidak dapat diinput lagi.</span>
                  </div>
                )}

                {/* Tombol lanjut ke step evaluasi */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-primary"
                    disabled={!form.santri_id || setoran.length === 0 || santriSudahSetorHariIni.has(selectedSantriNama.toLowerCase().trim())}
                    onClick={() => setFormStep('evaluasi')}
                  >
                    Lanjut ke Evaluasi
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                </div>
              </>
            )}

            {/* ─ STEP 2: Evaluasi ─ */}
            {formStep === 'evaluasi' && (
              <>
                {/* Info ringkasan santri & setoran terpilih */}
                <div style={{ marginBottom: '.85rem', padding: '.7rem 1rem', background: '#F0FDF4', borderRadius: 10, border: '1px solid #D1FAE5', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '.65rem', flexShrink: 0 }}>{getInitials(selectedSantriNama)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#1F2937' }}>{selectedSantriNama}</div>
                    <div style={{ fontSize: '.72rem', color: '#2D6A4F', marginTop: 1 }}>{labelSetoran(setoran)} · {totalAyatSetoran(setoran)} ayat</div>
                  </div>
                  <button
                    onClick={() => { setFormStep('surat'); setKesalahan(''); setForm(f => ({ ...f, nilai: '', status: '' })); }}
                    style={{ background: 'none', border: '1px solid #A7C4B5', borderRadius: 8, padding: '4px 10px', fontSize: '.72rem', fontWeight: 600, color: '#2D6A4F', cursor: 'pointer' }}
                  >
                    ← Ubah
                  </button>
                </div>

                {/* Evaluasi (kesalahan) */}
                <div style={{ marginBottom: '.75rem' }}>
                  <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: '#6B7280', marginBottom: '.3rem' }}>Jumlah Kesalahan (Evaluasi)</label>
                  <input
                    className="dash-input"
                    type="number"
                    min="0"
                    placeholder="Masukkan jumlah kesalahan"
                    value={kesalahan}
                    onChange={e => handleKesalahan(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Preview nilai otomatis */}
                {kesalahanValid && (
                  <div style={{ marginBottom: '.75rem', padding: '.6rem 1rem', background: '#F0FDF4', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #D1FAE5' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ fontSize: '.82rem', color: '#065F46', fontWeight: 600 }}>
                      {kesalahan} kesalahan → Nilai: <strong>{form.nilai}</strong> → Status: <strong>{form.status}</strong>
                    </span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: '#6B7280', marginBottom: '.3rem' }}>
                      Nilai {!kesalahanValid && <span style={{ color: '#F59E0B', fontWeight: 400 }}>(isi evaluasi dulu)</span>}
                    </label>
                    <input className="dash-input" type="number" min="0" max="100" placeholder="Otomatis dari kesalahan"
                      value={form.nilai} disabled={!kesalahanValid}
                      onChange={e => setForm({ ...form, nilai: e.target.value, status: getStatusDariNilai(parseInt(e.target.value) || 0) })} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: '#6B7280', marginBottom: '.3rem' }}>
                      Status {!nilaiValid && <span style={{ color: '#F59E0B', fontWeight: 400 }}>(isi nilai dulu)</span>}
                    </label>
                    <select className="dash-input" value={form.status} disabled={!nilaiValid} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="">Pilih status</option>
                      <option>Sangat Bagus</option><option>Bagus</option><option>Baik</option><option>Cukup</option><option>Kurang</option>
                    </select>
                  </div>
                </div>

                {/* Catatan */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: '#6B7280', marginBottom: '.3rem' }}>Catatan (opsional)</label>
                  <input className="dash-input" placeholder="Catatan untuk santri" value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                  {saveStatus === 'success' && <span style={{ color: '#065F46', fontSize: '.8rem', fontWeight: 500 }}>✓ Nilai berhasil disimpan</span>}
                  {saveStatus === 'error'   && <span style={{ color: '#991B1B', fontSize: '.8rem', fontWeight: 500 }}>✗ Gagal menyimpan, coba lagi</span>}
                  <button className="btn-primary" disabled={saveStatus === 'loading' || !form.santri_id || !nilaiValid || setoran.length === 0} onClick={handleSimpan}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                    </svg>
                    {saveStatus === 'loading' ? 'Menyimpan...' : 'Simpan Nilai'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Laporan Prestasi ── */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '.95rem', color: '#1F2937' }}>Laporan Prestasi Santri</h2>
                <p style={{ fontSize: '.78rem', color: '#9CA3AF', marginTop: 2 }}>Santri terbaik per bulan &amp; akumulasi semester</p>
              </div>
            </div>

            {/* Tab bulan */}
            <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {BULAN.map((b, i) => (
                <button key={b} className={`bulan-tab ${bulanAktif === i ? 'active' : ''}`} onClick={() => setBulanAktif(i)}>{b}</button>
              ))}
              <button
                className={`bulan-tab ${bulanAktif === 6 ? 'active' : ''}`}
                style={bulanAktif === 6 ? { background: '#C9A84C', borderColor: '#C9A84C', color: '#fff' } : { borderColor: '#C9A84C', color: '#92400E' }}
                onClick={() => setBulanAktif(6)}>
                📊 Semester
              </button>
            </div>

            {loading ? (
              <p style={{ color: '#9CA3AF', fontSize: '.83rem', textAlign: 'center', padding: '2rem 0' }}>Memuat data...</p>
            ) : bulanAktif < 6 ? (() => {
              const { rajin, rajinVal } = getPrestasiBulan(bulanAktif);
              return (
                <div>
                  <div style={{ marginBottom: '.75rem', padding: '.55rem 1rem', background: '#F0F9FF', borderRadius: 9, border: '1px solid #BAE6FD', fontSize: '.78rem', color: '#0369A1', fontWeight: 500 }}>
                    Data setoran {BULAN_FULL[bulanAktif]}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <PrestasiCard
                      emoji="🏆"
                      label="Paling Rajin (frekuensi setoran)"
                      nama={rajin?.nama ?? null}
                      sub={rajinVal !== null && rajinVal !== undefined ? `${rajinVal}× setoran` : '—'}
                    />

                  </div>
                  {prestasiData.length === 0 && (
                    <p style={{ color: '#9CA3AF', fontSize: '.82rem', textAlign: 'center', marginTop: '1rem' }}>Belum ada data setoran bulan ini</p>
                  )}
                </div>
              );
            })() : (() => {
              const { rajin, totalFRajin } = getPrestasiSemester();
              return (
                <div>
                  <div style={{ marginBottom: '.75rem', padding: '.55rem 1rem', background: '#FFFBEB', borderRadius: 9, border: '1px solid #FDE68A', fontSize: '.78rem', color: '#92400E', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Akumulasi {SEM.rentangLabel}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <PrestasiCard
                      emoji="🏆"
                      label="Paling Rajin Semester (total setoran)"
                      nama={rajin?.nama ?? null}
                      sub={totalFRajin !== null && totalFRajin !== undefined ? `${totalFRajin}× setoran` : '—'}
                    />

                  </div>
                </div>
              );
            })()}
          </div>

          {/* Bottom grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>

            {/* Penilaian Terbaru */}
            <div id="section-penilaian-terbaru" className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontWeight: 700, fontSize: '.95rem', color: '#1F2937' }}>Penilaian Terbaru</h2>
                <button onClick={handleOpenHistoryPenilaian} style={{ color: '#2D6A4F', fontSize: '.78rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Lihat Semua →
                </button>
              </div>
              {loading ? (
                <p style={{ color: '#9CA3AF', fontSize: '.83rem', textAlign: 'center', padding: '2rem 0' }}>Memuat data...</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>Santri</th><th>Setoran</th><th>Nilai</th><th>Status</th><th>Tanggal</th><th style={{ textAlign: 'center' }}>Aksi</th></tr>
                  </thead>
                  <tbody>
                    {penilaianTerbaru.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF', padding: '2rem 0' }}>Belum ada penilaian</td></tr>
                    ) : penilaianTerbaru.map(p => {
                      const sc = getStatusColor(p.status);
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 700, color: '#6B7280', flexShrink: 0 }}>{getInitials(getSantriNama(p))}</div>
                              <span style={{ fontWeight: 500 }}>{getSantriNama(p)}</span>
                            </div>
                          </td>
                          <td style={{ color: '#6B7280', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.setoran}</td>
                          <td style={{ fontWeight: 700, color: '#1B4332' }}>{p.nilai}</td>
                          <td><span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 99, fontSize: '.72rem', fontWeight: 600 }}>{p.status}</span></td>
                          <td style={{ color: '#9CA3AF', whiteSpace: 'nowrap' }}>{formatDate(p.tanggal)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                              <button className="icon-btn" title="Detail" onClick={() => setModalDetail(p)}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              </button>
                              <button className="icon-btn" title="Edit" onClick={() => setModalEdit(p)}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {penilaianTerbaru.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '1.1rem', paddingTop: '1rem', borderTop: '1px solid #F3F4F6' }}>
                  <button onClick={handleOpenHistoryPenilaian} style={{ color: '#2D6A4F', fontSize: '.8rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Lihat Semua Penilaian →</button>
                </div>
              )}
            </div>

          </div>
          {/* ── Pengaturan ── */}
          <div id="section-pengaturan" className="card" style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '.95rem', color: '#1F2937', marginBottom: '1.25rem' }}>Pengaturan</h2>

            {/* Ubah Password */}
            <div
              onClick={() => { setModalUbahPassword(true); setPwStatus('idle'); setPwErrMsg(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.1rem', borderRadius: 12, border: '1px solid #F3F4F6', marginBottom: '.75rem', cursor: 'pointer', transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                🔒
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '.87rem', color: '#1F2937' }}>Ubah Password</div>
                <div style={{ fontSize: '.76rem', color: '#9CA3AF', marginTop: 2 }}>Ganti password akun kamu</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>

            {/* Privasi */}
            <div
              onClick={() => setModalPrivasi(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.1rem', borderRadius: 12, border: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                🛡️
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '.87rem', color: '#1F2937' }}>Privasi</div>
                <div style={{ fontSize: '.76rem', color: '#9CA3AF', marginTop: 2 }}>Kelola data dan privasi kamu</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>

        </div>
      </main>

      {/* ── Modal Setoran Detail (Donut) ── */}
      {showDonutModal && (
        <ModalSetoranDetail
          detail={donutDetail}
          onClose={() => setShowDonutModal(false)}
          bulanLabel={new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        />
      )}

      {/* ── Modal Ubah Password ── */}
      {modalUbahPassword && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 460, position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            {/* Close */}
            <button onClick={() => setModalUbahPassword(false)} style={{ position: 'absolute', top: '1.1rem', right: '1.1rem', background: '#F3F4F6', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>🔒 Ubah Password</h3>
              <p style={{ fontSize: '.8rem', color: '#9CA3AF', marginTop: 4 }}>Pastikan password baru cukup kuat</p>
            </div>

            {/* Password Lama */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.4rem' }}>Password Lama</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="dash-input"
                  type={showPwLama ? 'text' : 'password'}
                  placeholder="Masukkan password lama"
                  value={pwLama}
                  onChange={e => setPwLama(e.target.value)}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button onClick={() => setShowPwLama(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
                  {showPwLama
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Password Baru */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.4rem' }}>Password Baru</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="dash-input"
                  type={showPwBaru ? 'text' : 'password'}
                  placeholder="Minimal 8 karakter"
                  value={pwBaru}
                  onChange={e => setPwBaru(e.target.value)}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button onClick={() => setShowPwBaru(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
                  {showPwBaru
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              {/* Strength bar */}
              {pwBaru.length > 0 && (() => {
                const strength = pwBaru.length >= 12 && /[A-Z]/.test(pwBaru) && /[0-9]/.test(pwBaru) ? 3
                  : pwBaru.length >= 8 ? 2 : 1;
                const colors = ['#EF4444', '#F59E0B', '#22C55E'];
                const labels = ['Lemah', 'Cukup', 'Kuat'];
                return (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1,2,3].map(i => (
                        <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= strength ? colors[strength-1] : '#E5E7EB', transition: 'background .3s' }} />
                      ))}
                    </div>
                    <div style={{ fontSize: '.72rem', color: colors[strength-1], fontWeight: 600, marginTop: 4 }}>{labels[strength-1]}</div>
                  </div>
                );
              })()}
            </div>

            {/* Konfirmasi */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.4rem' }}>Konfirmasi Password Baru</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="dash-input"
                  type={showPwKonfirm ? 'text' : 'password'}
                  placeholder="Ulangi password baru"
                  value={pwKonfirm}
                  onChange={e => setPwKonfirm(e.target.value)}
                  style={{ paddingRight: '2.5rem', borderColor: pwKonfirm.length > 0 ? (pwKonfirm === pwBaru ? '#22C55E' : '#EF4444') : undefined }}
                />
                <button onClick={() => setShowPwKonfirm(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
                  {showPwKonfirm
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              {pwKonfirm.length > 0 && (
                <div style={{ fontSize: '.72rem', marginTop: 4, fontWeight: 600, color: pwKonfirm === pwBaru ? '#22C55E' : '#EF4444' }}>
                  {pwKonfirm === pwBaru ? '✓ Password cocok' : '✗ Password tidak cocok'}
                </div>
              )}
            </div>

            {/* Error / Success */}
            {pwStatus === 'error' && (
              <div style={{ marginBottom: '1rem', padding: '.65rem 1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: '.8rem', color: '#DC2626', fontWeight: 500 }}>
                ✗ {pwErrMsg}
              </div>
            )}
            {pwStatus === 'success' && (
              <div style={{ marginBottom: '1rem', padding: '.65rem 1rem', background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 10, fontSize: '.8rem', color: '#065F46', fontWeight: 500 }}>
                ✓ Password berhasil diubah!
              </div>
            )}

            <button
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '.85rem', fontSize: '.88rem' }}
              disabled={pwStatus === 'loading' || !pwLama || !pwBaru || !pwKonfirm}
              onClick={handleUbahPassword}
            >
              {pwStatus === 'loading' ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Privasi & Keamanan ── */}
      {modalPrivasi && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 460, position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            {/* Close */}
            <button onClick={() => setModalPrivasi(false)} style={{ position: 'absolute', top: '1.1rem', right: '1.1rem', background: '#F3F4F6', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>🛡️ Privasi &amp; Keamanan</h3>
              <p style={{ fontSize: '.8rem', color: '#9CA3AF', marginTop: 4 }}>Kelola data dan akun kamu</p>
            </div>

            {/* Info akun */}
            <div style={{ background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 12, padding: '1rem 1.1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '.72rem', color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}>Akun terdaftar</div>
              <div style={{ fontWeight: 700, fontSize: '.95rem', color: '#1F2937' }}>{user?.nama ?? '—'}</div>
              <div style={{ fontSize: '.8rem', color: '#2D6A4F', marginTop: 2 }}>{user?.email ?? '—'}</div>
            </div>

            {/* Data tersimpan */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.6rem' }}>Data yang tersimpan di sistem:</div>
              {['Profil & identitas (nama, NIM, email)', 'Jadwal setoran & riwayat hafalan', 'Nilai dan catatan dari penyimak'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '.35rem 0', fontSize: '.82rem', color: '#374151' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {item}
                </div>
              ))}
            </div>

            {/* Zona berbahaya */}
            <div style={{ background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 12, padding: '1rem 1.1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#DC2626', marginBottom: '.4rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚠️ Zona Berbahaya
              </div>
              <p style={{ fontSize: '.78rem', color: '#6B7280', marginBottom: '1rem', lineHeight: 1.5 }}>Menghapus akun akan menghilangkan semua data kamu secara permanen dan tidak dapat dipulihkan.</p>
              <button
                onClick={handleHapusAkun}
                style={{ width: '100%', padding: '.7rem', background: 'transparent', border: '1.5px solid #FCA5A5', borderRadius: 10, color: '#DC2626', fontWeight: 600, fontSize: '.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                🗑️ Hapus Akun Saya
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
