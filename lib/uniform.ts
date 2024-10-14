export class UniformQuantization {
  imageData: ImageData;

  constructor(imageData: ImageData) {
    this.imageData = imageData;
  }

  getReplaceColors(maxColors: number): number[] {
    const cbrtColors = Math.floor(Math.cbrt(maxColors));
    const colors = new Array(cbrtColors ** 3);
    const step = 256 / cbrtColors;
    const center = step / 2;
    let i = 0;
    for (let R = 0; R < cbrtColors; R++) {
      for (let G = 0; G < cbrtColors; G++) {
        for (let B = 0; B < cbrtColors; B++) {
          const r = Math.round(step * R + center);
          const g = Math.round(step * G + center);
          const b = Math.round(step * B + center);
          colors[i] = (b * 256 + g) * 256 + r;
          i++;
        }
      }
    }
    return colors;
  }

  getIndexedImage(maxColors: number): Uint8Array | Uint16Array {
    const { imageData } = this;
    const cbrtColors = Math.floor(Math.cbrt(maxColors));
    const uint32Data = new Uint32Array(imageData.data.buffer);
    const imageSize = imageData.width * imageData.height;
    const arr = cbrtColors < 7
      ? new Uint8Array(imageSize)
      : new Uint16Array(imageSize);
    const step = 256 / cbrtColors;
    for (let i = 0; i < imageSize; i++) {
      const rgba = uint32Data[i];
      const B = (rgba >> 16) & 0xFF;
      const G = (rgba >> 8) & 0xFF;
      const R = rgba & 0xFF;
      const r = Math.floor(R / step);
      const g = Math.floor(G / step);
      const b = Math.floor(B / step);
      arr[i] = (b * cbrtColors + g) * cbrtColors + r;
    }
    return arr;
  }

  apply(maxColors: number): ImageData {
    const { imageData } = this;
    const cbrtColors = Math.floor(Math.cbrt(maxColors));
    const step = 256 / cbrtColors;
    const center = step / 2;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    for (let ri = 0; ri < data.length; ri += 4) {
      const gi = ri + 1;
      const bi = ri + 2;
      const ai = ri + 3;
      newData[ri] = Math.round(
        Math.floor(data[ri] / step) * step + center,
      );
      newData[gi] = Math.round(
        Math.floor(data[gi] / step) * step + center,
      );
      newData[bi] = Math.round(
        Math.floor(data[bi] / step) * step + center,
      );
      newData[ai] = data[ai];
    }
    return new ImageData(newData, imageData.width, imageData.height);
  }
}
