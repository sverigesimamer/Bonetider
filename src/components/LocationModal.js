import React, { useState } from 'react';
import { searchCity } from '../services/prayerApi';

export default function LocationModal({ detected, onConfirm, onClose, theme }) {
  const [showSearch, setShowSearch]   = useState(!detected);
  const [query,      setQuery]        = useState('');
  const [results,    setResults]      = useState([]);
  const [searching,  setSearching]    = useState(false);
  const [searchErr,  setSearchErr]    = useState('');

  const T = theme;

  const doSearch = async () => {
    if (!query.trim()) return;
    setSearching(true); setSearchErr('');
    try {
      const r = await searchCity(query);
      setResults(r);
      if (r.length === 0) setSearchErr('No cities found. Try a different name.');
    } catch (e) {
      setSearchErr(e.message);
    } finally { setSearching(false); }
  };

  const overlay = {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.65)',
    display:'flex', alignItems:'center', justifyContent:'center',
    zIndex:1000, padding:'24px',
  };
  const card = {
    background:T.card, borderRadius:22, padding:'28px 24px',
    border:`1px solid ${T.border}`, width:'100%', maxWidth:420,
    maxHeight:'80vh', overflowY:'auto',
  };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div style={card}>
        <h2 style={{ fontSize:20, fontWeight:800, color:T.text, marginBottom:18, textAlign:'center' }}>
          📍 Your Location
        </h2>

        {!showSearch && detected && (
          <>
            <p style={{ color:T.textMuted, textAlign:'center', marginBottom:6, fontSize:15 }}>
              We found your location as
            </p>
            <p style={{ color:T.accent, textAlign:'center', fontSize:24, fontWeight:800, marginBottom:20 }}>
              {detected.city}{detected.country ? `, ${detected.country}` : ''}
            </p>
            <p style={{ color:T.textMuted, textAlign:'center', marginBottom:22, fontSize:14 }}>
              Show prayer times for this location?
            </p>
            <button onClick={() => onConfirm(detected)} style={{
              width:'100%', padding:'14px', borderRadius:13,
              background:T.accent, color:T.isDark?'#0A0F2C':'#fff',
              fontSize:16, fontWeight:700, marginBottom:10, border:'none', cursor:'pointer',
            }}>
              Yes, use {detected.city}
            </button>
            <button onClick={() => setShowSearch(true)} style={{
              width:'100%', padding:'13px', borderRadius:13,
              background:'none', color:T.textMuted, fontSize:15, fontWeight:500,
              border:`1px solid ${T.border}`, cursor:'pointer',
            }}>
              Choose a different city
            </button>
          </>
        )}

        {showSearch && (
          <>
            {detected && (
              <button onClick={() => setShowSearch(false)} style={{
                background:'none', border:'none', color:T.textMuted,
                fontSize:13, cursor:'pointer', marginBottom:14, display:'flex', alignItems:'center', gap:4,
              }}>← Back
              </button>
            )}
            <p style={{ color:T.textMuted, fontSize:14, marginBottom:12 }}>Search for your city:</p>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                placeholder="e.g. Istanbul, Cairo…"
                autoFocus
                style={{
                  flex:1, padding:'12px 14px', borderRadius:11,
                  border:`1px solid ${T.border}`, background:T.bgSecondary,
                  color:T.text, fontSize:15,
                }}
              />
              <button onClick={doSearch} style={{
                padding:'12px 18px', borderRadius:11,
                background:T.accent, color:T.isDark?'#0A0F2C':'#fff',
                fontSize:14, fontWeight:700, border:'none', cursor:'pointer',
              }}>
                {searching ? '…' : '🔍'}
              </button>
            </div>
            {searchErr && <p style={{ color:T.error, fontSize:13, marginBottom:8 }}>{searchErr}</p>}
            <div style={{ maxHeight:260, overflowY:'auto' }}>
              {results.map((r, i) => (
                <button key={i} onClick={() => onConfirm(r)} style={{
                  display:'block', width:'100%', textAlign:'left',
                  padding:'12px 4px', background:'none', border:'none',
                  borderBottom:`1px solid ${T.border}`, cursor:'pointer',
                }}>
                  <div style={{ fontSize:15, fontWeight:600, color:T.text }}>
                    {r.city}{r.country ? `, ${r.country}` : ''}
                  </div>
                  <div style={{ fontSize:12, color:T.textMuted, marginTop:2 }}>
                    {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
