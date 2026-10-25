"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DAY_NAMES } from "@/lib/format";

// Add / remove custom plan steps (auto steps are managed by pickup slots).
export default function PlanStepForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(2);
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("plan_steps").insert({
      title: title.trim(),
      day_of_week: day,
      at_time: time || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    setTitle("");
    setNotes("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50 print:hidden"
      >
        + Add a step
      </button>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-4 print:hidden">
      <h2 className="text-sm font-bold text-stone-600">New plan step (repeats weekly)</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Step title"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm sm:col-span-2"
        />
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          {DAY_NAMES.map((d, i) => (
            <option key={i} value={i}>
              {d}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm sm:col-span-4"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={add}
          disabled={busy || !title.trim()}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add step"}
        </button>
        <button onClick={() => setOpen(false)} className="px-3 text-sm text-stone-500">
          Cancel
        </button>
      </div>
      <p className="mt-2 text-[11px] text-stone-400">
        To remove or change a custom step, edit the <code>plan_steps</code> table in Supabase
        for now — or ask and we&apos;ll add inline editing.
      </p>
    </section>
  );
}
