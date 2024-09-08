import { ColorStat, MedianCut } from "./mediancut.ts";

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

function unstableBucketSort(
  colors: ColorStat[],
  sortChannel: number,
): ColorStat[][] {
  const buckets = new Array(256);
  for (let i = 0; i < 256; i++) {
    buckets[i] = [];
  }
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    buckets[color[sortChannel]].push(color);
  }
  return buckets;
}

function stableBucketSort(
  colors: ColorStat[],
  sortChannel: number,
): ColorStat[][] {
  const buckets = unstableBucketSort(colors, sortChannel);
  const secondChannel = (sortChannel + 1) % 3;
  const thirdChannel = (sortChannel + 2) % 3;
  for (let i = 0; i < 256; i++) {
    buckets[i].sort((a: number[], b: number[]) => {
      if (a[secondChannel] !== b[secondChannel]) {
        return a[secondChannel] - b[secondChannel];
      }
      return a[thirdChannel] - b[thirdChannel];
    });
  }
  return buckets;
}

function getMax(arr: ColorStat[], sortChannel: number): number {
  let max = arr[0][sortChannel];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i][sortChannel] > max) {
      max = arr[i][sortChannel];
    }
  }
  return max;
}

function binaryRadixSortByPush(
  arr: ColorStat[],
  sortChannel: number,
  max?: number,
): ColorStat[] {
  if (max === undefined) max = getMax(arr, sortChannel);
  const maxBits = Math.floor(Math.log2(max)) + 1;
  for (let i = 0; i < maxBits; i++) {
    const zeroBucket = [];
    const oneBucket = [];
    for (let j = 0; j < arr.length; j++) {
      if ((arr[j][sortChannel] >> i) & 1) {
        oneBucket.push(arr[j]);
      } else {
        zeroBucket.push(arr[j]);
      }
    }
    arr = zeroBucket.concat(oneBucket);
  }
  return arr;
}

function binaryRadixSortByIndex(
  arr: ColorStat[],
  sortChannel: number,
  max?: number,
): ColorStat[] {
  if (max === undefined) max = getMax(arr, sortChannel);
  const maxBits = Math.floor(Math.log2(max)) + 1;
  const output = new Array(arr.length);
  const count = [0, 0];
  for (let i = 0; i < maxBits; i++) {
    count[0] = 0;
    count[1] = 0;
    for (let j = 0; j < arr.length; j++) {
      const bit = (arr[j][sortChannel] >> i) & 1;
      count[bit]++;
    }
    count[1] += count[0];
    for (let j = arr.length - 1; j >= 0; j--) {
      const bit = (arr[j][sortChannel] >> i) & 1;
      count[bit]--;
      output[count[bit]] = arr[j];
    }
    arr = output.slice();
  }
  return arr;
}

function countingSort(
  arr: ColorStat[],
  exp: number,
  radix: number,
  sortChannel: number,
): ColorStat[] {
  const output = new Array(arr.length);
  const count = new Array(radix);
  for (let i = 0; i < count.length; i++) {
    count[i] = 0;
  }
  for (let i = 0; i < arr.length; i++) {
    const index = Math.floor(arr[i][sortChannel] / exp) % radix;
    count[index]++;
  }
  for (let i = 1; i < radix; i++) {
    count[i] += count[i - 1];
  }
  for (let i = arr.length - 1; i >= 0; i--) {
    const index = Math.floor(arr[i][sortChannel] / exp) % radix;
    output[count[index] - 1] = arr[i];
    count[index]--;
  }
  for (let i = 0; i < arr.length; i++) {
    arr[i] = output[i];
  }
  return arr;
}

function radixSort(
  arr: ColorStat[],
  sortChannel: number,
  radix: number,
  max?: number,
): ColorStat[] {
  if (max === undefined) max = getMax(arr, sortChannel);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= radix) {
    countingSort(arr, exp, radix, sortChannel);
  }
  return arr;
}

function stableCountingSort(
  arr: ColorStat[],
  exp: number,
  radix: number,
  sortChannel: number,
): ColorStat[] {
  const secondChannel = (sortChannel + 1) % 3;
  const thirdChannel = (sortChannel + 2) % 3;
  const output = new Array(arr.length);
  const count = new Array(radix);
  for (let i = 0; i < count.length; i++) {
    count[i] = 0;
  }
  for (let i = 0; i < arr.length; i++) {
    const n = arr[i][sortChannel] << 16 + arr[i][secondChannel] <<
      8 + arr[i][thirdChannel];
    const index = Math.floor(n / exp) % radix;
    count[index]++;
  }
  for (let i = 1; i < radix; i++) {
    count[i] += count[i - 1];
  }
  for (let i = arr.length - 1; i >= 0; i--) {
    const n = arr[i][sortChannel] << 16 + arr[i][secondChannel] <<
      8 + arr[i][thirdChannel];
    const index = Math.floor(n / exp) % radix;
    output[count[index] - 1] = arr[i];
    count[index]--;
  }
  for (let i = 0; i < arr.length; i++) {
    arr[i] = output[i];
  }
  return arr;
}

function stableRadixSort(
  arr: ColorStat[],
  sortChannel: number,
  radix: number,
  max: number,
): ColorStat[] {
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= radix) {
    stableCountingSort(arr, exp, radix, sortChannel);
  }
  return arr;
}

const imageData = getRandomImageData(512, 512);
const medianCut = new MedianCut(imageData);

Deno.bench("Stable sort()", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  const firstChannel = 0;
  const secondChannel = (firstChannel + 1) % 3;
  const thirdChannel = (firstChannel + 2) % 3;
  colors.sort((a, b) => {
    if (a[firstChannel] !== b[firstChannel]) {
      return a[firstChannel] - b[firstChannel];
    }
    if (a[secondChannel] !== b[secondChannel]) {
      return a[secondChannel] - b[secondChannel];
    }
    return a[thirdChannel] - b[thirdChannel];
  });
});
Deno.bench("Unstable sort()", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  colors.sort((a, b) => a[0] - b[0]);
});
Deno.bench("Stable bucket sort", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  stableBucketSort(colors, 0);
});
Deno.bench("Unstable buckets sort", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  unstableBucketSort(colors, 0);
});
Deno.bench("Unstable Binary radix sort (push)", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  binaryRadixSortByPush(colors, 0, 255);
});
Deno.bench("Unstable Binary radix sort (index)", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  binaryRadixSortByIndex(colors, 0, 255);
});
Deno.bench("Unstable Radix sort (2)", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  radixSort(colors, 0, 2, 255);
});
Deno.bench("Unstable Radix sort (10)", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  radixSort(colors, 0, 10, 255);
});
Deno.bench("Unstable Radix sort (16)", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  radixSort(colors, 0, 16, 255);
});
Deno.bench("Unstable Radix sort (64)", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  radixSort(colors, 0, 64, 255);
});
Deno.bench("Unstable Radix sort (256)", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  radixSort(colors, 0, 256, 255);
});
Deno.bench("Stable Radix sort (256)", () => {
  const colors = structuredClone(medianCut.cubes[0].colors);
  stableRadixSort(colors, 0, 256, 16777216);
});
