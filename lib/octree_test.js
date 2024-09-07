import { OctreeQuantization } from "./octree.js";
import { assertEquals } from "@std/assert";

function getRandomImageData(width, height) {
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

function isWithinRange(num, max) {
  return max - 7 <= num && num <= max;
}

Deno.test("Simple", () => {
  const bitmap = new Uint8ClampedArray(4);
  const imageData = new ImageData(bitmap, 1, 1);
  const octree = new OctreeQuantization(imageData);
  octree.apply(256);
  assertEquals(octree.cubes.length, 1);
  assertEquals(octree.getIndexedImage()[0], 0);
  assertEquals(octree.replaceColors.length, 1);
});
Deno.test("Many colors", () => {
  const imageData = getRandomImageData(64, 64);
  const octree = new OctreeQuantization(imageData);
  octree.apply(32);
  assertEquals(isWithinRange(octree.cubes.length, 32), true);
  assertEquals(isWithinRange(octree.replaceColors.length, 32), true);
});
Deno.test("Cached splitCubes()", () => {
  const imageData = getRandomImageData(64, 64);
  const octree1 = new OctreeQuantization(imageData);
  const octree2 = new OctreeQuantization(imageData);
  octree1.apply(64);
  octree2.apply(16);
  octree2.apply(32);
  octree2.apply(64);
  for (let i = 0; i < octree1.cubes.length; i++) {
    const cube1 = octree1.cubes[i];
    const cube2 = octree2.cubes[i];
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
  const octree1 = new OctreeQuantization(imageData);
  const octree2 = new OctreeQuantization(imageData);
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
    const colors1 = cube1.colors.map(([r, g, b, a]) => {
      return (a << 24) | (b << 16) | (g << 8) | r;
    }).sort();
    const colors2 = cube2.colors.map(([r, g, b, a]) => {
      return (a << 24) | (b << 16) | (g << 8) | r;
    }).sort();
    assertEquals(colors1.length, colors2.length);
    for (let j = 0; j < colors1.length; j++) {
      assertEquals(colors1[j], colors2[j]);
    }
  }
});
