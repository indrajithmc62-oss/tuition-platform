import { NextResponse } from "next/server";
import crypto from "crypto";
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
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    await req.json();

  const booking = await prisma.booking.findUnique({ where: { id } });
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

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      paymentStatus: "PAID",
      stripePaymentId: razorpay_payment_id, // reused field name; holds the Razorpay payment id
    },
  });

  return NextResponse.json(updated);
}