import { stripTz } from '../utils/prayerUtils';

const BASE = 'https://api.aladhan.com/v1';

function mapTimings(t) {
  return {
    Fajr:    stripTz(t.Fajr),
    Sunrise: stripTz(t.Sunrise),
    Dhuhr:   stripTz(t.Dhuhr),
    Asr:     stripTz(t.Asr),
    Maghrib: stripTz(t.Maghrib),
    Isha:    stripTz(t.Isha),
  };
}

export async function fetchPrayerTimes(lat, lng, dateStr, method = 3) {
  const res = await fetch(`${BASE}/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=${method}`);
  if (!res.ok) throw new Error('Failed to fetch prayer times');
  const json = await res.json();
  return mapTimings(json.data.timings);
}

export async function fetchMonthlyTimes(lat, lng, month, year, method = 3) {
  const res = await fetch(`${BASE}/calendar/${year}/${month}?latitude=${lat}&longitude=${lng}&method=${method}`);
  if (!res.ok) throw new Error('Failed to fetch monthly times');
  const json = await res.json();
  return json.data.map(day => ({
    gregorianDay: parseInt(day.date.gregorian.day),
    date: day.date.readable,
    timings: mapTimings(day.timings),
  }));
}

export async function fetchQiblaDirection(lat, lng) {
  const res = await fetch(`${BASE}/qibla/${lat}/${lng}`);
  if (!res.ok) throw new Error('Failed to fetch Qibla direction');
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.status || 'API error');
  return json.data.direction;
}

export async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'User-Agent': 'SalatWebApp/1.0' } }
  );
  if (!res.ok) throw new Error('Geocoding failed');
  const json = await res.json();
  const a = json.address || {};
  return {
    city:    a.city || a.town || a.village || a.county || 'Unknown',
    country: a.country || '',
  };
}

export async function searchCity(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`,
    { headers: { 'User-Agent': 'SalatWebApp/1.0' } }
  );
  if (!res.ok) throw new Error('Search failed');
  const json = await res.json();
  return json.map(r => ({
    latitude:  parseFloat(r.lat),
    longitude: parseFloat(r.lon),
    city:      r.address?.city || r.address?.town || r.address?.village || r.display_name.split(',')[0],
    country:   r.address?.country || '',
  }));
}
