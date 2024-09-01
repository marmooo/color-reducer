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
    const uint32ImageData = new Uint32Array(imageData.data.buffer);
    const imageSize = imageData.width * imageData.height;
    const arr = cbrtColors < 7
      ? new Uint8Array(imageSize)
      : new Uint16Array(imageSize);
    const step = 256 / cbrtColors;
    for (let i = 0; i < imageSize; i++) {
      const rgba = uint32ImageData[i];
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
    const rgba = new Uint8ClampedArray(imageData.data.buffer);
    for (let ri = 0; ri < rgba.length; ri += 4) {
      const gi = ri + 1;
      const bi = ri + 2;
      rgba[ri] = Math.round(Math.floor(rgba[ri] / step) * step + center);
      rgba[gi] = Math.round(Math.floor(rgba[gi] / step) * step + center);
      rgba[bi] = Math.round(Math.floor(rgba[bi] / step) * step + center);
    }
  }
}
