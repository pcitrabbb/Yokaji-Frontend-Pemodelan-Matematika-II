'use client';

import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email') ?? '';

  const [step, setStep] = useState<'otp' | 'password'>('otp');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      await api.post('/verify-reset-code', { email: emailFromQuery, code });
      setStep('password');
      setStatus('idle');
    } catch (err: any) {
      const msg: string = err.response?.data?.message ?? '';
      setErrorMsg(msg || 'Kode tidak valid atau sudah kadaluarsa.');
      setStatus('error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setErrorMsg('Password dan konfirmasi tidak cocok.');
      setStatus('error');
      return;
    }
    if (form.password.length < 8) {
      setErrorMsg('Password minimal 8 karakter.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      await api.post('/reset-password', {
        email: emailFromQuery,
        code: otp.join(''),
        password: form.password,
        password_confirmation: form.confirmPassword,
      });
      setStatus('success');
    } catch (err: any) {
      const msg: string = err.response?.data?.message ?? '';
      setErrorMsg(msg || 'Terjadi kesalahan. Coba beberapa saat lagi.');
      setStatus('error');
    }
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

        .rp-left {
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
        .rp-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 2rem;
        }

        @media (max-width: 768px) {
          .rp-left { display: none; }
          .rp-right {
            padding: 0 !important;
            align-items: stretch !important;
          }
          .rp-card {
            border-radius: 0 !important;
            min-height: 100vh;
            padding: 2rem 1.4rem 2.5rem !important;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .mobile-brand { display: flex !important; }
        }

        .rp-card {
          width: 100%;
          max-width: 400px;
          background: transparent;
          padding: 0;
        }

        .mobile-brand {
          display: none;
          align-items: center;
          gap: 10px;
          margin-bottom: 2rem;
          padding: 1rem 1.4rem;
          background: #1B4332;
          border-radius: 14px;
        }

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

        .otp-input {
          width: 48px;
          height: 54px;
          border: 1.5px solid #E2E0D6;
          border-radius: 10px;
          font-size: 1.3rem;
          font-weight: 700;
          text-align: center;
          background: #FAFAF7;
          font-family: inherit;
          color: #1C1C1C;
          outline: none;
          transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .otp-input:focus {
          border-color: #1B4332;
          box-shadow: 0 0 0 3px rgba(27,67,50,0.12);
          background: #fff;
        }
        .otp-input.filled {
          border-color: #1B4332;
          background: #F0FDF4;
          color: #1B4332;
        }

        .rp-input {
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
        .rp-input:focus {
          border-color: #1B4332;
          box-shadow: 0 0 0 3px rgba(27,67,50,0.12);
          background: #fff;
        }

        .rp-btn {
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
        .rp-btn:hover:not(:disabled) {
          background: #2D6A4F;
          transform: translateY(-1px);
        }
        .rp-btn:disabled { opacity: .55; cursor: not-allowed; }

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

        .step-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 1.75rem;
        }
        .step-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #E2E0D6;
          transition: background .3s, width .3s;
        }
        .step-dot.active {
          background: #1B4332;
          width: 20px;
          border-radius: 4px;
        }
        .step-dot.done {
          background: #40916C;
        }

        .success-box {
          background: #F0FDF4;
          border: 1.5px solid rgba(27,67,50,0.2);
          border-radius: 14px;
          padding: 1.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: .6rem;
        }
        .success-icon {
          width: 52px; height: 52px;
          background: #1B4332;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: .4rem;
        }

        .strength-bar {
          height: 4px;
          border-radius: 2px;
          transition: width .3s, background .3s;
        }
      `}</style>

      {/* Panel Kiri */}
      <div className="rp-left">
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
            {step === 'otp' ? 'Verifikasi\nIdentitasmu' : 'Buat Password\nBaru'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '.85rem', lineHeight: 1.75, margin: 0 }}>
            {step === 'otp'
              ? `Kode 6 digit telah dikirim ke ${emailFromQuery || 'emailmu'}. Periksa inbox atau folder spam.`
              : 'Buat password baru yang kuat dan mudah kamu ingat.'}
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

      {/* Panel Kanan */}
      <div className="rp-right">
        <div className="rp-card">

          {/* Brand mini mobile */}
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
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/forgot-password" className="back-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Kembali
            </Link>
          </div>

          {/* Step indicator */}
          <div className="step-indicator">
            <div className={`step-dot ${step === 'otp' ? 'active' : 'done'}`} />
            <div className={`step-dot ${step === 'password' ? 'active' : step === 'otp' ? '' : 'done'}`} />
            <span style={{ fontSize: '.72rem', color: '#9CA3AF', marginLeft: 4 }}>
              Langkah {step === 'otp' ? '1' : '2'} dari 2
            </span>
          </div>

          {status === 'success' ? (
            <div className="success-box">
              <div className="success-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: '#1B4332', margin: 0, fontWeight: 700 }}>
                Password Berhasil Direset!
              </h3>
              <p style={{ fontSize: '.83rem', color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
                Password barumu telah disimpan. Silakan login dengan password baru.
              </p>
              <Link
                href="/login"
                style={{
                  marginTop: '.5rem',
                  display: 'block',
                  width: '100%',
                  background: '#1B4332',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '.82rem',
                  fontSize: '.9rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  textAlign: 'center',
                  fontFamily: 'inherit',
                }}
              >
                Masuk Sekarang →
              </Link>
            </div>
          ) : step === 'otp' ? (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.65rem',
                  color: '#1B4332',
                  margin: '0 0 .3rem',
                  fontWeight: 700,
                }}>
                  Masukkan Kode 🔐
                </h1>
                <p style={{ fontSize: '.83rem', color: '#6B7280', margin: 0 }}>
                  Kode dikirim ke <strong>{emailFromQuery || 'emailmu'}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }} onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      className={`otp-input${digit ? ' filled' : ''}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                    />
                  ))}
                </div>

                {status === 'error' && (
                  <div style={{ background: '#FEF2F2', border: '1px solid rgba(220,53,69,.2)', borderRadius: 10, padding: '.75rem 1rem', fontSize: '.82rem', color: '#991B1B', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  className="rp-btn"
                  type="submit"
                  disabled={status === 'loading' || otp.join('').length < 6}
                >
                  {status === 'loading' ? 'Memverifikasi...' : 'Verifikasi Kode'}
                </button>
              </form>

              <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '1.4rem 0 1.1rem' }} />

              <p style={{ textAlign: 'center', fontSize: '.82rem', color: '#6B7280', margin: 0 }}>
                Tidak menerima kode?{' '}
                <Link href="/forgot-password" className="link-green">Kirim ulang</Link>
              </p>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.65rem',
                  color: '#1B4332',
                  margin: '0 0 .3rem',
                  fontWeight: 700,
                }}>
                  Password Baru 🔑
                </h1>
                <p style={{ fontSize: '.83rem', color: '#6B7280', margin: 0 }}>
                  Buat password baru yang aman untuk akunmu.
                </p>
              </div>

              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>
                    Password Baru
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="rp-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimal 8 karakter"
                      required
                      style={{ paddingRight: '5.5rem' }}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                    />
                    <button type="button" className="show-btn" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                    </button>
                  </div>
                  {form.password && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                      {[1, 2, 3].map(level => {
                        const strength = form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
                        const colors = ['#EF4444', '#F59E0B', '#10B981'];
                        return (
                          <div key={level} style={{
                            flex: 1, height: 4, borderRadius: 2,
                            background: level <= strength ? colors[strength - 1] : '#E5E7EB',
                            transition: 'background .3s',
                          }} />
                        );
                      })}
                      <span style={{ fontSize: '.7rem', color: '#6B7280', whiteSpace: 'nowrap', alignSelf: 'center', marginLeft: 4 }}>
                        {form.password.length < 6 ? 'Lemah' : form.password.length < 10 ? 'Sedang' : 'Kuat'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>
                    Konfirmasi Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="rp-input"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Ulangi password baru"
                      required
                      style={{ paddingRight: '5.5rem' }}
                      value={form.confirmPassword}
                      onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    />
                    <button type="button" className="show-btn" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? 'Sembunyikan' : 'Tampilkan'}
                    </button>
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p style={{ fontSize: '.73rem', color: '#EF4444', marginTop: 5 }}>
                      Password tidak cocok
                    </p>
                  )}
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <p style={{ fontSize: '.73rem', color: '#10B981', marginTop: 5 }}>
                      ✓ Password cocok
                    </p>
                  )}
                </div>

                {status === 'error' && (
                  <div style={{ background: '#FEF2F2', border: '1px solid rgba(220,53,69,.2)', borderRadius: 10, padding: '.75rem 1rem', fontSize: '.82rem', color: '#991B1B', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  className="rp-btn"
                  type="submit"
                  disabled={status === 'loading'}
                  style={{ marginTop: '.25rem' }}
                >
                  {status === 'loading' ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}