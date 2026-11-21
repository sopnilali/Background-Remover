// Runs entirely in the browser (transformers.js + ONNX Runtime Web). No server needed.
// RMBG-1.4 (BRIA): light enough for the browser. NOTE: license is non-commercial.
const MODEL_ID = "briaai/RMBG-1.4";

type Loaded = { model: any; processor: any };
let loading: Promise<Loaded> | null = null;

export type ProgressInfo = { status: string; file?: string; progress?: number };

function load(onProgress?: (p: ProgressInfo) => void): Promise<Loaded> {
  if (!loading) {
    loading = (async () => {
      const { AutoModel, AutoProcessor, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      // navigator.gpu can exist without a usable adapter, so verify before choosing WebGPU.
      let hasGpu = false;
      try {
        hasGpu = !!(await (navigator as any).gpu?.requestAdapter());
      } catch {}
      const open = (device: string) =>
        AutoModel.from_pretrained(MODEL_ID, {
          // fp16 on GPU; 8-bit quantized (~44 MB) on CPU keeps memory low.
          dtype: device === "webgpu" ? "fp16" : "q8",
          device,
          // Reduce peak memory: wasm has a 4 GB ceiling and 1024x1024 activations are big.
          session_options: { enableCpuMemArena: false, enableMemPattern: false },
          progress_callback: onProgress,
        } as any);
      let model: any;
      try {
        model = await open(hasGpu ? "webgpu" : "wasm");
      } catch (e) {
        if (!hasGpu) throw e;
        model = await open("wasm"); // WebGPU failed at load time -> CPU fallback
      }
      const processor = await AutoProcessor.from_pretrained(MODEL_ID);
      return { model, processor };
    })().catch((e) => {
      loading = null; // allow retry
      throw e;
    });
  }
  return loading;
}

export async function removeBackground(file: File, onProgress?: (p: ProgressInfo) => void): Promise<Blob> {
  const { RawImage } = await import("@huggingface/transformers");
  const { model, processor } = await load(onProgress);

  const image = await RawImage.fromBlob(file);
  const { width, height } = image;
  const { pixel_values } = await processor(image);

  const inputName = model.sessions?.model?.inputNames?.[0] ?? "input_image";
  const outputs = await model({ [inputName]: pixel_values });
  const out = outputs[Object.keys(outputs)[0]];

  // RMBG-1.4 already outputs 0..1 probabilities -> 0..255 mask, resized to the original size.
  const mask = await RawImage.fromTensor(out[0].mul(255).to("uint8")).resize(width, height);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const bitmap = await createImageBitmap(file);
  ctx.drawImage(bitmap, 0, 0, width, height);
  const px = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < width * height; i++) px.data[i * 4 + 3] = mask.data[i];
  ctx.putImageData(px, 0, 0);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image."))), "image/png"),
  );
}
