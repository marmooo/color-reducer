import { MedianCut } from "./mediancut.ts";
import { getPixels } from "@unpic/pixels";

const file = await Deno.readFile("test/wires.jpg");
const image = await getPixels(file);

const numColors = new Array(10);
for (let i = 0; i < numColors.length; i++) {
  numColors[i] = Math.floor(Math.random() * 256);
}

Deno.bench(`cache`, (b) => {
  const medianCut = new MedianCut(image.data, image.width, image.height);
  b.start();
  for (let i = 0; i < numColors.length; i++) {
    medianCut.apply(numColors[i]);
  }
  b.end();
});
Deno.bench(`no cache`, (b) => {
  b.start();
  for (let i = 0; i < numColors.length; i++) {
    const medianCut = new MedianCut(image.data, image.width, image.height);
    medianCut.apply(numColors[i]);
  }
  b.end();
});
