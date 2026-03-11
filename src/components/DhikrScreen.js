import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import rawData from '../data/dhikr.json';

// ─────────────────────────────────────────────────────────────
// DATA: Group raw categories into 9 visual super-groups
// ─────────────────────────────────────────────────────────────
const RAW_CAT_MAP = {};
rawData.kategorier.forEach(c => { RAW_CAT_MAP[c.kategori] = c; });

function mergeCats(names) {
  const undersidor = [];
  names.forEach(name => {
    const c = RAW_CAT_MAP[name];
    if (!c) return;
    c.undersidor.forEach(us => {
      undersidor.push({
        ...us,
        _kategorinamn: name,
        dhikr_poster: us.dhikr_poster.map(d => ({
          ...d,
          _undersida: us.titel,
          _kategori: name,
        })),
      });
    });
  });
  return undersidor;
}

const GRUPPER = [
  {
    id: 'morgon',
    namn: 'Morgon & Kväll',
    gradient: ['#1a3a2a', '#2d6a4f'],
    emoji: '🌅',
    undersidor: mergeCats(['Morgon och kväll']),
  },
  {
    id: 'bonen',
    namn: 'Bönen',
    gradient: ['#1c2f4a', '#2e5090'],
    emoji: '🧎',
    undersidor: mergeCats(['Bönen', 'Moskén', 'Sittningar', 'Koranen']),
  },
  {
    id: 'dagligt',
    namn: 'Dagligt liv',
    gradient: ['#2d4a1e', '#4a7c3f'],
    emoji: '🏠',
    undersidor: mergeCats(['Hemmet', 'Mat och dryck', 'Kläder', 'Toalett', 'Hälsningsrelaterat', 'Nysning', 'Glädje och ilska', 'Djurrelaterat']),
  },
  {
    id: 'svarigheter',
    namn: 'Svårigheter & Skydd',
    gradient: ['#3a1c2a', '#6b2d4a'],
    emoji: '🛡️',
    undersidor: mergeCats(['Svårigheter och motgångar', 'Skydd', 'Synder och ånger']),
  },
  {
    id: 'somn',
    namn: 'Sömn',
    gradient: ['#1a1a3a', '#2d2d6a'],
    emoji: '😴',
    undersidor: mergeCats(['Sömn']),
  },
  {
    id: 'resa',
    namn: 'Resa',
    gradient: ['#1a2e3a', '#2d5070'],
    emoji: '✈️',
    undersidor: mergeCats(['Resa']),
  },
  {
    id: 'pilgrim',
    namn: 'Pilgrimsfärd',
    gradient: ['#2a1a10', '#6b3d1a'],
    emoji: '🕋',
    undersidor: mergeCats(['Pilgrimsfärd']),
  },
  {
    id: 'begravning',
    namn: 'Sjukdom & Begravning',
    gradient: ['#2a2a2a', '#4a4a4a'],
    emoji: '🕊️',
    undersidor: mergeCats(['Begravning & dödsrelaterat', 'Vid besök av den sjuke']),
  },
  {
    id: 'ovrigt',
    namn: 'Familj & Övrigt',
    gradient: ['#2a1a3a', '#4a2d6a'],
    emoji: '🤲',
    undersidor: mergeCats(['Äktenskap', 'Skulder', 'Övrigt', 'Ramadan och fasta', 'Väder']),
  },
];

// Flat list for search
const ALL_DHIKR = GRUPPER.flatMap(g =>
  g.undersidor.flatMap(us => us.dhikr_poster)
);

const STORAGE_KEY_FAV  = 'dhikr-favorites-v1';
const STORAGE_KEY_BM   = 'dhikr-bookmarks-v1';

function loadStorage(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function saveStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─────────────────────────────────────────────────────────────
// AUDIO PLAYER
// ─────────────────────────────────────────────────────────────
function AudioPlayer({ url, T }) {
  const ref = useRef(null);
  const [st, setSt] = useState({ playing: false, progress: 0, duration: 0, loading: false, err: false });
  useEffect(() => {
    setSt({ playing: false, progress: 0, duration: 0, loading: false, err: false });
    if (ref.current) { ref.current.pause(); ref.current.load(); }
  }, [url]);
  const fmt = s => (!s || isNaN(s)) ? '0:00' : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const toggle = () => {
    if (!ref.current) return;
    if (st.playing) { ref.current.pause(); setSt(s => ({...s, playing: false})); }
    else { setSt(s => ({...s, loading: true})); ref.current.play().then(() => setSt(s => ({...s, playing: true, loading: false}))).catch(() => setSt(s => ({...s, err: true, loading: false}))); }
  };
  const seek = e => {
    if (!ref.current || !st.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    ref.current.currentTime = ((e.clientX - r.left) / r.width) * st.duration;
  };
  if (!url) return null;
  return (
    <div style={{ marginTop:14, background:'rgba(255,255,255,.07)', borderRadius:12, padding:'11px 13px', display:'flex', alignItems:'center', gap:10 }}>
      <audio ref={ref} src={url} preload="none"
        onTimeUpdate={e => setSt(s => ({...s, progress: e.target.currentTime}))}
        onDurationChange={e => setSt(s => ({...s, duration: e.target.duration}))}
        onEnded={() => setSt(s => ({...s, playing: false, progress: 0}))}
        onError={() => setSt(s => ({...s, err: true, loading: false, playing: false}))}
      />
      <button onClick={toggle} disabled={st.err} style={{
        width:36, height:36, borderRadius:'50%', border:'none', flexShrink:0,
        background: st.err ? '#c0392b' : T.accent, cursor: st.err ? 'default' : 'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        WebkitTapHighlightColor:'transparent',
      }}>
        {st.loading ? <div style={{width:12,height:12,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'dhSpin .7s linear infinite'}}/> :
         st.err ? <span style={{color:'#fff',fontSize:11}}>✕</span> :
         st.playing ? <svg width="11" height="12" viewBox="0 0 11 12" fill="#fff"><rect x="0" y="0" width="4" height="12" rx="1"/><rect x="7" y="0" width="4" height="12" rx="1"/></svg> :
         <svg width="11" height="12" viewBox="0 0 11 12" fill="#fff"><path d="M0 0L11 6L0 12Z"/></svg>}
      </button>
      <div style={{flex:1, minWidth:0}}>
        <div onClick={seek} style={{height:3, borderRadius:3, background:'rgba(255,255,255,.18)', cursor:'pointer', position:'relative', marginBottom:5}}>
          <div style={{position:'absolute',left:0,top:0,height:'100%',borderRadius:3,background:T.accent,width:st.duration?`${(st.progress/st.duration)*100}%`:'0%',transition:'width .2s linear'}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(255,255,255,.5)',fontFamily:'system-ui'}}>
          <span>{fmt(st.progress)}</span><span>{fmt(st.duration)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DHIKR DETAIL CARD
// ─────────────────────────────────────────────────────────────
function DhikrCard({ d, T, favorites, bookmarks, onToggleFav, onToggleBm }) {
  const tabs = [
    d.arabisk_text && {id:'ara', label:'عربي'},
    d.svensk_text && {id:'swe', label:'Svenska'},
    d.translitteration && {id:'tra', label:'Uttal'},
  ].filter(Boolean);
  const [tab, setTab] = useState(tabs[0]?.id || 'ara');
  useEffect(() => { if (tabs.length) setTab(tabs[0].id); }, [d.titel]);

  const isFav = favorites.includes(d.url || d.titel);
  const isBm  = bookmarks.includes(d.url || d.titel);
  const key   = d.url || d.titel;

  return (
    <div style={{marginBottom:16}}>
      {/* Title + actions */}
      <div style={{display:'flex', alignItems:'flex-start', gap:10, marginBottom:12}}>
        <div style={{flex:1}}>
          <div style={{fontSize:17, fontWeight:700, color:T.text, lineHeight:1.4, fontFamily:'system-ui'}}>{d.titel}</div>
          <div style={{fontSize:11, color:T.textMuted, marginTop:3, fontFamily:'system-ui'}}>{d._undersida}</div>
        </div>
        <button onClick={() => onToggleFav(key)} style={{background:'none',border:'none',cursor:'pointer',padding:6,WebkitTapHighlightColor:'transparent',flexShrink:0}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isFav?'#f5a623':'none'} stroke={isFav?'#f5a623':T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
        <button onClick={() => onToggleBm(key)} style={{background:'none',border:'none',cursor:'pointer',padding:6,WebkitTapHighlightColor:'transparent',flexShrink:0}}>
          <svg width="18" height="20" viewBox="0 0 24 24" fill={isBm?T.accent:'none'} stroke={isBm?T.accent:T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>

      {/* Tab pills */}
      {tabs.length > 1 && (
        <div style={{display:'flex', gap:6, marginBottom:12}}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:'5px 14px', borderRadius:20, border:'none', cursor:'pointer',
              fontSize:12, fontWeight:600, fontFamily:'system-ui',
              background: tab===t.id ? T.accent : (T.isDark?'rgba(255,255,255,.09)':'rgba(0,0,0,.07)'),
              color: tab===t.id ? '#fff' : T.textMuted,
              WebkitTapHighlightColor:'transparent',
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{background: T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:'hidden'}}>
        <div style={{padding:'18px 16px'}}>
          {tab==='ara' && d.arabisk_text && (
            <div style={{fontSize:23, lineHeight:2.2, color:T.text, textAlign:'right', direction:'rtl',
              fontFamily:'"Traditional Arabic","Scheherazade New","Amiri",serif',
              background: T.isDark?'rgba(255,255,255,.04)':'rgba(36,100,93,.04)',
              padding:'16px 14px', borderRadius:12}}>
              {d.arabisk_text}
            </div>
          )}
          {tab==='swe' && d.svensk_text && (
            <div style={{fontSize:15, lineHeight:1.85, color:T.text, fontStyle:'italic',
              fontFamily:"'Georgia',serif",
              background: T.isDark?'rgba(255,255,255,.04)':'#fdf8f4',
              padding:'16px', borderRadius:12}}>
              {d.svensk_text}
            </div>
          )}
          {tab==='tra' && d.translitteration && (
            <div style={{fontSize:14, lineHeight:1.85, color:T.text, fontFamily:'system-ui',
              background: T.isDark?'rgba(255,255,255,.04)':'#f2f7f6',
              padding:'16px', borderRadius:12}}>
              {d.translitteration}
            </div>
          )}
          {d.mp3_url && <AudioPlayer url={d.mp3_url} T={T}/>}
          {d.kallhanvisning && (
            <div style={{marginTop:12, fontSize:11, color:T.textMuted, fontFamily:'system-ui', lineHeight:1.6, paddingTop:10, borderTop:`1px solid ${T.border}`}}>
              📚 {d.kallhanvisning}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GRID CARD (category tile)
// ─────────────────────────────────────────────────────────────
function GridCard({ g, count, onPress }) {
  return (
    <button onClick={onPress} style={{
      position:'relative', borderRadius:18, overflow:'hidden', border:'none',
      cursor:'pointer', WebkitTapHighlightColor:'transparent',
      aspectRatio:'1 / 1', display:'flex', flexDirection:'column',
      alignItems:'flex-start', justifyContent:'flex-end', padding:0,
      background:`linear-gradient(135deg, ${g.gradient[0]}, ${g.gradient[1]})`,
    }}>
      {/* Decorative pattern */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:`radial-gradient(circle at 70% 30%, rgba(255,255,255,.08) 0%, transparent 60%)`,
      }}/>
      {/* Emoji */}
      <div style={{
        position:'absolute', top:12, right:12,
        fontSize:28, lineHeight:1, opacity:.9,
      }}>{g.emoji}</div>
      {/* Bottom label */}
      <div style={{
        position:'relative', width:'100%',
        background:'linear-gradient(to top, rgba(0,0,0,.72) 0%, transparent 100%)',
        padding:'24px 12px 12px',
      }}>
        <div style={{fontSize:13, fontWeight:800, color:'#fff', lineHeight:1.2, fontFamily:'system-ui', textTransform:'uppercase', letterSpacing:.5}}>
          {g.namn}
        </div>
        <div style={{fontSize:11, color:'rgba(255,255,255,.65)', marginTop:2, fontFamily:'system-ui'}}>
          {count} dhikr
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// LIST ROW (for list view)
// ─────────────────────────────────────────────────────────────
const CAT_SVG = {
  'morgon': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  'bonen':  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/><path d="M9 12h6"/><path d="M9 8h6"/><path d="M9 16h4"/></svg>,
  'dagligt':<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  'svarigheter':<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  'somn':   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  'resa':   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 1 16.5 2.5L13 6 4.8 4.2l-1.4 1.4L9 10l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.6 1.4-1.4z"/></svg>,
  'pilgrim':<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  'begravning':<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  'ovrigt': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
};

function ListRow({ g, count, onPress, T }) {
  return (
    <button onClick={onPress} style={{
      display:'flex', alignItems:'center', gap:14,
      width:'100%', background:T.card,
      border:`1px solid ${T.border}`, borderRadius:14,
      padding:'14px 16px', cursor:'pointer', textAlign:'left',
      WebkitTapHighlightColor:'transparent', marginBottom:8,
    }}>
      <div style={{
        width:44, height:44, borderRadius:12, flexShrink:0,
        background:`linear-gradient(135deg, ${g.gradient[0]}, ${g.gradient[1]})`,
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'rgba(255,255,255,.9)',
      }}>
        {CAT_SVG[g.id]}
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:15, fontWeight:700, color:T.text, fontFamily:'system-ui'}}>{g.namn}</div>
        <div style={{fontSize:11, color:T.textMuted, marginTop:2, fontFamily:'system-ui'}}>{count} dhikr</div>
      </div>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// CATEGORY DETAIL — list all undersidor + dhikr items
// ─────────────────────────────────────────────────────────────
function CatDetail({ g, onSelectDhikr, favorites, bookmarks, T }) {
  return (
    <div style={{paddingBottom:32}}>
      {g.undersidor.map((us, ui) => (
        <div key={ui}>
          <div style={{
            padding:'14px 16px 6px',
            fontSize:11, fontWeight:700, color:T.accent,
            textTransform:'uppercase', letterSpacing:1.1, fontFamily:'system-ui',
            borderBottom:`1px solid ${T.border}`, background:T.bg,
          }}>{us.titel}</div>
          {us.dhikr_poster.map((d, i) => {
            const key = d.url || d.titel;
            const isFav = favorites.includes(key);
            const isBm  = bookmarks.includes(key);
            return (
              <button key={i} onClick={() => onSelectDhikr(d)} style={{
                display:'flex', alignItems:'center', gap:12,
                width:'100%', background:'none', border:'none',
                borderBottom:`1px solid ${T.border}`,
                padding:'12px 16px', cursor:'pointer', textAlign:'left',
                WebkitTapHighlightColor:'transparent',
              }}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:14, fontWeight:600, color:T.text, lineHeight:1.4, fontFamily:'system-ui'}}>{d.titel}</div>
                  {d.arabisk_text && (
                    <div style={{fontSize:12, color:T.textMuted, marginTop:3, direction:'rtl', textAlign:'right',
                      fontFamily:'"Traditional Arabic","Scheherazade New",serif', lineHeight:1.5,
                      overflow:'hidden', display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical'}}>
                      {d.arabisk_text}
                    </div>
                  )}
                </div>
                <div style={{display:'flex', alignItems:'center', gap:5, flexShrink:0}}>
                  {isFav && <svg width="12" height="12" viewBox="0 0 24 24" fill="#f5a623"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                  {isBm  && <svg width="11" height="13" viewBox="0 0 24 24" fill={T.accent}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>}
                  {d.mp3_url && <div style={{width:6, height:6, borderRadius:'50%', background:T.accent}}/>}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FAVORITES / BOOKMARKS VIEW
// ─────────────────────────────────────────────────────────────
function SavedView({ favorites, bookmarks, onSelectDhikr, onClearFav, onClearBm, T }) {
  const favDhikr = ALL_DHIKR.filter(d => favorites.includes(d.url || d.titel));
  const bmDhikr  = ALL_DHIKR.filter(d => bookmarks.includes(d.url  || d.titel));

  const Section = ({ title, items, icon, emptyText, onClear }) => (
    <div style={{marginBottom:24}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px 8px'}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          {icon}
          <span style={{fontSize:12, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:1, fontFamily:'system-ui'}}>{title}</span>
        </div>
        {items.length > 0 && (
          <button onClick={onClear} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:T.textMuted,fontFamily:'system-ui',padding:'2px 6px'}}>
            Rensa
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div style={{padding:'20px 16px', textAlign:'center', color:T.textMuted, fontSize:13, fontFamily:'system-ui'}}>{emptyText}</div>
      ) : items.map((d, i) => (
        <button key={i} onClick={() => onSelectDhikr(d)} style={{
          display:'flex', alignItems:'center', gap:12, width:'100%',
          background:'none', border:'none', borderBottom:`1px solid ${T.border}`,
          padding:'12px 16px', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent',
        }}>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:13, fontWeight:600, color:T.text, lineHeight:1.4, fontFamily:'system-ui'}}>{d.titel}</div>
            <div style={{fontSize:11, color:T.textMuted, marginTop:2, fontFamily:'system-ui'}}>{d._kategori} · {d._undersida}</div>
          </div>
          {d.mp3_url && <div style={{width:6, height:6, borderRadius:'50%', background:T.accent, flexShrink:0}}/>}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      ))}
    </div>
  );

  return (
    <div style={{paddingBottom:32}}>
      <Section
        title="Favoriter"
        items={favDhikr}
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="#f5a623"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
        emptyText="Inga favoriter ännu — tryck ⭐ på en dhikr"
        onClear={onClearFav}
      />
      <Section
        title="Bokmärken"
        items={bmDhikr}
        icon={<svg width="14" height="16" viewBox="0 0 24 24" fill={T.accent}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>}
        emptyText="Inga bokmärken ännu — tryck 🔖 på en dhikr"
        onClear={onClearBm}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SEARCH VIEW
// ─────────────────────────────────────────────────────────────
function SearchView({ query, onSelectDhikr, onSelectGrupp, T }) {
  const q = query.toLowerCase().trim();
  const grupper = useMemo(() => !q ? [] : GRUPPER.filter(g => g.namn.toLowerCase().includes(q)), [q]);
  const dhikrs  = useMemo(() => !q ? [] : ALL_DHIKR.filter(d =>
    d.titel.toLowerCase().includes(q) ||
    (d.svensk_text || '').toLowerCase().includes(q) ||
    (d.translitteration || '').toLowerCase().includes(q) ||
    (d._undersida || '').toLowerCase().includes(q)
  ).slice(0, 60), [q]);

  if (!q) return (
    <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', gap:16}}>
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={T.isDark?'rgba(255,255,255,.15)':'rgba(0,0,0,.12)'} strokeWidth="1.5" strokeLinecap="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:16, fontWeight:700, color:T.text, fontFamily:'system-ui', marginBottom:6}}>Sök i Dhikr & Du'a</div>
        <div style={{fontSize:13, color:T.textMuted, fontFamily:'system-ui'}}>Skriv ett ord för att söka bland kategorier, titlar och texter</div>
      </div>
    </div>
  );

  if (grupper.length === 0 && dhikrs.length === 0) return (
    <div style={{padding:'48px 24px', textAlign:'center', color:T.textMuted, fontFamily:'system-ui', fontSize:14}}>
      Inga träffar för "{query}"
    </div>
  );

  return (
    <div style={{paddingBottom:32}}>
      {grupper.length > 0 && (
        <>
          <div style={{padding:'12px 16px 4px', fontSize:11, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:1, fontFamily:'system-ui'}}>Kategorier</div>
          {grupper.map(g => {
            const cnt = g.undersidor.reduce((s,us) => s+us.dhikr_poster.length, 0);
            return (
              <button key={g.id} onClick={() => onSelectGrupp(g)} style={{
                display:'flex', alignItems:'center', gap:12, width:'100%',
                background:'none', border:'none', borderBottom:`1px solid ${T.border}`,
                padding:'12px 16px', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent',
              }}>
                <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:`linear-gradient(135deg,${g.gradient[0]},${g.gradient[1]})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{g.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:'system-ui'}}>{g.namn}</div>
                  <div style={{fontSize:11,color:T.textMuted,fontFamily:'system-ui'}}>{cnt} dhikr</div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            );
          })}
        </>
      )}
      {dhikrs.length > 0 && (
        <>
          <div style={{padding:'12px 16px 4px', fontSize:11, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:1, fontFamily:'system-ui'}}>
            Dhikr ({dhikrs.length}{dhikrs.length===60?'+':''})
          </div>
          {dhikrs.map((d,i) => (
            <button key={i} onClick={() => onSelectDhikr(d)} style={{
              display:'flex', alignItems:'center', gap:12, width:'100%',
              background:'none', border:'none', borderBottom:`1px solid ${T.border}`,
              padding:'12px 16px', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent',
            }}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:T.text,lineHeight:1.4,fontFamily:'system-ui'}}>{d.titel}</div>
                <div style={{fontSize:11,color:T.textMuted,marginTop:2,fontFamily:'system-ui'}}>{d._kategori} · {d._undersida}</div>
              </div>
              {d.mp3_url && <div style={{width:6,height:6,borderRadius:'50%',background:T.accent,flexShrink:0}}/>}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id:'grid',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { id:'list',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
  { id:'saved',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { id:'search',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> },
];

export default function DhikrScreen({ onBack }) {
  const { theme: T } = useTheme();
  const [mainTab,   setMainTab]   = useState('grid');   // grid|list|saved|search
  const [view,      setView]      = useState('home');    // home|cat|dhikr
  const [selGrupp,  setSelGrupp]  = useState(null);
  const [selDhikr,  setSelDhikr]  = useState(null);
  const [searchQ,   setSearchQ]   = useState('');
  const [favorites, setFavorites] = useState(() => loadStorage(STORAGE_KEY_FAV));
  const [bookmarks, setBookmarks] = useState(() => loadStorage(STORAGE_KEY_BM));
  const bodyRef   = useRef(null);
  const searchRef = useRef(null);

  const scrollTop = () => { if (bodyRef.current) bodyRef.current.scrollTop = 0; };

  const goToCat   = useCallback(g  => { setSelGrupp(g);  setView('cat');   scrollTop(); }, []);
  const goToDhikr = useCallback(d  => { setSelDhikr(d);  setView('dhikr'); scrollTop(); }, []);

  const goBack = useCallback(() => {
    if (view === 'dhikr') { setView('cat');   setSelDhikr(null); scrollTop(); }
    else if (view === 'cat')   { setView('home');  setSelGrupp(null); scrollTop(); }
    else if (onBack) onBack();
  }, [view, onBack]);

  const switchMainTab = (id) => {
    setMainTab(id);
    setView('home');
    setSelGrupp(null);
    setSelDhikr(null);
    scrollTop();
    if (id === 'search') setTimeout(() => searchRef.current?.focus(), 100);
  };

  const toggleFav = useCallback(key => {
    setFavorites(prev => {
      const next = prev.includes(key) ? prev.filter(k => k!==key) : [...prev, key];
      saveStorage(STORAGE_KEY_FAV, next); return next;
    });
  }, []);

  const toggleBm = useCallback(key => {
    setBookmarks(prev => {
      const next = prev.includes(key) ? prev.filter(k => k!==key) : [...prev, key];
      saveStorage(STORAGE_KEY_BM, next); return next;
    });
  }, []);

  const isInSubView = view !== 'home';
  const showBackArrow = isInSubView || !!onBack;

  // Header
  let headerTitle = "Dhikr & Du'a";
  if (mainTab==='saved')  headerTitle = 'Sparade';
  if (mainTab==='search') headerTitle = 'Sök';
  if (view==='cat'   && selGrupp)  headerTitle = selGrupp.namn;
  if (view==='dhikr' && selDhikr)  headerTitle = selDhikr._kategori;

  // Counts
  const groupCount = g => g.undersidor.reduce((s,us) => s+us.dhikr_poster.length, 0);

  return (
    <div style={{height:'100%', display:'flex', flexDirection:'column', background:T.bg}}>
      <style>{`
        @keyframes dhSpin{to{transform:rotate(360deg)}}
        @keyframes dhFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{flexShrink:0, background:T.bg, borderBottom:`1px solid ${T.border}`, paddingTop:'max(16px,env(safe-area-inset-top))'}}>
        {/* Top row */}
        <div style={{display:'flex', alignItems:'center', gap:6, padding:'0 14px 10px'}}>
          {showBackArrow && (
            <button onClick={goBack} style={{background:'none',border:'none',cursor:'pointer',flexShrink:0,padding:'4px 8px 4px 0',color:T.accent,fontSize:22,lineHeight:1,WebkitTapHighlightColor:'transparent'}}>‹</button>
          )}
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:19, fontWeight:800, color:T.text, letterSpacing:'-.3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'system-ui'}}>
              {headerTitle}
            </div>
          </div>
        </div>

        {/* Tab bar (only on home) */}
        {!isInSubView && (
          <div style={{display:'flex', alignItems:'center', gap:4, padding:'0 12px 10px'}}>
            {TABS.map(t => {
              const active = mainTab === t.id;
              // Badge on saved
              const hasBadge = t.id==='saved' && (favorites.length+bookmarks.length) > 0;
              return (
                <button key={t.id} onClick={() => switchMainTab(t.id)} style={{
                  position:'relative',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  width:42, height:36, borderRadius:10, border:'none', cursor:'pointer',
                  background: active ? (T.isDark?'rgba(255,255,255,.12)':'rgba(0,0,0,.08)') : 'none',
                  color: active ? T.accent : T.textMuted,
                  WebkitTapHighlightColor:'transparent',
                }}>
                  {t.icon}
                  {hasBadge && (
                    <div style={{position:'absolute', top:4, right:5, width:7, height:7, borderRadius:'50%', background:T.accent, border:`1.5px solid ${T.bg}`}}/>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Search bar (search tab) */}
        {mainTab==='search' && !isInSubView && (
          <div style={{padding:'0 14px 10px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,background:T.isDark?'rgba(255,255,255,.09)':'rgba(0,0,0,.06)',borderRadius:12,padding:'9px 13px',border:`1px solid ${T.border}`}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.2" strokeLinecap="round" style={{flexShrink:0}}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input ref={searchRef} type="text" placeholder="Sök kategori, dhikr eller text…" value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                style={{flex:1,background:'none',border:'none',outline:'none',color:T.text,fontSize:14,fontFamily:'system-ui'}}
              />
              {searchQ && <button onClick={() => setSearchQ('')} style={{background:'none',border:'none',cursor:'pointer',color:T.textMuted,fontSize:18,lineHeight:1,padding:0}}>×</button>}
            </div>
          </div>
        )}
      </div>

      {/* ── BODY ── */}
      <div ref={bodyRef} style={{flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch'}}>

        {/* GRID */}
        {mainTab==='grid' && view==='home' && (
          <div style={{padding:'12px 10px 32px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            {GRUPPER.map(g => <GridCard key={g.id} g={g} count={groupCount(g)} onPress={() => goToCat(g)}/>)}
          </div>
        )}

        {/* LIST */}
        {mainTab==='list' && view==='home' && (
          <div style={{padding:'12px 14px 32px'}}>
            {GRUPPER.map(g => <ListRow key={g.id} g={g} count={groupCount(g)} onPress={() => goToCat(g)} T={T}/>)}
          </div>
        )}

        {/* SAVED */}
        {mainTab==='saved' && view==='home' && (
          <SavedView
            favorites={favorites} bookmarks={bookmarks}
            onSelectDhikr={goToDhikr}
            onClearFav={() => { setFavorites([]); saveStorage(STORAGE_KEY_FAV,[]); }}
            onClearBm={() => { setBookmarks([]); saveStorage(STORAGE_KEY_BM,[]); }}
            T={T}
          />
        )}

        {/* SEARCH */}
        {mainTab==='search' && view==='home' && (
          <SearchView query={searchQ} onSelectDhikr={goToDhikr} onSelectGrupp={g => goToCat(g)} T={T}/>
        )}

        {/* CATEGORY DETAIL */}
        {view==='cat' && selGrupp && (
          <CatDetail g={selGrupp} onSelectDhikr={goToDhikr} favorites={favorites} bookmarks={bookmarks} T={T}/>
        )}

        {/* DHIKR DETAIL */}
        {view==='dhikr' && selDhikr && (
          <div style={{padding:'16px 14px 48px', animation:'dhFade .2s ease both'}}>
            <DhikrCard d={selDhikr} T={T} favorites={favorites} bookmarks={bookmarks} onToggleFav={toggleFav} onToggleBm={toggleBm}/>
          </div>
        )}
      </div>
    </div>
  );
}
