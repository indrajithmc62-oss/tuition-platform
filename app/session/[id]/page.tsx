"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

type RoomData = {
  roomName: string;
  jwt: string;
  appId: string;
  domain: string;
};

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Ask our server for the room and this person's pass
  useEffect(() => {
    fetch(`/api/bookings/${id}/create-room`, { method: "POST" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Couldn't load the session.");
          return;
        }
        setRoom(data);
      })
      .catch(() => setError("Couldn't load the session."));
  }, [id]);

  // 2. Load the 8x8 video script and open the room
  useEffect(() => {
    if (!room || !containerRef.current) return;

    let api: any = null;
    let cancelled = false;

    const start = () => {
      if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) {
        return;
      }
      api = new window.JitsiMeetExternalAPI(room.domain, {
        roomName: `${room.appId}/${room.roomName}`,
        jwt: room.jwt,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
      });
      api.addListener("readyToClose", () => router.push("/dashboard"));
    };

    if (window.JitsiMeetExternalAPI) {
      start();
    } else {
      const script = document.createElement("script");
      script.src = `https://${room.domain}/${room.appId}/external_api.js`;
      script.async = true;
      script.onload = start;
      script.onerror = () => setError("Couldn't load the video service.");
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (api) api.dispose();
    };
  }, [room, router]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-6 text-center">
        <p className="text-ink">{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 border border-ink px-4 py-2 rounded-md hover:border-marigold hover:text-marigold transition-colors"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  if (!room) {
    return <p className="text-center mt-20 text-ink">Loading your session...</p>;
  }

  return (
    <div className="h-[calc(100vh-73px)]">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}