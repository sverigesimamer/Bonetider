export const PRAYER_NAMES  = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
export const PRAYER_ICONS  = { Fajr:'🌙', Sunrise:'🌅', Dhuhr:'☀️', Asr:'🌤', Maghrib:'🌇', Isha:'✨' };

export const CALC_METHODS = {
  1:  'Muslim World League',
  2:  'ISNA (North America)',
  3:  'Egyptian General Authority',
  4:  "Umm Al-Qura, Makkah",
  5:  'Karachi (Islamic Sciences)',
  7:  'Tehran (Geophysics)',
  8:  'Gulf Region',
  9:  'Kuwait',
  10: 'Qatar',
  11: 'Singapore',
  12: 'Union Org. Islamic France',
  13: 'Diyanet, Turkey',
  14: 'Muslims of Russia',
};

export function timeToSec(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 3600 + m * 60;
}

export function fmt12(t) {
  if (!t) return '--:--';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function fmtCountdown(s) {
  s = Math.max(0, Math.round(s));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map(v => String(v).padStart(2, '0')).join(':');
}

export function getTodayDateStr() {
  const n = new Date();
  return `${String(n.getDate()).padStart(2,'0')}-${String(n.getMonth()+1).padStart(2,'0')}-${n.getFullYear()}`;
}

export function getNextPrayer(times, now) {
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  for (const name of PRAYER_NAMES) {
    const s = timeToSec(times[name]);
    if (s > nowSec) return { name, time: times[name], secondsUntil: s - nowSec };
  }
  // All passed → next is Fajr tomorrow
  const fajrSec = timeToSec(times.Fajr);
  return { name: 'Fajr', time: times.Fajr, secondsUntil: 86400 - nowSec + fajrSec };
}

export function stripTz(t) { return (t || '').replace(/\s*\(.*\)/, '').trim(); }
