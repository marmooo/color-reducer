export class MedianCut {
  replaceColors;
  colorMapping;

  constructor(imageData) {
    this.imageData = imageData.data;
    this.colors = this.getColorInfo();
  }

  getColorInfo() {
    const { imageData } = this;
    const uint32ImageData = new Uint32Array(imageData.buffer);
    const colorCount = new Uint32Array(16777216);
    for (let i = 0; i < uint32ImageData.length; i++) {
      const rgba = uint32ImageData[i];
      const key = rgba & 0xFFFFFF;
      colorCount[key]++;
    }
    const colors = [];
    for (let key = 0; key < colorCount.length; key++) {
      const uses = colorCount[key];
      if (uses > 0) {
        const b = (key >> 16) & 0xFF;
        const g = (key >> 8) & 0xFF;
        const r = key & 0xFF;
        colors.push([r, g, b, uses]);
      }
    }
    return colors;
  }

  calculateCubeProperties(colors) {
    const colorStats = this.getColorStats(colors);
    const dominantColorType = this.getDominantColorType(colorStats);
    return {
      colors,
      total: colorStats.totalUsage,
      type: dominantColorType,
    };
  }

  getColorStats(colors) {
    let totalUsage = 0;
    let maxR = 0, maxG = 0, maxB = 0;
    let minR = 255, minG = 255, minB = 255;
    for (let i = 0; i < colors.length; i++) {
      const [r, g, b, uses] = colors[i];
      maxR = Math.max(maxR, r);
      maxG = Math.max(maxG, g);
      maxB = Math.max(maxB, b);
      minR = Math.min(minR, r);
      minG = Math.min(minG, g);
      minB = Math.min(minB, b);
      totalUsage += uses;
    }
    return {
      maxR,
      maxG,
      maxB,
      minR,
      minG,
      minB,
      totalUsage,
      rangeR: (maxR - minR),
      rangeG: (maxG - minG),
      rangeB: (maxB - minB),
    };
  }

  getDominantColorType({ rangeR, rangeG, rangeB }) {
    if (rangeR > rangeG && rangeR > rangeB) return "r";
    if (rangeG > rangeR && rangeG > rangeB) return "g";
    if (rangeB > rangeR && rangeB > rangeG) return "b";
    return "g";
  }

  bucketSort(colors, colorIndex) {
    const buckets = new Array(256);
    for (let i = 0; i < 256; i++) {
      buckets[i] = [];
    }
    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      buckets[color[colorIndex]].push(color);
    }
    return buckets;
  }

  splitBuckets(buckets, half) {
    const split1 = [];
    const split2 = [];
    let count = 0;
    for (let i = 0; i < 256; i++) {
      const bucket = buckets[i];
      const bucketLength = bucket.length;
      if (count + bucketLength <= half) {
        split1.push(...bucket);
        count += bucketLength;
      } else {
        const remaining = half - count;
        split1.push(...bucket.slice(0, remaining));
        split2.push(...bucket.slice(remaining));
        for (let j = i + 1; j < 256; j++) {
          split2.push(...buckets[j]);
        }
        break;
      }
    }
    return [split1, split2];
  }

  sortAndSplit(colors, colorIndex) {
    const buckets = this.bucketSort(colors, colorIndex);
    const half = Math.floor((colors.length + 1) / 2);
    return this.splitBuckets(buckets, half);
  }

  splitCubesByMedian(cubes, colorSize) {
    while (cubes.length < colorSize) {
      let maxIndex = 0;
      let maxTotal = cubes[0].total;
      for (let i = 1; i < cubes.length; i++) {
        const cube = cubes[i];
        const total = cube.total;
        if (total > maxTotal && cube.colors.length > 1) {
          maxIndex = i;
          maxTotal = total;
        }
      }
      if (cubes[maxIndex].total === 1) break;
      if (cubes[maxIndex].colors.length === 1) break;
      const colorType = cubes[maxIndex].type;
      const colorIndex = "rgb".indexOf(colorType);
      const [colors1, colors2] = this.sortAndSplit(
        cubes[maxIndex].colors,
        colorIndex,
      );
      const split1 = this.calculateCubeProperties(colors1);
      const split2 = this.calculateCubeProperties(colors2);
      cubes.splice(maxIndex, 1, split1, split2);
    }
    return cubes;
  }

  apply(colorSize, update) {
    if (this.colors.length <= colorSize) return;
    const initialCube = this.calculateCubeProperties(this.colors);
    const cubes = this.splitCubesByMedian([initialCube], colorSize);
    const replaceColors = cubes.map((cube) => {
      let totalR = 0, totalG = 0, totalB = 0, totalUses = 0;
      const colors = cube.colors;
      for (let i = 0; i < colors.length; i++) {
        const [r, g, b, uses] = colors[i];
        totalR += r * uses;
        totalG += g * uses;
        totalB += b * uses;
        totalUses += uses;
      }
      const avgR = Math.round(totalR / totalUses);
      const avgG = Math.round(totalG / totalUses);
      const avgB = Math.round(totalB / totalUses);
      return (avgB * 256 + avgG) * 256 + avgR;
    });
    this.replaceColors = replaceColors;
    if (update) {
      const uint32ImageData = new Uint32Array(this.imageData.buffer);
      const colorMapping = new Uint8Array(16777216);
      cubes.forEach((cube, i) => {
        const colors = cube.colors;
        for (let j = 0; j < colors.length; j++) {
          const [r, g, b] = colors[j];
          const key = (b * 256 + g) * 256 + r;
          colorMapping[key] = i;
        }
      });
      this.colorMapping = colorMapping;
      for (let i = 0; i < uint32ImageData.length; i++) {
        const rgba = uint32ImageData[i];
        const key = rgba & 0xFFFFFF;
        const newColor = replaceColors[colorMapping[key]];
        if (newColor) {
          uint32ImageData[i] = newColor | (rgba & 0xFF000000);
        }
      }
    }
  }
}
