"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type PayoutTutor = {
  tutorId: string;
  name: string;
  email: string;
  total: number;
  sessions: { id: string; subject: string; scheduledAt: string; amount: number }[];
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "TUTOR";
  createdAt: string;
  _count: { bookingsAsStudent: number };
  tutorProfile: {
    subjects: string[];
    hourlyRate: number;
    ratingAvg: number;
    ratingCount: number;
    _count: { bookings: number };
  } | null;
};

type AdminBooking = {
  id: string;
  subject: string;
  scheduledAt: string;
  durationMins: number;
  status: string;
  paymentStatus: string;
  payoutStatus: string;
  platformFee: number;
  tutorEarning: number;
  student: { name: string; email: string };
  tutor: { hourlyRate: number; user: { name: string; email: string } };
};

type Tab = "sessions" | "payouts" | "tutors" | "students";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>("sessions");

  const [tutors, setTutors] = useState<PayoutTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [search, setSearch] = useState("");

  function loadPayouts() {
    fetch("/api/admin/payouts")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Couldn't load payouts.");
          return;
        }
        setTutors(data);
      })
      .catch(() => setError("Couldn't load payouts."))
      .finally(() => setLoading(false));
  }

  function loadUsers() {
    fetch("/api/admin/users")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setUsersError(data.error ?? "Couldn't load users.");
          return;
        }
        setUsers(data);
      })
      .catch(() => setUsersError("Couldn't load users."));
  }

  function loadBookings() {
    fetch("/api/admin/bookings")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setBookingsError(data.error ?? "Couldn't load sessions.");
          return;
        }
        setBookings(data);
      })
      .catch(() => setBookingsError("Couldn't load sessions."));
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    if ((session?.user as any)?.role !== "ADMIN") {
      setLoading(false);
      return;
    }
    loadPayouts();
    loadUsers();
    loadBookings();
  }, [status, session]);

  async function markPaid(t: PayoutTutor) {
    const ok = window.confirm(
      `Mark ${money(t.total)} as paid to ${t.name}? Only do this after you have sent the money.`
    );
    if (!ok) return;
    setMarkingId(t.tutorId);
    try {
      const res = await fetch(`/api/admin/payouts/${t.tutorId}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Couldn't update.");
        return;
      }
      loadPayouts();
      loadBookings();
    } finally {
      setMarkingId(null);
    }
  }

  if (status === "loading") return <p className="text-center mt-10">Loading...</p>;
  if (status === "unauthenticated")
    return <p className="text-center mt-10">Please log in.</p>;
  if ((session?.user as any)?.role !== "ADMIN")
    return <p className="text-center mt-10">This page is for admins only.</p>;

  const q = search.trim().toLowerCase();
  const matchesUser = (u: AdminUser) =>
    !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  const tutorUsers = users.filter((u) => u.role === "TUTOR" && matchesUser(u));
  const studentUsers = users.filter((u) => u.role === "STUDENT" && matchesUser(u));

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
    if (!q) return true;
    return (
      b.student.name.toLowerCase().includes(q) ||
      b.student.email.toLowerCase().includes(q) ||
      b.tutor.user.name.toLowerCase().includes(q) ||
      b.tutor.user.email.toLowerCase().includes(q) ||
      b.subject.toLowerCase().includes(q)
    );
  });

  const tabClass = (t: Tab) =>
    `px-4 py-2 rounded-md text-sm border transition-colors ${
      tab === t
        ? "bg-ink text-paper border-ink"
        : "border-mist hover:border-marigold"
    }`;

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Admin</h1>

      <div className="flex flex-wrap gap-2 mt-4">
        <button className={tabClass("sessions")} onClick={() => setTab("sessions")}>
          Sessions ({bookings.length})
        </button>
        <button className={tabClass("payouts")} onClick={() => setTab("payouts")}>
          Payouts
        </button>
        <button className={tabClass("tutors")} onClick={() => setTab("tutors")}>
          Tutors ({users.filter((u) => u.role === "TUTOR").length})
        </button>
        <button className={tabClass("students")} onClick={() => setTab("students")}>
          Students ({users.filter((u) => u.role === "STUDENT").length})
        </button>
      </div>

      {tab === "sessions" && (
        <>
          <div className="flex gap-3 mt-4">
            <input
              className="flex-1 border border-mist rounded-md p-2"
              placeholder="Search by student, tutor or subject"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="border border-mist rounded-md p-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          {bookingsError && <p className="text-sm text-red-600 mt-4">{bookingsError}</p>}

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-mist text-ink/60">
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Tutor</th>
                  <th className="py-2 pr-4">Subject</th>
                  <th className="py-2 pr-4">When (UTC)</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Payment</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2">Payout</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const total = (b.tutor.hourlyRate * b.durationMins) / 60;
                  return (
                    <tr key={b.id} className="border-b border-mist/60 text-ink align-top">
                      <td className="py-2 pr-4">
                        {b.student.name}
                        <div className="text-xs text-ink/50">{b.student.email}</div>
                      </td>
                      <td className="py-2 pr-4">
                        {b.tutor.user.name}
                        <div className="text-xs text-ink/50">{b.tutor.user.email}</div>
                      </td>
                      <td className="py-2 pr-4">{b.subject}</td>
                      <td className="py-2 pr-4">{formatWhen(b.scheduledAt)}</td>
                      <td className="py-2 pr-4">{b.status}</td>
                      <td className="py-2 pr-4">{b.paymentStatus}</td>
                      <td className="py-2 pr-4">
                        {money(total)}
                        {b.paymentStatus === "PAID" && (
                          <div className="text-xs text-ink/50">
                            fee {money(b.platformFee)}
                          </div>
                        )}
                      </td>
                      <td className="py-2">
                        {b.paymentStatus === "PAID"
                          ? `${b.payoutStatus} (${money(b.tutorEarning)})`
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredBookings.length === 0 && (
              <p className="text-ink/60 mt-4">No sessions found.</p>
            )}
          </div>
        </>
      )}

      {tab === "payouts" && (
        <>
          <p className="text-ink/60 mt-4">
            Send each tutor their money by bank transfer, then click Mark as paid.
          </p>

          {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

          {loading ? (
            <p className="text-ink/60 mt-6">Loading...</p>
          ) : tutors.length === 0 ? (
            <p className="text-ink/60 mt-6">No pending payouts. Everyone is paid up.</p>
          ) : (
            <div className="grid gap-4 mt-6">
              {tutors.map((t) => (
                <div key={t.tutorId} className="border border-mist rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-ink">{t.name}</p>
                      <p className="text-sm text-ink/50">{t.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-ink/50">Owed</p>
                      <p className="font-display text-xl text-ink">{money(t.total)}</p>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1">
                    {t.sessions.map((s) => (
                      <li key={s.id} className="text-sm text-ink/70 flex justify-between">
                        <span>
                          {s.subject}, {formatWhen(s.scheduledAt)} UTC
                        </span>
                        <span>{money(s.amount)}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => markPaid(t)}
                    disabled={markingId === t.tutorId}
                    className="mt-4 bg-ink text-paper px-4 py-2 rounded-md text-sm hover:bg-marigold transition-colors disabled:opacity-50"
                  >
                    {markingId === t.tutorId ? "Saving..." : "Mark as paid"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {(tab === "tutors" || tab === "students") && (
        <>
          <input
            className="w-full border border-mist rounded-md p-2 mt-4"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {usersError && <p className="text-sm text-red-600 mt-4">{usersError}</p>}
        </>
      )}

      {tab === "tutors" && (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-mist text-ink/60">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Subjects</th>
                <th className="py-2 pr-4">Rate</th>
                <th className="py-2 pr-4">Rating</th>
                <th className="py-2 pr-4">Sessions</th>
                <th className="py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {tutorUsers.map((u) => (
                <tr key={u.id} className="border-b border-mist/60 text-ink">
                  <td className="py-2 pr-4">{u.name}</td>
                  <td className="py-2 pr-4">{u.email}</td>
                  <td className="py-2 pr-4">{u.tutorProfile?.subjects.join(", ") ?? "-"}</td>
                  <td className="py-2 pr-4">
                    {u.tutorProfile ? `$${u.tutorProfile.hourlyRate}/hr` : "-"}
                  </td>
                  <td className="py-2 pr-4">
                    {u.tutorProfile
                      ? `${u.tutorProfile.ratingAvg.toFixed(1)} (${u.tutorProfile.ratingCount})`
                      : "-"}
                  </td>
                  <td className="py-2 pr-4">{u.tutorProfile?._count.bookings ?? 0}</td>
                  <td className="py-2">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tutorUsers.length === 0 && (
            <p className="text-ink/60 mt-4">No tutors found.</p>
          )}
        </div>
      )}

      {tab === "students" && (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-mist text-ink/60">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Bookings</th>
                <th className="py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {studentUsers.map((u) => (
                <tr key={u.id} className="border-b border-mist/60 text-ink">
                  <td className="py-2 pr-4">{u.name}</td>
                  <td className="py-2 pr-4">{u.email}</td>
                  <td className="py-2 pr-4">{u._count.bookingsAsStudent}</td>
                  <td className="py-2">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {studentUsers.length === 0 && (
            <p className="text-ink/60 mt-4">No students found.</p>
          )}
        </div>
      )}
    </div>
  );
}