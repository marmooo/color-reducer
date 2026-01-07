import { MedianCut, OctreeQuantization, UniformQuantization } from "./mod.ts";
import { getPixels } from "@unpic/pixels";
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

function calcMSE(data1: Uint8ClampedArray, data2: Uint8Array): number {
  let error = 0;
  for (let i = 0; i < data1.length; i++) {
    error += Math.pow(data1[i] - data2[i], 2);
  }
  return error / data1.length;
}

function measure(name: string, callback: (name: string) => void): void {
  callback(name);
}

const file = await Deno.readFile("test/wires.jpg");
const image = await getPixels(file);

for (const colors of [16, 64, 256]) {
  measure(`Uniform quantization by opencv.js (${colors}colors)`, (name) => {
    const data = uniformQuantizationByOpencvjs(image, colors);
    const mse = calcMSE(data, image.data);
    console.log(name, mse);
  });
  measure(`Uniform quantization (${colors}colors)`, (name) => {
    const uniform = new UniformQuantization(
      image.data,
      image.width,
      image.height,
    );
    const newImage = uniform.apply(colors);
    const mse = calcMSE(newImage, image.data);
    console.log(name, mse);
  });
  measure(`Octree quantization (${colors}colors)`, (name) => {
    const octree = new OctreeQuantization(
      image.data,
      image.width,
      image.height,
    );
    const newImage = octree.apply(colors);
    const mse = calcMSE(newImage, image.data);
    console.log(name, mse);
  });
  measure(`Median cut (${colors}colors)`, (name) => {
    const medianCut = new MedianCut(image.data, image.width, image.height, {
      cache: false,
    });
    const newImage = medianCut.apply(colors);
    const mse = calcMSE(newImage, image.data);
    console.log(name, mse);
  });
  measure(`Cached median cut (${colors}colors)`, (name) => {
    const medianCut = new MedianCut(image.data, image.width, image.height);
    const newImage = medianCut.apply(colors);
    const mse = calcMSE(newImage, image.data);
    console.log(name, mse);
  });
}
