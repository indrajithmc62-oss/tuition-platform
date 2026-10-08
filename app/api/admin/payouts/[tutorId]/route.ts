import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tutorId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { tutorId } = await params;

  const result = await prisma.booking.updateMany({
    where: { tutorId, paymentStatus: "PAID", payoutStatus: "PENDING" },
    data: { payoutStatus: "PAID", paidOutAt: new Date() },
  });

  return NextResponse.json({ updated: result.count });
}