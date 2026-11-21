import { NextResponse } from "next/server";
import { removeBackgroundHQ } from "@/lib/birefnet";

export const runtime = "nodejs";
export const maxDuration = 120;

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }
  if (!ACCEPTED.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 10 MB)." }, { status: 413 });
  }

  try {
    const png = await removeBackgroundHQ(Buffer.from(await file.arrayBuffer()));
    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("remove-bg failed:", err);
    return NextResponse.json({ error: "Could not process this image." }, { status: 500 });
  }
}
