import { MedianCut } from "./mediancut.ts";

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

const imageData = getRandomImageData(512, 512);
const medianCut = new MedianCut(imageData);

Deno.bench("Stable sort()", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  const firstSortIndex = 0;
  const secondSortIndex = (firstSortIndex + 1) % 3;
  const thirdSortIndex = (firstSortIndex + 2) % 3;
  colors.sort((a, b) => {
    if (a[firstSortIndex] !== b[firstSortIndex]) {
      return a[firstSortIndex] - b[firstSortIndex];
    }
    if (a[secondSortIndex] !== b[secondSortIndex]) {
      return a[secondSortIndex] - b[secondSortIndex];
    }
    return a[thirdSortIndex] - b[thirdSortIndex];
  });
});
Deno.bench("Unstable sort()", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  colors.sort((a, b) => a[0] - b[0]);
});
Deno.bench("Stable bucket sort", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  medianCut.stableBucketSort(colors, 0);
});
Deno.bench("Unstable buckets sort", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  medianCut.unstableBucketSort(colors, 0);
});
