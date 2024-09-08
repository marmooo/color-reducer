import { MedianCut, OctreeQuantization, UniformQuantization } from "./mod.ts";
import { getPixels } from "get_pixels";
import cv from "@techstark/opencv-js";

type GetPixelsImageData = {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
};

function getImageData(image: GetPixelsImageData): ImageData {
  const { data, width, height } = image;
  const uint8 = new Uint8ClampedArray(data.length);
  uint8.set(image.data);
  return new ImageData(uint8, width, height);
}

function uniformQuantizationByOpencvjs(
  imageData: ImageData,
  maxColors: number,
): Uint8Array {
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

function calcMSE(data1: Uint8ClampedArray, data2: Uint8ClampedArray): number {
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
    const imageData = getImageData(image);
    const data = uniformQuantizationByOpencvjs(imageData, colors);
    const mse = calcMSE(new Uint8ClampedArray(data), imageData.data);
    console.log(name, mse);
  });
  measure(`Uniform quantization (${colors}colors)`, (name) => {
    const imageData = getImageData(image);
    const uniform = new UniformQuantization(imageData);
    const newImageData = uniform.apply(colors);
    const mse = calcMSE(newImageData.data, imageData.data);
    console.log(name, mse);
  });
  measure(`Octree quantization (${colors}colors)`, (name) => {
    const imageData = getImageData(image);
    const octree = new OctreeQuantization(imageData);
    const newImageData = octree.apply(colors);
    const mse = calcMSE(newImageData.data, imageData.data);
    console.log(name, mse);
  });
  measure(`Median cut (${colors}colors)`, (name) => {
    const imageData = getImageData(image);
    const medianCut = new MedianCut(imageData, { cache: false });
    const newImageData = medianCut.apply(colors);
    const mse = calcMSE(newImageData.data, imageData.data);
    console.log(name, mse);
  });
  measure(`Cached median cut (${colors}colors)`, (name) => {
    const imageData = getImageData(image);
    const medianCut = new MedianCut(imageData);
    const newImageData = medianCut.apply(colors);
    const mse = calcMSE(newImageData.data, imageData.data);
    console.log(name, mse);
  });
}
