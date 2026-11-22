"use client";

import { useEffect, useRef, useState } from "react";

type Bg =
  | { kind: "transparent" }
  | { kind: "color"; value: string }
  | { kind: "gradient"; from: string; to: string }
  | { kind: "image"; url: string };

const COLORS = ["#ffffff", "#000000", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
const GRADIENTS: [string, string][] = [
  ["#7d2ae8", "#00c4cc"],
  ["#f97316", "#ec4899"],
  ["#0ea5e9", "#22c55e"],
  ["#111827", "#6b7280"],
];

function previewStyle(bg: Bg): React.CSSProperties {
  switch (bg.kind) {
    case "color":
      return { backgroundColor: bg.value, backgroundImage: "none" };
    case "gradient":
      return {
        backgroundImage: `linear-gradient(135deg, ${bg.from}, ${bg.to})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    case "image":
      return { backgroundImage: `url(${bg.url})`, backgroundSize: "cover", backgroundPosition: "center" };
    default:
      return {};
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

async function compose(resultUrl: string, bg: Bg): Promise<Blob> {
  const fg = await loadImage(resultUrl);
  const w = fg.naturalWidth;
  const h = fg.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  if (bg.kind === "color") {
    ctx.fillStyle = bg.value;
    ctx.fillRect(0, 0, w, h);
  } else if (bg.kind === "gradient") {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, bg.from);
    g.addColorStop(1, bg.to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (bg.kind === "image") {
    const img = await loadImage(bg.url);
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight); // cover
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }
  ctx.drawImage(fg, 0, 0, w, h);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), "image/png"),
  );
}

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
  const [bg, setBg] = useState<Bg>({ kind: "transparent" });
  const [custom, setCustom] = useState("#ffffff");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bgImageUrl = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (bgImageUrl.current) URL.revokeObjectURL(bgImageUrl.current);
    },
    [],
  );

  function pickImage(file?: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    if (bgImageUrl.current) URL.revokeObjectURL(bgImageUrl.current);
    const url = URL.createObjectURL(file);
    bgImageUrl.current = url;
    setBg({ kind: "image", url });
  }

  async function download() {
    if (bg.kind === "transparent") return;
    setBusy(true);
    try {
      const blob = await compose(resultUrl, bg);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName.replace("-no-bg", "-new-bg");
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setBusy(false);
    }
  }

  const isSel = (b: Bg) => JSON.stringify(b) === JSON.stringify(bg);

  return (
    <>
      <div className="result-layout">
        <div className="compare" style={previewStyle(bg)}>
          {/* Cutout (over checkerboard / chosen background) is the base layer */}
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

        <aside className="bg-panel">
          <h3>Background</h3>

          <div className="swatches">
            <button
              type="button"
              className={`swatch transparent${bg.kind === "transparent" ? " sel" : ""}`}
              title="Transparent"
              aria-label="Transparent"
              onClick={() => setBg({ kind: "transparent" })}
            />
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch${isSel({ kind: "color", value: c }) ? " sel" : ""}`}
                style={{ background: c }}
                title={c}
                aria-label={`Color ${c}`}
                onClick={() => setBg({ kind: "color", value: c })}
              />
            ))}
            <label
              className={`swatch picker${bg.kind === "color" && !COLORS.includes(bg.value) ? " sel" : ""}`}
              title="Custom color"
            >
              <input
                type="color"
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value);
                  setBg({ kind: "color", value: e.target.value });
                }}
              />
            </label>
          </div>

          <h4>Gradients</h4>
          <div className="swatches">
            {GRADIENTS.map(([from, to]) => (
              <button
                key={from + to}
                type="button"
                className={`swatch${isSel({ kind: "gradient", from, to }) ? " sel" : ""}`}
                style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
                aria-label={`Gradient ${from} to ${to}`}
                onClick={() => setBg({ kind: "gradient", from, to })}
              />
            ))}
          </div>

          <h4>Image</h4>
          <button type="button" className="btn secondary full" onClick={() => fileRef.current?.click()}>
            Upload background image
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              pickImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </aside>
      </div>

      <div className="actions">
        {bg.kind === "transparent" ? (
          <a className="btn" href={resultUrl} download={downloadName}>Download PNG</a>
        ) : (
          <button className="btn" onClick={download} disabled={busy}>
            {busy ? "Preparing…" : "Download with background"}
          </button>
        )}
        <button className="btn secondary" onClick={onReset}>Try another</button>
      </div>
    </>
  );
}
