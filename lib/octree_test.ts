import { OctreeQuantization } from "./octree.ts";
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

function isWithinRange(num: number, max: number) {
  return max - 7 <= num && num <= max;
}

Deno.test("Simple1", () => {
  const image = new Uint8ClampedArray(4);
  const octree = new OctreeQuantization(image, 1, 1);
  octree.apply(256);
  assertEquals(octree.cubes.length, 1);
  assertEquals(octree.getIndexedImage()[0], 0);
  assertEquals(octree.replaceColors.length, 1);
});
Deno.test("Simple2", () => {
  const image = new Uint8ClampedArray(16);
  for (let i = 0; i < 4; i++) {
    image[i] = 255;
  }
  const medianCut = new OctreeQuantization(image, 2, 2);
  medianCut.apply(256);
  assertEquals(medianCut.cubes.length, 2);
  assertEquals(medianCut.getIndexedImage()[0], 1);
  assertEquals(medianCut.replaceColors.length, 2);
});
Deno.test("Many colors", () => {
  const width = 64;
  const height = 64;
  const image = getRandomImage(width, height);
  const octree = new OctreeQuantization(image, width, height);
  octree.apply(32);
  assertEquals(isWithinRange(octree.cubes.length, 32), true);
  assertEquals(isWithinRange(octree.replaceColors.length, 32), true);
});
Deno.test("Cached splitCubes()", () => {
  const width = 64;
  const height = 64;
  const image = getRandomImage(width, height);
  const octree1 = new OctreeQuantization(image, width, height);
  const octree2 = new OctreeQuantization(image, width, height);
  octree1.apply(64);
  octree2.apply(16);
  octree2.apply(32);
  octree2.apply(64);
  for (let i = 0; i < octree1.cubes.length; i++) {
    const cube1 = octree1.cubes[i];
    const cube2 = octree2.cubes[i];
    assertEquals(cube1.total, cube2.total);
    assertEquals(cube1.colors.length, cube2.colors.length);
    for (let j = 0; j < cube1.colors.length; j++) {
      assertEquals(cube1.colors[j][0], cube2.colors[j][0]);
    }
  }
});
Deno.test("Cached mergeCubes()", () => {
  const width = 64;
  const height = 64;
  const image = getRandomImage(width, height);
  const octree1 = new OctreeQuantization(image, width, height);
  const octree2 = new OctreeQuantization(image, width, height);
  octree1.apply(32);
  octree2.apply(64);
  assertEquals(isWithinRange(octree2.cubes.length, 64), true);
  octree2.apply(16);
  assertEquals(isWithinRange(octree2.cubes.length, 16), true);
  octree2.apply(48);
  assertEquals(isWithinRange(octree2.cubes.length, 48), true);
  octree2.apply(32);
  assertEquals(isWithinRange(octree2.cubes.length, 32), true);
  for (let i = 0; i < octree1.cubes.length; i++) {
    const cube1 = octree1.cubes[i];
    const cube2 = octree2.cubes[i];
    assertEquals(cube1.total, cube2.total);
    assertEquals(cube1.colors.length, cube2.colors.length);
    const colors1 = cube1.colors.sort((a, b) => a[0] - b[0]);
    const colors2 = cube1.colors.sort((a, b) => a[0] - b[0]);
    for (let j = 0; j < colors1.length; j++) {
      assertEquals(colors1[j][0], colors2[j][0]);
    }
  }
});
