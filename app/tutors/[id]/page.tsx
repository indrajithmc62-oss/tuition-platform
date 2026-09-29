"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Tutor = {
  id: string;
  bio: string | null;
  subjects: string[];
  hourlyRate: number;
  ratingAvg: number;
  ratingCount: number;
  user: { name: string; image: string | null };
};

export default function TutorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Simple approach: fetch the full list and find this tutor.
    // For a larger app, add a GET /api/tutors/[id] route instead.
    fetch(`/api/tutors`)
      .then((r) => r.json())
      .then((data: Tutor[]) => setTutor(data.find((t) => t.id === id) ?? null));
  }, [id]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);

    // Combine date + time into a UTC ISO string.
    // NOTE: for production, capture the student's timezone explicitly
    // rather than relying on the browser's local time.
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tutorId: id,
        subject,
        scheduledAt,
        durationMins: 60,
      }),
    });

    setSubmitting(false);

    if (res.status === 401) {
      setStatus("Please log in first.");
      return;
    }
    if (!res.ok) {
      const data = await res.json();
      setStatus(data.error ?? "Something went wrong.");
      return;
    }

    setStatus("Booked! Redirecting to your dashboard...");
    setTimeout(() => router.push("/dashboard"), 1200);
  }

  if (!tutor) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <h1 className="text-2xl font-semibold">{tutor.user.name}</h1>
      <p className="text-gray-600 mt-1">{tutor.subjects.join(", ")}</p>
      <p className="text-gray-500 mt-1">
        ⭐ {tutor.ratingAvg.toFixed(1)} ({tutor.ratingCount} reviews) · ${tutor.hourlyRate}/hr
      </p>
      <p className="mt-4">{tutor.bio}</p>

      <div className="border-t mt-8 pt-6">
        <h2 className="text-lg font-medium mb-4">Book a session</h2>
        <form onSubmit={handleBook} className="space-y-3">
          <input
            className="w-full border rounded-md p-2"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <div className="flex gap-3">
            <input
              className="border rounded-md p-2 flex-1"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <input
              className="border rounded-md p-2 flex-1"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          {status && <p className="text-sm">{status}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-black text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {submitting ? "Booking..." : "Request booking"}
          </button>
        </form>
      </div>
    </div>
  );
}