export class UniformQuantization {
  constructor(imageData) {
    this.imageData = imageData;
  }

  getReplaceColors(maxColors) {
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
          colors[i] = { r, g, b };
          i++;
        }
      }
    }
    return colors;
  }

  getIndexedImage(maxColors) {
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
      const B = (rgba >> 24) & 0xFF;
      const G = (rgba >> 16) & 0xFF;
      const R = (rgba >> 8) & 0xFF;
      const r = Math.floor(R / step);
      const g = Math.floor(G / step);
      const b = Math.floor(B / step);
      arr[i] = (b * cbrtColors + g) * cbrtColors + r;
    }
    return arr;
  }

  apply(maxColors) {
    const { imageData } = this;
    const cbrtColors = Math.floor(Math.cbrt(maxColors));
    const step = 256 / cbrtColors;
    const center = step / 2;
    const uint8Data = new Uint8ClampedArray(imageData.data.buffer);
    const newUint8Data = new Uint8ClampedArray(uint8Data.length);
    for (let ri = 0; ri < uint8Data.length; ri += 4) {
      const gi = ri + 1;
      const bi = ri + 2;
      const ai = ri + 3;
      newUint8Data[ri] = Math.round(
        Math.floor(uint8Data[ri] / step) * step + center,
      );
      newUint8Data[gi] = Math.round(
        Math.floor(uint8Data[gi] / step) * step + center,
      );
      newUint8Data[bi] = Math.round(
        Math.floor(uint8Data[bi] / step) * step + center,
      );
      newUint8Data[ai] = uint8Data[ai];
    }
    return new ImageData(newUint8Data, imageData.width, imageData.height);
  }
}
