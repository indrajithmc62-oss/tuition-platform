import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendBookingConfirmations } from "@/lib/email";

// Share of each payment kept by the platform (0.15 = 15%)
const COMMISSION_RATE = 0.15;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    await req.json();

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

  // Recreate the expected signature and compare — this proves the payment
  // response actually came from Razorpay and wasn't faked by the client.
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  // The booking expired before payment arrived. Only confirm it if nobody
  // else has taken the hour in the meantime.
  if (booking.status === "CANCELLED") {
    const taken = await prisma.booking.findFirst({
      where: {
        tutorId: booking.tutorId,
        scheduledAt: booking.scheduledAt,
        status: { in: ["PENDING", "CONFIRMED"] },
        id: { not: booking.id },
      },
    });
    if (taken) {
      console.error(
        `Late payment ${razorpay_payment_id} for expired booking ${booking.id}: slot taken, needs refund`
      );
      return NextResponse.json(
        {
          error:
            "Your payment arrived after the booking expired and the time slot was taken. Please contact support for a refund.",
        },
        { status: 409 }
      );
    }
  }

  const alreadyPaid = booking.paymentStatus === "PAID";

  // Split the payment between the platform and the tutor (rounded to 2 decimals)
  const total = booking.tutor.hourlyRate * (booking.durationMins / 60);
  const platformFee = Math.round(total * COMMISSION_RATE * 100) / 100;
  const tutorEarning = Math.round((total - platformFee) * 100) / 100;

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      paymentStatus: "PAID",
      stripePaymentId: razorpay_payment_id, // reused field name; holds the Razorpay payment id
      // Only set the split the first time, and never overwrite a paid-out booking
      ...(alreadyPaid
        ? {}
        : { platformFee, tutorEarning, payoutStatus: "PENDING" as const }),
    },
    include: {
      student: { select: { name: true, email: true } },
      tutor: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  // Send confirmation emails (only the first time). Failures never block the payment.
  if (!alreadyPaid) {
    try {
      await sendBookingConfirmations({
        subject: updated.subject,
        scheduledAt: updated.scheduledAt,
        studentName: updated.student.name,
        studentEmail: updated.student.email,
        tutorName: updated.tutor.user.name,
        tutorEmail: updated.tutor.user.email,
      });
    } catch (err) {
      console.error("Confirmation emails failed:", err);
    }
  }

  return NextResponse.json({ id: updated.id, status: updated.status });
}