import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const bookings = await prisma.booking.findMany({
    orderBy: { scheduledAt: "desc" },
    select: {
      id: true,
      subject: true,
      scheduledAt: true,
      durationMins: true,
      status: true,
      paymentStatus: true,
      payoutStatus: true,
      platformFee: true,
      tutorEarning: true,
      student: { select: { name: true, email: true } },
      tutor: {
        select: {
          hourlyRate: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json(bookings);
}