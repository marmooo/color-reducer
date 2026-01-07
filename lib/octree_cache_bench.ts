import { OctreeQuantization } from "./octree.ts";
import { getPixels } from "@unpic/pixels";

const file = await Deno.readFile("test/wires.jpg");
const image = await getPixels(file);

const numColors = new Array(10);
for (let i = 0; i < numColors.length; i++) {
  numColors[i] = Math.floor(Math.random() * 256);
}

Deno.bench(`cache`, (b) => {
  const octree = new OctreeQuantization(image.data, image.width, image.height);
  b.start();
  for (let i = 0; i < numColors.length; i++) {
    octree.apply(numColors[i]);
  }
  b.end();
});
Deno.bench(`no cache`, (b) => {
  b.start();
  for (let i = 0; i < numColors.length; i++) {
    const octree = new OctreeQuantization(
      image.data,
      image.width,
      image.height,
    );
    octree.apply(numColors[i]);
  }
  b.end();
});
