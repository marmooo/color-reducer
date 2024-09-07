class UniformQuantization {
    constructor(imageData){
        this.imageData = imageData;
    }
    getReplaceColors(maxColors) {
        const cbrtColors = Math.floor(Math.cbrt(maxColors));
        const colors = new Array(cbrtColors ** 3);
        const step = 256 / cbrtColors;
        const center = step / 2;
        let i = 0;
        for(let R = 0; R < cbrtColors; R++){
            for(let G = 0; G < cbrtColors; G++){
                for(let B = 0; B < cbrtColors; B++){
                    const r = Math.round(step * R + center);
                    const g = Math.round(step * G + center);
                    const b = Math.round(step * B + center);
                    colors[i] = {
                        r,
                        g,
                        b
                    };
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
        const arr = cbrtColors < 7 ? new Uint8Array(imageSize) : new Uint16Array(imageSize);
        const step = 256 / cbrtColors;
        for(let i = 0; i < imageSize; i++){
            const rgba = uint32Data[i];
            const B = rgba >> 24 & 0xFF;
            const G = rgba >> 16 & 0xFF;
            const R = rgba >> 8 & 0xFF;
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
        const data = imageData.data;
        const newData = new Uint8ClampedArray(data.length);
        for(let ri = 0; ri < data.length; ri += 4){
            const gi = ri + 1;
            const bi = ri + 2;
            const ai = ri + 3;
            newData[ri] = Math.round(Math.floor(data[ri] / step) * step + center);
            newData[gi] = Math.round(Math.floor(data[gi] / step) * step + center);
            newData[bi] = Math.round(Math.floor(data[bi] / step) * step + center);
            newData[ai] = data[ai];
        }
        return new ImageData(newData, imageData.width, imageData.height);
    }
}
export { UniformQuantization as UniformQuantization };
class OctreeNode {
    colors = [];
    total = 0;
    constructor(level){
        this.level = level;
    }
}
class OctreeLog {
    constructor(cubeIndex, numLeaves){
        this.cubeIndex = cubeIndex;
        this.numLeaves = numLeaves;
    }
}
class OctreeQuantization {
    replaceColors;
    colorMapping;
    splitLogs = [];
    constructor(imageData){
        this.imageData = imageData;
        this.cubes = this.initCubes();
    }
    getKey(rgb, level) {
        const r = (rgb >> 16 + level & 1) << 2;
        const g = (rgb >> 8 + level & 1) << 1;
        const b = rgb >> level & 1;
        return r | g | b;
    }
    initCubes() {
        const { imageData } = this;
        const uint32Data = new Uint32Array(imageData.data.buffer);
        const colorCount = new Uint32Array(16777216);
        for(let i = 0; i < uint32Data.length; i++){
            const rgba = uint32Data[i];
            const rgb = rgba & 0xFFFFFF;
            colorCount[rgb]++;
        }
        const level = 7;
        const cubes = new Array(8);
        for(let i = 0; i < cubes.length; i++){
            cubes[i] = new OctreeNode(level);
        }
        for(let rgb = 0; rgb < colorCount.length; rgb++){
            const uses = colorCount[rgb];
            if (uses) {
                const key = this.getKey(rgb, 7);
                const cube = cubes[key];
                cube.colors.push([
                    rgb,
                    uses
                ]);
                cube.total += uses;
            }
        }
        const newCubes = cubes.filter((cube)=>cube.total > 0);
        this.splitLogs = [
            new OctreeLog(0, newCubes.length)
        ];
        return newCubes;
    }
    splitCubes(cubes, maxColors) {
        const { splitLogs } = this;
        while(cubes.length < maxColors){
            let maxIndex = 0;
            let maxTotal = cubes[0].total;
            for(let i = 1; i < cubes.length; i++){
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
            for(let i = 0; i < newCubes.length; i++){
                newCubes[i] = new OctreeNode(level);
            }
            for(let i = 0; i < maxCube.colors.length; i++){
                const [rgb, uses] = maxCube.colors[i];
                const key = this.getKey(rgb, level);
                const newCube = newCubes[key];
                newCube.colors.push([
                    rgb,
                    uses
                ]);
                newCube.total += uses;
            }
            newCubes = newCubes.filter((cube)=>cube.total > 0);
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
    mergeCubes(cubes, maxColors) {
        const { splitLogs } = this;
        let i = splitLogs.length - 1;
        while(maxColors < cubes.length){
            const { cubeIndex, numLeaves } = splitLogs[i];
            const newCube = cubes[cubeIndex];
            for(let j = 1; j < numLeaves; j++){
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
    getReplaceColors(cubes) {
        const { colorMapping } = this;
        const arr = new Array(cubes.length);
        for(let i = 0; i < cubes.length; i++){
            const colors = cubes[i].colors;
            let totalR = 0, totalG = 0, totalB = 0, totalUses = 0;
            for(let j = 0; j < colors.length; j++){
                const [rgb, uses] = colors[j];
                const b = rgb >> 16 & 0xFF;
                const g = rgb >> 8 & 0xFF;
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
    getIndexedImage() {
        const { imageData, replaceColors } = this;
        const uint32Data = new Uint8Array(this.imageData.data.length);
        const imageSize = imageData.width * imageData.height;
        const arr = replaceColors.length <= 256 ? new Uint8Array(imageSize) : new Uint16Array(imageSize);
        for(let i = 0; i < imageSize; i++){
            const rgba = uint32Data[i];
            const rgb = rgba & 0xFFFFFF;
            arr[i] = this.colorMapping[rgb];
        }
        return arr;
    }
    initColorMapping(maxColors) {
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
        return this.colorMapping;
    }
    apply(maxColors) {
        const { imageData } = this;
        let { cubes } = this;
        cubes = maxColors < cubes.length ? this.mergeCubes(cubes, maxColors) : this.splitCubes(cubes, maxColors);
        this.cubes = cubes;
        const colorMapping = this.initColorMapping(cubes.length);
        const replaceColors = this.getReplaceColors(cubes);
        this.replaceColors = replaceColors;
        const uint32Data = new Uint32Array(imageData.data.buffer);
        const newUint32Data = new Uint32Array(uint32Data.length);
        for(let i = 0; i < uint32Data.length; i++){
            const rgba = uint32Data[i];
            const rgb = rgba & 0xFFFFFF;
            const newColor = replaceColors[colorMapping[rgb]];
            newUint32Data[i] = newColor | rgba & 0xFF000000;
        }
        const data = new Uint8ClampedArray(newUint32Data.buffer);
        return new ImageData(data, imageData.width, imageData.height);
    }
}
export { OctreeNode as OctreeNode };
export { OctreeLog as OctreeLog };
export { OctreeQuantization as OctreeQuantization };
class Cube {
    constructor(colors, sortIndex){
        this.colors = colors;
        this.sortIndex = sortIndex;
        this.calculateCubeProperties();
    }
    calculateCubeProperties() {
        const colorStats = this.getColorStats(this.colors);
        const { rangeR, rangeG, rangeB } = colorStats;
        this.total = colorStats.total;
        this.type = this.getDominantColorType(rangeR, rangeG, rangeB);
    }
    getDominantColorType(rangeR, rangeG, rangeB) {
        if (rangeR > rangeG && rangeR > rangeB) return "r";
        if (rangeG > rangeR && rangeG > rangeB) return "g";
        if (rangeB > rangeR && rangeB > rangeG) return "b";
        return "g";
    }
    getColorStats(colors) {
        let total = 0, maxR = 0, maxG = 0, maxB = 0;
        let minR = 255, minG = 255, minB = 255;
        for(let i = 0; i < colors.length; i++){
            const [r, g, b, uses] = colors[i];
            maxR = Math.max(maxR, r);
            maxG = Math.max(maxG, g);
            maxB = Math.max(maxB, b);
            minR = Math.min(minR, r);
            minG = Math.min(minG, g);
            minB = Math.min(minB, b);
            total += uses;
        }
        return {
            total,
            rangeR: maxR - minR,
            rangeG: maxG - minG,
            rangeB: maxB - minB
        };
    }
}
class MedianCutLog {
    constructor(cubeIndex, sortIndex, type){
        this.cubeIndex = cubeIndex;
        this.sortIndex = sortIndex;
        this.type = type;
    }
}
class MedianCut {
    replaceColors;
    colorMapping;
    splitLogs = [];
    constructor(imageData, options = {
        cache: true
    }){
        this.imageData = imageData;
        this.options = options;
        this.colors = this.getColors();
        this.cubes = this.initCubes();
    }
    initCubes() {
        return [
            new Cube(this.colors, -1)
        ];
    }
    getColors() {
        const { imageData } = this;
        const uint32Data = new Uint32Array(imageData.data.buffer);
        const colorCount = new Uint32Array(16777216);
        for(let i = 0; i < uint32Data.length; i++){
            const rgba = uint32Data[i];
            const rgb = rgba & 0xFFFFFF;
            colorCount[rgb]++;
        }
        const colors = [];
        for(let rgb = 0; rgb < colorCount.length; rgb++){
            const uses = colorCount[rgb];
            if (uses > 0) {
                const b = rgb >> 16 & 0xFF;
                const g = rgb >> 8 & 0xFF;
                const r = rgb & 0xFF;
                colors.push([
                    r,
                    g,
                    b,
                    uses
                ]);
            }
        }
        return colors;
    }
    bucketSort(colors, sortIndex) {
        const { options } = this;
        const buckets = new Array(256);
        for(let i = 0; i < 256; i++){
            buckets[i] = [];
        }
        for(let i = 0; i < colors.length; i++){
            const color = colors[i];
            buckets[color[sortIndex]].push(color);
        }
        if (options.cache) {
            const secondSortIndex = (sortIndex + 1) % 3;
            const thirdSortIndex = (sortIndex + 2) % 3;
            for(let i = 0; i < 256; i++){
                buckets[i].sort((a, b)=>{
                    if (a[secondSortIndex] !== b[secondSortIndex]) {
                        return a[secondSortIndex] - b[secondSortIndex];
                    }
                    return a[thirdSortIndex] - b[thirdSortIndex];
                });
            }
        }
        return buckets;
    }
    splitBuckets(buckets, half) {
        const split1 = [];
        const split2 = [];
        let count = 0;
        for(let i = 0; i < 256; i++){
            const bucket = buckets[i];
            const bucketLength = bucket.length;
            if (count + bucketLength <= half) {
                split1.push(...bucket);
                count += bucketLength;
            } else {
                const remaining = half - count;
                split1.push(...bucket.slice(0, remaining));
                split2.push(...bucket.slice(remaining));
                for(let j = i + 1; j < 256; j++){
                    split2.push(...buckets[j]);
                }
                break;
            }
        }
        return [
            split1,
            split2
        ];
    }
    sortAndSplit(colors, sortIndex) {
        const buckets = this.bucketSort(colors, sortIndex);
        const half = Math.floor((colors.length + 1) / 2);
        return this.splitBuckets(buckets, half);
    }
    splitCubesByMedian(cubes, numColors) {
        const { splitLogs } = this;
        while(cubes.length < numColors){
            let maxIndex = 0;
            let maxTotal = cubes[0].total;
            for(let i = 1; i < cubes.length; i++){
                const cube = cubes[i];
                const total = cube.total;
                if (maxTotal < total && cube.colors.length !== 1) {
                    maxIndex = i;
                    maxTotal = total;
                }
            }
            const maxCube = cubes[maxIndex];
            if (maxCube.total === 1) break;
            const sortIndex = "rgb".indexOf(maxCube.type);
            const [colors1, colors2] = this.sortAndSplit(maxCube.colors, sortIndex);
            const split1 = new Cube(colors1, sortIndex);
            const split2 = new Cube(colors2, sortIndex);
            cubes.splice(maxIndex, 1, split1, split2);
            const splitLog = new MedianCutLog(maxIndex, maxCube.sortIndex, maxCube.type);
            splitLogs.push(splitLog);
        }
        return cubes;
    }
    mergeCubesByMedian(cubes, numColors) {
        const { splitLogs } = this;
        let i = splitLogs.length - 1;
        while(numColors < cubes.length){
            const { cubeIndex, sortIndex, type } = splitLogs[i];
            const newCube = cubes[cubeIndex];
            const oldCube = cubes[cubeIndex + 1];
            newCube.colors.push(...oldCube.colors);
            const buckets = this.bucketSort(newCube.colors, sortIndex);
            const newColors = [];
            for(let j = 0; j < buckets.length; j++){
                newColors.push(...buckets[j]);
            }
            newCube.colors = newColors;
            newCube.total += oldCube.total;
            newCube.type = type;
            cubes.splice(cubeIndex, 2, newCube);
            i--;
        }
        this.splitLogs = splitLogs.slice(0, cubes.length - 1);
        return cubes;
    }
    getReplaceColors(cubes) {
        const { colorMapping } = this;
        const arr = new Array(cubes.length);
        for(let i = 0; i < cubes.length; i++){
            const colors = cubes[i].colors;
            let totalR = 0, totalG = 0, totalB = 0, totalUses = 0;
            for(let j = 0; j < colors.length; j++){
                const [r, g, b, uses] = colors[j];
                totalR += r * uses;
                totalG += g * uses;
                totalB += b * uses;
                totalUses += uses;
                const rgb = (b * 256 + g) * 256 + r;
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
    getIndexedImage() {
        const { imageData, replaceColors, colorMapping } = this;
        const uint32Data = new Uint8Array(imageData.data.length);
        const imageSize = imageData.width * imageData.height;
        const arr = replaceColors.length <= 256 ? new Uint8Array(imageSize) : new Uint16Array(imageSize);
        for(let i = 0; i < imageSize; i++){
            const rgba = uint32Data[i];
            const rgb = rgba & 0xFFFFFF;
            arr[i] = colorMapping[rgb];
        }
        return arr;
    }
    initColorMapping(numColors) {
        const { colorMapping } = this;
        if (numColors <= 256) {
            if (!(colorMapping instanceof Uint8Array)) {
                this.colorMapping = new Uint8Array(16777216);
            }
        } else {
            if (!(colorMapping instanceof Uint16Array)) {
                this.colorMapping = new Uint16Array(16777216);
            }
        }
        return this.colorMapping;
    }
    apply(numColors) {
        const { imageData, options } = this;
        let { cubes } = this;
        if (options.cache) {
            cubes = numColors < cubes.length ? this.mergeCubesByMedian(cubes, numColors) : this.splitCubesByMedian(cubes, numColors);
        } else {
            if (numColors < cubes.length) cubes = this.initCubes();
            cubes = this.splitCubesByMedian(cubes, numColors);
        }
        this.cubes = cubes;
        const colorMapping = this.initColorMapping(numColors);
        const replaceColors = this.getReplaceColors(cubes);
        this.replaceColors = replaceColors;
        const uint32Data = new Uint32Array(imageData.data.buffer);
        const newUint32Data = new Uint32Array(uint32Data.length);
        for(let i = 0; i < uint32Data.length; i++){
            const rgba = uint32Data[i];
            const rgb = rgba & 0xFFFFFF;
            const newColor = replaceColors[colorMapping[rgb]];
            newUint32Data[i] = newColor | rgba & 0xFF000000;
        }
        const data = new Uint8ClampedArray(newUint32Data.buffer);
        return new ImageData(data, imageData.width, imageData.height);
    }
}
export { Cube as Cube };
export { MedianCutLog as MedianCutLog };
export { MedianCut as MedianCut };

