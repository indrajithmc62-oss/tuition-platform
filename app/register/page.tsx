"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"STUDENT" | "TUTOR">("STUDENT");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    bio: "",
    subjects: "",
    hourlyRate: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        role,
        ...(role === "TUTOR" && {
          bio: form.bio,
          subjects: form.subjects.split(",").map((s) => s.trim()).filter(Boolean),
          hourlyRate: Number(form.hourlyRate) || 0,
        }),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push("/login");
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-semibold mb-6">Create an account</h1>

      <div className="flex gap-2 mb-6">
        {(["STUDENT", "TUTOR"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`flex-1 py-2 rounded-md border ${
              role === r ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            {r === "STUDENT" ? "I'm a Student" : "I'm a Tutor"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full border rounded-md p-2"
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="w-full border rounded-md p-2"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="w-full border rounded-md p-2"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={6}
        />

        {role === "TUTOR" && (
          <>
            <textarea
              className="w-full border rounded-md p-2"
              placeholder="Short bio"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
            <input
              className="w-full border rounded-md p-2"
              placeholder="Subjects (comma separated, e.g. Math, Physics)"
              value={form.subjects}
              onChange={(e) => setForm({ ...form, subjects: e.target.value })}
            />
            <input
              className="w-full border rounded-md p-2"
              placeholder="Hourly rate ($)"
              type="number"
              value={form.hourlyRate}
              onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
            />
          </>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded-md disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </div>
  );
}