import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function NewHomeScreen() {
  const { theme: T } = useTheme();
  return (
    <div style={{
      padding: '32px 20px',
      background: T.bg,
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: T.card, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 32 }}>🏠</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 8 }}>Hem</div>
      <div style={{ fontSize: 14, color: T.textMuted, textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
        Den här sidan är under uppbyggnad.
      </div>
    </div>
  );
}
