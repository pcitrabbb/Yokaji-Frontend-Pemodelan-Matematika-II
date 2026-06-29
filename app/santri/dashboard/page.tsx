'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

type User = {
  id: number;
  nama: string;
  email: string;
  nim?: string;
  fakultas?: string;
  prodi?: string;
  jenis_kelamin?: string;
  url_foto?: string;
};

type JadwalItem = {
  id: number;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  jenis: string;
  detail: string;
  penyimak: string;
  penyimak_nama?: string;
  tempat?: string;
  jenis_kelamin?: string;
  status: 'Selesai' | 'Terjadwal' | 'Dibatalkan' | 'aktif';
};

type HistoryItem = {
  id: number;
  tanggal: string;
  jenis_setoran: string;
  detail: string;
  ustadz: string;
  nilai?: number;
  catatan?: string;
};

type JadwalTersedia = {
  id: number;
  tanggal: string;
  waktu: string;
  penyimak_id: number;
  penyimak_nama: string;
  kampus?: string;
  kuota_tersisa: number;
  jenis_kelamin?: string;
};

type RingkasanData = {
  total_setoran: number;
  nilai_rata_rata: number;
  hafalan_juz: number;
  progres_persen: number;
  juz_selesai?: number;
  juz_sedang?: number;
};

type SetoranSurat = {
  surat: string;
  ayat_mulai: number;
  ayat_selesai: number;
};

type SemesterInfo = {
  key: string;          // "genap-2025-2026"
  label: string;        // "Semester Genap 2025/2026"
  tahunAwal: number;
  tahunAkhir: number;
  jenis: 'genap' | 'ganjil';
  bulanMulai: number;   // 0-indexed
  bulanSelesai: number;
};

// ── Helper semester ───────────────────────────────────────────────────────────
function getSemesterDariTanggal(dateStr: string): SemesterInfo {
  const d = parseTanggalLokal(dateStr);
  const bulan = d.getMonth(); // 0-indexed
  const tahun = d.getFullYear();
  // Genap: Februari (1) – Juli (6)
  // Ganjil: Agustus (7) – Januari (0) tahun berikutnya
  if (bulan >= 1 && bulan <= 6) {
    // Semester Genap: Feb–Jul, tahun akademik tahun-1/tahun
    return { key: `genap-${tahun - 1}-${tahun}`, label: `Semester Genap ${tahun - 1}/${tahun}`, tahunAwal: tahun - 1, tahunAkhir: tahun, jenis: 'genap', bulanMulai: 1, bulanSelesai: 6 };
  } else if (bulan >= 7) {
    // Semester Ganjil: Agu–Des, tahun akademik tahun/tahun+1
    return { key: `ganjil-${tahun}-${tahun + 1}`, label: `Semester Ganjil ${tahun}/${tahun + 1}`, tahunAwal: tahun, tahunAkhir: tahun + 1, jenis: 'ganjil', bulanMulai: 7, bulanSelesai: 0 };
  } else {
    // Januari (0) masuk semester ganjil tahun sebelumnya: tahun-1/tahun
    return { key: `ganjil-${tahun - 1}-${tahun}`, label: `Semester Ganjil ${tahun - 1}/${tahun}`, tahunAwal: tahun - 1, tahunAkhir: tahun, jenis: 'ganjil', bulanMulai: 7, bulanSelesai: 0 };
  }
}

function normKey(surat: string): string {
  return surat.toLowerCase().replace(/[-\s,]/g, '');
}

// Parse satu segmen surat, misal "Al-Fatihah 1-7" atau "Al-Baqarah 1"
function parseSegmen(seg: string): { surat: string; ayat_mulai: number; ayat_selesai: number } | null {
  const d = seg.trim();
  if (!d) return null;
  const rangeMatch = d.match(/^(.+?)\s+(\d+)\s*[-–]\s*(\d+)$/);
  if (rangeMatch) return { surat: rangeMatch[1].trim(), ayat_mulai: Number(rangeMatch[2]), ayat_selesai: Number(rangeMatch[3]) };
  const singleMatch = d.match(/^(.+?)\s+(\d+)$/);
  if (singleMatch) return { surat: singleMatch[1].trim(), ayat_mulai: Number(singleMatch[2]), ayat_selesai: Number(singleMatch[2]) };
  return { surat: d, ayat_mulai: 0, ayat_selesai: 0 };
}

// Parse detail yang mungkin berisi beberapa surat dipisah koma
// misal "Al-Fatihah 1-7, Al-Baqarah 1-25" → array 2 item
function parseDetailSurat(detail: string): { surat: string; ayat_mulai: number; ayat_selesai: number } | null {
  if (!detail?.trim()) return null;
  // Ambil segmen pertama saja (untuk kompatibilitas kode lama)
  return parseSegmen(detail.split(',')[0]);
}

function parseAllDetailSurat(detail: string): { surat: string; ayat_mulai: number; ayat_selesai: number }[] {
  if (!detail?.trim()) return [];
  return detail.split(',').map(s => parseSegmen(s)).filter(Boolean) as { surat: string; ayat_mulai: number; ayat_selesai: number }[];
}

function akumulasiSetoran(items: HistoryItem[]): SetoranSurat[] {
  // map per surat: akumulasi ayat min-max
  const map: Record<string, { min: number; max: number; originalName: string }> = {};

  for (const item of items) {
    const segmenList = parseAllDetailSurat(item.detail);
    for (const parsed of segmenList) {
      const key = normKey(parsed.surat);
      if (!map[key]) {
        map[key] = { min: parsed.ayat_mulai, max: parsed.ayat_selesai, originalName: parsed.surat };
      } else {
        if (parsed.ayat_mulai > 0) map[key].min = Math.min(map[key].min || parsed.ayat_mulai, parsed.ayat_mulai);
        if (parsed.ayat_selesai > 0) map[key].max = Math.max(map[key].max, parsed.ayat_selesai);
      }
    }
  }

  // Untuk setiap entry multi-surat (detail mengandung koma), buang surat-surat
  // yang juga muncul sebagai entry TUNGGAL tersendiri di history.
  // Contoh: "Al-Fatihah 1-7, Al-Baqarah 1-25" → Al-Fatihah dibuang dari sini
  // karena Al-Fatihah punya entry sendiri ("Al-Fatihah 1-7").
  // Hasilnya: entry ini hanya tampilkan Al-Baqarah 1-25.
  //
  // Kita buat set key surat yang muncul sebagai entry TUNGGAL
  const singleEntryKeys = new Set<string>();
  for (const item of items) {
    const segmenList = parseAllDetailSurat(item.detail);
    if (segmenList.length === 1) {
      singleEntryKeys.add(normKey(segmenList[0].surat));
    }
  }

  // Urutan kemunculan: kumpulkan surat unik dalam urutan pertama kali muncul
  // Untuk entry multi-surat, skip surat yang sudah ada sebagai entry tunggal
  const hasil: SetoranSurat[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const segmenList = parseAllDetailSurat(item.detail);
    const isMulti = segmenList.length > 1;

    for (const parsed of segmenList) {
      const key = normKey(parsed.surat);
      if (seen.has(key)) continue;
      // Jika entry ini multi-surat dan surat ini punya entry tunggal sendiri → skip
      if (isMulti && singleEntryKeys.has(key)) continue;
      seen.add(key);
      const range = map[key];
      if (range) hasil.push({ surat: range.originalName, ayat_mulai: range.min, ayat_selesai: range.max });
    }
  }

  return hasil;
}

const HARI  = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

// ── Helpers tanggal ──────────────────────────────────────────────────────────
// Normalisasi ke tengah malam lokal agar isSameDay tidak kena timezone UTC
function toLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Parse string "2025-06-15" atau ISO sebagai local midnight, TIDAK UTC
function parseTanggalLokal(dateStr: string): Date {
  const s = dateStr.split('T')[0];
  const [y, m, d] = s.split('-').map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  return toLocalMidnight(new Date(dateStr));
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate();
}

// Parse "HH:MM" atau "HH:MM:SS" jadi { jam, menit }
function parseWaktu(waktu: string): { jam: number; menit: number } {
  const parts = (waktu ?? '').split(':').map(Number);
  return { jam: parts[0] || 0, menit: parts[1] || 0 };
}

// Cek apakah jadwal santri sudah lewat (tanggal + waktu_selesai)
// Hilang tepat setelah waktu_selesai berlalu
function isJadwalSantriLewat(j: { tanggal: string; waktu_selesai: string }): boolean {
  const tgl = parseTanggalLokal(j.tanggal);
  const { jam, menit } = parseWaktu(j.waktu_selesai);
  const selesai = new Date(tgl.getFullYear(), tgl.getMonth(), tgl.getDate(), jam, menit, 0);
  return new Date() > selesai;
}

// Cek apakah jadwal admin sudah lewat lebih dari 1 hari penuh
// Hilang setelah tengah malam hari berikutnya setelah tanggal jadwal
function isJadwalAdminLewat(j: { tanggal: string; waktu_selesai: string }): boolean {
  const tgl = parseTanggalLokal(j.tanggal);
  const { jam, menit } = parseWaktu(j.waktu_selesai);
  const selesai = new Date(tgl.getFullYear(), tgl.getMonth(), tgl.getDate(), jam, menit, 0);
  // Tambah 1 hari penuh (24 jam) setelah waktu selesai
  const batasAdmin = new Date(selesai.getTime() + 24 * 60 * 60 * 1000);
  return new Date() > batasAdmin;
}

function getWeekDays(center: Date) {
  const days: Date[] = [];
  for (let i = -2; i <= 4; i++) {
    const d = new Date(center);
    d.setDate(center.getDate() + i);
    days.push(toLocalMidnight(d));
  }
  return days;
}

function fmtTgl(dateStr: string) {
  const d = parseTanggalLokal(dateStr);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function getNamaPenyimak(j: JadwalItem): string {
  return j.penyimak_nama || j.penyimak || '—';
}

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  Selesai:    { bg: '#D8F3DC', color: '#1B4332' },
  Terjadwal:  { bg: '#FEF3C7', color: '#92400E' },
  Dibatalkan: { bg: '#FEE2E2', color: '#991B1B' },
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '.78rem', fontWeight: 600,
  color: '#374151', marginBottom: '.35rem',
};

// ─── Badge Ikhwan/Akhwat ─────────────────────────────────────────────────────
function BadgeJK({ jenis_kelamin }: { jenis_kelamin?: string }) {
  if (!jenis_kelamin || jenis_kelamin === 'Semua') return null;
  const isIkhwan = jenis_kelamin === 'Ikhwan';
  return (
    <span style={{
      display: 'inline-block',
      background: isIkhwan ? '#EFF6FF' : '#FDF2F8',
      color: isIkhwan ? '#1D4ED8' : '#9D174D',
      borderRadius: 20, padding: '2px 9px',
      fontSize: '.68rem', fontWeight: 700,
      border: `1px solid ${isIkhwan ? 'rgba(29,78,216,0.2)' : 'rgba(157,23,77,0.2)'}`,
    }}>
      {isIkhwan ? '♂ Ikhwan' : '♀ Akhwat'}
    </span>
  );
}

// ─── RingkasanSemesterModal ──────────────────────────────────────────────────
function RingkasanSemesterModal({ allHistory, user, ringkasan, onClose }: {
  allHistory: HistoryItem[];
  user: User | null;
  ringkasan: RingkasanData | null;
  onClose: () => void;
}) {
  // Kumpulkan daftar semester unik dari history
  const semesterMap: Record<string, SemesterInfo> = {};
  for (const h of allHistory) {
    const sem = getSemesterDariTanggal(h.tanggal);
    semesterMap[sem.key] = sem;
  }
  // Urutkan: terbaru dulu
  const semesterList = Object.values(semesterMap).sort((a, b) =>
    b.tahunAkhir - a.tahunAkhir || (b.jenis === 'genap' ? 1 : -1)
  );

  // Jika belum ada history, tampilkan semester sekarang
  if (semesterList.length === 0) {
    semesterList.push(getSemesterDariTanggal(new Date().toISOString()));
  }

  const [activeSem, setActiveSem] = useState(semesterList[0].key);
  const [exportingPDF, setExportingPDF] = useState(false);

  const currentSem = semesterMap[activeSem] ?? semesterList[0];

  // Filter history sesuai semester aktif
  // Genap: Feb (1) – Jul (6), tahunAkhir
  // Ganjil: Agu (7) – Des (11) tahunAwal, + Jan (0) tahunAkhir
  const historyFiltered = allHistory.filter(h => {
    const d = parseTanggalLokal(h.tanggal);
    const bulan = d.getMonth();
    const tahun = d.getFullYear();
    if (currentSem.jenis === 'genap') {
      return bulan >= 1 && bulan <= 6 && tahun === currentSem.tahunAkhir;
    } else {
      return (
        (bulan >= 7 && tahun === currentSem.tahunAwal) ||
        (bulan === 0 && tahun === currentSem.tahunAkhir)
      );
    }
  });

  const suratList = akumulasiSetoran(historyFiltered);
  const totalSetoran = historyFiltered.length;
  const nilaiRata = historyFiltered.length > 0
    ? Math.round(historyFiltered.filter(h => h.nilai).reduce((s, h) => s + (h.nilai ?? 0), 0) / historyFiltered.filter(h => h.nilai).length) || 0
    : 0;
  const juzFloor = Math.floor(ringkasan?.hafalan_juz ?? 0);

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const margin = 40;

      // Header
      doc.setFillColor(27, 67, 50);
      doc.rect(0, 0, pw, 80, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('Ringkasan Hafalan Semester', margin, 28);
      doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 220, 195);
      doc.text(currentSem.label, margin, 46);
      doc.text("UKM Tahfidzul Qur'an · Universitas Airlangga", margin, 62);
      doc.setTextColor(201, 168, 76);
      const now = new Date();
      doc.text(`Diekspor: ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`, pw - margin, 62, { align: 'right' });

      // Info santri
      let y = 100;
      doc.setFillColor(248, 250, 247);
      doc.rect(margin, y, pw - margin * 2, 52, 'F');
      doc.setDrawColor(220, 235, 225); doc.setLineWidth(0.5);
      doc.rect(margin, y, pw - margin * 2, 52, 'S');
      doc.setTextColor(107, 114, 128); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text('Nama Santri', margin + 12, y + 14);
      doc.text('NIM', margin + 200, y + 14);
      doc.text('Total Setoran', margin + 320, y + 14);
      doc.text('Jumlah Juz', margin + 430, y + 14);
      doc.setTextColor(27, 67, 50); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text(user?.nama ?? '—', margin + 12, y + 34);
      doc.text(user?.nim ?? '—', margin + 200, y + 34);
      doc.text(String(totalSetoran), margin + 320, y + 34);
      doc.text(`${juzFloor} Juz`, margin + 430, y + 34);
      y += 68;

      // Judul tabel
      doc.setTextColor(27, 67, 50); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('Daftar Surat yang Telah Disetorkan', margin, y);
      y += 14;

      // Header tabel
      const cols = [30, 200, 100, 100];
      const labels = ['No', 'Surat', 'Ayat Mulai', 'Ayat Selesai'];
      const rh = 24;
      doc.setFillColor(240, 253, 244);
      doc.rect(margin, y, pw - margin * 2, rh, 'F');
      doc.setDrawColor(208, 230, 215); doc.rect(margin, y, pw - margin * 2, rh, 'S');
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(27, 67, 50);
      let xc = margin + 8;
      labels.forEach((l, i) => { doc.text(l, xc, y + 16); xc += cols[i]; });
      y += rh;

      if (suratList.length === 0) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(156, 163, 175);
        doc.text('Belum ada setoran pada semester ini.', pw / 2, y + 20, { align: 'center' });
      } else {
        suratList.forEach((s, idx) => {
          if (y + rh > ph - 50) { doc.addPage(); y = 40; }
          const bg = idx % 2 === 0 ? [255, 255, 255] : [250, 250, 247];
          doc.setFillColor(bg[0], bg[1], bg[2]);
          doc.rect(margin, y, pw - margin * 2, rh, 'F');
          doc.setDrawColor(243, 244, 246);
          doc.line(margin, y + rh, margin + pw - margin * 2, y + rh);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(55, 65, 81);
          const cells = [
            String(idx + 1),
            s.surat,
            s.ayat_mulai > 0 ? String(s.ayat_mulai) : '—',
            s.ayat_selesai > 0 ? String(s.ayat_selesai) : '—',
          ];
          xc = margin + 8;
          cells.forEach((cell, i) => { doc.text(cell, xc, y + 16); xc += cols[i]; });
          y += rh;
        });
      }

      // Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7.5); doc.setTextColor(156, 163, 175); doc.setFont('helvetica', 'normal');
        doc.text(`Halaman ${p} dari ${totalPages}`, pw / 2, ph - 15, { align: 'center' });
        doc.text("YoKaji · UKM Tahfidzul Qur'an Unair", margin, ph - 15);
      }

      const fname = `ringkasan-${activeSem}.pdf`;
      doc.save(fname);
    } catch {
      alert('Export PDF gagal. Coba lagi.');
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.22)' }} onClick={e => e.stopPropagation()}>

        {/* Header modal */}
        <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.75rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 150, height: 150, borderRadius: '50%', border: '1.5px solid rgba(201,168,76,0.15)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: '#fff', margin: '0 0 4px', fontWeight: 700 }}>📊 Ringkasan Akhir Semester</h2>
              <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,0.55)', margin: 0 }}>Rekap surat & akumulasi ayat yang disetorkan</p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
          </div>

          {/* Tab semester */}
          <div style={{ display: 'flex', gap: 6, marginTop: '1rem', overflowX: 'auto', paddingBottom: 2 }}>
            {semesterList.map(sem => (
              <button key={sem.key} onClick={() => setActiveSem(sem.key)} style={{
                padding: '.4rem .9rem', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: activeSem === sem.key ? '#C9A84C' : 'rgba(255,255,255,0.12)',
                color: activeSem === sem.key ? '#1B4332' : 'rgba(255,255,255,0.7)',
                fontSize: '.75rem', fontWeight: activeSem === sem.key ? 700 : 500,
                fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s',
              }}>{sem.label}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Stat row */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { icon: '📖', label: 'Total Setoran', value: totalSetoran, sub: 'sesi semester ini', bg: '#EFF6FF', color: '#1D4ED8' },
              { icon: '⭐', label: 'Nilai Rata-rata', value: nilaiRata || '—', sub: 'rata-rata semua sesi', bg: '#FFFBEB', color: '#92400E' },
            ].map(s => (
              <div key={s.label} style={{ flex: '1 1 120px', background: s.bg, borderRadius: 12, padding: '.9rem 1rem', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '1.1rem', marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '.7rem', fontWeight: 600, color: '#6B7280', marginTop: 3 }}>{s.label}</div>
                <div style={{ fontSize: '.65rem', color: '#9CA3AF', marginTop: 1 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Tabel surat terakumulasi */}
          <div>
            <div style={{ fontSize: '.8rem', fontWeight: 700, color: '#1B4332', marginBottom: '.65rem' }}>
              Daftar Surat yang Telah Disetorkan
            </div>
            {suratList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#9CA3AF', background: '#FAFAF7', borderRadius: 12 }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: '.83rem' }}>Belum ada setoran di semester ini</div>
              </div>
            ) : (
              <div style={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }}>
                  <thead>
                    <tr style={{ background: '#F0FDF4', borderBottom: '1px solid rgba(27,67,50,0.1)' }}>
                      {['No', 'Nama Surat', 'Ayat Mulai', 'Ayat Selesai'].map(h => (
                        <th key={h} style={{ padding: '.6rem .8rem', textAlign: 'left', color: '#1B4332', fontWeight: 700, fontSize: '.75rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {suratList.map((s, i) => (
                      <tr key={i} style={{ borderBottom: i < suratList.length - 1 ? '1px solid #F3F4F6' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFAF7' }}>
                        <td style={{ padding: '.6rem .8rem', color: '#9CA3AF', fontWeight: 500, width: 36 }}>{i + 1}</td>
                        <td style={{ padding: '.6rem .8rem', color: '#1B4332', fontWeight: 600 }}>{s.surat}</td>
                        <td style={{ padding: '.6rem .8rem', color: '#374151' }}>{s.ayat_mulai > 0 ? s.ayat_mulai : '—'}</td>
                        <td style={{ padding: '.6rem .8rem', color: '#374151' }}>{s.ayat_selesai > 0 ? s.ayat_selesai : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Export */}
          <button onClick={handleExportPDF} disabled={exportingPDF} style={{
            width: '100%', padding: '.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: exportingPDF ? '#F3F4F6' : '#1B4332',
            color: exportingPDF ? '#9CA3AF' : '#fff',
            border: 'none', borderRadius: 12, fontSize: '.88rem', fontWeight: 600,
            cursor: exportingPDF ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .2s',
          }}>
            {exportingPDF
              ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #9CA3AF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Mengekspor PDF...</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export PDF {currentSem.label}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AllHistoryModal ──────────────────────────────────────────────────────────
function AllHistoryModal({ allHistory, user, onClose }: {
  allHistory: HistoryItem[];
  user: User | null;
  onClose: () => void;
}) {
  const semesterMap: Record<string, SemesterInfo> = {};
  for (const h of allHistory) {
    const sem = getSemesterDariTanggal(h.tanggal);
    semesterMap[sem.key] = sem;
  }
  const semesterList = Object.values(semesterMap).sort((a, b) =>
    b.tahunAkhir - a.tahunAkhir || (b.jenis === 'genap' ? 1 : -1)
  );
  if (semesterList.length === 0) semesterList.push(getSemesterDariTanggal(new Date().toISOString()));

  const [activeSem, setActiveSem] = useState(semesterList[0].key);
  const currentSem = semesterMap[activeSem] ?? semesterList[0];

  const historyFiltered = allHistory.filter(h => {
    const d = parseTanggalLokal(h.tanggal);
    const bulan = d.getMonth();
    const tahun = d.getFullYear();
    if (currentSem.jenis === 'genap') {
      return bulan >= 1 && bulan <= 6 && tahun === currentSem.tahunAkhir;
    } else {
      return (
        (bulan >= 7 && tahun === currentSem.tahunAwal) ||
        (bulan === 0 && tahun === currentSem.tahunAkhir)
      );
    }
  }).sort((a, b) => parseTanggalLokal(b.tanggal).getTime() - parseTanggalLokal(a.tanggal).getTime());

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.75rem', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: '#fff', margin: '0 0 4px', fontWeight: 700 }}>📖 History Setoran</h2>
              <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,0.55)', margin: 0 }}>{user?.nama ?? '—'} · Semua riwayat setoran</p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
          </div>
          {/* Tab semester */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {semesterList.map(sem => (
              <button key={sem.key} onClick={() => setActiveSem(sem.key)} style={{
                padding: '.4rem .9rem', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: activeSem === sem.key ? '#C9A84C' : 'rgba(255,255,255,0.12)',
                color: activeSem === sem.key ? '#1B4332' : 'rgba(255,255,255,0.7)',
                fontSize: '.75rem', fontWeight: activeSem === sem.key ? 700 : 500,
                fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s',
              }}>{sem.label}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.75rem', flex: 1 }}>
          {historyFiltered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9CA3AF' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: '.85rem' }}>Belum ada setoran di semester ini</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '.78rem', color: '#6B7280', marginBottom: '1rem' }}>
                {historyFiltered.length} setoran · {currentSem.label}
              </div>
              {/* Desktop table */}
              <div className="history-table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #F0FDF4' }}>
                      {['Tanggal', 'Jenis Setoran', 'Detail', 'Penyimak', 'Nilai', 'Catatan'].map(h => (
                        <th key={h} style={{ padding: '.55rem .7rem', textAlign: 'left', color: '#1B4332', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '.75rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyFiltered.map((h, i) => (
                      <tr key={h.id} style={{ borderBottom: '1px solid #F9FAFB', background: i % 2 === 0 ? '#fff' : '#FAFAF7' }}>
                        <td style={{ padding: '.6rem .7rem', color: '#1B4332', fontWeight: 500, whiteSpace: 'nowrap' }}>{fmtTgl(h.tanggal)}</td>
                        <td style={{ padding: '.6rem .7rem', color: '#374151' }}>{h.jenis_setoran}</td>
                        <td style={{ padding: '.6rem .7rem', color: '#374151' }}>{h.detail}</td>
                        <td style={{ padding: '.6rem .7rem', color: '#374151', whiteSpace: 'nowrap' }}>{h.ustadz}</td>
                        <td style={{ padding: '.6rem .7rem', fontWeight: 600, color: h.nilai && h.nilai >= 85 ? '#1B4332' : h.nilai ? '#92400E' : '#9CA3AF' }}>{h.nilai ?? '—'}</td>
                        <td style={{ padding: '.6rem .7rem', color: '#6B7280' }}>{h.catatan ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="history-cards">
                {historyFiltered.map(h => (
                  <div key={h.id} style={{ background: '#FAFAF7', borderRadius: 12, padding: '.9rem 1rem', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '.78rem', fontWeight: 600, color: '#1B4332' }}>{fmtTgl(h.tanggal)}</span>
                      <span style={{ fontSize: '.85rem', fontWeight: 700, color: h.nilai && h.nilai >= 85 ? '#1B4332' : h.nilai ? '#92400E' : '#9CA3AF' }}>{h.nilai ?? '—'}</span>
                    </div>
                    <div style={{ fontSize: '.82rem', fontWeight: 600, color: '#374151', marginBottom: 3 }}>{h.jenis_setoran}</div>
                    <div style={{ fontSize: '.78rem', color: '#6B7280', marginBottom: 3 }}>{h.detail}</div>
                    <div style={{ fontSize: '.75rem', color: '#9CA3AF' }}>👤 {h.ustadz}</div>
                    {h.catatan && <div style={{ fontSize: '.73rem', color: '#6B7280', marginTop: 4, fontStyle: 'italic' }}>{h.catatan}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── UbahPasswordModal ────────────────────────────────────────────────────────
function UbahPasswordModal({ onClose }: { onClose: () => void }) {
  const [passwordLama, setPasswordLama]   = useState('');
  const [passwordBaru, setPasswordBaru]   = useState('');
  const [konfirmasi, setKonfirmasi]       = useState('');
  const [showLama, setShowLama]           = useState(false);
  const [showBaru, setShowBaru]           = useState(false);
  const [showKonfirmasi, setShowKonfirmasi] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [sukses, setSukses]               = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!passwordLama || !passwordBaru || !konfirmasi) { setError('Semua field wajib diisi.'); return; }
    if (passwordBaru.length < 8) { setError('Password baru minimal 8 karakter.'); return; }
    if (passwordBaru !== konfirmasi) { setError('Konfirmasi password tidak cocok.'); return; }
    setLoading(true);
    try {
      await api.post('/santri/ubah-password', { password_lama: passwordLama, password_baru: passwordBaru });
      setSukses(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Gagal mengubah password. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '.65rem .9rem', border: '1.5px solid #E5E7EB',
    borderRadius: 10, fontSize: '.85rem', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', color: '#1B4332',
    transition: 'border .15s',
  };
  const EyeIcon = ({ show }: { show: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {show
        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      }
    </svg>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '2rem', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1B4332' }}>🔒 Ubah Password</h2>
            <p style={{ margin: '4px 0 0', fontSize: '.75rem', color: '#6B7280' }}>Pastikan password baru cukup kuat</p>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {sukses ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>✅</div>
            <div style={{ fontWeight: 700, color: '#1B4332', marginBottom: 6 }}>Password berhasil diubah!</div>
            <div style={{ fontSize: '.8rem', color: '#6B7280', marginBottom: '1.5rem' }}>Gunakan password baru kamu saat login berikutnya.</div>
            <button onClick={onClose} style={{ padding: '.7rem 2rem', background: '#1B4332', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Tutup</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Password Lama */}
            <div>
              <label style={lbl}>Password Lama</label>
              <div style={{ position: 'relative' }}>
                <input type={showLama ? 'text' : 'password'} value={passwordLama} onChange={e => setPasswordLama(e.target.value)} placeholder="Masukkan password lama" style={inputStyle} />
                <button onClick={() => setShowLama(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}><EyeIcon show={showLama} /></button>
              </div>
            </div>
            {/* Password Baru */}
            <div>
              <label style={lbl}>Password Baru</label>
              <div style={{ position: 'relative' }}>
                <input type={showBaru ? 'text' : 'password'} value={passwordBaru} onChange={e => setPasswordBaru(e.target.value)} placeholder="Minimal 8 karakter" style={inputStyle} />
                <button onClick={() => setShowBaru(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}><EyeIcon show={showBaru} /></button>
              </div>
              {passwordBaru && (
                <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: passwordBaru.length >= i * 3 ? (passwordBaru.length >= 10 ? '#1B4332' : passwordBaru.length >= 7 ? '#F59E0B' : '#EF4444') : '#E5E7EB' }} />
                  ))}
                </div>
              )}
            </div>
            {/* Konfirmasi */}
            <div>
              <label style={lbl}>Konfirmasi Password Baru</label>
              <div style={{ position: 'relative' }}>
                <input type={showKonfirmasi ? 'text' : 'password'} value={konfirmasi} onChange={e => setKonfirmasi(e.target.value)} placeholder="Ulangi password baru" style={{ ...inputStyle, borderColor: konfirmasi && konfirmasi !== passwordBaru ? '#EF4444' : konfirmasi && konfirmasi === passwordBaru ? '#1B4332' : '#E5E7EB' }} />
                <button onClick={() => setShowKonfirmasi(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}><EyeIcon show={showKonfirmasi} /></button>
              </div>
              {konfirmasi && konfirmasi !== passwordBaru && <div style={{ fontSize: '.72rem', color: '#EF4444', marginTop: 4 }}>Password tidak cocok</div>}
              {konfirmasi && konfirmasi === passwordBaru && <div style={{ fontSize: '.72rem', color: '#1B4332', marginTop: 4 }}>✓ Password cocok</div>}
            </div>

            {error && <div style={{ background: '#FEF2F2', border: '1px solid rgba(220,53,69,.2)', borderRadius: 8, padding: '.65rem .9rem', fontSize: '.8rem', color: '#991B1B' }}>⚠️ {error}</div>}

            <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '.85rem', background: loading ? '#9CA3AF' : '#1B4332', color: '#fff', border: 'none', borderRadius: 10, fontSize: '.9rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
              {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PrivasiModal ─────────────────────────────────────────────────────────────
function PrivasiModal({ user, onClose, onHapusAkun }: { user: User | null; onClose: () => void; onHapusAkun: () => void }) {
  const [step, setStep] = useState<'main' | 'konfirmasi'>('main');
  const [inputKonfirmasi, setInputKonfirmasi] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const KATA_KUNCI = 'HAPUS AKUN';

  const handleHapus = async () => {
    if (inputKonfirmasi !== KATA_KUNCI) { setError(`Ketik "${KATA_KUNCI}" untuk melanjutkan.`); return; }
    setLoading(true);
    try {
      await api.delete('/santri/hapus-akun');
      onHapusAkun();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Gagal menghapus akun. Hubungi admin.');
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={step === 'main' ? onClose : undefined}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '2rem', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        {step === 'main' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1B4332' }}>🛡️ Privasi & Keamanan</h2>
                <p style={{ margin: '4px 0 0', fontSize: '.75rem', color: '#6B7280' }}>Kelola data dan akun kamu</p>
              </div>
              <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Info akun */}
            <div style={{ background: '#F0FDF4', border: '1px solid rgba(27,67,50,0.12)', borderRadius: 12, padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '.75rem', color: '#6B7280', marginBottom: 4 }}>Akun terdaftar</div>
              <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#1B4332' }}>{user?.nama ?? '—'}</div>
              <div style={{ fontSize: '.78rem', color: '#40916C', marginTop: 2 }}>{user?.email ?? '—'}</div>
            </div>

            {/* Data yang tersimpan */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>Data yang tersimpan di sistem:</div>
              {['Profil & identitas (nama, NIM, email)', 'Jadwal setoran & riwayat hafalan', 'Nilai dan catatan dari penyimak'].map(item => (
                <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '.5rem 0', borderBottom: '1px solid #F3F4F6', fontSize: '.78rem', color: '#6B7280' }}>
                  <span style={{ color: '#40916C', fontWeight: 700, flexShrink: 0 }}>✓</span>{item}
                </div>
              ))}
            </div>

            {/* Zona berbahaya */}
            <div style={{ border: '1.5px solid rgba(220,53,69,0.2)', borderRadius: 12, padding: '1rem', background: '#FFF5F5' }}>
              <div style={{ fontSize: '.8rem', fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>⚠️ Zona Berbahaya</div>
              <div style={{ fontSize: '.75rem', color: '#6B7280', marginBottom: '1rem', lineHeight: 1.6 }}>
                Menghapus akun akan menghilangkan semua data kamu secara permanen dan tidak dapat dipulihkan.
              </div>
              <button onClick={() => setStep('konfirmasi')} style={{ width: '100%', padding: '.7rem', background: '#FEF2F2', color: '#991B1B', border: '1.5px solid rgba(220,53,69,0.3)', borderRadius: 10, fontWeight: 600, fontSize: '.83rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                🗑️ Hapus Akun Saya
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>⚠️</div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#991B1B' }}>Konfirmasi Hapus Akun</h2>
              <p style={{ margin: '6px 0 0', fontSize: '.78rem', color: '#6B7280', lineHeight: 1.6 }}>
                Tindakan ini <strong>tidak dapat dibatalkan</strong>. Seluruh data kamu akan dihapus permanen dari sistem.
              </p>
            </div>

            <div style={{ background: '#FEF2F2', border: '1px solid rgba(220,53,69,.2)', borderRadius: 10, padding: '.85rem', marginBottom: '1.25rem', fontSize: '.78rem', color: '#991B1B' }}>
              Data yang akan dihapus: profil, jadwal, seluruh riwayat setoran, dan nilai hafalan kamu.
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ ...lbl, color: '#991B1B' }}>Ketik <strong>{KATA_KUNCI}</strong> untuk konfirmasi:</label>
              <input
                type="text"
                value={inputKonfirmasi}
                onChange={e => { setInputKonfirmasi(e.target.value); setError(''); }}
                placeholder={KATA_KUNCI}
                style={{ width: '100%', padding: '.65rem .9rem', border: `1.5px solid ${inputKonfirmasi === KATA_KUNCI ? '#EF4444' : '#E5E7EB'}`, borderRadius: 10, fontSize: '.85rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#991B1B', letterSpacing: '.04em' }}
              />
              {error && <div style={{ fontSize: '.72rem', color: '#EF4444', marginTop: 4 }}>⚠️ {error}</div>}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setStep('main'); setInputKonfirmasi(''); setError(''); }} style={{ flex: 1, padding: '.75rem', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: '.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                Batal
              </button>
              <button onClick={handleHapus} disabled={loading || inputKonfirmasi !== KATA_KUNCI} style={{ flex: 1, padding: '.75rem', background: inputKonfirmasi === KATA_KUNCI && !loading ? '#DC2626' : '#FCA5A5', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: '.85rem', cursor: inputKonfirmasi === KATA_KUNCI && !loading ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'background .2s' }}>
                {loading ? 'Menghapus...' : '🗑️ Ya, Hapus Akun'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ active, user, onNav, open, onClose }: {
  active: string; user: User | null; onNav: (k: string) => void; open: boolean; onClose: () => void;
}) {
  const navItems = [
    { key: 'profil',     label: 'Profil',          icon: '👤' },
    { key: 'dashboard',  label: 'Dashboard',        icon: '⊞' },
    { key: 'jadwal',     label: 'Jadwal & Booking', icon: '📅' },
    { key: 'history',    label: 'History Setoran',  icon: '📖' },
    { key: 'pengaturan', label: 'Pengaturan',        icon: '⚙️' },
  ];
  return (
    <>
      <div className={`sidebar-overlay${open ? ' sidebar-overlay--open' : ''}`} onClick={onClose} />
      <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
        <div style={{ padding: '1.8rem 1.5rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <svg width="44" height="44" viewBox="0 0 38 38" fill="none">
              <rect width="38" height="38" rx="9" fill="rgba(255,255,255,0.1)"/>
              <path d="M19 7 C13 12 10 16 10 21 C10 26 14 30 19 31 C24 30 28 26 28 21 C28 16 25 12 19 7Z" fill="#40916C"/>
              <path d="M15 20 Q19 14 23 20" stroke="#C9A84C" strokeWidth="1.5" fill="none"/>
              <line x1="19" y1="18" x2="19" y2="28" stroke="#C9A84C" strokeWidth="1.5"/>
            </svg>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '.8rem', letterSpacing: '.04em' }}>UKM TAHFIDZUL QUR'AN</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '.65rem', letterSpacing: '.06em' }}>UNIVERSITAS AIRLANGGA</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#40916C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
            {user?.url_foto
              ? <img src={user.url_foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (user?.nama?.[0] ?? '?')}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: '#fff', fontSize: '.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.nama ?? '—'}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '.7rem' }}>Santri Aktif</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(n => (
            <button key={n.key} onClick={() => { onNav(n.key); onClose(); }} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '.6rem .9rem', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: active === n.key ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: active === n.key ? '#fff' : 'rgba(255,255,255,0.55)',
              fontSize: '.83rem', fontWeight: active === n.key ? 600 : 400,
              fontFamily: 'inherit', textAlign: 'left', transition: 'all .15s', width: '100%',
            }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '1.2rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', lineHeight: 1.7 }}>
            &ldquo;Sesungguhnya Al-Qur&apos;an ini memberi petunjuk kepada jalan yang lebih lurus.&rdquo;
            <div style={{ marginTop: 4, fontStyle: 'normal', color: 'rgba(201,168,76,0.5)', fontWeight: 600 }}>QS. Al-Isra&apos; : 9</div>
          </div>
          <div style={{ marginTop: 12, opacity: 0.15, textAlign: 'center', fontSize: '2.5rem', lineHeight: 1 }}>✦</div>
        </div>
      </aside>
    </>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ user, onLogout, onHamburger }: { user: User | null; onLogout: () => void; onHamburger: () => void }) {
  return (
    <div className="topbar">
      <button className="hamburger-btn" onClick={onHamburger} aria-label="Buka menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <div className="topbar-title">
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#1B4332', margin: 0 }}>
          Assalamu&apos;alaikum, {user?.nama?.split(' ')[0] ?? 'Santri'} 🌿
        </h1>
        <p className="topbar-subtitle" style={{ fontSize: '.78rem', color: '#6B7280', margin: '2px 0 0' }}>
          Semangat muroja&apos;ah hari ini, semoga setiap ayat yang dibaca menjadi cahaya di dunia dan akhirat.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1.5px solid #E2E0D6', borderRadius: 8, padding: '.4rem .85rem', cursor: 'pointer', fontSize: '.8rem', color: '#6B7280', fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap' }}>
          ↪ Keluar
        </button>
      </div>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', padding: '.85rem 1rem', minWidth: 110, textAlign: 'center' }}>
      <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1B4332', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '.73rem', color: '#6B7280', marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── BookingModal ─────────────────────────────────────────────────────────────
function BookingModal({ onClose, onSuccess, initialDate }: { onClose: () => void; onSuccess: () => void; initialDate?: Date }) {
  const KAMPUS_LIST = ['Kampus A', 'Kampus B', 'Kampus C'];
  const [kampus, setKampus]           = useState('');
  const [jadwalList, setJadwalList]   = useState<JadwalTersedia[]>([]);
  const [jadwalId, setJadwalId]       = useState('');
  const [loadingJadwal, setLoadingJadwal] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  // Filter tanggal di modal — default ke tanggal yang diklik dari kalender
  const [filterTanggal, setFilterTanggal] = useState<string | 'semua'>(() => {
    if (!initialDate) return 'semua';
    const y = initialDate.getFullYear();
    const m = String(initialDate.getMonth() + 1).padStart(2, '0');
    const d = String(initialDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  useEffect(() => {
    if (!kampus) return;
    setLoadingJadwal(true);
    setJadwalId('');
    // Saat kampus berubah, reset filter tanggal ke initialDate atau 'semua'
    if (initialDate) {
      const y = initialDate.getFullYear();
      const m = String(initialDate.getMonth() + 1).padStart(2, '0');
      const d = String(initialDate.getDate()).padStart(2, '0');
      setFilterTanggal(`${y}-${m}-${d}`);
    }
    api.get(`/jadwal-tersedia?kampus=${encodeURIComponent(kampus)}&jenis=Setoran+Hafalan`)
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      // Filter: hilangkan jadwal yang waktu selesainya sudah lewat
        const now = new Date();
        const filtered = list.filter((j: JadwalTersedia) => {
          if (!j.tanggal) return true;
          const [y, m, d] = j.tanggal.split('T')[0].split('-').map(Number);
          const waktuSelesai = (j as any).waktu_selesai ?? '23:59';
          const [jam, menit] = waktuSelesai.split(':').map(Number);
          const selesai = new Date(y, m - 1, d, jam, menit, 0);
          return now <= selesai;
        });
          setJadwalList(filtered);
      })
      .catch(() => setJadwalList([]))
      .finally(() => setLoadingJadwal(false));
  }, [kampus]);

  const selectedJadwal = jadwalList.find(j => String(j.id) === jadwalId);

  // Daftar tanggal unik dari jadwal yang tersedia
  const tanggalUnik = Array.from(new Set(jadwalList.map(j => j.tanggal?.split('T')[0]).filter(Boolean))).sort();
  // Jadwal yang ditampilkan setelah filter tanggal
  const jadwalFiltered = filterTanggal === 'semua'
    ? jadwalList
    : jadwalList.filter(j => j.tanggal?.split('T')[0] === filterTanggal);

  const handleSubmit = async () => {
    if (!jadwalId) { setError('Pilih jadwal terlebih dahulu.'); return; }
    setSubmitting(true); setError('');
    try {
      await api.post('/booking', { jadwal_id: jadwalId, jenis: 'Setoran Hafalan' });
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Booking gagal, coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 500, padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', color: '#1B4332', margin: 0 }}>Booking Setoran Hafalan</h2>
            <p style={{ fontSize: '.75rem', color: '#6B7280', margin: '4px 0 0' }}>Jadwal tersedia dari admin · pilih lokasi & sesi</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#6B7280', padding: 4 }}>✕</button>
        </div>

        {/* Pilih Kampus */}
        <div style={{ marginBottom: '1.1rem' }}>
          <label style={lbl}>Pilih Lokasi Kampus</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {KAMPUS_LIST.map(k => (
              <button key={k} onClick={() => setKampus(k)} style={{
                padding: '.65rem .5rem', borderRadius: 10,
                border: `1.5px solid ${kampus === k ? '#1B4332' : '#E2E0D6'}`,
                background: kampus === k ? '#F0FDF4' : '#FAFAF7',
                cursor: 'pointer', fontSize: '.8rem', fontWeight: kampus === k ? 600 : 400,
                color: kampus === k ? '#1B4332' : '#6B7280',
                fontFamily: 'inherit', transition: 'all .15s', textAlign: 'center' as const,
              }}>{k}</button>
            ))}
          </div>
        </div>

        {/* Pilih Jadwal */}
        <div style={{ marginBottom: '1.1rem' }}>
          <label style={lbl}>Pilih Jadwal & Jam</label>
          {!kampus ? (
            <div style={{ textAlign: 'center', padding: '1.2rem', color: '#9CA3AF', fontSize: '.83rem', background: '#FAFAF7', borderRadius: 10, border: '1.5px dashed #E2E0D6' }}>
              Pilih kampus terlebih dahulu
            </div>
          ) : loadingJadwal ? (
            <div style={{ textAlign: 'center', padding: '1.2rem', color: '#9CA3AF', fontSize: '.83rem' }}>Memuat jadwal...</div>
          ) : jadwalList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.2rem', color: '#9CA3AF', fontSize: '.83rem', background: '#FAFAF7', borderRadius: 10, border: '1.5px dashed #E2E0D6' }}>
              Belum ada jadwal tersedia di {kampus}
            </div>
          ) : (
            <>
              {/* Tab filter tanggal */}
              {tanggalUnik.length > 1 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
                  <button
                    onClick={() => { setFilterTanggal('semua'); setJadwalId(''); }}
                    style={{
                      padding: '.35rem .85rem', borderRadius: 20, border: 'none', cursor: 'pointer',
                      background: filterTanggal === 'semua' ? '#1B4332' : '#F3F4F6',
                      color: filterTanggal === 'semua' ? '#fff' : '#6B7280',
                      fontSize: '.75rem', fontWeight: filterTanggal === 'semua' ? 700 : 500,
                      fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s', flexShrink: 0,
                    }}>Semua</button>
                  {tanggalUnik.map(tgl => {
                    const d = parseTanggalLokal(tgl);
                    const isToday = isSameDay(d, toLocalMidnight(new Date()));
                    const label = isToday ? `Hari ini (${d.getDate()} ${BULAN[d.getMonth()]})` : `${d.getDate()} ${BULAN[d.getMonth()]}`;
                    const active = filterTanggal === tgl;
                    return (
                      <button key={tgl}
                        onClick={() => { setFilterTanggal(tgl); setJadwalId(''); }}
                        style={{
                          padding: '.35rem .85rem', borderRadius: 20, border: 'none', cursor: 'pointer',
                          background: active ? '#1B4332' : '#F3F4F6',
                          color: active ? '#fff' : '#374151',
                          fontSize: '.75rem', fontWeight: active ? 700 : 500,
                          fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s', flexShrink: 0,
                        }}>{label}</button>
                    );
                  })}
                </div>
              )}
              {jadwalFiltered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.2rem', color: '#9CA3AF', fontSize: '.83rem', background: '#FAFAF7', borderRadius: 10, border: '1.5px dashed #E2E0D6' }}>
                  Tidak ada jadwal pada tanggal ini
                </div>
              ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {jadwalFiltered.map(j => {
                const selected = jadwalId === String(j.id);
                const penuh    = j.kuota_tersisa === 0;
                const isIkhwan = j.jenis_kelamin === 'Ikhwan';
                const isAkhwat = j.jenis_kelamin === 'Akhwat';
                return (
                  <button key={j.id} onClick={() => !penuh && setJadwalId(String(j.id))} disabled={penuh} style={{
                    padding: '.75rem 1rem', borderRadius: 10,
                    border: `1.5px solid ${selected ? '#1B4332' : '#E2E0D6'}`,
                    background: selected ? '#F0FDF4' : penuh ? '#F9FAFB' : '#FAFAF7',
                    cursor: penuh ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', transition: 'all .15s', textAlign: 'left' as const,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Tanggal + Jam */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        {j.tanggal && (
                          <span style={{ fontWeight: 700, fontSize: '.82rem', color: penuh ? '#9CA3AF' : '#1B4332' }}>
                            {fmtTgl(j.tanggal)}
                          </span>
                        )}
                        <span style={{ fontWeight: 600, fontSize: '.82rem', color: penuh ? '#9CA3AF' : '#40916C' }}>{j.waktu}</span>
                        {(isIkhwan || isAkhwat) && (
                          <span style={{
                            background: isIkhwan ? '#EFF6FF' : '#FDF2F8',
                            color: isIkhwan ? '#1D4ED8' : '#9D174D',
                            borderRadius: 20, padding: '1px 8px',
                            fontSize: '.67rem', fontWeight: 700,
                            border: `1px solid ${isIkhwan ? 'rgba(29,78,216,0.2)' : 'rgba(157,23,77,0.2)'}`,
                          }}>
                            {isIkhwan ? '♂ Ikhwan' : '♀ Akhwat'}
                          </span>
                        )}
                      </div>
                      {/* Penyimak */}
                      <div style={{ fontSize: '.75rem', color: '#6B7280' }}>
                        👤 {j.penyimak_nama || '—'}
                      </div>
                    </div>
                    {penuh
                      ? <span style={{ fontSize: '.72rem', color: '#EF4444', fontWeight: 600, background: '#FEF2F2', padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>Penuh</span>
                      : <span style={{ fontSize: '.72rem', color: '#40916C', fontWeight: 600, background: '#D8F3DC', padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>Sisa {j.kuota_tersisa}</span>
                    }
                  </button>
                );
              })}
            </div>
              )}
            </>
          )}
        </div>

        {/* Preview jadwal terpilih */}
        {selectedJadwal && (
          <div style={{ background: '#F0FDF4', border: '1px solid rgba(27,67,50,0.15)', borderRadius: 10, padding: '.85rem 1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>👤</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '.83rem', color: '#1B4332' }}>{selectedJadwal.penyimak_nama}</div>
                <div style={{ fontSize: '.73rem', color: '#40916C', marginTop: 2 }}>
                  Penyimak · {selectedJadwal.kampus ?? kampus} · {selectedJadwal.waktu}
                  {selectedJadwal.tanggal ? ` · ${fmtTgl(selectedJadwal.tanggal)}` : ''}
                </div>
                {selectedJadwal.jenis_kelamin && selectedJadwal.jenis_kelamin !== 'Semua' && (
                  <div style={{ marginTop: 5 }}>
                    <BadgeJK jenis_kelamin={selectedJadwal.jenis_kelamin} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid rgba(220,53,69,.2)', borderRadius: 8, padding: '.65rem .9rem', fontSize: '.8rem', color: '#991B1B', marginBottom: '1rem' }}>⚠️ {error}</div>
        )}

        <button onClick={handleSubmit} disabled={submitting || !jadwalId} style={{
          width: '100%', padding: '.85rem',
          background: !jadwalId || submitting ? '#9CA3AF' : '#1B4332',
          color: '#fff', border: 'none', borderRadius: 10,
          fontSize: '.9rem', fontWeight: 600,
          cursor: !jadwalId || submitting ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', transition: 'background .2s',
        }}>
          {submitting ? 'Memproses...' : 'Konfirmasi Booking'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardSantriPage() {
  const router = useRouter();
  const [activeNav, setActiveNav]     = useState('profil');
  const [user, setUser]               = useState<User | null>(null);
  const [ringkasan, setRingkasan]     = useState<RingkasanData | null>(null);
  const [jadwal, setJadwal]           = useState<JadwalItem[]>([]);
  const [history, setHistory]         = useState<HistoryItem[]>([]);
  // FIX: simpan selectedDate sebagai local midnight agar isSameDay akurat
  const [selectedDate, setSelectedDate] = useState<Date>(() => toLocalMidnight(new Date()));
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRingkasanModal, setShowRingkasanModal] = useState(false);
  const [allHistory, setAllHistory] = useState<HistoryItem[]>([]);
  const [showUbahPasswordModal, setShowUbahPasswordModal] = useState(false);
  const [showPrivasiModal, setShowPrivasiModal] = useState(false);
  const [showAllHistoryModal, setShowAllHistoryModal] = useState(false);

  const refProfil     = useRef<HTMLDivElement>(null);
  const refDashboard  = useRef<HTMLDivElement>(null);
  const refJadwal     = useRef<HTMLDivElement>(null);
  const refHistory    = useRef<HTMLDivElement>(null);
  const refPengaturan = useRef<HTMLDivElement>(null);

  const sectionRefs: Record<string, React.RefObject<HTMLDivElement>> = {
    profil: refProfil, dashboard: refDashboard, jadwal: refJadwal,
    history: refHistory, pengaturan: refPengaturan,
  };

  const handleNav = (key: string) => {
    setActiveNav(key);
    setTimeout(() => {
      sectionRefs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await api.get('/me');
        setUser(meRes.data?.user ?? meRes.data);
      } catch {
        router.push('/login');
        return;
      }
      const [ringkasanRes, jadwalRes, historyRes, allHistoryRes] = await Promise.allSettled([
        api.get('/santri/ringkasan'),
        api.get('/santri/jadwal'),
        api.get('/santri/history-setoran?limit=4'),
        api.get('/santri/history-setoran'),
      ]);
      if (ringkasanRes.status === 'fulfilled') setRingkasan(ringkasanRes.value.data?.data ?? ringkasanRes.value.data ?? null);
      if (jadwalRes.status   === 'fulfilled') setJadwal(jadwalRes.value.data?.data ?? jadwalRes.value.data ?? []);
      if (historyRes.status  === 'fulfilled') setHistory(historyRes.value.data?.data ?? historyRes.value.data ?? []);
      if (allHistoryRes.status === 'fulfilled') setAllHistory(allHistoryRes.value.data?.data ?? allHistoryRes.value.data ?? []);
      setLoading(false);
    };
    init();
  }, []);

  const exportHistoryPDF = async () => {
    setExportingPDF(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth  = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      doc.setFillColor(27, 67, 50);
      doc.rect(0, 0, pageWidth, 70, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text('History Setoran Hafalan', margin, 30);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 220, 195);
      doc.text("UKM Tahfidzul Qur'an · Universitas Airlangga", margin, 46);
      doc.text(`Nama: ${user?.nama ?? '—'}`, margin, 60);
      const now = new Date();
      const tglExport = `${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`;
      doc.setTextColor(201, 168, 76);
      doc.text(`Diekspor: ${tglExport}`, pageWidth - margin, 60, { align: 'right' });
      const colWidths = [90, 110, 160, 130, 60, 170];
      const colLabels = ['Tanggal', 'Jenis Setoran', 'Detail', 'Penyimak', 'Nilai', 'Catatan'];
      let y = 90;
      const rowHeight = 26;
      doc.setFillColor(240, 253, 244);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');
      doc.setDrawColor(220, 235, 225); doc.setLineWidth(0.5);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'S');
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(27, 67, 50);
      let xCol = margin + 8;
      colLabels.forEach((label, i) => { doc.text(label, xCol, y + 17); xCol += colWidths[i]; });
      y += rowHeight;
      if (history.length === 0) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(156, 163, 175);
        doc.text('Belum ada history setoran', pageWidth / 2, y + 20, { align: 'center' });
      } else {
        history.forEach((item, idx) => {
          if (y + rowHeight > pageHeight - 40) { doc.addPage(); y = 40; }
          const rowBg = idx % 2 === 0 ? [255, 255, 255] : [250, 250, 247];
          doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
          doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');
          doc.setDrawColor(243, 244, 246);
          doc.line(margin, y + rowHeight, margin + pageWidth - margin * 2, y + rowHeight);
          const cells = [fmtTgl(item.tanggal), item.jenis_setoran, item.detail, item.ustadz, item.nilai != null ? String(item.nilai) : '—', item.catatan ?? '—'];
          xCol = margin + 8;
          cells.forEach((cell, i) => {
            if (i === 4 && item.nilai != null) {
              doc.setTextColor(item.nilai >= 85 ? 27 : 146, item.nilai >= 85 ? 67 : 64, item.nilai >= 85 ? 50 : 14);
              doc.setFont('helvetica', 'bold');
            } else { doc.setTextColor(55, 65, 81); doc.setFont('helvetica', 'normal'); }
            doc.setFontSize(8.5);
            doc.text(doc.splitTextToSize(cell, colWidths[i] - 12)[0], xCol, y + 17);
            xCol += colWidths[i];
          });
          y += rowHeight;
        });
      }
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8); doc.setTextColor(156, 163, 175); doc.setFont('helvetica', 'normal');
        doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
        doc.text("YoKaji · UKM Tahfidzul Qur'an Unair", margin, pageHeight - 15);
      }
      doc.save(`history-setoran-${tglExport.replace(/\s/g, '-')}.pdf`);
    } catch {
      alert('Export PDF gagal. Coba lagi.');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleLogout = async () => {
    try { await api.post('/logout'); } catch {}
    localStorage.removeItem('token');
    router.push('/login');
  };

  const weekDays = getWeekDays(selectedDate);
  const jadwalHariIni = jadwal.filter(j =>
    isSameDay(parseTanggalLokal(j.tanggal), selectedDate) && !isJadwalSantriLewat(j)
  );

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F0', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>🌿</div>
        <div style={{ color: '#1B4332', fontSize: '.9rem' }}>Memuat dashboard...</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F5F0', fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
        .sidebar { width: 230px; min-height: 100vh; background: #1B4332; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; overflow-y: auto; flex-shrink: 0; z-index: 50; transition: transform .25s ease; }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 49; }
        .topbar { display: flex; align-items: center; gap: 12; padding: 1rem 2rem; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.06); position: sticky; top: 0; z-index: 30; }
        .topbar-title { flex: 1; min-width: 0; }
        .hamburger-btn { display: none; background: none; border: none; cursor: pointer; padding: 4px; flex-shrink: 0; }
        .main-content { flex: 1; padding: 1.8rem 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .stat-row { display: flex; gap: 12; }
        .grid-dashboard { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; }
        .grid-jadwal { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; }
        .grid-history { display: grid; grid-template-columns: 1fr 280px; gap: 1.5rem; }
        .akademik-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .history-table-wrap { display: block; }
        .history-cards { display: none; flex-direction: column; gap: 10px; }
        .topbar-subtitle { display: block; }
        .topbar-msg-btn { display: block; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          .grid-dashboard { grid-template-columns: 1fr; }
          .grid-jadwal { grid-template-columns: 1fr; }
          .grid-history { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .sidebar { position: fixed; left: 0; top: 0; transform: translateX(-100%); }
          .sidebar--open { transform: translateX(0); }
          .sidebar-overlay { display: block; pointer-events: none; opacity: 0; transition: opacity .25s; }
          .sidebar-overlay--open { pointer-events: auto; opacity: 1; }
          .hamburger-btn { display: block; }
          .topbar { padding: .85rem 1rem; gap: 8px; }
          .topbar-subtitle { display: none; }
          .topbar-msg-btn { display: none; }
          .main-content { padding: 1rem; }
          .akademik-grid { grid-template-columns: 1fr; }
          .history-table-wrap { display: none; }
          .history-cards { display: flex; }
          .profil-header { flex-direction: column !important; text-align: center; }
          .profil-header > div:last-child { text-align: center; }
        }
        @media (max-width: 420px) {
          .stat-row > * { flex: 1 1 100%; }
          .topbar-title h1 { font-size: .98rem !important; }
        }
      `}</style>

      <Sidebar active={activeNav} user={user} onNav={handleNav} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        <Topbar user={user} onLogout={handleLogout} onHamburger={() => setSidebarOpen(v => !v)} />

        <main className="main-content">

          {/* ── SECTION: Profil ── */}
          <div ref={refProfil}>
            <div className="profil-header" style={{
              background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
              borderRadius: 16, padding: '1.8rem 2rem', display: 'flex',
              alignItems: 'center', gap: 20, marginBottom: '1rem',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', border: '1.5px solid rgba(201,168,76,0.15)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', right: 20, top: 20, width: 100, height: 100, borderRadius: '50%', border: '1.5px solid rgba(201,168,76,0.1)', pointerEvents: 'none' }} />
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#40916C', border: '3px solid rgba(201,168,76,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                {user?.url_foto ? <img src={user.url_foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user?.nama?.[0]?.toUpperCase() ?? '?')}
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.15rem', lineHeight: 1.3 }}>{user?.nama ?? '—'}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.8rem', marginTop: 2 }}>{user?.email ?? '—'}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ background: 'rgba(64,145,108,0.5)', border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C', fontSize: '.72rem', fontWeight: 700, padding: '3px 12px', borderRadius: 20, letterSpacing: '.04em' }}>✦ Santri Aktif</span>
                  {user?.jenis_kelamin && user.jenis_kelamin !== 'Semua' && (
                    <span style={{
                      background: user.jenis_kelamin === 'Ikhwan' ? 'rgba(29,78,216,0.25)' : 'rgba(157,23,77,0.25)',
                      border: `1px solid ${user.jenis_kelamin === 'Ikhwan' ? 'rgba(147,197,253,0.4)' : 'rgba(249,168,212,0.4)'}`,
                      color: user.jenis_kelamin === 'Ikhwan' ? '#93C5FD' : '#F9A8D4',
                      fontSize: '.72rem', fontWeight: 700, padding: '3px 12px', borderRadius: 20,
                    }}>
                      {user.jenis_kelamin === 'Ikhwan' ? '♂ Ikhwan' : '♀ Akhwat'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: '1.4rem' }}>
              <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                Informasi Akademik
              </div>
              <div className="akademik-grid">
                {[
                  { label: 'NIM',           value: user?.nim           ?? '—', icon: '🎓' },
                  { label: 'Jenis Kelamin', value: user?.jenis_kelamin ?? '—', icon: '👤' },
                  { label: 'Fakultas',      value: user?.fakultas      ?? '—', icon: '🏛️' },
                  { label: 'Program Studi', value: user?.prodi         ?? '—', icon: '📚' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#FAFAF7', borderRadius: 12, padding: '.85rem 1rem', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: '.7rem', color: '#9CA3AF', marginBottom: 3, fontWeight: 600, letterSpacing: '.02em' }}>{item.label}</div>
                      <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#1B4332', lineHeight: 1.3 }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SECTION: Dashboard ── */}
          <div ref={refDashboard} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="grid-dashboard">
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '.9rem', fontWeight: 600, color: '#1B4332', margin: 0 }}>Ringkasan Saya</h3>
                <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                  <div style={{ flex: 1, background: '#F0FDF4', borderRadius: 12, border: '1px solid rgba(27,67,50,0.08)', padding: '1.1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>📖</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1B4332', lineHeight: 1 }}>{ringkasan?.total_setoran ?? 0}</div>
                    <div style={{ fontSize: '.73rem', color: '#6B7280', marginTop: 5 }}>Total Setoran</div>
                  </div>
                  <div style={{ flex: 1, background: '#FFFBEB', borderRadius: 12, border: '1px solid rgba(201,168,76,0.15)', padding: '1.1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>⭐</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1B4332', lineHeight: 1 }}>{ringkasan?.nilai_rata_rata ?? 0}</div>
                    <div style={{ fontSize: '.73rem', color: '#6B7280', marginTop: 5 }}>Nilai Rata-rata</div>
                  </div>
                </div>
              </div>

              {/* Jadwal Terdekat */}
              <div style={{ background: '#1B4332', borderRadius: 16, padding: '1.4rem', color: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '.9rem' }}>Jadwal Terdekat</span>
                  <button onClick={() => handleNav('jadwal')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: '.75rem', cursor: 'pointer', fontFamily: 'inherit' }}>Lihat Semua</button>
                </div>
                {jadwal.filter(j => ['Terjadwal','aktif'].includes(j.status) && !isJadwalAdminLewat(j)).slice(0, 3).length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.5, padding: '1rem 0' }}>
                    <span style={{ fontSize: '2rem' }}>📅</span>
                    <span style={{ fontSize: '.78rem', textAlign: 'center' }}>Belum ada jadwal terjadwal</span>
                  </div>
                ) : jadwal.filter(j => ['Terjadwal','aktif'].includes(j.status) && !isJadwalAdminLewat(j)).slice(0, 3).map(j => (
                  <div key={j.id} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '.75rem .9rem', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ background: 'rgba(201,168,76,0.2)', borderRadius: 8, padding: '.5rem .6rem', textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '.65rem', color: '#C9A84C', fontWeight: 700 }}>{BULAN[parseTanggalLokal(j.tanggal).getMonth()].toUpperCase()}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{parseTanggalLokal(j.tanggal).getDate()}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: '.82rem', color: '#fff' }}>{j.jenis}</span>
                        {j.jenis_kelamin && j.jenis_kelamin !== 'Semua' && (
                          <span style={{
                            background: j.jenis_kelamin === 'Ikhwan' ? 'rgba(147,197,253,0.2)' : 'rgba(249,168,212,0.2)',
                            color: j.jenis_kelamin === 'Ikhwan' ? '#93C5FD' : '#F9A8D4',
                            borderRadius: 20, padding: '1px 7px', fontSize: '.63rem', fontWeight: 700,
                          }}>
                            {j.jenis_kelamin === 'Ikhwan' ? '♂ Ikhwan' : '♀ Akhwat'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {j.waktu_mulai} · 👤 {getNamaPenyimak(j)}{j.tempat ? ` · ${j.tempat}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => setShowBookingModal(true)} style={{ marginTop: 'auto', padding: '.65rem', background: 'rgba(255,255,255,0.1)', border: '1px dashed rgba(255,255,255,0.25)', borderRadius: 10, color: '#fff', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Booking Jadwal Baru
                </button>
              </div>
            </div>
          </div>

          {/* ── SECTION: Jadwal & Booking ── */}
          <div ref={refJadwal} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="grid-jadwal">
              {/* Kalender + list jadwal per hari */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: '1.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '.9rem', fontWeight: 600, color: '#1B4332', margin: 0 }}>Jadwal Saya</h3>
                    {/* FIX: tampilkan tanggal yang sedang dipilih */}
                    <div style={{ fontSize: '.75rem', color: '#6B7280', marginTop: 3 }}>
                      {selectedDate.getDate()} {BULAN[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                      {isSameDay(selectedDate, toLocalMidnight(new Date())) ? ' · Hari ini' : ''}
                    </div>
                  </div>
                  <button style={{ background: 'none', border: 'none', color: '#40916C', fontSize: '.75rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Lihat Kalender →</button>
                </div>

                {/* Kalender mingguan */}
                <div style={{ display: 'flex', gap: 6, marginBottom: '1.2rem', overflowX: 'auto', paddingBottom: 4 }}>
                  {weekDays.map((d) => {
                    const isSelected = isSameDay(d, selectedDate);
                    const isToday    = isSameDay(d, toLocalMidnight(new Date()));
                    // dot indikator: ada jadwal di hari ini
                    const hasJadwal  = jadwal.some(j => isSameDay(parseTanggalLokal(j.tanggal), d) && !isJadwalSantriLewat(j));
                    return (
                      <button
                        key={d.toISOString()}
                        // FIX: set selectedDate selalu sebagai local midnight
                        onClick={() => setSelectedDate(toLocalMidnight(d))}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          padding: '.5rem .7rem', borderRadius: 10, border: 'none', cursor: 'pointer',
                          minWidth: 48, position: 'relative',
                          background: isSelected ? '#1B4332' : 'transparent',
                          color: isSelected ? '#fff' : isToday ? '#1B4332' : '#6B7280',
                          fontFamily: 'inherit', transition: 'all .15s',
                        }}
                      >
                        <span style={{ fontSize: '.65rem', marginBottom: 3 }}>{BULAN[d.getMonth()].toUpperCase()}</span>
                        <span style={{ fontSize: '1rem', fontWeight: 700 }}>{d.getDate()}</span>
                        <span style={{ fontSize: '.65rem', marginTop: 2 }}>{HARI[d.getDay()]}</span>
                        {/* dot indikator jadwal */}
                        {hasJadwal && (
                          <span style={{
                            position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                            width: 5, height: 5, borderRadius: '50%',
                            background: isSelected ? '#C9A84C' : '#40916C',
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* FIX: list jadwal untuk tanggal yang dipilih saja */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {jadwalHariIni.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#9CA3AF', fontSize: '.83rem' }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>📭</div>
                      Tidak ada jadwal pada{' '}
                      {isSameDay(selectedDate, toLocalMidnight(new Date()))
                        ? 'hari ini'
                        : `${selectedDate.getDate()} ${BULAN[selectedDate.getMonth()]}`}
                    </div>
                  ) : jadwalHariIni.map(j => {
                    const sc = STATUS_COLOR[j.status] ?? STATUS_COLOR['Terjadwal'];
                    return (
                      <div key={j.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '.85rem', background: '#FAFAF7', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '.7rem', color: '#6B7280', minWidth: 50, paddingTop: 2, lineHeight: 1.6 }}>
                          <div>{j.waktu_mulai}</div>
                          <div>– {j.waktu_selesai}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                            <span style={{ fontWeight: 600, fontSize: '.85rem', color: '#1B4332' }}>{j.jenis}</span>
                            <BadgeJK jenis_kelamin={j.jenis_kelamin} />
                          </div>
                          {j.detail && <div style={{ fontSize: '.77rem', color: '#6B7280', marginTop: 2 }}>{j.detail}</div>}
                          {/* Nama penyimak */}
                          <div style={{ fontSize: '.75rem', color: '#1B4332', fontWeight: 600, marginTop: 4 }}>
                            👤 {getNamaPenyimak(j)}
                          </div>
                          {j.tempat && <div style={{ fontSize: '.72rem', color: '#9CA3AF', marginTop: 2 }}>📍 {j.tempat}</div>}
                        </div>
                        <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 600, flexShrink: 0 }}>{j.status}</span>
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => setShowBookingModal(true)} style={{ width: '100%', marginTop: '1rem', padding: '.75rem', background: '#F0FDF4', border: '1.5px dashed #40916C', borderRadius: 10, color: '#1B4332', fontWeight: 600, fontSize: '.83rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                  📅 Booking Jadwal {isSameDay(selectedDate, toLocalMidnight(new Date())) ? 'Hari Ini' : `${selectedDate.getDate()} ${BULAN[selectedDate.getMonth()]}`}
                </button>
              </div>

              {/* Info booking */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '.9rem', fontWeight: 600, color: '#1B4332', margin: 0 }}>Booking Setoran Hafalan</h3>
                <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '1rem', border: '1px solid rgba(27,67,50,0.1)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.3rem' }}>📋</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.83rem', color: '#1B4332', marginBottom: 4 }}>Jadwal dari Admin</div>
                      <div style={{ fontSize: '.75rem', color: '#6B7280', lineHeight: 1.6 }}>
                        Pilih slot yang tersedia di Kampus A, B, atau C sesuai jadwal yang ditetapkan admin. Kamu dapat melihat jam & penyimak sebelum konfirmasi.
                      </div>
                    </div>
                  </div>
                </div>
                {[
                  { icon: '🕌', label: 'Kampus A, B & C',   desc: 'Pilih lokasi yang paling dekat' },
                  { icon: '🕐', label: 'Jam fleksibel',      desc: 'Berbagai pilihan sesi tersedia' },
                  { icon: '👤', label: 'Info penyimak',      desc: 'Lihat nama penyimak per sesi' },
                  { icon: '🏷️', label: 'Ikhwan / Akhwat',   desc: 'Jadwal dipisah per jenis kelamin' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.8rem', color: '#1B4332' }}>{item.label}</div>
                      <div style={{ fontSize: '.72rem', color: '#6B7280' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
                <button onClick={() => setShowBookingModal(true)} style={{ width: '100%', padding: '.85rem', background: '#1B4332', color: '#fff', border: 'none', borderRadius: 10, fontSize: '.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 'auto', transition: 'background .2s' }}>
                  📅 Booking Setoran Sekarang
                </button>
              </div>
            </div>
          </div>

          {/* ── SECTION: History Setoran ── */}
          <div ref={refHistory}>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: '1.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ fontSize: '.9rem', fontWeight: 600, color: '#1B4332', margin: 0 }}>History Setoran</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => setShowRingkasanModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F0FDF4', color: '#1B4332', border: '1px solid rgba(27,67,50,0.2)', borderRadius: 8, padding: '.4rem .85rem', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600, fontFamily: 'inherit', transition: 'all .15s' }}>
                    📊 Ringkasan Semester
                  </button>
                  <button onClick={exportHistoryPDF} disabled={exportingPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, background: exportingPDF ? '#F3F4F6' : '#1B4332', color: exportingPDF ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 8, padding: '.4rem .85rem', cursor: exportingPDF ? 'not-allowed' : 'pointer', fontSize: '.75rem', fontWeight: 600, fontFamily: 'inherit', transition: 'all .15s' }}>
                    {exportingPDF ? (
                      <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #9CA3AF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Mengekspor...</>
                    ) : (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export PDF</>
                    )}
                  </button>
                  <button onClick={() => setShowAllHistoryModal(true)} style={{ background: 'none', border: 'none', color: '#40916C', fontSize: '.75rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Lihat Semua →</button>
                </div>
              </div>
              {/* Desktop table */}
              <div className="history-table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      {['Tanggal','Jenis Setoran','Detail','Penyimak','Nilai','Catatan'].map(h => (
                        <th key={h} style={{ padding: '.5rem .6rem', textAlign: 'left', color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>Belum ada history setoran</td></tr>
                    ) : history.map((h) => (
                      <tr key={h.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                        <td style={{ padding: '.6rem', color: '#1B4332', fontWeight: 500, whiteSpace: 'nowrap' }}>{fmtTgl(h.tanggal)}</td>
                        <td style={{ padding: '.6rem', color: '#374151' }}>{h.jenis_setoran}</td>
                        <td style={{ padding: '.6rem', color: '#374151' }}>{h.detail}</td>
                        <td style={{ padding: '.6rem', color: '#374151', whiteSpace: 'nowrap' }}>{h.ustadz}</td>
                        <td style={{ padding: '.6rem', fontWeight: 600, color: h.nilai && h.nilai >= 85 ? '#1B4332' : h.nilai ? '#92400E' : '#9CA3AF' }}>{h.nilai ?? '—'}</td>
                        <td style={{ padding: '.6rem', color: '#6B7280' }}>{h.catatan ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="history-cards">
                {history.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '.83rem' }}>Belum ada history setoran</div>
                ) : history.map((h) => (
                  <div key={h.id} style={{ background: '#FAFAF7', borderRadius: 12, padding: '.9rem 1rem', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '.78rem', fontWeight: 600, color: '#1B4332' }}>{fmtTgl(h.tanggal)}</span>
                      <span style={{ fontSize: '.85rem', fontWeight: 700, color: h.nilai && h.nilai >= 85 ? '#1B4332' : h.nilai ? '#92400E' : '#9CA3AF' }}>{h.nilai ?? '—'}</span>
                    </div>
                    <div style={{ fontSize: '.82rem', fontWeight: 600, color: '#374151', marginBottom: 3 }}>{h.jenis_setoran}</div>
                    <div style={{ fontSize: '.78rem', color: '#6B7280', marginBottom: 3 }}>{h.detail}</div>
                    <div style={{ fontSize: '.75rem', color: '#9CA3AF' }}>👤 {h.ustadz}</div>
                    {h.catatan && <div style={{ fontSize: '.73rem', color: '#6B7280', marginTop: 4, fontStyle: 'italic' }}>{h.catatan}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SECTION: Pengaturan ── */}
          <div ref={refPengaturan} style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: '1.4rem' }}>
            <h3 style={{ fontSize: '.9rem', fontWeight: 600, color: '#1B4332', margin: '0 0 1rem' }}>Pengaturan</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div onClick={() => setShowUbahPasswordModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '.85rem 1rem', background: '#FAFAF7', borderRadius: 12, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.05)', transition: 'background .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F0FDF4')}
                onMouseLeave={e => (e.currentTarget.style.background = '#FAFAF7')}>
                <span style={{ fontSize: '1.2rem' }}>🔒</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '.85rem', color: '#1B4332' }}>Ubah Password</div>
                  <div style={{ fontSize: '.75rem', color: '#6B7280', marginTop: 2 }}>Ganti password akun kamu</div>
                </div>
                <span style={{ color: '#9CA3AF', fontSize: '1rem' }}>→</span>
              </div>
              <div onClick={() => setShowPrivasiModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '.85rem 1rem', background: '#FAFAF7', borderRadius: 12, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.05)', transition: 'background .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FFF5F5')}
                onMouseLeave={e => (e.currentTarget.style.background = '#FAFAF7')}>
                <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '.85rem', color: '#1B4332' }}>Privasi</div>
                  <div style={{ fontSize: '.75rem', color: '#6B7280', marginTop: 2 }}>Kelola data dan privasi kamu</div>
                </div>
                <span style={{ color: '#9CA3AF', fontSize: '1rem' }}>→</span>
              </div>
            </div>
          </div>

        </main>
      </div>

      {showBookingModal && (
        <BookingModal
          onClose={() => setShowBookingModal(false)}
          initialDate={selectedDate}
          onSuccess={() => {
            setShowBookingModal(false);
            api.get('/santri/jadwal').then(r => setJadwal(r.data?.data ?? r.data ?? []));
          }}
        />
      )}

      {showAllHistoryModal && (
        <AllHistoryModal
          allHistory={allHistory}
          user={user}
          onClose={() => setShowAllHistoryModal(false)}
        />
      )}

      {showRingkasanModal && (
        <RingkasanSemesterModal
          allHistory={allHistory}
          user={user}
          ringkasan={ringkasan}
          onClose={() => setShowRingkasanModal(false)}
        />
      )}

      {showUbahPasswordModal && (
        <UbahPasswordModal onClose={() => setShowUbahPasswordModal(false)} />
      )}

      {showPrivasiModal && (
        <PrivasiModal user={user} onClose={() => setShowPrivasiModal(false)} onHapusAkun={() => { router.push('/login'); }} />
      )}
    </div>
  );
}