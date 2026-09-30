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

declare global {
  interface Window {
    Razorpay: any;
  }
}

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
    fetch(`/api/tutors`)
      .then((r) => r.json())
      .then((data: Tutor[]) => setTutor(data.find((t) => t.id === id) ?? null));
  }, [id]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);

    try {
      // Step 1: create the PENDING/UNPAID booking
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

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

      // Step 2: create a Razorpay order for this booking
      const orderRes = await fetch(`/api/bookings/${booking.id}/create-order`, {
        method: "POST",
      });
      if (!orderRes.ok) {
        setStatus("Booking created, but payment setup failed. Check your dashboard.");
        setSubmitting(false);
        return;
      }
      const order = await orderRes.json();

      // Step 3: open Razorpay checkout
      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "TuitionHub",
        description: `${subject} session with ${tutor?.user.name}`,
        handler: async function (response: any) {
          // Step 4: verify payment on the server
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
        theme: { color: "#000000" },
      });

      razorpay.open();
    } catch (err) {
      console.error(err);
      setStatus("Something went wrong.");
      setSubmitting(false);
    }
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
            {submitting ? "Processing..." : "Book & Pay"}
          </button>
        </form>
      </div>
    </div>
  );
}