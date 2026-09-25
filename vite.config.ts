import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Preenche o service worker (public/sw.js) com a lista de arquivos do build, para o
 * app abrir offline já depois da primeira visita. O nome do cache muda a cada build.
 */
function precacheSw(): Plugin {
  let files: string[] = [];
  let outDir = "dist";
  return {
    name: "lockerdex-precache",
    apply: "build",
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
    },
    generateBundle(_, bundle) {
      files = Object.keys(bundle).filter((f) => !f.endsWith(".map"));
    },
    closeBundle() {
      const swPath = resolve(outDir, "sw.js");
      const list = ["./", ...files.map((f) => `./${f}`), "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
      const hash = createHash("sha1").update(list.join("|")).digest("hex").slice(0, 10);
      const sw = readFileSync(swPath, "utf8")
        .replace('const CACHE = "lockerdex-dev";', `const CACHE = "lockerdex-${hash}";`)
        .replace("const PRECACHE = [];", `const PRECACHE = ${JSON.stringify(list)};`);
      writeFileSync(swPath, sw);
    },
  };
}

// base relativo: o build funciona em qualquer subpasta (GitHub Pages, Netlify etc.).
export default defineConfig({
  base: "./",
  plugins: [react(), precacheSw()],
});
