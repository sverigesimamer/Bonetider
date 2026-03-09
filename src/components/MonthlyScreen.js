import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { fetchMonthlyTimes } from '../services/prayerApi';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function MonthlyScreen() {
  const { theme: T } = useTheme();
  const { location, settings } = useApp();

  const today = new Date();
  const [month,   setMonth]   = useState(today.getMonth() + 1);
  const [year,    setYear]    = useState(today.getFullYear());
  const [days,    setDays]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    if (!location) return;
    setLoading(true); setError(null);
    try {
      const data = await fetchMonthlyTimes(location.latitude, location.longitude, month, year, settings.calculationMethod);
      setDays(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [location, month, year, settings.calculationMethod]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => { if (month===1) { setMonth(12); setYear(y=>y-1); } else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12) { setMonth(1); setYear(y=>y+1); } else setMonth(m=>m+1); };
  const isToday = d => d === today.getDate() && month === today.getMonth()+1 && year === today.getFullYear();

  const navBtn = (label, onClick) => (
    <button onClick={onClick} style={{
      width:38, height:38, borderRadius:19, border:`1px solid ${T.border}`,
      background:'none', color:T.accent, fontSize:22, cursor:'pointer',
      display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1,
    }}>{label}</button>
  );

  return (
    <div style={{ background:T.bg, minHeight:'100%', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ padding:'22px 18px 14px', borderBottom:`1px solid ${T.border}`, flexShrink:0, animation:'fadeUp .4s ease both' }}>
        <div style={{ fontSize:26, fontWeight:800, color:T.text, letterSpacing:'-0.5px', marginBottom:14 }}>Monthly Times</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {navBtn('‹', prevMonth)}
          <span style={{ fontSize:17, fontWeight:700, color:T.text }}>{MONTHS[month-1]} {year}</span>
          {navBtn('›', nextMonth)}
        </div>
      </div>

      {/* No location */}
      {!location && (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 32px' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:14 }}>📅</div>
            <div style={{ fontSize:18, fontWeight:700, color:T.text, marginBottom:8 }}>No Location Set</div>
            <div style={{ fontSize:14, color:T.textMuted, lineHeight:1.6 }}>Set your location on the Home tab to view monthly prayer times.</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:32, height:32, borderRadius:16, border:`3px solid ${T.border}`, borderTopColor:T.accent, animation:'spin .8s linear infinite' }}/>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ margin:'20px 18px', padding:'14px', borderRadius:13, border:'1px solid rgba(255,80,80,0.3)', background:'rgba(255,80,80,0.08)', color:'#FF6B6B', fontSize:14 }}>
          ⚠️ {error}
          <button onClick={load} style={{ marginLeft:10, color:T.accent, background:'none', border:'none', fontWeight:700, cursor:'pointer' }}>Retry</button>
        </div>
      )}

      {/* List */}
      {!loading && !error && days.length > 0 && (
        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 40px' }}>
          {days.map((d, i) => {
            const ht = isToday(d.gregorianDay);
            return (
              <div key={d.gregorianDay} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'11px 13px', borderRadius:14, border:'1px solid',
                marginBottom:7,
                background:ht ? T.accent : T.card,
                borderColor:ht ? T.accent : T.border,
                animation:`fadeUp .35s ${i*.015}s ease both`,
              }}>
                <div style={{ width:34, textAlign:'center', flexShrink:0 }}>
                  <div style={{ fontSize:19, fontWeight:800, color:ht?(T.isDark?'#0A0F2C':'#fff'):T.text, lineHeight:1 }}>{d.gregorianDay}</div>
                  {ht && <div style={{ fontSize:8, fontWeight:700, color:T.isDark?'rgba(10,15,44,.6)':'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:.5, marginTop:2 }}>Today</div>}
                </div>
                <div style={{ flex:1, display:'flex', justifyContent:'space-between' }}>
                  {['Fajr','Dhuhr','Asr','Maghrib','Isha'].map(p => (
                    <div key={p} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:8, fontWeight:700, textTransform:'uppercase', letterSpacing:.8, color:ht?(T.isDark?'rgba(10,15,44,.55)':'rgba(255,255,255,.55)'):T.textMuted, marginBottom:3 }}>
                        {p.slice(0,3)}
                      </div>
                      <div style={{ fontSize:10, fontWeight:600, fontFamily:"'DM Mono','Courier New',monospace", color:ht?(T.isDark?'#0A0F2C':'#fff'):T.text }}>
                        {d.timings[p]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
