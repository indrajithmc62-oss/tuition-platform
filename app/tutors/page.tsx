"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Tutor = {
  id: string;
  bio: string | null;
  subjects: string[];
  hourlyRate: number;
  ratingAvg: number;
  ratingCount: number;
  user: { name: string; image: string | null };
};

export default function TutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [subject, setSubject] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadTutors() {
    setLoading(true);
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (maxRate) params.set("maxRate", maxRate);

    const res = await fetch(`/api/tutors?${params.toString()}`);
    const data = await res.json();
    setTutors(data);
    setLoading(false);
  }

  useEffect(() => {
    loadTutors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6">
      <h1 className="text-2xl font-semibold mb-6">Find a tutor</h1>

      <div className="flex gap-3 mb-8">
        <input
          className="border rounded-md p-2 flex-1"
          placeholder="Subject (e.g. Math)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <input
          className="border rounded-md p-2 w-40"
          placeholder="Max rate ($/hr)"
          type="number"
          value={maxRate}
          onChange={(e) => setMaxRate(e.target.value)}
        />
        <button
          onClick={loadTutors}
          className="bg-black text-white px-4 rounded-md"
        >
          Search
        </button>
      </div>

      {loading ? (
        <p>Loading tutors...</p>
      ) : tutors.length === 0 ? (
        <p className="text-gray-500">No tutors found. Try a different filter.</p>
      ) : (
        <div className="grid gap-4">
          {tutors.map((t) => (
            <Link
              key={t.id}
              href={`/tutors/${t.id}`}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow flex justify-between items-center"
            >
              <div>
                <h2 className="font-medium">{t.user.name}</h2>
                <p className="text-sm text-gray-600">{t.subjects.join(", ")}</p>
                <p className="text-sm text-gray-500">
                  ⭐ {t.ratingAvg.toFixed(1)} ({t.ratingCount} reviews)
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${t.hourlyRate}/hr</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}