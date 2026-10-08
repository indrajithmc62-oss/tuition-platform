import { prisma } from "@/lib/prisma";

// How long an unpaid booking holds its time slot
const HOLD_MINUTES = 15;

// Cancels bookings that were never paid within the hold time.
// Paid bookings are never touched.
export async function expireUnpaidBookings() {
  const cutoff = new Date(Date.now() - HOLD_MINUTES * 60 * 1000);

  await prisma.booking.updateMany({
    where: {
      status: "PENDING",
      paymentStatus: "UNPAID",
      createdAt: { lt: cutoff },
    },
    data: { status: "CANCELLED" },
  });
}