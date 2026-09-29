"use client";

import { useEffect, useState } from "react";
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
      <h1 className="text-2xl font-semibold mb-6">
        Welcome, {session?.user?.name}
      </h1>

      {loading ? (
        <p>Loading sessions...</p>
      ) : bookings.length === 0 ? (
        <p className="text-gray-500">No sessions yet.</p>
      ) : (
        <div className="grid gap-3">
          {bookings.map((b) => (
            <div key={b.id} className="border rounded-lg p-4">
              <p className="font-medium">{b.subject}</p>
              <p className="text-sm text-gray-600">
                {new Date(b.scheduledAt).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">
                {role === "TUTOR" ? `Student: ${b.student.name}` : `Tutor: ${b.tutor.user.name}`}
              </p>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="px-2 py-1 rounded bg-gray-100">{b.status}</span>
                <span className="px-2 py-1 rounded bg-gray-100">{b.paymentStatus}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}