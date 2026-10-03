"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Booking = {
  id: string;
  subject: string;
  scheduledAt: string;
  status: string;
  paymentStatus: string;
  tutor: { user: { name: string } };
  student: { name: string };
};

function formatScheduledAt(iso: string) {
  // scheduledAt is stored as a literal wall-clock time (no timezone
  // conversion — see the booking creation flow), so we read its UTC
  // components directly instead of using toLocaleString(), which would
  // incorrectly shift it to the browser's local timezone.
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => setBookings(data))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading") return <p className="text-center mt-10">Loading...</p>;
  if (status === "unauthenticated")
    return <p className="text-center mt-10">Please log in to view your dashboard.</p>;

  const role = (session?.user as any)?.role;

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Welcome, {session?.user?.name}
        </h1>
        {role === "TUTOR" && (
          <Link
            href="/dashboard/availability"
            className="border border-ink px-4 py-2 rounded-md hover:border-marigold hover:text-marigold transition-colors text-sm"
          >
            Set availability
          </Link>
        )}
      </div>

      <div className="mt-6">
        {loading ? (
          <p>Loading sessions...</p>
        ) : bookings.length === 0 ? (
          <p className="text-ink/60">No sessions yet.</p>
        ) : (
          <div className="grid gap-3">
            {bookings.map((b) => (
              <div key={b.id} className="border border-mist rounded-lg p-4">
                <p className="font-medium text-ink">{b.subject}</p>
                <p className="text-sm text-ink/60">{formatScheduledAt(b.scheduledAt)}</p>
                <p className="text-sm text-ink/50">
                  {role === "TUTOR" ? `Student: ${b.student.name}` : `Tutor: ${b.tutor.user.name}`}
                </p>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="px-2 py-1 rounded bg-mist">{b.status}</span>
                  <span className="px-2 py-1 rounded bg-mist">{b.paymentStatus}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}