import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["STUDENT", "TUTOR"]),
  // Tutor-only optional fields
  bio: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  hourlyRate: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        ...(data.role === "TUTOR" && {
          tutorProfile: {
            create: {
              bio: data.bio ?? "",
              subjects: data.subjects ?? [],
              hourlyRate: data.hourlyRate ?? 0,
            },
          },
        }),
      },
    });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err: any) {
    if (err?.issues) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}