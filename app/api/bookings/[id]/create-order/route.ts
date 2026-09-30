import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { tutor: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.studentId !== (session.user as any).id) {
    return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  }

  if (booking.paymentStatus === "PAID") {
    return NextResponse.json({ error: "Already paid" }, { status: 409 });
  }

  // Razorpay expects the amount in the smallest currency unit (paise for INR)
  const amountInPaise = Math.round(
    booking.tutor.hourlyRate * (booking.durationMins / 60) * 100
  );

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: booking.id,
    notes: { bookingId: booking.id },
  });

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}