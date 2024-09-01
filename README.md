# Color Reducer

Reduce colors of images.

## GUI

[Color Reducer](https://marmooo.github.io/color-reducer/)

## Usage

```
import {
  MedianCut,
  OctreeQuantization,
  UniformQuantization,
} from "npm:color-reducer";

const imageData = new ImageData(dataArray, 64, 64);

new MedianCut(imageData).apply(256);
new UniformQuantization(imageData).apply(256);
new OctreeQuantization(imageData).apply(256);
```

## Test

```
deno test --allow-read
deno bench --allow-read
deno run --allow read mse.js
```

## Build

```
bash build_opencvjs.sh
bash build.sh
```

## License

MIT
