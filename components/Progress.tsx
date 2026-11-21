"use client";

import { useEffect, useState } from "react";

// The server gives no real progress events, so this is an estimate:
// the bar eases toward 95% and only completes when the request finishes.
const STAGES = [
  { at: 0, label: "Uploading image…" },
  { at: 8, label: "Loading AI model (first run is slower)…" },
  { at: 30, label: "Detecting the subject…" },
  { at: 50, label: "Refining edges…" },
];

export default function Progress() {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const percent = Math.round(95 * (1 - Math.exp(-sec / 25)));
  const stage = [...STAGES].reverse().find((s) => sec >= s.at)!.label;

  return (
    <div className="loading">
      <div className="spinner" />
      <p>{stage}</p>
      <div className="bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="bar-meta">
        {percent}% · {sec}s elapsed
      </p>
    </div>
  );
}
