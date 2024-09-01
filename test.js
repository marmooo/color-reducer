import {
  MedianCut,
  OctreeQuantization,
  UniformQuantization,
} from "./lib/mod.js";
import { assertEquals } from "@std/assert";

const bitmap1 = new Uint8ClampedArray(4);
const imageData1 = new ImageData(bitmap1, 1, 1);
const manyColors = new Uint32Array(4096);
for (let i = 0; i < manyColors.length; i++) {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  const a = 0xFF;
  manyColors[i] = (a << 24) | (b << 16) | (g << 8) | r;
}
const bitmap2 = new Uint8ClampedArray(manyColors.buffer);
const imageData2 = new ImageData(bitmap2, 64, 64);

const medianCut1 = new MedianCut(imageData1);
medianCut1.apply(256);
assertEquals(medianCut1.getIndexedImage()[0], 0);
assertEquals(medianCut1.replaceColors.length, 1);
const medianCut2 = new MedianCut(imageData2);
medianCut2.apply(32);
assertEquals(medianCut2.replaceColors.length, 32);

const uniform1 = new UniformQuantization(imageData1);
const indexed1 = uniform1.getIndexedImage(256);
const palette1 = uniform1.getReplaceColors(256);
assertEquals(indexed1[0], 0);
assertEquals(palette1.length, 216);
const uniform2 = new UniformQuantization(imageData1);
const indexed2 = uniform2.getIndexedImage(256);
const palette2 = uniform2.getReplaceColors(32);
assertEquals(indexed2[0], 0);
assertEquals(palette2.length, 27);

const octree1 = new OctreeQuantization(imageData1);
octree1.apply(256);
assertEquals(octree1.getIndexedImage()[0], 0);
assertEquals(octree1.replaceColors.length, 1);
const octree2 = new OctreeQuantization(imageData2);
octree2.apply(32);
assertEquals(octree2.replaceColors.length <= 32, true);
