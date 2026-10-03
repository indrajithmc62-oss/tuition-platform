import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const slotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), // "HH:MM"
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

const bodySchema = z.object({
  slots: z.array(slotSchema),
});

// GET: return the logged-in tutor's own availability slots
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: (session.user as any).id },
  });
  if (!tutorProfile) {
    return NextResponse.json({ error: "You're not registered as a tutor" }, { status: 403 });
  }

  const slots = await prisma.availability.findMany({
    where: { tutorId: tutorProfile.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(slots);
}

// POST: replace the tutor's entire availability with the given slots
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: (session.user as any).id },
  });
  if (!tutorProfile) {
    return NextResponse.json({ error: "You're not registered as a tutor" }, { status: 403 });
  }

  const body = await req.json();
  const { slots } = bodySchema.parse(body);

  // Simple approach: wipe and recreate. Fine at this scale; a tutor
  // re-saves their whole weekly schedule each time they edit it.
  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { tutorId: tutorProfile.id } }),
    prisma.availability.createMany({
      data: slots.map((s) => ({ ...s, tutorId: tutorProfile.id })),
    }),
  ]);

  const updated = await prisma.availability.findMany({
    where: { tutorId: tutorProfile.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(updated);
}