import { copySync } from "@std/fs";
import { build, emptyDir } from "@deno/dnt";

await emptyDir("./npm");

await build({
  entryPoints: ["./lib/mod.ts"],
  outDir: "./npm",
  importMap: "deno.json",
  compilerOptions: {
    lib: ["ESNext"],
  },
  shims: {
    deno: true,
  },
  package: {
    name: "@marmooo/color-reducer",
    version: "0.1.1",
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
