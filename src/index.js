import { Tooltip } from "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/+esm";
import imageCompareViewer from "https://cdn.jsdelivr.net/npm/image-compare-viewer@1.6.2/+esm";

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
    const filter = filterPanel.filters.uniformQuantization;
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
    this.addEvents(panel);
  }

  show() {
    super.show();
    this.panelContainer.scrollIntoView({ behavior: "instant" });
  }

  moveLoadPanel() {
    this.hide();
    loadPanel.show();
  }

  download() {
    this.canvas.toBlob((blob) => {
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = "reduced.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  filterSelect(event) {
    const options = event.target.options;
    const selectedIndex = options.selectedIndex;
    const prevClass = options[this.selectedIndex].value;
    const currClass = options[selectedIndex].value;
    this.panel.querySelector(`.${prevClass}`).classList.add("d-none");
    this.panel.querySelector(`.${currClass}`).classList.remove("d-none");
    this.selectedIndex = selectedIndex;
    const filter = this.filters[currClass];
    filter.apply(...filter.defaultOptions);
  }

  addEvents(panel) {
    this.filtering = false;
    this.addUniformQuantizationEvents(panel);
    this.addMedianCutEvents(panel);
  }

  addInputEvents(filter) {
    for (const input of Object.values(filter.inputs)) {
      input.oninput = () => filter.apply();
      input.onchange = () => filter.apply();
    }
    for (const node of filter.root.querySelectorAll("button[title=reset]")) {
      node.onclick = () => {
        const rangeInput = node.previousElementSibling;
        rangeInput.value = rangeInput.dataset.value;
        filter.apply();
      };
    }
  }

  addUniformQuantizationEvents(panel) {
    const root = panel.querySelector(".uniformQuantization");
    this.filters.uniformQuantization = {
      root,
      apply: (range) => {
        this.uniformQuantization(range);
      },
      defaultOptions: [6],
      inputs: {
        color: root.querySelector(".color"),
      },
    };
    this.addInputEvents(this.filters.uniformQuantization);
  }

  uniformQuantization(color) {
    const filter = this.filters.uniformQuantization;
    const inputs = filter.inputs;
    if (color === undefined) {
      color = Number(inputs.color.value);
    } else {
      inputs.color.value = color;
    }
    if (color === 1) {
      this.canvasContext.drawImage(this.offscreenCanvas, 0, 0);
    } else {
      const src = cv.imread(this.offscreenCanvas);

      const colorValue = 2 ** color - 1;
      const colorArray = new Array(256);
      for (let i = 0; i < colorArray.length; i++) {
        colorArray[i] = Math.round(i / colorValue) * colorValue;
      }
      const lut = cv.matFromArray(1, 256, cv.CV_8U, colorArray);
      cv.LUT(src, lut, src);
      cv.imshow(this.canvas, src);
      src.delete();
      lut.delete();
    }
  }

  addMedianCutEvents(panel) {
    const root = panel.querySelector(".medianCut");
    this.filters.medianCut = {
      root,
      apply: (range) => {
        this.medianCut(range);
      },
      defaultOptions: [6],
      inputs: {
        color: root.querySelector(".color"),
      },
    };
    this.addInputEvents(this.filters.medianCut);
  }

  medianCut(color) {
    const filter = this.filters.medianCut;
    const inputs = filter.inputs;
    if (color === undefined) {
      color = Number(inputs.color.value);
    } else {
      inputs.color.value = color;
    }
    if (color === 9) {
      this.canvasContext.drawImage(this.offscreenCanvas, 0, 0);
    } else {
      const imageData = this.offscreenCanvasContext.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );
      const medianCut = new MedianCut(imageData);
      medianCut.apply(color ** 2, true);
      this.canvasContext.putImageData(imageData, 0, 0);
    }
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

class MedianCut {
  constructor(imageData) {
    this.raw = imageData.data;
    this.width = imageData.width;
    this.height = imageData.height;
    this.colors = this.getColorInfo();
  }

  getColorInfo() {
    const { raw } = this;
    const colorCount = new Map();
    for (let i = 0; i < raw.length; i += 4) {
      const r = raw[i];
      const g = raw[i + 1];
      const b = raw[i + 2];
      const key = (r * 256 + g) * 256 + b;
      colorCount.set(key, (colorCount.get(key) || 0) + 1);
    }
    const colors = [];
    colorCount.forEach((uses, key) => {
      const r = key >> 16;
      const g = (key >> 8) & 0xff;
      const b = key & 0xff;
      colors.push({ r, g, b, uses });
    });
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
      const { r, g, b, uses } = color;
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
      rangeR: (maxR - minR) * 1.2,
      rangeG: (maxG - minG) * 1.2,
      rangeB: maxB - minB,
    };
  }

  getDominantColorType({ rangeR, rangeG, rangeB }) {
    if (rangeR > rangeG && rangeR > rangeB) return "r";
    if (rangeG > rangeR && rangeG > rangeB) return "g";
    if (rangeB > rangeR && rangeB > rangeG) return "b";
    return "r";
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
    cubes[index].colors.sort((a, b) => a[colorType] - b[colorType]);
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
        const { r, g, b, uses } = col;
        totalR += r * uses;
        totalG += g * uses;
        totalB += b * uses;
        totalUses += uses;
      }
      return {
        r: Math.round(totalR / totalUses),
        g: Math.round(totalG / totalUses),
        b: Math.round(totalB / totalUses),
      };
    });
    if (update) {
      const pixels = new Map();
      cubes.forEach((cube, i) => {
        cube.colors.forEach(({ r, g, b }) => {
          const key = (r * 256 + g) * 256 + b;
          pixels.set(key, replaceColors[i]);
        });
      });
      const { raw } = this;
      for (let i = 0; i < raw.length; i += 4) {
        const r = raw[i];
        const g = raw[i + 1];
        const b = raw[i + 2];
        const key = (r * 256 + g) * 256 + b;
        const color = pixels.get(key);
        if (color) {
          raw[i] = color.r;
          raw[i + 1] = color.g;
          raw[i + 2] = color.b;
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
