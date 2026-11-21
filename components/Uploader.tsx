"use client";

import { useRef, useState } from "react";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
export const MAX_BYTES = 10 * 1024 * 1024;

export default function Uploader({
  onFile,
  onError,
}: {
  onFile: (file: File) => void;
  onError: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function handle(file?: File | null) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return onError("Please upload a PNG, JPG or WEBP image.");
    if (file.size > MAX_BYTES) return onError("Image is too large. Max size is 10 MB.");
    onFile(file);
  }

  return (
    <div
      className={`drop${over ? " over" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files?.[0]); }}
    >
      <button type="button" className="btn">Upload image</button>
      <p>or drag and drop a PNG, JPG or WEBP (max 10 MB)</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        hidden
        onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }}
      />
    </div>
  );
}
