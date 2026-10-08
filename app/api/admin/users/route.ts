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

  // passwordHash is never selected, so it can't leak
  const users = await prisma.user.findMany({
    where: { role: { in: ["STUDENT", "TUTOR"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { bookingsAsStudent: true } },
      tutorProfile: {
        select: {
          subjects: true,
          hourlyRate: true,
          ratingAvg: true,
          ratingCount: true,
          _count: { select: { bookings: true } },
        },
      },
    },
  });

  return NextResponse.json(users);
}