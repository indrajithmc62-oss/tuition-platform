"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Booking = {
  id: string;
  subject: string;
  scheduledAt: string;
  durationMins?: number;
  status: string;
  paymentStatus: string;
  videoRoomUrl: string | null;
  platformFee?: number;
  tutorEarning?: number;
  payoutStatus?: string;
  tutor: { user: { name: string }; hourlyRate?: number };
  student: { name: string };
  review?: { rating: number } | null;
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

function formatScheduledAt(iso: string) {
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

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function hasEnded(b: Booking) {
  const end =
    new Date(b.scheduledAt).getTime() + (b.durationMins ?? 60) * 60 * 1000;
  return Date.now() > end;
}

function BookingCard({
  booking,
  role,
  onJoin,
  onPay,
  onReview,
  joining,
  paying,
}: {
  booking: Booking;
  role: string;
  onJoin: (id: string) => void;
  onPay: (booking: Booking) => void;
  onReview: (booking: Booking) => void;
  joining: boolean;
  paying: boolean;
}) {
  const canPay =
    role !== "TUTOR" &&
    booking.paymentStatus === "UNPAID" &&
    booking.status === "PENDING";

  const canReview =
    role !== "TUTOR" &&
    booking.paymentStatus === "PAID" &&
    booking.status !== "CANCELLED" &&
    !booking.review &&
    hasEnded(booking);

  return (
    <div className="border border-mist rounded-lg p-4">
      <p className="font-medium text-ink">{booking.subject}</p>
      <p className="text-sm text-ink/60">{formatScheduledAt(booking.scheduledAt)}</p>
      <p className="text-sm text-ink/50">
        {role === "TUTOR" ? `Student: ${booking.student.name}` : `Tutor: ${booking.tutor.user.name}`}
      </p>
      <div className="flex gap-2 mt-2 text-xs">
        <span className="px-2 py-1 rounded bg-mist">{booking.status}</span>
        <span className="px-2 py-1 rounded bg-mist">{booking.paymentStatus}</span>
        {role === "TUTOR" && booking.paymentStatus === "PAID" && (
          <span className="px-2 py-1 rounded bg-mist">
            PAYOUT {booking.payoutStatus ?? "PENDING"}
          </span>
        )}
      </div>

      {role === "TUTOR" && booking.paymentStatus === "PAID" && (
        <p className="mt-2 text-sm text-ink/70">
          You earn {money(booking.tutorEarning ?? 0)}{" "}
          <span className="text-ink/50">
            (platform fee {money(booking.platformFee ?? 0)})
          </span>
        </p>
      )}

      {booking.status === "CANCELLED" && booking.paymentStatus === "UNPAID" && (
        <p className="mt-2 text-sm text-ink/60">
          Expired because it wasn't paid in time.
          {role !== "TUTOR" && " Book again to get a new slot."}
        </p>
      )}

      {booking.review && (
        <p className="mt-2 text-sm text-ink/70">
          {"★".repeat(booking.review.rating)}
          {"☆".repeat(5 - booking.review.rating)} Reviewed
        </p>
      )}

      {booking.status === "CONFIRMED" && (
        <button
          onClick={() => onJoin(booking.id)}
          disabled={joining}
          className="mt-3 bg-ink text-paper px-4 py-2 rounded-md text-sm hover:bg-marigold transition-colors disabled:opacity-50"
        >
          {joining ? "Joining..." : "Join session"}
        </button>
      )}

      {canPay && (
        <button
          onClick={() => onPay(booking)}
          disabled={paying}
          className="mt-3 bg-marigold text-ink px-4 py-2 rounded-md text-sm hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
        >
          {paying ? "Opening..." : "Pay now"}
        </button>
      )}

      {canReview && (
        <button
          onClick={() => onReview(booking)}
          className="mt-3 ml-2 border border-ink px-4 py-2 rounded-md text-sm hover:border-marigold hover:text-marigold transition-colors"
        >
          Leave a review
        </button>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const [reviewing, setReviewing] = useState<Booking | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [savingReview, setSavingReview] = useState(false);

  function loadBookings() {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => setBookings(data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    if ((session?.user as any)?.role === "ADMIN") {
      router.replace("/admin");
      return;
    }
    loadBookings();
  }, [status, session]);

  async function handleJoin(bookingId: string) {
    setJoiningId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/create-room`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Couldn't join the session.");
        return;
      }
      router.push(`/session/${bookingId}`);
    } finally {
      setJoiningId(null);
    }
  }

  async function handlePay(booking: Booking) {
    setPayingId(booking.id);
    try {
      const orderRes = await fetch(`/api/bookings/${booking.id}/create-order`, {
        method: "POST",
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        alert(order.error ?? "Couldn't start payment.");
        loadBookings();
        return;
      }

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "TuitionHub",
        description: `${booking.subject} session`,
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
            loadBookings();
          } else {
            const data = await verifyRes.json().catch(() => null);
            alert(data?.error ?? "Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: function () {
            setPayingId(null);
          },
        },
        theme: { color: "#14213d" },
      });

      razorpay.open();
    } finally {
      setPayingId(null);
    }
  }

  function openReview(b: Booking) {
    setReviewing(b);
    setRating(0);
    setComment("");
    setReviewError(null);
  }

  async function submitReview() {
    if (!reviewing) return;
    if (rating < 1) {
      setReviewError("Please choose a star rating.");
      return;
    }
    setSavingReview(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/bookings/${reviewing.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error ?? "Couldn't save your review.");
        return;
      }
      setReviewing(null);
      loadBookings();
    } finally {
      setSavingReview(false);
    }
  }

  if (status === "loading") return <p className="text-center mt-10">Loading...</p>;
  if (status === "unauthenticated")
    return <p className="text-center mt-10">Please log in to view your dashboard.</p>;

  const role = (session?.user as any)?.role;

  if (role === "ADMIN") {
    return <p className="text-center mt-10">Taking you to the admin page...</p>;
  }

  const upcoming = bookings.filter(
    (b) => b.status !== "COMPLETED" && b.status !== "CANCELLED"
  );
  const past = bookings.filter((b) => b.status === "COMPLETED");
  const cancelled = bookings.filter((b) => b.status === "CANCELLED");

  const paidBookings = bookings.filter((b) => b.paymentStatus === "PAID");
  const totalEarned = paidBookings.reduce((sum, b) => sum + (b.tutorEarning ?? 0), 0);
  const pendingPayout = paidBookings
    .filter((b) => b.payoutStatus === "PENDING")
    .reduce((sum, b) => sum + (b.tutorEarning ?? 0), 0);
  const paidOut = paidBookings
    .filter((b) => b.payoutStatus === "PAID")
    .reduce((sum, b) => sum + (b.tutorEarning ?? 0), 0);

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6">
      <h1 className="font-display text-2xl font-semibold text-ink">
        {role === "TUTOR" ? `Welcome back, ${session?.user?.name}` : `Hi, ${session?.user?.name}`}
      </h1>

      {role === "TUTOR" ? (
        <>
          <p className="text-ink/60 mt-1">Here's how your tutoring is going.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="border border-mist rounded-lg p-4">
              <p className="text-ink/50 text-sm">Total sessions</p>
              <p className="font-display text-2xl text-ink mt-1">
                {bookings.filter((b) => b.status !== "CANCELLED").length}
              </p>
            </div>
            <div className="border border-mist rounded-lg p-4">
              <p className="text-ink/50 text-sm">Earned so far</p>
              <p className="font-display text-2xl text-ink mt-1">{money(totalEarned)}</p>
            </div>
            <div className="border border-mist rounded-lg p-4">
              <p className="text-ink/50 text-sm">Pending payout</p>
              <p className="font-display text-2xl text-ink mt-1">{money(pendingPayout)}</p>
            </div>
            <div className="border border-mist rounded-lg p-4">
              <p className="text-ink/50 text-sm">Paid out</p>
              <p className="font-display text-2xl text-ink mt-1">{money(paidOut)}</p>
            </div>
          </div>
          <p className="text-xs text-ink/50 mt-2">
            Earnings are shown after the platform fee is taken off.
          </p>

          <div className="flex items-center justify-between mt-8 mb-3">
            <h2 className="font-display text-lg font-semibold text-ink">Your sessions</h2>
            <Link
              href="/dashboard/availability"
              className="border border-ink px-4 py-2 rounded-md hover:border-marigold hover:text-marigold transition-colors text-sm"
            >
              Set availability
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="text-ink/60 mt-1">Ready for your next session?</p>

          <div className="flex items-center justify-between mt-8 mb-3">
            <h2 className="font-display text-lg font-semibold text-ink">Your sessions</h2>
            <Link
              href="/tutors"
              className="border border-ink px-4 py-2 rounded-md hover:border-marigold hover:text-marigold transition-colors text-sm"
            >
              Find more tutors
            </Link>
          </div>
        </>
      )}

      {loading ? (
        <p className="text-ink/60">Loading sessions...</p>
      ) : upcoming.length === 0 ? (
        <p className="text-ink/60">No upcoming sessions.</p>
      ) : (
        <div className="grid gap-3">
          {upcoming.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              role={role}
              onJoin={handleJoin}
              onPay={handlePay}
              onReview={openReview}
              joining={joiningId === b.id}
              paying={payingId === b.id}
            />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="font-display text-lg font-semibold text-ink mt-10 mb-3">
            Past sessions
          </h2>
          <div className="grid gap-3">
            {past.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                role={role}
                onJoin={handleJoin}
                onPay={handlePay}
                onReview={openReview}
                joining={false}
                paying={false}
              />
            ))}
          </div>
        </>
      )}

      {cancelled.length > 0 && (
        <>
          <h2 className="font-display text-lg font-semibold text-ink mt-10 mb-3">
            Cancelled sessions
          </h2>
          <div className="grid gap-3">
            {cancelled.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                role={role}
                onJoin={handleJoin}
                onPay={handlePay}
                onReview={openReview}
                joining={false}
                paying={false}
              />
            ))}
          </div>
        </>
      )}

      {reviewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-paper rounded-lg p-6 w-full max-w-md">
            <h3 className="font-display text-lg font-semibold text-ink">
              Review {reviewing.tutor.user.name}
            </h3>
            <div className="flex gap-1 mt-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`text-3xl ${
                    n <= rating ? "text-marigold" : "text-ink/30"
                  }`}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="w-full border border-mist rounded-md p-2 mt-4"
              rows={3}
              placeholder="Share how the session went (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {reviewError && (
              <p className="text-sm text-red-600 mt-2">{reviewError}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setReviewing(null)}
                className="border border-ink px-4 py-2 rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={savingReview}
                className="bg-ink text-paper px-4 py-2 rounded-md text-sm hover:bg-marigold transition-colors disabled:opacity-50"
              >
                {savingReview ? "Saving..." : "Submit review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}