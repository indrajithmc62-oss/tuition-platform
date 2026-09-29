import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tutors?subject=Math&maxRate=50&sort=rating
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const subject = searchParams.get("subject");
  const maxRate = searchParams.get("maxRate");
  const sort = searchParams.get("sort") ?? "rating";

  const tutors = await prisma.tutorProfile.findMany({
    where: {
      ...(subject && { subjects: { has: subject } }),
      ...(maxRate && { hourlyRate: { lte: Number(maxRate) } }),
    },
    include: {
      user: { select: { name: true, image: true } },
    },
    orderBy:
      sort === "price"
        ? { hourlyRate: "asc" }
        : { ratingAvg: "desc" },
  });

  return NextResponse.json(tutors);
}