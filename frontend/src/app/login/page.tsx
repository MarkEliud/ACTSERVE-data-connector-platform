'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading, error, clearError, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await login(formData.email, formData.password);
    setIsSubmitting(false);
    if (success) {
      router.push('/dashboard');
    }
  };

  // Show loading spinner only during actual login attempt, not initial auth check
  const showLoading = isSubmitting;

  // ACTSERV brand colors
  const colors = {
    primary: '#46b754',
    primaryHover: '#3a9e47',
    secondary: '#f89734',
    dark: '#223843',
    teal: '#244a4a',
    lightTeal: '#edf7f5',
    gray: '#6c8a96',
    lightGray: '#F7FAFC',
    white: '#ffffff',
    danger: '#dc2626',
    dangerLight: '#fee2e2',
    dangerDark: '#7f1d1d',
    border: '#d0dde3',
  };

  // Don't render anything while checking auth (optional)
  if (authLoading) {
    return (
      <div style={{ 
        minHeight: 'calc(100vh - 200px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.lightGray,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: `3px solid ${colors.lightTeal}`,
            borderTopColor: colors.primary,
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            margin: '0 auto',
          }} />
          <p style={{ marginTop: '1rem', color: colors.gray }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 200px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: colors.lightGray,
      fontFamily: 'Montserrat, sans-serif',
      padding: '2rem 1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>
        <div style={{
          background: colors.white,
          borderRadius: '0',
          boxShadow: '0px 15px 35px -10px rgba(0, 0, 0, 0.10)',
          overflow: 'hidden',
          borderTop: `4px solid ${colors.primary}`,
        }}>
          <div style={{ padding: '2.5rem 2.5rem 2rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', borderBottom: `1px dashed ${colors.primary}`, paddingBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  background: colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: colors.dark, letterSpacing: '0.15em', textTransform: 'uppercase' }}>ACTSERV</span>
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: colors.dark, margin: '0 0 4px', lineHeight: '1.3' }}>Sign in to your account</h1>
              <p style={{ fontSize: '13px', color: colors.gray, margin: 0, fontWeight: 400 }}>Actuarial Consultancy Services — Client Portal</p>
            </div>

            {/* Error alert */}
            {error && (
              <div style={{
                background: colors.dangerLight,
                borderLeft: `3px solid ${colors.danger}`,
                padding: '10px 14px',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '13px',
                color: colors.dangerDark,
                lineHeight: '1.5',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
                <button onClick={clearError} style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.dangerDark,
                  padding: 0,
                  fontSize: '16px',
                  lineHeight: 1,
                  flexShrink: 0,
                }}>✕</button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="email" style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: colors.dark,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '7px',
                }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.gray,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px' }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoFocus
                    autoComplete="email"
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 38px',
                      fontSize: '14px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 400,
                      color: colors.dark,
                      background: colors.lightGray,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 0,
                      outline: 'none',
                      transition: 'border-color 0.15s, background 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = colors.primary;
                      e.target.style.background = colors.white;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = colors.border;
                      e.target.style.background = colors.lightGray;
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="password" style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: colors.dark,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '7px',
                }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.gray,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px' }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 38px',
                      paddingRight: '40px',
                      fontSize: '14px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 400,
                      color: colors.dark,
                      background: colors.lightGray,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 0,
                      outline: 'none',
                      transition: 'border-color 0.15s, background 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = colors.primary;
                      e.target.style.background = colors.white;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = colors.border;
                      e.target.style.background = colors.lightGray;
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.gray,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                    onMouseLeave={(e) => e.currentTarget.style.color = colors.gray}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px' }}>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px' }}>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.75rem' }}>
                <input
                  id="remember"
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                  style={{ accentColor: colors.primary, width: '15px', height: '15px', cursor: 'pointer' }}
                />
                <label htmlFor="remember" style={{ fontSize: '12px', fontWeight: 500, color: '#4a6370', cursor: 'pointer', userSelect: 'none' }}>Keep me signed in</label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={showLoading}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  background: colors.primary,
                  color: colors.white,
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  border: 'none',
                  borderRadius: 0,
                  cursor: showLoading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s, box-shadow 0.2s, transform 0.1s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: showLoading ? 0.65 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!showLoading) {
                    e.currentTarget.style.background = colors.primaryHover;
                    e.currentTarget.style.boxShadow = `0px 8px 20px -6px ${colors.primary}73`;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.primary;
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {showLoading ? (
                  <>
                    <span style={{
                      width: '14px',
                      height: '14px',
                      border: `2px solid ${colors.white}59`,
                      borderTopColor: colors.white,
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                      display: 'inline-block',
                    }} />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <hr style={{ border: 'none', borderTop: `1px solid #e5ecef`, margin: '1.5rem 0 1.25rem' }} />

            {/* Demo credentials */}
            <div style={{
              background: colors.lightTeal,
              borderLeft: `3px solid ${colors.primary}`,
              padding: '10px 14px',
              fontSize: '12px',
              color: colors.dark,
              lineHeight: '1.7',
            }}>
              <div style={{
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                fontSize: '10px',
                color: colors.primary,
                marginBottom: '2px',
              }}>Demo Credentials</div>
              <code style={{
                fontFamily: 'Courier New, monospace',
                fontSize: '12px',
                color: colors.teal,
                background: `${colors.primary}1A`,
                padding: '1px 5px',
              }}>admin@example.com / admin123</code>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 2.5rem',
            background: colors.dark,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: colors.primary,
            }}>ACTSERV</span>
            <span style={{
              fontSize: '10px',
              fontWeight: 500,
              color: colors.gray,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>Actuarial Consulting</span>
          </div>
        </div>
      </div>

      {/* Add keyframe animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}