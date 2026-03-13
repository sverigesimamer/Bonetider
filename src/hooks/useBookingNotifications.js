/**
 * useBookingNotifications.js
 * Håller koll på ej sedda bokningsuppdateringar via Supabase.
 *
 * - Besökare: räknar bokningar med status approved/rejected som de inte sett
 * - Admin: räknar pending-bokningar
 *
 * "Sedd" = man har öppnat BookingScreen, vilket sparar en timestamp i localStorage.
 * Vi jämför det mot booking.resolved_at (för besökare) resp. booking.created_at (för admin).
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

const STORAGE_DEVICE      = 'islamnu_device_id';
const STORAGE_ADMIN       = 'islamnu_admin_mode';
const STORAGE_VISITOR_SEEN = 'islamnu_bookings_visitor_seen'; // timestamp (ms)
const STORAGE_ADMIN_SEEN   = 'islamnu_bookings_admin_seen';   // timestamp (ms)

export function useBookingNotifications() {
  const [visitorUnread, setVisitorUnread] = useState(0);
  const [adminUnread,   setAdminUnread]   = useState(0);

  const deviceId  = localStorage.getItem(STORAGE_DEVICE);
  const isAdmin   = localStorage.getItem(STORAGE_ADMIN) === 'true';

  const calculate = useCallback(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, status, created_at, resolved_at, device_id');
    if (error || !data) return;

    // ── Besökare: bokningar som tillhör den här enheten och fått svar sedan senast sedd ──
    if (deviceId) {
      const seenAt = parseInt(localStorage.getItem(STORAGE_VISITOR_SEEN) || '0', 10);
      const unseen = data.filter(b =>
        b.device_id === deviceId &&
        (b.status === 'approved' || b.status === 'rejected') &&
        b.resolved_at > seenAt
      );
      setVisitorUnread(unseen.length);
    }

    // ── Admin: pending bokningar skapade efter senast admin-sedd ──
    const adminSeenAt = parseInt(localStorage.getItem(STORAGE_ADMIN_SEEN) || '0', 10);
    const pendingNew  = data.filter(b =>
      b.status === 'pending' && b.created_at > adminSeenAt
    );
    setAdminUnread(pendingNew.length);
  }, [deviceId]);

  useEffect(() => {
    calculate();
    const channel = supabase
      .channel('booking-notif')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, calculate)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [calculate]);

  /** Anropas när besökaren öppnar BookingScreen */
  const markVisitorSeen = useCallback(() => {
    localStorage.setItem(STORAGE_VISITOR_SEEN, Date.now().toString());
    setVisitorUnread(0);
  }, []);

  /** Anropas när admin öppnar BookingScreen / adminpanelen */
  const markAdminSeen = useCallback(() => {
    localStorage.setItem(STORAGE_ADMIN_SEEN, Date.now().toString());
    setAdminUnread(0);
  }, []);

  const totalUnread = (deviceId ? visitorUnread : 0) + (isAdmin ? adminUnread : 0);

  return { visitorUnread, adminUnread, totalUnread, markVisitorSeen, markAdminSeen };
}
