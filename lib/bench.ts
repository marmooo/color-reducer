import { MedianCut, OctreeQuantization, UniformQuantization } from "./mod.ts";
import { getPixels } from "get_pixels";
import cv from "@techstark/opencv-js";

type GetPixelsImageData = {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
};

function uniformQuantizationByOpencvjs(
  imageData: GetPixelsImageData,
  maxColors: number,
): Uint8ClampedArray {
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
  return new Uint8ClampedArray(data);
}

const file = await Deno.readFile("test/wires.jpg");
const image = await getPixels(file);

for (const colors of [16, 64, 256]) {
  Deno.bench(`Uniform quantization by opencv.js (${colors}colors)`, (b) => {
    b.start();
    uniformQuantizationByOpencvjs(image, colors);
    b.end();
  });
  Deno.bench(`Uniform quantization (${colors}colors)`, (b) => {
    b.start();
    const uniform = new UniformQuantization(
      image.data,
      image.width,
      image.height,
    );
    uniform.apply(colors);
    b.end();
  });
  Deno.bench(`Octree quantization (${colors}colors)`, (b) => {
    b.start();
    const octree = new OctreeQuantization(
      image.data,
      image.width,
      image.height,
    );
    octree.apply(colors);
    b.end();
  });
  Deno.bench(`Median cut (${colors}colors)`, (b) => {
    b.start();
    const medianCut = new MedianCut(image.data, image.width, image.height, {
      cache: false,
    });
    medianCut.apply(colors);
    b.end();
  });
  Deno.bench(`Cached median cut (${colors}colors)`, (b) => {
    b.start();
    const medianCut = new MedianCut(image.data, image.width, image.height);
    medianCut.apply(colors);
    b.end();
  });
}
