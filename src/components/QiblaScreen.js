import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useQibla } from '../hooks/useQibla';
import CompassSVG from './CompassSVG';

export default function QiblaScreen() {
  const { theme: T } = useTheme();
  const { location } = useApp();
  const { qiblaDir, heading, needleAngle, alignDelta, isAligned, compassAvail, loading, error } = useQibla(location);

  // iOS permission prompt for DeviceOrientationEvent
  const [needsPermission, setNeedsPermission] = useState(false);
  useEffect(() => {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      setNeedsPermission(true);
    }
  }, []);

  const requestCompassPermission = async () => {
    try {
      await DeviceOrientationEvent.requestPermission();
      setNeedsPermission(false);
      window.location.reload();
    } catch (e) {
      alert('Compass permission denied. Qibla direction will still be shown without live compass.');
    }
  };

  // Animated needle (use animNeedle for smooth CSS-less rotation)
  const animRef   = useRef(needleAngle);
  const [animVal, setAnimVal] = useState(needleAngle);
  useEffect(() => {
    let frame;
    const target = needleAngle;
    const animate = () => {
      let diff = target - animRef.current;
      if (diff > 180)  diff -= 360;
      if (diff < -180) diff += 360;
      if (Math.abs(diff) < 0.3) { animRef.current = target; setAnimVal(target); return; }
      animRef.current += diff * 0.12;
      setAnimVal(animRef.current);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [needleAngle]);

  const compassSize = Math.min(window.innerWidth - 48, 300);

  return (
    <div style={{ padding:'22px 18px 28px', background:T.bg, minHeight:'100%', overflowY:'auto', display:'flex', flexDirection:'column', alignItems:'center' }}>
      {/* Header */}
      <div style={{ width:'100%', marginBottom:22, animation:'fadeUp .4s ease both' }}>
        <div style={{ fontSize:26, fontWeight:800, color:T.text, letterSpacing:'-0.5px' }}>Qibla Finder</div>
        <div style={{ fontSize:13, color:T.textMuted, marginTop:3 }}>Direction toward the Kaaba · AlAdhan API</div>
      </div>

      {/* No location */}
      {!location && (
        <div style={{ flex:1, textAlign:'center', paddingTop:40, animation:'fadeUp .4s ease both' }}>
          <div style={{ fontSize:52, marginBottom:14 }}>📍</div>
          <div style={{ fontSize:20, fontWeight:700, color:T.text, marginBottom:10 }}>Location Required</div>
          <div style={{ fontSize:14, color:T.textMuted, lineHeight:1.6, maxWidth:280, margin:'0 auto' }}>
            Set your location on the Home tab to find the Qibla direction.
          </div>
        </div>
      )}

      {location && (
        <>
          {/* iOS permission button */}
          {needsPermission && (
            <div style={{ width:'100%', marginBottom:16, animation:'fadeUp .3s ease both' }}>
              <button onClick={requestCompassPermission} style={{
                width:'100%', padding:'13px', borderRadius:13,
                background:T.accent, color:T.isDark?'#0A0F2C':'#fff',
                fontSize:15, fontWeight:700, border:'none', cursor:'pointer',
              }}>
                🧭 Enable Live Compass
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ marginBottom:16, display:'flex', alignItems:'center', gap:10, color:T.textMuted }}>
              <div style={{ width:18, height:18, borderRadius:9, border:`2px solid ${T.border}`, borderTopColor:T.accent, animation:'spin .8s linear infinite' }}/>
              <span style={{ fontSize:14 }}>Fetching Qibla direction…</span>
            </div>
          )}

          {/* Compass */}
          <div style={{
            filter:`drop-shadow(0 10px 40px ${isAligned ? 'rgba(76,175,130,.5)' : T.accentGlow})`,
            marginBottom:18, animation:'fadeUp .4s .08s ease both',
            transition:'filter .6s',
          }}>
            <CompassSVG animNeedle={animVal} isAligned={isAligned} theme={T} size={compassSize} />
          </div>

          {/* Aligned badge */}
          <div style={{ height:44, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
            {isAligned ? (
              <div style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'9px 22px', borderRadius:100,
                background:'rgba(76,175,130,.12)', border:'1.5px solid #4CAF82',
                animation:'pop .3s cubic-bezier(.34,1.56,.64,1) both',
              }}>
                <span style={{ fontSize:15 }}>✅</span>
                <span style={{ fontSize:14, fontWeight:700, color:'#4CAF82', letterSpacing:.3 }}>You are facing the Qibla</span>
              </div>
            ) : (
              <div style={{ fontSize:13, color:T.textMuted, fontStyle:'italic', textAlign:'center' }}>
                {qiblaDir !== null ? `Rotate to face ${qiblaDir.toFixed(1)}° from North · ${alignDelta.toFixed(0)}° off` : 'Calculating…'}
              </div>
            )}
          </div>

          {/* Info cards */}
          <div style={{ display:'flex', gap:10, width:'100%', marginBottom:12, animation:'fadeUp .4s .15s ease both' }}>
            {[
              { label:'QIBLA',   val: qiblaDir   !== null ? `${qiblaDir.toFixed(1)}°`   : '—', sub:'from North',    col:T.accent },
              { label:'HEADING', val: compassAvail ? `${heading.toFixed(1)}°` : '—',           sub:'device heading', col:T.text },
              { label:'OFF BY',  val: compassAvail && qiblaDir !== null ? `${alignDelta.toFixed(0)}°` : '—', sub:isAligned?'aligned!':'rotate', col:isAligned?'#4CAF82':alignDelta<20?T.accent:T.text },
            ].map(({ label, val, sub, col }) => (
              <div key={label} style={{
                flex:1, background:T.card, border:`1px solid ${T.border}`,
                borderRadius:15, padding:'13px 8px', textAlign:'center',
              }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'1.2px', color:T.textMuted, marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:19, fontWeight:800, color:col, fontFamily:"'DM Mono','Courier New',monospace" }}>{val}</div>
                <div style={{ fontSize:10, color:T.textMuted, marginTop:3 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Status bar */}
          <div style={{
            width:'100%', background:T.card, border:`1px solid ${T.border}`,
            borderRadius:11, padding:'10px 14px', display:'flex', alignItems:'center',
            gap:8, marginBottom:10, animation:'fadeUp .4s .2s ease both',
          }}>
            <div style={{ width:8, height:8, borderRadius:4, background: compassAvail ? '#4CAF82' : T.textMuted, flexShrink:0 }}/>
            <span style={{ fontSize:12, color:T.textMuted, fontWeight:500 }}>
              {compassAvail ? 'Live compass active · AlAdhan API' : 'Compass unavailable · Showing calculated direction'}
            </span>
          </div>

          {/* API error */}
          {error && (
            <div style={{
              width:'100%', borderRadius:12, padding:'13px 14px', border:'1px solid rgba(240,160,0,.35)',
              background:'rgba(240,160,0,.08)', marginBottom:10, fontSize:13, color:'#F0A500', lineHeight:1.5, textAlign:'center',
            }}>
              ⚠️ Using offline calculation (API unavailable)
            </div>
          )}

          {/* No sensor */}
          {!compassAvail && (
            <div style={{
              width:'100%', background:T.card, border:`1px solid ${T.border}`,
              borderRadius:12, padding:'13px 14px', fontSize:13, color:T.textMuted, lineHeight:1.6, textAlign:'center',
            }}>
              📱 Compass requires a mobile device with motion sensors.<br/>
              The arrow shows your calculated Qibla direction.
            </div>
          )}

          {/* Location label */}
          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:12, fontSize:13, color:T.textMuted }}>
            <span>📍</span>
            <span>{location.city}{location.country ? `, ${location.country}` : ''}</span>
          </div>
        </>
      )}
    </div>
  );
}
