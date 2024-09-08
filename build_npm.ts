import { copySync } from "jsr:@std/fs/copy";
import { build, emptyDir } from "jsr:@deno/dnt";

await emptyDir("./npm");

await build({
  entryPoints: [
    "./lib/mod.ts",
  ],
  outDir: "./npm",
  importMap: "deno.json",
  compilerOptions: {
    lib: ["ESNext"],
  },
  shims: {
    deno: true,
    custom: [{
      module: "./lib/imagedata.ts",
      globalNames: ["ImageData"],
    }],
  },
  package: {
    name: "@marmooo/color-reducer",
    version: "0.0.5",
    description: "Reduce colors of images.",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/marmooo/color-reducer.git",
    },
    bugs: {
      url: "https://github.com/marmooo/color-reducer/issues",
    },
  },
  postBuild() {
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
    copySync("test", "npm/esm/test");
    copySync("test", "npm/script/test");
  },
});
