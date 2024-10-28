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
} from "npm:@marmooo/color-reducer";

new MedianCut(uint8, width, height).apply(256);
new OctreeQuantization(uint8, width, height).apply(256);
new UniformQuantization(uint8, width, height).apply(256);
```

## Test

```
deno test --allow-read
deno bench --allow-read
deno run --allow-read lib/mse.ts
```

## Build

```
bash build_opencvjs.sh
bash build.sh
```

## License

MIT
