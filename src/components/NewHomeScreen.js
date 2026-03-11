import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useBanner } from '../hooks/useBanner';
import SvgIcon from './SvgIcon';
import IslamNuLogoTeal from '../icons/islamnu-logga-light.svg';

export default function NewHomeScreen() {
  const { theme: T } = useTheme();
  const { allBanners, banners, unreadCount, read, dismiss, markRead, markAllRead } = useBanner();
  const [showBellPanel, setShowBellPanel] = useState(false);

  return (
    <div
      style={{ background: T.bg, minHeight: '100%', fontFamily: "'Inter', system-ui, sans-serif" }}
      onMouseDown={() => setShowBellPanel(false)}
    >
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bannerIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px 12px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        position: 'relative',
      }}>
        <img
          src={IslamNuLogoTeal}
          alt="islam.nu"
          style={{ width: 72, height: 72, pointerEvents: 'none', userSelect: 'none' }}
        />

        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: '-.3px' }}>
          Hem
        </div>

        {/* Bell button — always visible, badge updates when data loads */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowBellPanel(v => !v);
              allBanners.forEach(b => markRead(b.id));
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 8, WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <SvgIcon
                name="bell"
                size={24}
                color={unreadCount > 0 ? T.accent : T.textMuted}
                style={{ opacity: unreadCount > 0 ? 1 : 0.5, transition: 'color .2s, opacity .2s' }}
              />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 17, height: 17, borderRadius: 9,
                  background: '#FF3B30', border: `2px solid ${T.bg}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'fadeUp .2s ease',
                }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </div>
          </button>

          {/* Notification panel */}
          {showBellPanel && (
            <div
              onMouseDown={e => e.stopPropagation()}
              style={{
                position: 'absolute', top: 44, right: 0,
                width: 'min(320px, calc(100vw - 32px))',
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 16, zIndex: 500,
                boxShadow: `0 8px 32px rgba(0,0,0,${T.isDark ? '0.5' : '0.12'})`,
                overflow: 'hidden', animation: 'fadeUp .2s ease both',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px 10px', borderBottom: `1px solid ${T.border}`,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Meddelanden</span>
                {allBanners.length > 0 && (
                  <button onClick={() => { markAllRead(); setShowBellPanel(false); }} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700, color: T.accent, padding: '2px 0',
                  }}>Markera alla lästa</button>
                )}
              </div>

              {allBanners.length === 0 ? (
                <div style={{ padding: '20px 14px', fontSize: 13, color: T.textMuted, textAlign: 'center' }}>
                  Inga meddelanden
                </div>
              ) : allBanners.map(b => {
                const isRead = read.includes(b.id);
                return (
                  <div key={b.id} style={{
                    padding: '11px 14px', borderBottom: `1px solid ${T.border}`,
                    background: isRead ? 'transparent' : T.isDark ? 'rgba(45,139,120,0.06)' : 'rgba(36,100,93,0.05)',
                    display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: 4, flexShrink: 0, marginTop: 5, background: isRead ? 'transparent' : T.accent }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.5 }}>{b.message}</div>
                      {b.linkText && b.linkUrl && (
                        <a href={b.linkUrl} target="_blank" rel="noopener noreferrer" style={{
                          display: 'inline-block', marginTop: 5, fontSize: 12, fontWeight: 700,
                          color: T.accent, textDecoration: 'underline', textUnderlineOffset: 2,
                        }}>{b.linkText} →</a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── INLINE BANNER FEED ── */}
      {banners.length > 0 && (
        <div style={{ padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {banners.map((b, i) => (
            <div
              key={b.id}
              style={{
                background: T.card,
                border: `1px solid ${T.accent}44`,
                borderLeft: `4px solid ${T.accent}`,
                borderRadius: 14,
                padding: '13px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                boxShadow: `0 2px 16px ${T.accentGlow}`,
                animation: `bannerIn .3s ease both`,
                animationDelay: `${i * 60}ms`,
              }}
            >
              <img
                src={IslamNuLogoTeal}
                alt=""
                style={{ width: 22, height: 22, flexShrink: 0, marginTop: 2, objectFit: 'contain' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: T.textSecondary, fontFamily: 'system-ui' }}>
                  {b.message}
                </div>
                {b.linkText && b.linkUrl && (
                  <a
                    href={b.linkUrl} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-block', marginTop: 6,
                      fontSize: 12, fontWeight: 700, color: T.accent,
                      textDecoration: 'underline', textUnderlineOffset: 3,
                      fontFamily: 'system-ui',
                    }}
                  >{b.linkText} →</a>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismiss(b.id); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: T.textMuted, fontSize: 20, lineHeight: 1,
                  padding: '0 2px', flexShrink: 0, marginTop: -2,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* ── CONTENT PLACEHOLDER ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '60px 20px', gap: 16,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 22, background: T.card,
          border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 36 }}>🕌</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Välkommen</div>
        <div style={{ fontSize: 14, color: T.textMuted, textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
          Den här sidan är under uppbyggnad.
        </div>
      </div>
    </div>
  );
}
