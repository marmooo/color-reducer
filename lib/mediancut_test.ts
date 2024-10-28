import { MedianCut } from "./mediancut.ts";
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
  const medianCut = new MedianCut(image, 1, 1);
  medianCut.apply(256);
  assertEquals(medianCut.cubes.length, 1);
  assertEquals(medianCut.getIndexedImage()[0], 0);
  assertEquals(medianCut.replaceColors.length, 1);
});
Deno.test("Simple2", () => {
  const image = new Uint8ClampedArray(16);
  for (let i = 0; i < 4; i++) {
    image[i] = 255;
  }
  const medianCut = new MedianCut(image, 2, 2);
  medianCut.apply(256);
  assertEquals(medianCut.cubes.length, 2);
  assertEquals(medianCut.getIndexedImage()[0], 1);
  assertEquals(medianCut.replaceColors.length, 2);
});
Deno.test("Many colors", () => {
  const width = 64;
  const height = 64;
  const image = getRandomImage(64, 64);
  const medianCut = new MedianCut(image, width, height);
  medianCut.apply(32);
  assertEquals(medianCut.cubes.length, 32);
  assertEquals(medianCut.replaceColors.length, 32);
});
Deno.test("Cached splitCubes()", () => {
  const width = 64;
  const height = 64;
  const image = getRandomImage(64, 64);
  const medianCut1 = new MedianCut(image, width, height);
  const medianCut2 = new MedianCut(image, width, height);
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
  const width = 64;
  const height = 64;
  const image = getRandomImage(width, height);
  const medianCut1 = new MedianCut(image, width, height);
  const medianCut2 = new MedianCut(image, width, height);
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
  const width = 64;
  const height = 64;
  const image = getRandomImage(width, height);
  const medianCut = new MedianCut(image, width, height, { cache: false });
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
