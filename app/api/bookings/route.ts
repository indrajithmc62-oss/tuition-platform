import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const bookingSchema = z.object({
  tutorId: z.string(),
  subject: z.string(),
  scheduledAt: z.string().datetime(), // ISO string in UTC
  durationMins: z.number().default(60),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = bookingSchema.parse(body);
    const scheduledAt = new Date(data.scheduledAt);

    // Prevent double-booking: check for an overlapping CONFIRMED/PENDING booking
    // for the same tutor at the same time.
    const conflict = await prisma.booking.findFirst({
      where: {
        tutorId: data.tutorId,
        scheduledAt,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "That slot is already booked. Please pick another time." },
        { status: 409 }
      );
    }

    const booking = await prisma.booking.create({
      data: {
        studentId: (session.user as any).id,
        tutorId: data.tutorId,
        subject: data.subject,
        scheduledAt,
        durationMins: data.durationMins,
        status: "PENDING",
        paymentStatus: "UNPAID",
      },
    });

    // NOTE: next step is to create a Stripe Checkout session here and
    // redirect the student to pay; on webhook success, flip status to CONFIRMED.

    return NextResponse.json(booking, { status: 201 });
  } catch (err: any) {
    if (err?.issues) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const bookings = await prisma.booking.findMany({
    where:
      role === "TUTOR"
        ? { tutor: { userId } }
        : { studentId: userId },
    include: {
      tutor: { include: { user: { select: { name: true } } } },
      student: { select: { name: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json(bookings);
}