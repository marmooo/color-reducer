import { Tooltip } from "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/+esm";
import imageCompareViewer from "https://cdn.jsdelivr.net/npm/image-compare-viewer@1.6.2/+esm";
import { encode } from "/color-reducer/pngs.js";

function loadConfig() {
  if (localStorage.getItem("darkMode") == 1) {
    document.documentElement.setAttribute("data-bs-theme", "dark");
  }
}

function toggleDarkMode() {
  if (localStorage.getItem("darkMode") == 1) {
    localStorage.setItem("darkMode", 0);
    document.documentElement.setAttribute("data-bs-theme", "light");
  } else {
    localStorage.setItem("darkMode", 1);
    document.documentElement.setAttribute("data-bs-theme", "dark");
  }
}

function initLangSelect() {
  const langSelect = document.getElementById("lang");
  langSelect.onchange = () => {
    const lang = langSelect.options[langSelect.selectedIndex].value;
    location.href = `/color-reducer/${lang}/`;
  };
}

function initTooltip() {
  for (const node of document.querySelectorAll('[data-bs-toggle="tooltip"]')) {
    const tooltip = new Tooltip(node);
    node.addEventListener("touchstart", () => tooltip.show());
    node.addEventListener("touchend", () => tooltip.hide());
    node.addEventListener("click", () => {
      if (!tooltip.tip) return;
      tooltip.tip.classList.add("d-none");
      tooltip.hide();
      tooltip.tip.classList.remove("d-none");
    });
  }
}

async function getOpenCVPath() {
  const simdSupport = await wasmFeatureDetect.simd();
  const threadsSupport = self.crossOriginIsolated &&
    await wasmFeatureDetect.threads();
  if (simdSupport && threadsSupport) {
    return "/color-reducer/opencv/threaded-simd/opencv_js.js";
  } else if (simdSupport) {
    return "/color-reducer/opencv/simd/opencv_js.js";
  } else if (threadsSupport) {
    return "/color-reducer/opencv/threads/opencv_js.js";
  } else {
    return "/color-reducer/opencv/wasm/opencv_js.js";
  }
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    script.src = url;
    document.body.appendChild(script);
  });
}

class Panel {
  constructor(panel) {
    this.panel = panel;
  }

  show() {
    this.panel.classList.remove("d-none");
  }

  hide() {
    this.panel.classList.add("d-none");
  }

  getActualRect(canvas) {
    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;
    const naturalWidth = canvas.width;
    const naturalHeight = canvas.height;
    const aspectRatio = naturalWidth / naturalHeight;
    let width, height, top, left, right, bottom;
    if (canvasWidth / canvasHeight > aspectRatio) {
      width = canvasHeight * aspectRatio;
      height = canvasHeight;
      top = 0;
      left = (canvasWidth - width) / 2;
      right = left + width;
      bottom = canvasHeight;
    } else {
      width = canvasWidth;
      height = canvasWidth / aspectRatio;
      top = (canvasHeight - height) / 2;
      left = 0;
      right = canvasWidth;
      bottom = top + height;
    }
    return { width, height, top, left, right, bottom };
  }
}

class LoadPanel extends Panel {
  constructor(panel) {
    super(panel);

    for (const node of document.querySelectorAll(".image-compare")) {
      const images = node.querySelectorAll("img");
      new imageCompareViewer(node, { addCircle: true }).mount();
      images[1].classList.remove("d-none");
    }
    const clipboardButton = panel.querySelector(".clipboard");
    if (clipboardButton) {
      clipboardButton.onclick = (event) => {
        this.loadClipboardImage(event);
      };
    }
    panel.querySelector(".selectImage").onclick = () => {
      panel.querySelector(".inputImage").click();
    };
    panel.querySelector(".inputImage").onchange = (event) => {
      this.loadInputImage(event);
    };
    const examples = panel.querySelector(".examples");
    if (examples) {
      for (const img of examples.querySelectorAll("img")) {
        img.onclick = () => {
          const url = img.src.replace("-64", "");
          this.loadImage(url);
        };
      }
    }
  }

  show() {
    super.show();
    document.body.scrollIntoView({ behavior: "instant" });
  }

  executeCamera() {
    this.hide();
    cameraPanel.show();
    cameraPanel.executeVideo();
  }

  handleImageOnloadEvent = (event) => {
    const img = event.currentTarget;
    filterPanel.setCanvas(img);
    const filter = new filterPanel.filters.uniformQuantization(filterPanel);
    filterPanel.currentFilter = filter;
    filter.apply(...filter.defaultOptions);
  };

  loadImage(url) {
    this.hide();
    filterPanel.show();
    const img = new Image();
    img.onload = (event) => this.handleImageOnloadEvent(event);
    img.src = url;
  }

  loadInputImage(event) {
    const file = event.currentTarget.files[0];
    this.loadFile(file);
    event.currentTarget.value = "";
  }

  loadFile(file) {
    if (!file.type.startsWith("image/")) return;
    if (file.type === "image/svg+xml") {
      alert("SVG is not supported.");
      return;
    }
    const url = URL.createObjectURL(file);
    this.loadImage(url);
  }

  async loadClipboardImage() {
    try {
      const items = await navigator.clipboard.read();
      const item = items[0];
      for (const type of item.types) {
        if (type === "image/svg+xml") {
          alert("SVG is not supported.");
        } else if (type.startsWith("image/")) {
          const file = await item.getType(type);
          const url = URL.createObjectURL(file);
          this.loadImage(url);
          break;
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
}

class FilterPanel extends LoadPanel {
  filters = {};
  currentFilter;

  constructor(panel) {
    super(panel);
    this.panelContainer = panel.querySelector(".panelContainer");
    this.selectedIndex = 0;
    this.canvas = panel.querySelector("canvas");
    this.canvasContext = this.canvas.getContext("2d", {
      willReadFrequently: true,
    });
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCanvasContext = this.offscreenCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    this.canvasContainer = this.canvas.parentNode;

    panel.querySelector(".moveTop").onclick = () => this.moveLoadPanel();
    panel.querySelector(".download").onclick = () => this.download();
    panel.querySelector(".filterSelect").onchange = (event) =>
      this.filterSelect(event);
    this.addFilters();
    this.outputOptions = new OutputOptions(this);
  }

  show() {
    super.show();
    this.panelContainer.scrollIntoView({ behavior: "instant" });
  }

  moveLoadPanel() {
    this.hide();
    loadPanel.show();
  }

  downloadFile(file) {
    const a = document.createElement("a");
    const url = URL.createObjectURL(file);
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  downloadCanvas(type, quality) {
    let ext = type.split("/")[1];
    if (ext == "jpeg") ext = "jpg";
    const name = `reduced.${ext}`;
    this.canvas.toBlob(
      (blob) => {
        const file = new File([blob], name, { type });
        this.downloadFile(file);
      },
      type,
      quality,
    );
  }

  toPNG8() {
    const { width, height } = this.canvas;
    const medianCut = this.currentFilter.medianCut;
    const { replaceColors, colorMapping, imageData } = medianCut;
    const palette = new Uint8Array(replaceColors.length * 3);
    for (let i = 0; i < replaceColors.length; i++) {
      const key = replaceColors[i];
      const j = i * 3;
      palette[j] = key & 0xFF;
      palette[j + 1] = (key >> 8) & 0xFF;
      palette[j + 2] = (key >> 16) & 0xFF;
    }
    const mappedImageData = new Uint8Array(width * height);
    const uint32ImageData = new Uint32Array(imageData.buffer);
    replaceColors.forEach((key, i) => {
      colorMapping[key] = i;
    });
    for (let i = 0; i < uint32ImageData.length; i++) {
      const rgba = uint32ImageData[i];
      const key = rgba & 0xFFFFFF;
      mappedImageData[i] = colorMapping[key];
    }
    return encode(mappedImageData, width, height, {
      palette,
      color: 3, // Indexed
      compression: 2, // Best
    });
  }

  toPNG() {
    const { width, height } = this.canvas;
    const imageData = this.canvasContext.getImageData(0, 0, width, height);
    return encode(imageData.data, width, height, {
      compression: 2, // Best
    });
  }

  download() {
    const typeSelect = this.panel.querySelector(".typeSelect");
    const type = typeSelect.options[typeSelect.selectedIndex].value;
    const quality = Number(this.panel.querySelector(".quality").value);
    if (this.currentFilter instanceof MedianCutFilter) {
      if (type == "image/png") {
        const png = this.toPNG8();
        const blob = new Blob([png.buffer]);
        const name = "reduced.png";
        const file = new File([blob], name, { type });
        this.downloadFile(file);
      } else {
        this.downloadCanvas(type, quality);
      }
    } else {
      if (type == "image/png") {
        const png = this.toPNG();
        const blob = new Blob([png.buffer]);
        const name = "reduced.png";
        const file = new File([blob], name, { type });
        this.downloadFile(file);
      } else {
        this.downloadCanvas(type, quality);
      }
    }
  }

  filterSelect(event) {
    const options = event.target.options;
    const selectedIndex = options.selectedIndex;
    const prevClass = options[this.selectedIndex].value;
    const currClass = options[selectedIndex].value;
    this.panel.querySelector(`.${prevClass}`).classList.add("d-none");
    this.panel.querySelector(`.${currClass}`).classList.remove("d-none");
    this.selectedIndex = selectedIndex;
    const filter = new this.filters[currClass](this);
    this.currentFilter = filter;
    filter.apply(...filter.defaultOptions);
  }

  addFilters() {
    this.filtering = false;
    this.filters.uniformQuantization = UniformQuantizationFilter;
    this.filters.medianCut = MedianCutFilter;
  }

  setCanvas(canvas) {
    if (canvas.tagName.toLowerCase() === "img") {
      this.canvas.width = canvas.naturalWidth;
      this.canvas.height = canvas.naturalHeight;
      this.offscreenCanvas.width = canvas.naturalWidth;
      this.offscreenCanvas.height = canvas.naturalHeight;
    } else {
      this.canvas.width = canvas.width;
      this.canvas.height = canvas.height;
      this.offscreenCanvas.width = canvas.width;
      this.offscreenCanvas.height = canvas.height;
    }
    this.canvasContext.drawImage(canvas, 0, 0);
    this.offscreenCanvasContext.drawImage(canvas, 0, 0);
  }
}

class Filter {
  constructor(root, inputs) {
    this.root = root;
    this.inputs = inputs;
    this.addInputEvents(root, inputs);
  }

  apply() {
  }

  addInputEvents(root, inputs) {
    for (const input of Object.values(inputs)) {
      input.addEventListener("input", () => this.apply());
    }
    for (const node of root.querySelectorAll("button[title=reset]")) {
      node.onclick = () => {
        const rangeInput = node.previousElementSibling;
        rangeInput.value = rangeInput.dataset.value;
        rangeInput.dispatchEvent(new Event("input"));
      };
    }
  }
}

class OutputOptions extends Filter {
  cached = false;
  defaultOptions = [0.8];

  constructor(filterPanel) {
    const root = filterPanel.panel.querySelector(".outputOptions");
    const inputs = {
      quality: root.querySelector(".quality"),
    };
    super(root, inputs);
    this.filterPanel = filterPanel;
    this.canvas = document.createElement("canvas");
    this.canvasContext = this.canvas.getContext("2d", {
      willReadFrequently: true,
    });
    this.typeSelect = this.root.querySelector(".typeSelect");
    this.checkFilterEvents();
  }

  checkFilterEvents() {
    const filters = this.filterPanel.panel.querySelector(".filters");
    for (const input of filters.querySelectorAll("input")) {
      input.addEventListener("input", () => {
        this.cached = false;
        this.inputs.quality.value = this.defaultOptions[0];
        filterPanel.canvasContext.drawImage(this.canvas, 0, 0);
      });
    }
    this.typeSelect.addEventListener("change", () => {
      this.cached = false;
      this.inputs.quality.value = this.defaultOptions[0];
      filterPanel.canvasContext.drawImage(this.canvas, 0, 0);
    });
  }

  apply(quality) {
    const { inputs, filterPanel, typeSelect, canvas } = this;
    const type = typeSelect.options[typeSelect.selectedIndex].value;
    if (quality === undefined) {
      quality = Number(inputs.quality.value);
    } else {
      inputs.quality.value = color;
    }
    if (!this.cached) {
      const { width, height } = filterPanel.canvas;
      canvas.width = width;
      canvas.height = height;
      this.canvasContext.drawImage(filterPanel.canvas, 0, 0);
      this.cached = true;
    }
    canvas.toBlob(
      (blob) => {
        const file = new File([blob], "", { type });
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          filterPanel.canvasContext.drawImage(img, 0, 0);
        };
        img.src = url;
      },
      type,
      quality,
    );
  }
}

class UniformQuantizationFilter extends Filter {
  defaultOptions = [6];

  constructor(filterPanel) {
    const root = filterPanel.panel.querySelector(".uniformQuantization");
    const inputs = {
      color: root.querySelector(".color"),
    };
    super(root, inputs);
    this.filterPanel = filterPanel;
  }

  apply(color) {
    const { inputs, filterPanel } = this;
    if (color === undefined) {
      color = Number(inputs.color.value);
    } else {
      inputs.color.value = color;
    }
    if (color === 8) {
      filterPanel.canvasContext.drawImage(filterPanel.offscreenCanvas, 0, 0);
    } else {
      const src = cv.imread(filterPanel.offscreenCanvas);

      const step = 256 / 2 ** color;
      const colorArray = new Array(256);
      for (let i = 0; i < colorArray.length; i++) {
        const index = Math.floor(i / step);
        const median = Math.floor((index + 0.5) * step);
        colorArray[i] = median;
      }
      const lut = cv.matFromArray(1, 256, cv.CV_8U, colorArray);
      cv.LUT(src, lut, src);
      cv.imshow(filterPanel.canvas, src);
      src.delete();
      lut.delete();
    }
  }
}

class MedianCutFilter extends Filter {
  defaultOptions = [6];

  constructor(filterPanel) {
    const root = filterPanel.panel.querySelector(".medianCut");
    const inputs = {
      color: root.querySelector(".color"),
    };
    super(root, inputs);
    const imageData = filterPanel.offscreenCanvasContext.getImageData(
      0,
      0,
      filterPanel.canvas.width,
      filterPanel.canvas.height,
    );
    this.filterPanel = filterPanel;
    this.medianCut = new MedianCut(imageData);
  }

  apply(color) {
    const { inputs, filterPanel } = this;
    if (color === undefined) {
      color = Number(inputs.color.value);
    } else {
      inputs.color.value = color;
    }
    if (color === 9) {
      filterPanel.canvasContext.drawImage(filterPanel.offscreenCanvas, 0, 0);
    } else {
      const imageData = filterPanel.offscreenCanvasContext.getImageData(
        0,
        0,
        filterPanel.canvas.width,
        filterPanel.canvas.height,
      );
      this.medianCut.imageData = imageData.data;
      this.medianCut.apply(2 ** color, true);
      filterPanel.canvasContext.putImageData(imageData, 0, 0);
    }
  }
}

class MedianCut {
  replaceColors;
  colorMapping;

  constructor(imageData) {
    this.imageData = imageData.data;
    this.colors = this.getColorInfo();
  }

  getColorInfo() {
    const { imageData } = this;
    // const colorCount = new Uint32Array(16777216);
    // for (let i = 0; i < imageData.length; i += 4) {
    //   const r = imageData[i];
    //   const g = imageData[i + 1];
    //   const b = imageData[i + 2];
    //   const key = (r << 16) | (g << 8) | b;
    //   colorCount[key]++;
    // }
    // const colors = [];
    // for (let key = 0; key < colorCount.length; key++) {
    //   const uses = colorCount[key];
    //   if (uses > 0) {
    //     const r = (key >> 16) & 0xFF;
    //     const g = (key >> 8) & 0xFF;
    //     const b = key & 0xFF;
    //     colors.push([r, g, b, uses]);
    //   }
    // }
    const uint32ImageData = new Uint32Array(imageData.buffer);
    const colorCount = new Uint32Array(16777216);
    for (let i = 0; i < uint32ImageData.length; i++) {
      const rgba = uint32ImageData[i];
      const key = rgba & 0xFFFFFF;
      colorCount[key]++;
    }
    const colors = [];
    for (let key = 0; key < colorCount.length; key++) {
      const uses = colorCount[key];
      if (uses > 0) {
        const b = (key >> 16) & 0xFF;
        const g = (key >> 8) & 0xFF;
        const r = key & 0xFF;
        colors.push([r, g, b, uses]);
      }
    }
    return colors;
  }

  calculateCubeProperties(colorArray) {
    const colorStats = this.getColorStats(colorArray);
    const dominantColorType = this.getDominantColorType(colorStats);
    return {
      colors: colorArray,
      total: colorStats.totalUsage,
      type: dominantColorType,
    };
  }

  getColorStats(colorArray) {
    let totalUsage = 0;
    let maxR = 0, maxG = 0, maxB = 0;
    let minR = 255, minG = 255, minB = 255;
    for (const color of colorArray) {
      const [r, g, b, uses] = color;
      maxR = Math.max(maxR, r);
      maxG = Math.max(maxG, g);
      maxB = Math.max(maxB, b);
      minR = Math.min(minR, r);
      minG = Math.min(minG, g);
      minB = Math.min(minB, b);
      totalUsage += uses;
    }
    return {
      maxR,
      maxG,
      maxB,
      minR,
      minG,
      minB,
      totalUsage,
      rangeR: (maxR - minR),
      rangeG: (maxG - minG),
      rangeB: (maxB - minB),
    };
  }

  getDominantColorType({ rangeR, rangeG, rangeB }) {
    if (rangeR > rangeG && rangeR > rangeB) return "r";
    if (rangeG > rangeR && rangeG > rangeB) return "g";
    if (rangeB > rangeR && rangeB > rangeG) return "b";
    return "g";
  }

  bucketSort(colors, colorIndex) {
    const buckets = new Array(256);
    for (let i = 0; i < 256; i++) {
      buckets[i] = [];
    }
    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      buckets[color[colorIndex]].push(color);
    }
    return buckets.flat();
  }

  splitCubesByMedian(cubes, colorSize) {
    let maxIndex = 0;
    for (let i = 1; i < cubes.length; i++) {
      if (
        cubes[i].total > cubes[maxIndex].total && cubes[i].colors.length !== 1
      ) {
        maxIndex = i;
      }
    }
    const index = maxIndex;
    if (cubes[index].total === 1 || cubes[index].colors.length === 1) {
      return cubes;
    }
    const colorType = cubes[index].type;
    const colorIndex = "rgb".indexOf(colorType);
    cubes[index].colors = this.bucketSort(cubes[index].colors, colorIndex);
    const splitBorder = Math.floor((cubes[index].colors.length + 1) / 2);
    const split1 = this.calculateCubeProperties(
      cubes[index].colors.slice(0, splitBorder),
    );
    const split2 = this.calculateCubeProperties(
      cubes[index].colors.slice(splitBorder),
    );
    const result = cubes.filter((_, i) => i !== index);
    result.push(split1, split2);
    return result.length < colorSize
      ? this.splitCubesByMedian(result, colorSize)
      : result;
  }

  apply(colorSize, update) {
    if (this.colors.length <= colorSize) return;
    const initialCube = this.calculateCubeProperties(this.colors);
    const cubes = this.splitCubesByMedian([initialCube], colorSize);
    const replaceColors = cubes.map((cube) => {
      let totalR = 0, totalG = 0, totalB = 0, totalUses = 0;
      for (const col of cube.colors) {
        const [r, g, b, uses] = col;
        totalR += r * uses;
        totalG += g * uses;
        totalB += b * uses;
        totalUses += uses;
      }
      const avgR = Math.round(totalR / totalUses);
      const avgG = Math.round(totalG / totalUses);
      const avgB = Math.round(totalB / totalUses);
      return (avgB * 256 + avgG) * 256 + avgR;
    });
    this.replaceColors = replaceColors;
    if (update) {
      // const { imageData } = this;
      // const colorMapping = new Array(16777216);
      // cubes.forEach((cube, i) => {
      //   cube.colors.forEach(([r, g, b]) => {
      //     const key = (r * 256 + g) * 256 + b;
      //     colorMapping[key] = replaceColors[i];
      //   });
      // });
      // for (let i = 0; i < imageData.length; i += 4) {
      //   const r = imageData[i];
      //   const g = imageData[i + 1];
      //   const b = imageData[i + 2];
      //   const key = (r * 256 + g) * 256 + b;
      //   const color = colorMapping[key];
      //   if (color) {
      //     imageData[i] = color.r;
      //     imageData[i + 1] = color.g;
      //     imageData[i + 2] = color.b;
      //   }
      // }
      const uint32ImageData = new Uint32Array(this.imageData.buffer);
      const colorMapping = new Uint8Array(16777216);
      cubes.forEach((cube, i) => {
        const colors = cube.colors;
        for (let j = 0; j < colors.length; j++) {
          const [r, g, b] = colors[j];
          const key = (b * 256 + g) * 256 + r;
          colorMapping[key] = i;
        }
      });
      this.colorMapping = colorMapping;
      for (let i = 0; i < uint32ImageData.length; i++) {
        const rgba = uint32ImageData[i];
        const key = rgba & 0xFFFFFF;
        const newColor = replaceColors[colorMapping[key]];
        if (newColor) {
          uint32ImageData[i] = newColor | (rgba & 0xFF000000);
        }
      }
    }
  }
}

const filterPanel = new FilterPanel(document.getElementById("filterPanel"));
const loadPanel = new LoadPanel(document.getElementById("loadPanel"));
loadConfig();
initLangSelect();
initTooltip();
document.getElementById("toggleDarkMode").onclick = toggleDarkMode;
globalThis.ondragover = (event) => {
  event.preventDefault();
};
globalThis.ondrop = (event) => {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  loadPanel.loadFile(file);
};
globalThis.addEventListener("paste", (event) => {
  const item = event.clipboardData.items[0];
  const file = item.getAsFile();
  if (!file) return;
  loadPanel.loadFile(file);
});

await loadScript(await getOpenCVPath());
cv = await cv();
