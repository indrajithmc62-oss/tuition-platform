import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

function loadPrivateKey(): string | null {
  // Online (Vercel): the key comes from a setting. "\n" is turned back into real line breaks.
  const fromEnv = process.env.JAAS_PRIVATE_KEY;
  if (fromEnv) return fromEnv.replace(/\\n/g, "\n");

  // Local only: read the key from a file
  const keyPath = process.env.JAAS_PRIVATE_KEY_PATH;
  if (!keyPath) return null;
  try {
    return fs.readFileSync(/* turbopackIgnore: true */ path.resolve(keyPath), "utf8");
  } catch {
    return null;
  }
}

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

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { tutor: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const isTutor = booking.tutor.userId === userId;
  const isStudent = booking.studentId === userId;
  if (!isTutor && !isStudent) {
    return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  }

  if (booking.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "This session isn't confirmed yet." },
      { status: 400 }
    );
  }

  const appId = process.env.JAAS_APP_ID;
  const keyId = process.env.JAAS_KEY_ID;
  if (!appId || !keyId) {
    return NextResponse.json(
      { error: "Video settings are missing in .env" },
      { status: 500 }
    );
  }

  const privateKey = loadPrivateKey();
  if (!privateKey) {
    return NextResponse.json(
      { error: "Could not read the JaaS private key" },
      { status: 500 }
    );
  }

  const roomName = `TuitionHub-${booking.id}`;
  const url = `https://8x8.vc/${appId}/${roomName}`;

  // Save the room link (replaces any old Daily/Jitsi link)
  if (booking.videoRoomUrl !== url) {
    await prisma.booking.update({
      where: { id },
      data: { videoRoomUrl: url },
    });
  }

  // A fresh pass for this person. The tutor is the moderator, the student is not.
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    {
      aud: "jitsi",
      iss: "chat",
      iat: now,
      nbf: now - 10,
      exp: now + 60 * 60 * 3,
      sub: appId,
      room: roomName,
      context: {
        user: {
          id: String(userId),
          name: session.user.name ?? (isTutor ? "Tutor" : "Student"),
          email: session.user.email ?? "",
          moderator: isTutor ? "true" : "false",
        },
        features: {
          recording: "false",
          livestreaming: "false",
          transcription: "false",
          "outbound-call": "false",
        },
      },
    },
    privateKey,
    { algorithm: "RS256", header: { alg: "RS256", typ: "JWT", kid: keyId } }
  );

  return NextResponse.json({
    url,
    roomName,
    jwt: token,
    appId,
    domain: "8x8.vc",
  });
}