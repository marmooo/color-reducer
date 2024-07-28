import init, { encode } from "./pngs/pngs.js";

await init();
const ColorType = {
  Grayscale: 0,
  RGB: 2,
  Indexed: 3,
  GrayscaleAlpha: 4,
  RGBA: 6,
};
const BitDepth = {
  One: 1,
  Two: 2,
  Four: 4,
  Eight: 8,
  Sixteen: 16,
};
const Compression = {
  Default: 0,
  Fast: 1,
  Best: 2,
  Huffman: 3,
  Rle: 4,
};
const FilterType = {
  NoFilter: 0,
  Sub: 1,
  Up: 2,
  Avg: 3,
  Paeth: 4,
};
function encode1(image, width, height, options) {
  if (options?.stripAlpha) {
    image = image.filter((_, i) => (i + 1) % 4);
  }
  return encode(
    image,
    width,
    height,
    options?.palette,
    options?.trns,
    options?.color ?? ColorType.RGBA,
    options?.depth ?? BitDepth.Eight,
    options?.compression,
    options?.filter,
  );
}
export { ColorType as ColorType };
export { BitDepth as BitDepth };
export { Compression as Compression };
export { FilterType as FilterType };
export { encode1 as encode };
