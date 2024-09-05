import { MedianCut } from "./mediancut.js";
import { getPixels } from "get_pixels";

function getImageData(image) {
  const { data, width, height } = image;
  const uint8 = new Uint8ClampedArray(data.length);
  uint8.set(image.data);
  return new ImageData(uint8, width, height);
}

const file = await Deno.readFile("test/wires.jpg");
const image = await getPixels(file);

const numColors = new Array(10);
for (let i = 0; i < numColors.length; i++) {
  numColors[i] = Math.floor(Math.random() * 256);
}

Deno.bench(`cache`, (b) => {
  const imageData = getImageData(image);
  const medianCut = new MedianCut(imageData);
  b.start();
  for (let i = 0; i < numColors.length; i++) {
    medianCut.apply(numColors[i]);
  }
  b.end();
});
Deno.bench(`no cache`, (b) => {
  const imageData = getImageData(image);
  b.start();
  for (let i = 0; i < numColors.length; i++) {
    const medianCut = new MedianCut(imageData);
    medianCut.apply(numColors[i]);
  }
  b.end();
});
