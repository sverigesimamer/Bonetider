/**
 * useBookingNotifications.js
 *
 * Batterioptimerad strategi:
 *
 * REALTIME (Supabase WebSocket) — primär källa:
 *   • En enda persistent WebSocket-kanal för hela sessionen
 *   • Varje DB-händelse debouncias i 600ms (dvs. 260 bulk-inserts → 1 anrop)
 *   • Ingen polling medan Realtime är uppkopplad
 *
 * POLLING — fallback om Realtime tappar anslutning:
 *   • Förgrundsläge: var 5:e minut (ej 30s)
 *   • Bakgrundsläge (Page Visibility API): pausas helt
 *   • Återupptas direkt när appen kommer till förgrunden
 *
 * ANROP per calculate()-körning (optimerat):
 *   • Besökare:             1 anrop  (egna bokningar med svar)
 *   • Admin inloggad:       1 anrop  (pending + cancelled av besökare, kombinerat)
 *   • Admin-device ej inl.: 1 anrop  (bookings count, admin_devices cachas lokalt)
 *
 * ADMIN NOTIS:
 *   • Pending/edit_pending → nya bokningar att godkänna (orange)
 *   • Cancelled av besökare (approved-bokning) → avbokningar att känna till (orange)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

const STORAGE_DEVICE        = 'islamnu_device_id';
const STORAGE_ADMIN         = 'islamnu_admin_mode';
const STORAGE_VISITOR_SEEN  = 'islamnu_bookings_visitor_seen';
const STORAGE_ADMIN_SEEN    = 'islamnu_bookings_admin_seen';
const STORAGE_HAS_BOOKING   = 'islamnu_has_booking';
const STORAGE_ADMIN_DEVICE  = 'islamnu_is_admin_device'; // cachat för att slippa DB-anrop
const POLL_FOREGROUND_MS    = 5 * 60 * 1000; // 5 minuter — fallback om Realtime tappar
const DEBOUNCE_MS           = 600;            // slår ihop bulk-inserts till ett enda anrop

export function useBookingNotifications() {
  const [visitorUnread,     setVisitorUnread]     = useState(0);
  const [adminUnread,       setAdminUnread]       = useState(0);
  const [adminPendingCount, setAdminPendingCount] = useState(0);
  const [bellNotifs,        setBellNotifs]        = useState([]);
  const [active,            setActive]            = useState(false);

  const deviceId     = useRef(localStorage.getItem(STORAGE_DEVICE)).current;
  const isAdminRef   = useRef(localStorage.getItem(STORAGE_ADMIN) === 'true');
  const debounceRef  = useRef(null);
  const pollRef      = useRef(null);
  const hiddenRef    = useRef(false);
  const channelRef   = useRef(null);

  // Uppdatera isAdmin-ref vid varje render utan att skapa ny calculate
  isAdminRef.current = localStorage.getItem(STORAGE_ADMIN) === 'true';

  // ── Kärna: ett enda optimerat DB-anrop per roll ──────────────────────────
  const calculate = useCallback(async () => {
    const isAdmin = isAdminRef.current;

    try {
      // 1. Besökar-notiser — alltid om enheten har en bokning
      if (deviceId) {
        const seenAt = parseInt(localStorage.getItem(STORAGE_VISITOR_SEEN) || '0', 10);
        const { data } = await supabase
          .from('bookings')
          .select('id, status, resolved_at, date, time_slot, admin_comment')
          .eq('device_id', deviceId)
          .in('status', ['approved', 'rejected', 'cancelled', 'edited'])
          .gt('resolved_at', seenAt);
        if (data) {
          setVisitorUnread(data.length);
          setBellNotifs(data.map(b => ({
            id: b.id, type: 'booking', status: b.status,
            date: b.date, time_slot: b.time_slot, admin_comment: b.admin_comment,
          })));
        }
      }

      // 2. Admin inloggad — ett kombinerat anrop för allt admin behöver se:
      //    • pending/edit_pending  → nya att godkänna
      //    • cancelled av besökare (resolved_at > adminSeenAt) → avbokningar
      if (isAdmin) {
        const adminSeenAt = parseInt(localStorage.getItem(STORAGE_ADMIN_SEEN) || '0', 10);
        const { data } = await supabase
          .from('bookings')
          .select('id, status, created_at, resolved_at, admin_comment')
          .or(
            `status.in.(pending,edit_pending),` +
            `and(status.eq.cancelled,resolved_at.gt.${adminSeenAt},admin_comment.ilike.%Avbok%)`
          );
        if (data) {
          setAdminUnread(data.length);
        }
        setAdminPendingCount(0);
        return; // admin behöver inte köra block 3
      }

      // 3. Admin-device ej inloggad — kolla pending count
      //    Använd localStorage-cache för is-admin-device för att slippa admin_devices-anrop
      const cachedIsAdminDevice = localStorage.getItem(STORAGE_ADMIN_DEVICE);
      if (cachedIsAdminDevice === 'true') {
        // Vi vet redan att enheten är admin-device — hämta direkt count
        const { count } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'edit_pending']);
        setAdminPendingCount(count ?? 0);
      } else if (cachedIsAdminDevice !== 'false') {
        // Okänd — kolla admin_devices en gång och cacha resultatet
        const { data: adminDevice } = await supabase
          .from('admin_devices')
          .select('device_id, dismissed_at')
          .eq('device_id', deviceId)
          .maybeSingle();
        if (adminDevice && !adminDevice.dismissed_at) {
          localStorage.setItem(STORAGE_ADMIN_DEVICE, 'true');
          const { count } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .in('status', ['pending', 'edit_pending']);
          setAdminPendingCount(count ?? 0);
        } else {
          localStorage.setItem(STORAGE_ADMIN_DEVICE, adminDevice ? 'dismissed' : 'false');
          setAdminPendingCount(0);
        }
      }
    } catch {
      // Nätverksfel — ignorera tyst, nästa trigger försöker igen
    }
  }, [deviceId]); // eslint-disable-line

  // ── Debounced trigger — slår ihop burst-events (t.ex. 260 bulk-inserts) ─
  const triggerDebounced = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!hiddenRef.current) calculate();
    }, DEBOUNCE_MS);
  }, [calculate]);

  // ── Page Visibility — pausa polling i bakgrunden ─────────────────────────
  useEffect(() => {
    const onVisibilityChange = () => {
      hiddenRef.current = document.hidden;
      if (!document.hidden) {
        // Kom till förgrunden — kör direkt + återstarta polling-timer
        calculate();
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(calculate, POLL_FOREGROUND_MS);
      } else {
        // Gick till bakgrunden — stoppa polling
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [calculate]);

  // ── Aktiveringslogik — avgör om systemet ska starta ──────────────────────
  useEffect(() => {
    const isAdmin = isAdminRef.current;
    if (isAdmin) { setActive(true); return; }
    if (!deviceId) return;

    // Kolla cachat admin-device-status först (undviker DB-anrop vid varje app-start)
    const cachedIsAdminDevice = localStorage.getItem(STORAGE_ADMIN_DEVICE);
    if (cachedIsAdminDevice === 'true') { setActive(true); return; }

    const cached = localStorage.getItem(STORAGE_HAS_BOOKING);
    if (cached === 'true') { setActive(true); return; }
    if (cached === 'false' && cachedIsAdminDevice === 'false') return; // definitiv nej

    // Okänt — gör ett enda kombinerat check-anrop
    Promise.all([
      supabase
        .from('admin_devices')
        .select('device_id, dismissed_at')
        .eq('device_id', deviceId)
        .maybeSingle(),
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('device_id', deviceId),
    ]).then(([{ data: adminDevice }, { count }]) => {
      const isAdminDev = !!(adminDevice && !adminDevice.dismissed_at);
      const hasBooking = (count ?? 0) > 0;
      localStorage.setItem(STORAGE_ADMIN_DEVICE, isAdminDev ? 'true' : (adminDevice ? 'dismissed' : 'false'));
      localStorage.setItem(STORAGE_HAS_BOOKING, hasBooking ? 'true' : 'false');
      if (isAdminDev || hasBooking) setActive(true);
    }).catch(() => {});
  }, [deviceId]); // eslint-disable-line

  // ── Realtime + fallback-polling ───────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

    calculate();

    // Fallback-poll: 5 min i förgrunden, pausas i bakgrunden
    if (!document.hidden) {
      pollRef.current = setInterval(calculate, POLL_FOREGROUND_MS);
    }

    // Realtime — en kanal, debounced callback
    const channel = supabase
      .channel('booking-notif-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, triggerDebounced)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_devices' }, triggerDebounced)
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [active, calculate, triggerDebounced]);

  // ── Publika hjälpfunktioner ───────────────────────────────────────────────
  const activateForDevice = useCallback(() => {
    localStorage.setItem(STORAGE_HAS_BOOKING, 'true');
    setActive(true);
  }, []);

  const registerAdminDevice = useCallback(async () => {
    if (!deviceId) return;
    await supabase
      .from('admin_devices')
      .upsert({ device_id: deviceId, created_at: Date.now(), dismissed_at: null },
               { onConflict: 'device_id' });
    localStorage.setItem(STORAGE_ADMIN_DEVICE, 'true');
    isAdminRef.current = true;
    setActive(true);
    setTimeout(calculate, 150);
  }, [deviceId, calculate]);

  const dismissAdminDevice = useCallback(async () => {
    if (!deviceId) return;
    await supabase
      .from('admin_devices')
      .update({ dismissed_at: Date.now() })
      .eq('device_id', deviceId);
    localStorage.setItem(STORAGE_ADMIN_DEVICE, 'dismissed');
    setAdminPendingCount(0);
  }, [deviceId]);

  const markVisitorSeen = useCallback(() => {
    localStorage.setItem(STORAGE_VISITOR_SEEN, Date.now().toString());
    setVisitorUnread(0);
    setBellNotifs([]);
  }, []);

  const markAdminSeen = useCallback(() => {
    localStorage.setItem(STORAGE_ADMIN_SEEN, Date.now().toString());
    setAdminUnread(0);
  }, []);

  const isAdmin = isAdminRef.current;
  const totalUnread =
    (deviceId ? visitorUnread : 0) +
    (isAdmin ? adminUnread : adminPendingCount);

  return {
    visitorUnread,
    adminUnread,
    adminPendingCount,
    totalUnread,
    bellNotifs,
    activateForDevice,
    registerAdminDevice,
    dismissAdminDevice,
    markVisitorSeen,
    markAdminSeen,
  };
}
