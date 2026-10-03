"use client";

import { useEffect, useState } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Slot = { id?: string; dayOfWeek: number; startTime: string; endTime: string };

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSlots(data))
      .finally(() => setLoading(false));
  }, []);

  function addSlot() {
    setSlots([...slots, { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }]);
  }

  function updateSlot(index: number, field: keyof Slot, value: string | number) {
    const next = [...slots];
    next[index] = { ...next[index], [field]: value };
    setSlots(next);
  }

  function removeSlot(index: number) {
    setSlots(slots.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);

    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slots: slots.map(({ dayOfWeek, startTime, endTime }) => ({
          dayOfWeek,
          startTime,
          endTime,
        })),
      }),
    });

    setSaving(false);

    if (res.ok) {
      setStatus("Saved!");
    } else {
      const data = await res.json();
      setStatus(data.error ?? "Something went wrong.");
    }
  }

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Set your availability</h1>
      <p className="text-ink/70 mt-1">
        Add the days and times you're available. Students can only book you within these windows.
      </p>

      <div className="mt-6 space-y-3">
        {slots.map((slot, i) => (
          <div key={i} className="flex gap-3 items-center border border-mist rounded-md p-3">
            <select
              className="border border-mist rounded-md p-2 flex-1"
              value={slot.dayOfWeek}
              onChange={(e) => updateSlot(i, "dayOfWeek", Number(e.target.value))}
            >
              {DAYS.map((day, idx) => (
                <option key={idx} value={idx}>
                  {day}
                </option>
              ))}
            </select>
            <input
              type="time"
              className="border border-mist rounded-md p-2"
              value={slot.startTime}
              onChange={(e) => updateSlot(i, "startTime", e.target.value)}
            />
            <span className="text-ink/50">to</span>
            <input
              type="time"
              className="border border-mist rounded-md p-2"
              value={slot.endTime}
              onChange={(e) => updateSlot(i, "endTime", e.target.value)}
            />
            <button
              onClick={() => removeSlot(i)}
              className="text-coral hover:text-coral/70 px-2"
              aria-label="Remove slot"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addSlot}
        className="mt-4 border border-ink px-4 py-2 rounded-md hover:border-marigold hover:text-marigold transition-colors"
      >
        + Add a time slot
      </button>

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-ink text-paper px-6 py-3 rounded-md hover:bg-marigold transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save availability"}
        </button>
        {status && <p className="text-sm text-ink/70">{status}</p>}
      </div>
    </div>
  );
}