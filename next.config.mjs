import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // static site, deployable on Netlify
  images: { unoptimized: true },
  webpack: (config) => {
    // Browser-only build: don't bundle Node-native modules.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@huggingface/transformers$": path.resolve("node_modules/@huggingface/transformers/dist/transformers.web.js"),
      sharp$: false,
      "onnxruntime-node$": false,
    };
    // Terser can't parse the onnxruntime .mjs asset (uses import.meta); skip minification.
    config.optimization.minimize = false;
    return config;
  },
};

export default nextConfig;
