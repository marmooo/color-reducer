import { MedianCut } from "./mediancut.ts";
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

Deno.test("Simple", () => {
  const bitmap = new Uint8ClampedArray(4);
  const imageData = new ImageData(bitmap, 1, 1);
  const medianCut = new MedianCut(imageData);
  medianCut.apply(256);
  assertEquals(medianCut.cubes.length, 1);
  assertEquals(medianCut.getIndexedImage()[0], 0);
  assertEquals(medianCut.replaceColors.length, 1);
});
Deno.test("Many colors", () => {
  const imageData = getRandomImageData(64, 64);
  const medianCut = new MedianCut(imageData);
  medianCut.apply(32);
  assertEquals(medianCut.cubes.length, 32);
  assertEquals(medianCut.replaceColors.length, 32);
});
Deno.test("Cached splitCubes()", () => {
  const imageData = getRandomImageData(64, 64);
  const medianCut1 = new MedianCut(imageData);
  const medianCut2 = new MedianCut(imageData);
  medianCut1.apply(64);
  medianCut2.apply(16);
  medianCut2.apply(32);
  medianCut2.apply(64);
  for (let i = 0; i < medianCut1.cubes.length; i++) {
    const cube1 = medianCut1.cubes[i];
    const cube2 = medianCut2.cubes[i];
    const colors1 = cube1.colors.map(([r, g, b, a]) => {
      return (a << 24) | (b << 16) | (g << 8) | r;
    });
    const colors2 = cube2.colors.map(([r, g, b, a]) => {
      return (a << 24) | (b << 16) | (g << 8) | r;
    });
    assertEquals(colors1.length, colors2.length);
    for (let j = 0; j < colors1.length; j++) {
      assertEquals(colors1[j], colors2[j]);
    }
  }
});
Deno.test("Cached mergeCubes()", () => {
  const imageData = getRandomImageData(64, 64);
  const medianCut1 = new MedianCut(imageData);
  const medianCut2 = new MedianCut(imageData);
  medianCut1.apply(32);
  medianCut2.apply(64);
  assertEquals(medianCut2.cubes.length, 64);
  assertEquals(medianCut2.splitLogs.length, 64 - 1);
  medianCut2.apply(16);
  assertEquals(medianCut2.cubes.length, 16);
  assertEquals(medianCut2.splitLogs.length, 16 - 1);
  medianCut2.apply(48);
  assertEquals(medianCut2.cubes.length, 48);
  assertEquals(medianCut2.splitLogs.length, 48 - 1);
  medianCut2.apply(32);
  assertEquals(medianCut2.cubes.length, 32);
  assertEquals(medianCut2.splitLogs.length, 32 - 1);
  for (let i = 0; i < medianCut1.cubes.length; i++) {
    const cube1 = medianCut1.cubes[i];
    const cube2 = medianCut2.cubes[i];
    assertEquals(cube1.total, cube2.total);
    assertEquals(cube1.sortChannel, cube2.sortChannel);
    assertEquals(cube1.mainChannel, cube2.mainChannel);
    const colors1 = cube1.colors.map(([r, g, b, a]) => {
      return (a << 24) | (b << 16) | (g << 8) | r;
    });
    const colors2 = cube2.colors.map(([r, g, b, a]) => {
      return (a << 24) | (b << 16) | (g << 8) | r;
    });
    assertEquals(colors1.length, colors2.length);
    for (let j = 0; j < colors1.length; j++) {
      assertEquals(colors1[j], colors2[j]);
    }
  }
});
Deno.test("No chache", () => {
  const imageData = getRandomImageData(64, 64);
  const medianCut = new MedianCut(imageData, { cache: false });
  medianCut.apply(32);
  assertEquals(medianCut.cubes.length, 32);
  assertEquals(medianCut.replaceColors.length, 32);
  medianCut.apply(64);
  assertEquals(medianCut.cubes.length, 64);
  assertEquals(medianCut.replaceColors.length, 64);
  medianCut.apply(32);
  assertEquals(medianCut.cubes.length, 32);
  assertEquals(medianCut.replaceColors.length, 32);
});
