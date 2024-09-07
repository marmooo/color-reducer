import {
  MedianCut,
  OctreeQuantization,
  UniformQuantization,
} from "./mod.js";
import { getPixels } from "get_pixels";
import cv from "@techstark/opencv-js";

function getImageData(image) {
  const { data, width, height } = image;
  const uint8 = new Uint8ClampedArray(data.length);
  uint8.set(image.data);
  return new ImageData(uint8, width, height);
}

function uniformQuantizationByOpencvjs(imageData, maxColors) {
  const cbrtColors = Math.floor(Math.cbrt(maxColors));
  const step = 256 / cbrtColors;
  const center = step / 2;
  const colorArray = new Array(256);
  for (let i = 0; i < colorArray.length; i++) {
    colorArray[i] = Math.round(Math.floor(i / step) * step + center);
  }
  const src = cv.matFromImageData(imageData);
  const lut = cv.matFromArray(1, 256, cv.CV_8U, colorArray);
  cv.LUT(src, lut, src);
  const data = src.data;
  lut.delete();
  src.delete();
  return data;
}

const file = await Deno.readFile("test/wires.jpg");
const image = await getPixels(file);

for (const colors of [16, 64, 256]) {
  Deno.bench(`Uniform quantization by opencv.js (${colors}colors)`, (b) => {
    const imageData = getImageData(image);
    b.start();
    uniformQuantizationByOpencvjs(imageData, colors);
    b.end();
  });
  Deno.bench(`Uniform quantization (${colors}colors)`, (b) => {
    const imageData = getImageData(image);
    b.start();
    const uniform = new UniformQuantization(imageData);
    uniform.apply(colors);
    b.end();
  });
  Deno.bench(`Octree quantization (${colors}colors)`, (b) => {
    const imageData = getImageData(image);
    b.start();
    const octree = new OctreeQuantization(imageData);
    octree.apply(colors);
    b.end();
  });
  Deno.bench(`Median cut (${colors}colors)`, (b) => {
    const imageData = getImageData(image);
    b.start();
    const medianCut = new MedianCut(imageData, { cache: false });
    medianCut.apply(colors);
    b.end();
  });
  Deno.bench(`Cached Median cut (${colors}colors)`, (b) => {
    const imageData = getImageData(image);
    b.start();
    const medianCut = new MedianCut(imageData);
    medianCut.apply(colors);
    b.end();
  });
}
