import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useQibla } from '../hooks/useQibla';
import { reverseGeocode } from '../services/prayerApi';
import CompassSVG from './CompassSVG';
import SvgIcon from './SvgIcon';

export default function QiblaScreen() {
  const { theme: T } = useTheme();
  const { location, dispatch } = useApp();
  const {
    qiblaDir, heading, alignDelta, isAligned,
    compassAvail, loading, error, needsPermission, requestPermission,
  } = useQibla(location);

  const [gpsState, setGpsState] = useState('idle'); // 'idle' | 'loading' | 'denied' | 'error'

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) { setGpsState('error'); return; }
    setGpsState('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const geo = await reverseGeocode(latitude, longitude);
          dispatch({ type: 'SET_LOCATION', payload: { latitude, longitude, ...geo } });
          localStorage.setItem('gps-prompt-shown', 'done');
          setGpsState('idle');
        } catch {
          // Kunde inte reverse-geocoda, sätt ändå koordinaterna
          dispatch({ type: 'SET_LOCATION', payload: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, city: 'Okänd plats', country: '' } });
          setGpsState('idle');
        }
      },
      (err) => {
        setGpsState(err.code === 1 ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, [dispatch]);

  const compassSize = Math.min(window.innerWidth - 32, 320);

  const getHint = () => {
    if (!compassAvail || qiblaDir == null) return null;
    if (isAligned) return null;
    let diff = qiblaDir - ((heading % 360 + 360) % 360);
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    if (diff > 0) return 'Rotera åt höger för att rikta dig mot Qibla.';
    return 'Rotera åt vänster för att rikta dig mot Qibla.';
  };

  const hint = getHint();

  return (
    <div style={{ padding:'16px 16px 24px', background:T.bg, minHeight:'100%', display:'flex', flexDirection:'column', alignItems:'center', fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* No location — GPS request */}
      {!location && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', paddingTop:40, width:'100%', maxWidth:320 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🧭</div>
          <div style={{ fontSize:20, fontWeight:800, color:T.text, marginBottom:8 }}>Hitta Qibla</div>
          <div style={{ fontSize:14, color:T.textMuted, lineHeight:1.65, marginBottom:28 }}>
            Appen behöver din plats för att beräkna riktningen mot Mecka.
          </div>

          {gpsState === 'idle' && (
            <button onClick={requestLocation} style={{
              width:'100%', padding:'15px', borderRadius:14,
              background:T.accent, color:'#fff',
              fontSize:15, fontWeight:700, border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              boxShadow:`0 4px 16px ${T.accent}44`,
              WebkitTapHighlightColor:'transparent',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/><circle cx="12" cy="12" r="8" strokeDasharray="2 3"/>
              </svg>
              Använd min plats
            </button>
          )}

          {gpsState === 'loading' && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
              <div style={{ width:36, height:36, borderRadius:18, border:`3px solid ${T.border}`, borderTopColor:T.accent, animation:'spin .8s linear infinite' }}/>
              <span style={{ fontSize:13, color:T.textMuted }}>Hämtar din position…</span>
            </div>
          )}

          {gpsState === 'denied' && (
            <div style={{ width:'100%' }}>
              <div style={{ background:'#ef444418', border:'1px solid #ef444433', borderRadius:12, padding:'14px', marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#ef4444', marginBottom:4 }}>Platstillstånd nekades</div>
                <div style={{ fontSize:12, color:'#ef4444', lineHeight:1.6 }}>
                  Gå till telefonens inställningar → Safari/Appen → Plats → Tillåt.
                </div>
              </div>
              <button onClick={requestLocation} style={{
                width:'100%', padding:'13px', borderRadius:12,
                background:T.card, color:T.text, border:`1px solid ${T.border}`,
                fontSize:14, fontWeight:600, cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
              }}>Försök igen</button>
            </div>
          )}

          {gpsState === 'error' && (
            <div style={{ width:'100%' }}>
              <div style={{ background:'#f59e0b18', border:'1px solid #f59e0b33', borderRadius:12, padding:'14px', marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#f59e0b', marginBottom:4 }}>Kunde inte hämta plats</div>
                <div style={{ fontSize:12, color:'#f59e0b', lineHeight:1.6 }}>
                  Kontrollera att GPS är aktiverat och försök igen.
                </div>
              </div>
              <button onClick={requestLocation} style={{
                width:'100%', padding:'13px', borderRadius:12,
                background:T.accent, color:'#fff', border:'none',
                fontSize:14, fontWeight:700, cursor:'pointer',
                WebkitTapHighlightColor:'transparent',
              }}>Försök igen</button>
            </div>
          )}

          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {location && (
        <>
          {/* Permission prompt */}
          {needsPermission && (
            <div style={{
              width:'100%', marginBottom:16,
              background:T.card, border:`1px solid ${T.border}`,
              borderRadius:14, padding:'16px',
            }}>
              <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:6 }}>🧭 Kompass-åtkomst</div>
              <div style={{ fontSize:13, color:T.textMuted, lineHeight:1.5, marginBottom:12 }}>
                För att live-kompassen ska fungera behöver appen åtkomst till enhetens rörelsesensorer. Vi frågar bara en gång.
              </div>
              <button onClick={requestPermission} style={{
                width:'100%', padding:'12px', borderRadius:11,
                background:T.accent, color:'#fff',
                fontSize:14, fontWeight:700, border:'none', cursor:'pointer',
              }}>Tillåt kompass</button>
            </div>
          )}

          {loading && (
            <div style={{ marginBottom:12, display:'flex', alignItems:'center', gap:10, color:T.textMuted }}>
              <div style={{ width:16, height:16, borderRadius:8, border:`2px solid ${T.border}`, borderTopColor:T.accent, animation:'spin .8s linear infinite' }}/>
              <span style={{ fontSize:13 }}>Hämtar Qibla-riktning…</span>
            </div>
          )}

          {/* Compass */}
          <div style={{ width:compassSize, height:compassSize, flexShrink:0 }}>
            <CompassSVG
              heading={heading}
              qiblaDir={qiblaDir}
              isAligned={isAligned}
              alignDelta={alignDelta}
              theme={T}
              size={compassSize}
            />
          </div>

          {/* Big heading + direction text */}
          <div style={{ textAlign:'center', marginTop:24, marginBottom:4 }}>
            <div style={{ fontSize:52, fontWeight:800, color:T.text, lineHeight:1, letterSpacing:'-1px' }}>
              {Math.round(((heading % 360) + 360) % 360)}°{' '}
              {(() => {
                const h = Math.round(((heading % 360) + 360) % 360);
                return ['N','NÖ','Ö','SÖ','S','SV','V','NV'][Math.round(h/45)%8];
              })()}
            </div>
            <div style={{ fontSize:13, color:T.textMuted, marginTop:6 }}>
              Qiblas riktning är{' '}
              <strong style={{ color:T.textSecondary }}>
                {qiblaDir != null ? `${Math.round(qiblaDir)} °` : '—'}
              </strong>
            </div>
          </div>

          {/* Aligned or rotation hint */}
          <div style={{ minHeight:32, textAlign:'center', marginTop:6 }}>
            {isAligned ? (
              <div style={{ fontSize:17, fontWeight:700, color:T.success }}>
                Du är vänd mot rätt håll.
              </div>
            ) : hint ? (
              <div style={{ fontSize:15, fontWeight:500, color:T.textSecondary }}>
                {hint}
              </div>
            ) : null}
          </div>

          {/* Location */}
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:16, opacity:.55 }}>
            <SvgIcon name="moon" size={13} color={T.textMuted} />
            <span style={{ fontSize:12, color:T.textMuted }}>
              {location.city}{location.country ? `, ${location.country}` : ''}
            </span>
          </div>

          {/* Live indicator */}
          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:8 }}>
            <div style={{ width:6, height:6, borderRadius:3, background: compassAvail ? '#4CAF82' : T.textMuted }}/>
            <span style={{ fontSize:11, color:T.textMuted }}>
              {compassAvail ? 'Live-kompass aktiv' : 'Kompass ej tillgänglig'}
            </span>
          </div>

          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </>
      )}
    </div>
  );
}

