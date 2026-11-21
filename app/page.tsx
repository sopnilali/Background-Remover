"use client";

import { useEffect, useRef, useState } from "react";
import Uploader from "@/components/Uploader";
import ResultView from "@/components/ResultView";
import Progress from "@/components/Progress";
import { removeBackground } from "@/lib/removeBg";

type State =
  | { phase: "idle" }
  | { phase: "loading"; originalUrl: string }
  | { phase: "done"; originalUrl: string; resultUrl: string; name: string };

export default function Home() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [error, setError] = useState<string | null>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function track(url: string) {
    urls.current.push(url);
    return url;
  }

  async function onFile(file: File) {
    setError(null);
    const originalUrl = track(URL.createObjectURL(file));
    setState({ phase: "loading", originalUrl });
    try {
      const blob = await removeBackground(file);
      const resultUrl = track(URL.createObjectURL(blob));
      const base = file.name.replace(/\.[^.]+$/, "") || "image";
      setState({ phase: "done", originalUrl, resultUrl, name: `${base}-no-bg.png` });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setState({ phase: "idle" });
    }
  }

  function reset() {
    setError(null);
    setState({ phase: "idle" });
  }

  return (
    <main>
      <h1>Background Remover</h1>
      <p className="sub">Remove the background from any image for free, in seconds.</p>
      <div className="card">
        {state.phase === "idle" && <Uploader onFile={onFile} onError={setError} />}
        {state.phase === "loading" && <Progress />}
        {state.phase === "done" && (
          <ResultView
            originalUrl={state.originalUrl}
            resultUrl={state.resultUrl}
            downloadName={state.name}
            onReset={reset}
          />
        )}
        {error && <div className="error">{error}</div>}
      </div>
    </main>
  );
}
