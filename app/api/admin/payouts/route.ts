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
    where: { paymentStatus: "PAID", payoutStatus: "PENDING" },
    include: {
      tutor: { include: { user: { select: { name: true, email: true } } } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  // Group by tutor
  const byTutor: Record<
    string,
    {
      tutorId: string;
      name: string;
      email: string;
      total: number;
      sessions: { id: string; subject: string; scheduledAt: string; amount: number }[];
    }
  > = {};

  for (const b of bookings) {
    const key = b.tutorId;
    if (!byTutor[key]) {
      byTutor[key] = {
        tutorId: key,
        name: b.tutor.user.name,
        email: b.tutor.user.email,
        total: 0,
        sessions: [],
      };
    }
    byTutor[key].total += b.tutorEarning;
    byTutor[key].sessions.push({
      id: b.id,
      subject: b.subject,
      scheduledAt: b.scheduledAt.toISOString(),
      amount: b.tutorEarning,
    });
  }

  const tutors = Object.values(byTutor).map((t) => ({
    ...t,
    total: Math.round(t.total * 100) / 100,
  }));

  return NextResponse.json(tutors);
}