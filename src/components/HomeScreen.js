import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useCountdown } from '../hooks/useCountdown';
import { fetchPrayerTimes } from '../services/prayerApi';
import { PRAYER_NAMES, PRAYER_ICONS, fmt12, fmtCountdown, getTodayDateStr, timeToSec } from '../utils/prayerUtils';
import LocationModal from './LocationModal';
import { reverseGeocode } from '../services/prayerApi';

export default function HomeScreen() {
  const { theme: T } = useTheme();
  const { prayerTimes, location, settings, isLoading, error, dispatch } = useApp();
  const { nextPrayer, secondsUntil } = useCountdown(prayerTimes);

  const [showModal,        setShowModal]        = useState(false);
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [detecting,        setDetecting]        = useState(false);

  const loadPrayers = useCallback(async (loc, method) => {
    if (!loc) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR',   payload: null });
    try {
      const times = await fetchPrayerTimes(loc.latitude, loc.longitude, getTodayDateStr(), method);
      dispatch({ type: 'SET_PRAYER_TIMES', payload: times });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  useEffect(() => {
    if (location) loadPrayers(location, settings.calculationMethod);
  }, [location, settings.calculationMethod, loadPrayers]);

  // Auto-detect on first visit
  useEffect(() => {
    if (!location) detectLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detectLocation = async () => {
    if (!navigator.geolocation) { setDetectedLocation(null); setShowModal(true); return; }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const geo = await reverseGeocode(latitude, longitude);
          setDetectedLocation({ latitude, longitude, ...geo });
          setShowModal(true);
        } catch { setDetectedLocation(null); setShowModal(true); }
        finally { setDetecting(false); }
      },
      () => { setDetectedLocation(null); setShowModal(true); setDetecting(false); }
    );
  };

  const handleLocationConfirm = (loc) => {
    dispatch({ type: 'SET_LOCATION', payload: loc });
    setShowModal(false);
  };

  const now = new Date();
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const todayStr = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

  return (
    <div style={{ padding:'22px 18px 24px', background:T.bg, minHeight:'100%', overflowY:'auto' }}>
      {showModal && (
        <LocationModal
          detected={detectedLocation}
          onConfirm={handleLocationConfirm}
          onClose={() => setShowModal(false)}
          theme={T}
        />
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:26, animation:'fadeUp .4s ease both' }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1.2px', textTransform:'uppercase', color:T.textMuted, marginBottom:5 }}>
            {todayStr}
          </div>
          <button onClick={detectLocation} style={{
            display:'flex', alignItems:'center', gap:6, background:'none', border:'none', padding:0, cursor:'pointer',
          }}>
            <span style={{ fontSize:26, fontWeight:800, color:T.text, letterSpacing:'-0.5px' }}>
              {location ? location.city : 'Set Location'}
            </span>
            <span style={{ fontSize:17 }}>{detecting ? '⏳' : '📍'}</span>
          </button>
          {location?.country && (
            <div style={{ fontSize:13, color:T.textMuted, marginTop:3 }}>{location.country}</div>
          )}
        </div>
        <button onClick={() => loadPrayers(location, settings.calculationMethod)}
          disabled={!location || isLoading}
          style={{
            padding:'8px 14px', borderRadius:100, border:`1px solid ${T.border}`,
            background:'none', color:T.textMuted, fontSize:13, fontWeight:600, cursor:'pointer',
          }}>
          {isLoading ? '⏳' : '↻ Refresh'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding:'14px 16px', borderRadius:13, border:'1px solid rgba(255,80,80,0.3)',
          background:'rgba(255,80,80,0.08)', marginBottom:16, fontSize:14, color:'#FF6B6B',
          animation:'fadeUp .3s ease both',
        }}>
          ⚠️ {error}
          <button onClick={() => loadPrayers(location, settings.calculationMethod)} style={{
            marginLeft:10, color:T.accent, background:'none', border:'none', fontWeight:700, cursor:'pointer', fontSize:14,
          }}>Retry</button>
        </div>
      )}

      {/* No location */}
      {!location && !isLoading && (
        <div style={{ textAlign:'center', paddingTop:60, animation:'fadeUp .4s ease both' }}>
          <div style={{ fontSize:60, marginBottom:16 }}>🕌</div>
          <div style={{ fontSize:22, fontWeight:700, color:T.text, marginBottom:10 }}>Set Your Location</div>
          <div style={{ fontSize:15, color:T.textMuted, lineHeight:1.6, maxWidth:280, margin:'0 auto 28px' }}>
            We need your location to show accurate prayer times for your city.
          </div>
          <button onClick={detectLocation} style={{
            padding:'14px 32px', borderRadius:14, background:T.accent,
            color:T.isDark?'#0A0F2C':'#fff', fontSize:16, fontWeight:700,
            border:'none', cursor:'pointer',
          }}>
            Detect My Location
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && !prayerTimes && (
        <div style={{ animation:'fadeUp .4s ease both' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{
              height:58, borderRadius:16, marginBottom:9,
              background:T.card, border:`1px solid ${T.border}`,
              overflow:'hidden',
            }}>
              <div style={{
                height:'100%', width:'100%',
                background:`linear-gradient(90deg, transparent 25%, ${T.border} 50%, transparent 75%)`,
                backgroundSize:'200% 100%',
                animation:'shimmer 1.5s infinite',
              }}/>
            </div>
          ))}
        </div>
      )}

      {/* Countdown */}
      {prayerTimes && nextPrayer && (
        <>
          <div style={{
            background:T.bgSecondary, border:`1px solid ${T.border}`, borderRadius:22,
            padding:'22px 20px 20px', textAlign:'center', marginBottom:22,
            position:'relative', overflow:'hidden',
            animation:'fadeUp .4s .05s ease both',
          }}>
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:T.accent, opacity:.65, borderRadius:2 }}/>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:T.textMuted, marginBottom:8 }}>
              Time until {nextPrayer}
            </div>
            <div style={{ fontSize:52, fontWeight:800, color:T.text, letterSpacing:'4px', lineHeight:1, fontFamily:"'DM Mono', 'Courier New', monospace", fontVariantNumeric:'tabular-nums' }}>
              {fmtCountdown(secondsUntil)}
            </div>
            <div style={{ fontSize:13, color:T.textMuted, marginTop:9 }}>
              {PRAYER_ICONS[nextPrayer]} {nextPrayer} at {fmt12(prayerTimes[nextPrayer])}
            </div>
          </div>

          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:T.textMuted, marginBottom:12, animation:'fadeUp .4s .1s ease both' }}>
            Today's Prayers
          </div>

          {PRAYER_NAMES.map((name, i) => {
            const isNext   = name === nextPrayer;
            const isPassed = timeToSec(prayerTimes[name]) < nowSec && !isNext;
            return (
              <div key={name} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'15px 18px', borderRadius:17, marginBottom:9,
                border:'1px solid',
                background: isNext ? T.accent : T.card,
                borderColor: isNext ? T.accent : T.border,
                opacity: isPassed ? .42 : 1,
                transition:'all .3s',
                animation:`fadeUp .4s ${.12 + i * .05}s ease both`,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <span style={{ fontSize:21, width:28, textAlign:'center' }}>{PRAYER_ICONS[name]}</span>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color: isNext ? (T.isDark?'#0A0F2C':'#fff') : T.text }}>
                      {name}
                    </div>
                    {isNext && (
                      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:T.isDark?'rgba(10,15,44,.6)':'rgba(255,255,255,.6)', marginTop:2 }}>
                        Next prayer
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize:16, fontWeight:700, fontFamily:"'DM Mono','Courier New',monospace", color: isNext ? (T.isDark?'#0A0F2C':'#fff') : T.textSecondary }}>
                  {fmt12(prayerTimes[name])}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
