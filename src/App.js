import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';
import HomeScreen    from './components/HomeScreen';
import MonthlyScreen from './components/MonthlyScreen';
import QiblaScreen   from './components/QiblaScreen';
import SettingsScreen from './components/SettingsScreen';

const TABS = [
  { id:'home',     icon:'🕌', label:'Home'     },
  { id:'monthly',  icon:'📅', label:'Monthly'  },
  { id:'qibla',    icon:'🧭', label:'Qibla'    },
  { id:'settings', icon:'⚙️', label:'Settings' },
];

function Shell() {
  const { theme: T } = useTheme();
  const [tab, setTab] = useState('home');

  const screens = {
    home:     <HomeScreen />,
    monthly:  <MonthlyScreen />,
    qibla:    <QiblaScreen />,
    settings: <SettingsScreen />,
  };

  const now = new Date();
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;

  /* ── Responsive layout ──
     On desktop: centered phone frame
     On mobile:  full screen app
  */
  const isMobile = window.innerWidth <= 430;

  const phoneStyle = isMobile ? {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    background: T.bg,
  } : {
    width: 390, height: 844,
    borderRadius: 50, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 50px 150px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.09)',
    background: T.bg,
    position: 'relative',
    flexShrink: 0,
  };

  return (
    <div style={{
      minHeight: '100vh',
      minWidth: '100vw',
      background: isMobile ? T.bg : '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'flex-start' : 'center',
      padding: isMobile ? 0 : '32px 0',
    }}>
      {!isMobile && (
        <div style={{ marginBottom:20, fontFamily:"'DM Sans',system-ui,sans-serif", fontSize:13, color:'rgba(255,255,255,0.28)', letterSpacing:'0.5px' }}>
          SALAT — Prayer Times & Qibla
        </div>
      )}

      <div style={phoneStyle}>
        {/* Status bar */}
        <div style={{
          background: T.bg, padding: isMobile ? '48px 24px 8px' : '14px 26px 8px',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0,
          borderBottom: `1px solid ${T.border}`,
        }}>
          <span style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:"'DM Sans',system-ui,sans-serif" }}>
            {timeStr}
          </span>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ fontSize:11, color:T.textMuted }}>●●●●</span>
            <span style={{ fontSize:13, color:T.text }}>🔋</span>
          </div>
        </div>

        {/* Screen */}
        <div key={tab} style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
          {screens[tab]}
        </div>

        {/* Tab bar */}
        <div style={{
          display:'flex', borderTop:`1px solid ${T.border}`, background:T.bg,
          paddingBottom: isMobile ? 24 : 12, paddingTop:6, flexShrink:0,
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              gap:4, padding:'6px 0', background:'none', border:'none',
              cursor:'pointer', fontFamily:"'DM Sans',system-ui,sans-serif",
              transition:'transform .12s',
            }}
              onMouseDown={e => e.currentTarget.style.transform='scale(.9)'}
              onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
              <span style={{ fontSize:22, opacity: tab===t.id ? 1 : .38, transition:'opacity .2s' }}>{t.icon}</span>
              <span style={{ fontSize:10, fontWeight:600, letterSpacing:'.4px', color: tab===t.id ? T.accent : T.textMuted }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {!isMobile && (
        <div style={{ marginTop:18, fontFamily:"'DM Sans',system-ui,sans-serif", fontSize:12, color:'rgba(255,255,255,0.18)', textAlign:'center', lineHeight:'20px' }}>
          Live prayer times · AlAdhan API · Qibla compass · Dark & light mode
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </ThemeProvider>
  );
}
