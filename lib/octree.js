export class OctreeNode {
  colors = [];
  total = 0;

  constructor(level) {
    this.level = level;
  }
}

export class OctreeQuantization {
  replaceColors;
  colorMapping;

  constructor(imageData) {
    this.imageData = imageData;
  }

  getKey(rgb, level) {
    const r = ((rgb >> 16 + level) & 1) << 2;
    const g = ((rgb >> 8 + level) & 1) << 1;
    const b = (rgb >> level) & 1;
    return r | g | b;
  }

  getInitialCubes() {
    const { imageData } = this;
    const uint32Data = new Uint32Array(imageData.data.buffer);
    const colorCount = new Uint32Array(16777216);
    for (let i = 0; i < uint32Data.length; i++) {
      const rgba = uint32Data[i];
      const rgb = rgba & 0xFFFFFF;
      colorCount[rgb]++;
    }
    const level = 7;
    const cubes = new Array(8);
    for (let i = 0; i < cubes.length; i++) {
      cubes[i] = new OctreeNode(level);
    }
    for (let rgb = 0; rgb < colorCount.length; rgb++) {
      const uses = colorCount[rgb];
      if (uses) {
        const key = this.getKey(rgb, level);
        const cube = cubes[key];
        cube.colors.push([rgb, uses]);
        cube.total += uses;
      }
    }
    return cubes.filter((cube) => cube.total > 0);
  }

  splitCubes(cubes, maxColors) {
    while (cubes.length < maxColors) {
      let maxIndex = 0;
      let maxTotal = cubes[0].total;
      for (let i = 1; i < cubes.length; i++) {
        const cube = cubes[i];
        const total = cube.total;
        if (maxTotal < total && cube.level !== 0) {
          maxIndex = i;
          maxTotal = total;
        }
      }
      const maxCube = cubes[maxIndex];
      if (maxCube.total === 1) break;
      if (maxCube.colors.length === 1) break;
      const level = maxCube.level - 1;
      let newCubes = new Array(8);
      for (let i = 0; i < newCubes.length; i++) {
        newCubes[i] = new OctreeNode(level);
      }
      for (let i = 0; i < maxCube.colors.length; i++) {
        const [rgb, uses] = maxCube.colors[i];
        const key = this.getKey(rgb, level);
        const newCube = newCubes[key];
        newCube.colors.push([rgb, uses]);
        newCube.total += uses;
      }
      newCubes = newCubes.filter((cube) => cube.total > 0);
      if (cubes.length + newCubes.length - 1 <= maxColors) {
        cubes.splice(maxIndex, 1, ...newCubes);
      } else {
        break;
      }
    }
    return cubes;
  }

  getReplaceColors(cubes) {
    const { colorMapping } = this;
    const arr = new Array(cubes.length);
    for (let i = 0; i < cubes.length; i++) {
      const colors = cubes[i].colors;
      let totalR = 0, totalG = 0, totalB = 0, totalUses = 0;
      for (let j = 0; j < colors.length; j++) {
        const [rgb, uses] = colors[j];
        const b = (rgb >> 16) & 0xFF;
        const g = (rgb >> 8) & 0xFF;
        const r = rgb & 0xFF;
        totalR += r * uses;
        totalG += g * uses;
        totalB += b * uses;
        totalUses += uses;
        colorMapping[rgb] = i;
      }
      const avgR = Math.round(totalR / totalUses);
      const avgG = Math.round(totalG / totalUses);
      const avgB = Math.round(totalB / totalUses);
      const rgb = (avgB * 256 + avgG) * 256 + avgR;
      arr[i] = rgb;
    }
    return arr;
  }

  getIndexedImage() {
    const { imageData, replaceColors } = this;
    const uint32Data = new Uint8Array(this.imageData.data.length);
    const imageSize = imageData.width * imageData.height;
    const arr = replaceColors.length <= 256
      ? new Uint8Array(imageSize)
      : new Uint16Array(imageSize);
    for (let i = 0; i < imageSize; i++) {
      const rgba = uint32Data[i];
      const rgb = rgba & 0xFFFFFF;
      arr[i] = this.colorMapping[rgb];
    }
    return arr;
  }

  initColorMapping(numColors) {
    const { colorMapping } = this;
    if (numColors <= 256) {
      if (!(colorMapping instanceof Uint8Array)) {
        this.colorMapping = new Uint8Array(16777216);
      }
    } else {
      if (!(colorMapping instanceof Uint16Array)) {
        this.colorMapping = new Uint16Array(16777216);
      }
    }
    return this.colorMapping;
  }

  apply(maxColors) {
    const { imageData } = this;
    const cubes = this.getInitialCubes();
    this.splitCubes(cubes, maxColors);
    const colorMapping = this.initColorMapping(cubes.length);
    const replaceColors = this.getReplaceColors(cubes);
    this.replaceColors = replaceColors;
    const uint32Data = new Uint32Array(imageData.data.buffer);
    const newUint32Data = new Uint32Array(uint32Data.length);
    for (let i = 0; i < uint32Data.length; i++) {
      const rgba = uint32Data[i];
      const rgb = rgba & 0xFFFFFF;
      const newColor = replaceColors[colorMapping[rgb]];
      newUint32Data[i] = newColor | (rgba & 0xFF000000);
    }
    const data = new Uint8ClampedArray(newUint32Data.buffer);
    return new ImageData(data, imageData.width, imageData.height);
  }
}
