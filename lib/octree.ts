export type BinaryColorStat = [
  rgb: number,
  total: number,
];

export class OctreeNode {
  level: number;
  colors: BinaryColorStat[] = [];
  total = 0;

  constructor(level: number) {
    this.level = level;
  }
}

export class OctreeLog {
  cubeIndex: number;
  numLeaves: number;

  constructor(cubeIndex: number, numLeaves: number) {
    this.cubeIndex = cubeIndex;
    this.numLeaves = numLeaves;
  }
}

export class OctreeQuantization {
  imageData: ImageData;
  cubes: OctreeNode[];
  replaceColors: number[] = [];
  colorMapping: Uint8Array | Uint16Array | undefined;
  splitLogs: OctreeLog[] = [];

  constructor(imageData: ImageData) {
    this.imageData = imageData;
    this.cubes = this.initCubes();
  }

  getKey(rgb: number, level: number): number {
    const r = ((rgb >> 16 + level) & 1) << 2;
    const g = ((rgb >> 8 + level) & 1) << 1;
    const b = (rgb >> level) & 1;
    return r | g | b;
  }

  initCubes(): OctreeNode[] {
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
    const newCubes = cubes.filter((cube) => cube.total > 0);
    this.splitLogs = [new OctreeLog(0, newCubes.length)];
    return newCubes;
  }

  splitCubes(cubes: OctreeNode[], maxColors: number) {
    const { splitLogs } = this;
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
        const splitLog = new OctreeLog(maxIndex, newCubes.length);
        splitLogs.push(splitLog);
      } else {
        break;
      }
    }
    return cubes;
  }

  mergeCubes(cubes: OctreeNode[], maxColors: number) {
    const { splitLogs } = this;
    let i = splitLogs.length - 1;
    while (maxColors < cubes.length) {
      const { cubeIndex, numLeaves } = splitLogs[i];
      const newCube = cubes[cubeIndex];
      for (let j = 1; j < numLeaves; j++) {
        const oldCube = cubes[cubeIndex + j];
        newCube.colors.push(...oldCube.colors);
        newCube.total += oldCube.total;
      }
      newCube.level++;
      cubes.splice(cubeIndex, numLeaves, newCube);
      i--;
    }
    this.splitLogs = splitLogs.slice(0, i + 1);
    return cubes;
  }

  getReplaceColors(cubes: OctreeNode[]): number[] {
    const { colorMapping } = this;
    if (colorMapping === undefined) {
      throw new Error("colorMapping is not initialized");
    }
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

  getIndexedImage(): Uint8Array | Uint16Array {
    const { imageData, replaceColors, colorMapping } = this;
    if (colorMapping === undefined) {
      throw new Error("colorMapping is not initialized");
    }
    const uint32Data = new Uint8Array(this.imageData.data.length);
    const imageSize = imageData.width * imageData.height;
    const arr = replaceColors.length <= 256
      ? new Uint8Array(imageSize)
      : new Uint16Array(imageSize);
    for (let i = 0; i < imageSize; i++) {
      const rgba = uint32Data[i];
      const rgb = rgba & 0xFFFFFF;
      arr[i] = colorMapping[rgb];
    }
    return arr;
  }

  initColorMapping(maxColors: number): Uint8Array | Uint16Array {
    const { colorMapping } = this;
    if (maxColors <= 256) {
      if (!(colorMapping instanceof Uint8Array)) {
        this.colorMapping = new Uint8Array(16777216);
      }
    } else {
      if (!(colorMapping instanceof Uint16Array)) {
        this.colorMapping = new Uint16Array(16777216);
      }
    }
    return this.colorMapping as Uint8Array | Uint16Array;
  }

  apply(maxColors: number): ImageData {
    const { imageData } = this;
    let { cubes } = this;
    cubes = maxColors < cubes.length
      ? this.mergeCubes(cubes, maxColors)
      : this.splitCubes(cubes, maxColors);
    this.cubes = cubes;
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
