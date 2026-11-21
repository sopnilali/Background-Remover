"use client";

import { useState } from "react";

export default function ResultView({
  originalUrl,
  resultUrl,
  downloadName,
  onReset,
}: {
  originalUrl: string;
  resultUrl: string;
  downloadName: string;
  onReset: () => void;
}) {
  // pos = % of width showing the transparent cutout (right of handle shows original)
  const [pos, setPos] = useState(50);

  return (
    <>
      <div className="compare">
        {/* Cutout (over checkerboard) is the base layer */}
        <img src={resultUrl} alt="Background removed" draggable={false} />
        {/* Original is clipped to the right of the handle */}
        <div className="before" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
          <img src={originalUrl} alt="Original" draggable={false} />
        </div>
        <span className="label l">Removed</span>
        <span className="label r">Original</span>
        <div className="handle" style={{ left: `${pos}%` }} />
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          aria-label="Before and after slider"
          onChange={(e) => setPos(Number(e.target.value))}
        />
      </div>
      <div className="actions">
        <a className="btn" href={resultUrl} download={downloadName}>Download PNG</a>
        <button className="btn secondary" onClick={onReset}>Try another</button>
      </div>
    </>
  );
}
