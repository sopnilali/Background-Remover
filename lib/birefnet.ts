import { AutoModel, AutoProcessor, RawImage } from "@huggingface/transformers";
import sharp from "sharp";

// BiRefNet: high-accuracy dichotomous segmentation (MIT license).
const MODEL_ID = process.env.BG_MODEL ?? "onnx-community/BiRefNet_lite-ONNX";

type Loaded = { model: any; processor: any };
let loading: Promise<Loaded> | null = null;

function load(): Promise<Loaded> {
  if (!loading) {
    loading = (async () => {
      const model = await AutoModel.from_pretrained(MODEL_ID, {
        dtype: "fp32",
        session_options: { enableCpuMemArena: false, enableMemPattern: false },
      });
      const processor = await AutoProcessor.from_pretrained(MODEL_ID);
      return { model, processor };
    })().catch((e) => {
      loading = null; // allow retry after a failed load
      throw e;
    });
  }
  return loading;
}

export async function removeBackgroundHQ(input: Buffer): Promise<Buffer> {
  const { model, processor } = await load();

  // Normalise orientation + colour space, keep original resolution for the output.
  const rgb = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = rgb.info;
  const src = await sharp(rgb.data, { raw: { width, height, channels: 4 } })
    .removeAlpha()
    .raw()
    .toBuffer();

  const image = new RawImage(new Uint8ClampedArray(src), width, height, 3);
  const { pixel_values } = await processor(image);

  const inputName = model.sessions?.model?.inputNames?.[0] ?? "input_image";
  const outputs = await model({ [inputName]: pixel_values });
  const out = outputs[Object.keys(outputs)[0]];

  // Sigmoid -> 0..255 mask, resized back to the original image size (bicubic = smooth edges).
  const mask = await RawImage.fromTensor(out[0].sigmoid().mul(255).to("uint8")).resize(width, height);

  return sharp(src, { raw: { width, height, channels: 3 } })
    .joinChannel(Buffer.from(mask.data), { raw: { width, height, channels: 1 } })
    .png({ compressionLevel: 6 })
    .toBuffer();
}
