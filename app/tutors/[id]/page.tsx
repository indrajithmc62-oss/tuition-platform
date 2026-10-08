"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Availability = { dayOfWeek: number; startTime: string; endTime: string };

type Tutor = {
  id: string;
  bio: string | null;
  subjects: string[];
  hourlyRate: number;
  ratingAvg: number;
  ratingCount: number;
  user: { name: string; image: string | null };
  availability: Availability[];
  bookedSlots?: string[];
  reviews?: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    author: { name: string };
  }[];
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

function getSlotsForDate(date: string, availability: Availability[]) {
  if (!date) return [];
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  const slots: string[] = [];
  for (const a of availability.filter((a) => a.dayOfWeek === dow)) {
    const [sh, sm] = a.startTime.split(":").map(Number);
    const [eh, em] = a.endTime.split(":").map(Number);
    for (let m = sh * 60 + sm; m + 60 <= eh * 60 + em; m += 60) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

export default function TutorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: authSession } = useSession();
  const isTutor = (authSession?.user as any)?.role === "TUTOR";
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/tutors/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setTutor(data));
  }, [id]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);

    try {
      const scheduledAt = new Date(`${date}T${time}:00Z`).toISOString();

      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: id,
          subject,
          scheduledAt,
          durationMins: 60,
        }),
      });

      if (bookingRes.status === 401) {
        setStatus("Please log in first.");
        setSubmitting(false);
        return;
      }
      if (!bookingRes.ok) {
        const data = await bookingRes.json();
        setStatus(data.error ?? "Something went wrong.");
        setSubmitting(false);
        return;
      }

      const booking = await bookingRes.json();

      const orderRes = await fetch(`/api/bookings/${booking.id}/create-order`, {
        method: "POST",
      });
      if (!orderRes.ok) {
        setStatus("Booking created, but payment setup failed. Check your dashboard.");
        setSubmitting(false);
        return;
      }
      const order = await orderRes.json();

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "TuitionHub",
        description: `${subject} session with ${tutor?.user.name}`,
        handler: async function (response: any) {
          const verifyRes = await fetch(`/api/bookings/${booking.id}/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          if (verifyRes.ok) {
            setStatus("Payment successful! Redirecting to your dashboard...");
            setTimeout(() => router.push("/dashboard"), 1200);
          } else {
            setStatus("Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: function () {
            setStatus("Payment cancelled. Your booking is saved as unpaid — you can pay later from your dashboard.");
            setSubmitting(false);
          },
        },
        theme: { color: "#14213d" },
      });

      razorpay.open();
    } catch (err) {
      console.error(err);
      setStatus("Something went wrong.");
      setSubmitting(false);
    }
  }

  const booked = new Set(
    (tutor?.bookedSlots ?? []).map((iso) => iso.slice(0, 16))
  );
  const slots = getSlotsForDate(date, tutor?.availability ?? []).filter(
    (s) => !booked.has(`${date}T${s}`)
  );

  if (!tutor) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <h1 className="font-display text-2xl font-semibold text-ink">{tutor.user.name}</h1>
      <p className="text-ink/70 mt-1">{tutor.subjects.join(", ")}</p>
      <p className="text-ink/50 mt-1">
        ⭐ {tutor.ratingAvg.toFixed(1)} ({tutor.ratingCount}{" "}
        {tutor.ratingCount === 1 ? "review" : "reviews"}) · ${tutor.hourlyRate}/hr
      </p>
      <p className="mt-4 text-ink">{tutor.bio}</p>

      <div className="mt-6">
        <h2 className="font-display text-sm font-semibold text-ink/60 uppercase tracking-wide">
          Availability
        </h2>
        {tutor.availability.length === 0 ? (
          <p className="text-ink/50 text-sm mt-2">
            This tutor hasn't set their availability yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {tutor.availability.map((slot, i) => (
              <li key={i} className="text-sm text-ink/70">
                {DAYS[slot.dayOfWeek]}: {slot.startTime} – {slot.endTime}
              </li>
            ))}
          </ul>
        )}
      </div>

      {tutor.reviews && tutor.reviews.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-sm font-semibold text-ink/60 uppercase tracking-wide">
            What students say
          </h2>
          <div className="mt-3 space-y-3">
            {tutor.reviews.map((r) => (
              <div key={r.id} className="border border-mist rounded-lg p-3">
                <p className="text-sm text-marigold">
                  {"★".repeat(r.rating)}
                  <span className="text-ink/30">{"★".repeat(5 - r.rating)}</span>
                </p>
                {r.comment && <p className="text-sm text-ink mt-1">{r.comment}</p>}
                <p className="text-xs text-ink/50 mt-1">{r.author.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isTutor ? (
        <div className="border-t border-mist mt-8 pt-6">
          <p className="text-sm text-ink/60">
            Tutor accounts can't book sessions. Log in with a student account to book.
          </p>
        </div>
      ) : (
        <div className="border-t border-mist mt-8 pt-6">
          <h2 className="font-display text-lg font-medium text-ink mb-4">Book a session</h2>
          <form onSubmit={handleBook} className="space-y-3">
            <input
              className="w-full border border-mist rounded-md p-2"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <input
              className="border border-mist rounded-md p-2 w-full"
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setTime("");
              }}
              required
            />
            {date && (
              <div className="flex flex-wrap gap-2">
                {slots.length === 0 ? (
                  <p className="text-sm text-ink/50">
                    No open slots on this day. Try another date.
                  </p>
                ) : (
                  slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTime(s)}
                      className={`border px-3 py-1 rounded-md text-sm ${
                        time === s
                          ? "bg-ink text-paper border-ink"
                          : "border-mist hover:border-marigold"
                      }`}
                    >
                      {s}
                    </button>
                  ))
                )}
              </div>
            )}
            {status && <p className="text-sm text-ink">{status}</p>}
            <button
              type="submit"
              disabled={submitting || !time}
              className="bg-ink text-paper px-4 py-2 rounded-md hover:bg-marigold transition-colors disabled:opacity-50"
            >
              {submitting ? "Processing..." : "Book & Pay"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}