/**
 * Tom's Chicken - Centralized Reservation & Cancellation Logic
 * Enforces thesis adviser's late-cancellation policy and atomic slot management.
 */

export const LATE_CANCEL_MINUTES = 120; // 2 hours before slot start

/**
 * Parses date string (YYYY-MM-DD) and time slot (e.g. "2:00 PM - 5:00 PM") into local Date object.
 */
export function parseSlotStartTime(dateStr, timeStr) {
  if (!dateStr) return new Date();
  
  // Extract the starting portion before any hyphen
  let startPart = (timeStr || "").split("-")[0].trim();
  if (!startPart) startPart = "11:00 AM";

  const match = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let hours = 12;
  let minutes = 0;
  
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const meridiem = match[3].toUpperCase();
    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
  }

  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d, hours, minutes, 0, 0);
}

/**
 * Checks if current time is within the late cancellation window (< 120 mins before slot start).
 */
export function isLateCancellation(dateStr, timeStr, lateMinutes = LATE_CANCEL_MINUTES) {
  const slotDate = parseSlotStartTime(dateStr, timeStr);
  const diffMs = slotDate.getTime() - Date.now();
  return diffMs < (lateMinutes * 60 * 1000);
}

/**
 * Centralized reservation cancellation handler.
 * - Late cancel on approved bookings: Slot remains LOCKED (forfeited) per adviser policy.
 * - Early cancel or pending: Slot is freed for other customers to book.
 */
export async function cancelReservationRecord({
  db,
  resId,
  resData,
  cancelledBy = "customer",
  reason = "Customer cancellation",
  update,
  remove,
  ref
}) {
  if (!resId || !resData) {
    throw new Error("Missing reservation ID or reservation data.");
  }

  if (resData.status === "seated" || resData.status === "completed") {
    throw new Error("Active or completed dining sessions cannot be cancelled.");
  }

  const wasApproved = resData.status === "approved";
  const isLate = wasApproved && isLateCancellation(resData.date, resData.time, LATE_CANCEL_MINUTES);

  // Extract clean numeric table ID
  let tableId = resData.tableId;
  if (!tableId && resData.tableSize) {
    const m = resData.tableSize.match(/Table\s+(\d+)/i);
    if (m) tableId = m[1];
  }

  let slotFreed = false;
  let refundStatus = wasApproved ? (isLate ? "forfeited" : "refund_needed") : "none";

  if (isLate) {
    // LATE CANCEL: Table slot remains locked in reservationSlots (wasted window per adviser rule)
    slotFreed = false;
  } else {
    // EARLY CANCEL or PENDING: Release the slot so others can reserve
    if (tableId && resData.date && resData.time) {
      try {
        await remove(ref(db, `reservationSlots/${resData.date}/${resData.time}/tables/${tableId}`));
        slotFreed = true;
      } catch (slotErr) {
        console.warn("Could not remove slot from reservationSlots:", slotErr);
      }
    }
  }

  // Update reservation record
  const resUpdate = {
    status: "cancelled",
    slotForfeited: Boolean(isLate),
    lateCancellation: Boolean(isLate),
    cancelledBy: cancelledBy,
    cancelledAt: Date.now(),
    cancellationReason: reason,
    rejectionReason: reason
  };
  await update(ref(db, `reservations/${resId}`), resUpdate);

  // Update linked payment record if present
  const paymentKey = resData.paymentId;
  if (paymentKey) {
    try {
      await update(ref(db, `payments/${paymentKey}`), {
        status: "cancelled",
        refundStatus: refundStatus,
        cancellationReason: reason,
        rejectionReason: reason,
        cancelledBy: cancelledBy,
        cancelledAt: Date.now()
      });
    } catch (pErr) {
      console.warn("Payment sync error:", pErr);
    }
  }

  return {
    success: true,
    isLate,
    slotFreed,
    refundStatus
  };
}
