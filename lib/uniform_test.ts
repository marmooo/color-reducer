import { UniformQuantization } from "./uniform.ts";
import { assertEquals } from "@std/assert";

function getRandomImage(width: number, height: number): Uint8ClampedArray {
  const manyColors = new Uint32Array(width * height);
  for (let i = 0; i < manyColors.length; i++) {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    const a = 255;
    manyColors[i] = (a << 24) | (b << 16) | (g << 8) | r;
  }
  return new Uint8ClampedArray(manyColors.buffer);
}

Deno.test("Simple1", () => {
  const image = new Uint8ClampedArray(4);
  const uniform = new UniformQuantization(image, 1, 1);
  assertEquals(uniform.getIndexedImage(256)[0], 0);
  assertEquals(uniform.getReplaceColors(256).length, 216);
});
Deno.test("Simple2", () => {
  const image = new Uint8ClampedArray(16);
  for (let i = 0; i < 4; i++) {
    image[i] = 255;
  }
  const uniform = new UniformQuantization(image, 2, 2);
  assertEquals(uniform.getIndexedImage(256)[0], 215);
  assertEquals(uniform.getReplaceColors(256).length, 216);
});
Deno.test("Many colors", () => {
  const width = 64;
  const height = 64;
  const image = getRandomImage(width, height);
  const uniform = new UniformQuantization(image, width, height);
  assertEquals(uniform.getReplaceColors(32).length, 27);
});
