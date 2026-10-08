import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expireUnpaidBookings } from "@/lib/expire-bookings";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Free up hours held by unpaid bookings older than 15 minutes
  await expireUnpaidBookings();

  const tutor = await prisma.tutorProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, image: true } },
      availability: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      },
    },
  });

  if (!tutor) {
    return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
  }

  // Upcoming bookings for this tutor, so the page can hide taken slots.
  // Only the time is sent, never any student details.
  const upcoming = await prisma.booking.findMany({
    where: { tutorId: id, scheduledAt: { gte: new Date() } },
    select: { scheduledAt: true, status: true },
  });

  const bookedSlots = upcoming
    .filter((b) => String(b.status) !== "CANCELLED")
    .map((b) => b.scheduledAt.toISOString());

  return NextResponse.json({ ...tutor, bookedSlots });
}