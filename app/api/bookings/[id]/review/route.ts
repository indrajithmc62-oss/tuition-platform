import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as any).id;

  const body = await req.json().catch(() => null);
  const rating = Number(body?.rating);
  const comment =
    typeof body?.comment === "string" ? body.comment.trim().slice(0, 1000) : "";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating must be a whole number from 1 to 5." },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { review: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.studentId !== userId) {
    return NextResponse.json(
      { error: "Only the student can review this session." },
      { status: 403 }
    );
  }
  if (booking.paymentStatus !== "PAID" || booking.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Only paid sessions can be reviewed." },
      { status: 400 }
    );
  }

  const endsAt =
    booking.scheduledAt.getTime() + booking.durationMins * 60 * 1000;
  if (Date.now() < endsAt) {
    return NextResponse.json(
      { error: "You can review a session after it has ended." },
      { status: 400 }
    );
  }
  if (booking.review) {
    return NextResponse.json(
      { error: "You already reviewed this session." },
      { status: 400 }
    );
  }

  // Save the review, mark the session completed, and recalculate the average
  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        bookingId: id,
        tutorId: booking.tutorId,
        authorId: userId,
        rating,
        comment: comment || null,
      },
    });

    await tx.booking.update({
      where: { id },
      data: { status: "COMPLETED" },
    });

    const agg = await tx.review.aggregate({
      where: { tutorId: booking.tutorId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.tutorProfile.update({
      where: { id: booking.tutorId },
      data: {
        ratingAvg: agg._avg.rating ?? 0,
        ratingCount: agg._count.rating,
      },
    });
  });

  return NextResponse.json({ ok: true });
}