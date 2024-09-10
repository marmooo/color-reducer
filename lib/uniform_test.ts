import { UniformQuantization } from "./uniform.ts";
import { assertEquals } from "@std/assert";

function getRandomImageData(width: number, height: number): ImageData {
  const manyColors = new Uint32Array(width * height);
  for (let i = 0; i < manyColors.length; i++) {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    const a = 255;
    manyColors[i] = (a << 24) | (b << 16) | (g << 8) | r;
  }
  const bitmap = new Uint8ClampedArray(manyColors.buffer);
  return new ImageData(bitmap, width, height);
}

Deno.test("Simple1", () => {
  const bitmap = new Uint8ClampedArray(4);
  const imageData = new ImageData(bitmap, 1, 1);
  const uniform = new UniformQuantization(imageData);
  assertEquals(uniform.getIndexedImage(256)[0], 0);
  assertEquals(uniform.getReplaceColors(256).length, 216);
});
Deno.test("Simple2", () => {
  const bitmap = new Uint8ClampedArray(16);
  for (let i = 0; i < 4; i++) {
    bitmap[i] = 255;
  }
  const imageData = new ImageData(bitmap, 2, 2);
  const uniform = new UniformQuantization(imageData);
  assertEquals(uniform.getIndexedImage(256)[0], 215);
  assertEquals(uniform.getReplaceColors(256).length, 216);
});
Deno.test("Many colors", () => {
  const imageData = getRandomImageData(64, 64);
  const uniform = new UniformQuantization(imageData);
  assertEquals(uniform.getReplaceColors(32).length, 27);
});
