import { Tooltip } from "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/+esm";
import imageCompareViewer from "https://cdn.jsdelivr.net/npm/image-compare-viewer@1.6.2/+esm";
import { MedianCut, OctreeQuantization } from "./color-reducer.js";
import { encode } from "./pngs.js";

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

function getTransparentBackgroundImage(size, colors) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.fillStyle = colors[0];
  context.fillRect(0, 0, size / 2, size / 2);
  context.fillRect(size / 2, size / 2, size / 2, size / 2);
  context.fillStyle = colors[1];
  context.fillRect(size / 2, 0, size / 2, size / 2);
  context.fillRect(0, size / 2, size / 2, size / 2);
  const url = canvas.toDataURL("image/png");
  return `url(${url})`;
}

function setTransparentCSSVariables() {
  const lightBg = getTransparentBackgroundImage(32, ["#ddd", "#fff"]);
  const darkBg = getTransparentBackgroundImage(32, ["#333", "#212529"]);
  document.documentElement.style.setProperty(
    "--transparent-bg-light",
    lightBg,
  );
  document.documentElement.style.setProperty(
    "--transparent-bg-dark",
    darkBg,
  );
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
      images[0].classList.remove("w-100");
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
    const select = filterPanel.panel.querySelector(".filterSelect");
    select.options[0].selected = true;
    select.dispatchEvent(new Event("change"));
    filterPanel.currentFilter = filter;
    filterPanel.canvas.classList.add("loading");
    setTimeout(() => {
      filter.apply();
      filterPanel.canvas.classList.remove("loading");
    }, 0);
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
    const { quantizer } = this.currentFilter;
    const { replaceColors } = quantizer;
    const palette = new Uint8Array(replaceColors.length * 3);
    for (let i = 0; i < replaceColors.length; i++) {
      const key = replaceColors[i];
      const j = i * 3;
      palette[j] = key & 0xFF;
      palette[j + 1] = (key >> 8) & 0xFF;
      palette[j + 2] = (key >> 16) & 0xFF;
    }
    const indexedImage = quantizer.getIndexedImage();
    return encode(indexedImage, width, height, {
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
    if (this.currentFilter instanceof UniformQuantizationFilter) {
      if (type == "image/png") {
        const png = this.toPNG();
        const blob = new Blob([png.buffer]);
        const name = "reduced.png";
        const file = new File([blob], name, { type });
        this.downloadFile(file);
      } else {
        this.downloadCanvas(type, quality);
      }
    } else {
      if (type == "image/png") {
        const png = this.toPNG8();
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
    this.canvas.classList.add("loading");
    setTimeout(() => {
      this.currentFilter.apply();
      this.canvas.classList.remove("loading");
    }, 0);
  }

  addFilters() {
    this.filters.uniformQuantization = UniformQuantizationFilter;
    this.filters.octreeQuantization = OctreeQuantizationFilter;
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
      input.addEventListener("input", () => {
        filterPanel.canvas.classList.add("loading");
        setTimeout(() => {
          filterPanel.currentFilter.apply();
          filterPanel.canvas.classList.remove("loading");
        }, 0);
      });
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
        this.inputs.quality.value = 0.8;
        filterPanel.canvasContext.drawImage(this.canvas, 0, 0);
      });
    }
    this.typeSelect.addEventListener("change", () => {
      this.cached = false;
      this.inputs.quality.value = 0.8;
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
  constructor(filterPanel) {
    const root = filterPanel.panel.querySelector(".uniformQuantization");
    const inputs = {
      color: root.querySelector(".color"),
    };
    super(root, inputs);
    this.filterPanel = filterPanel;
  }

  apply() {
    const { inputs, filterPanel } = this;
    const color = Number(inputs.color.value);
    if (color === 16) {
      filterPanel.canvasContext.drawImage(filterPanel.offscreenCanvas, 0, 0);
    } else {
      const src = cv.imread(filterPanel.offscreenCanvas);

      const step = 256 / color;
      const center = step / 2;
      const colorArray = new Array(256);
      for (let i = 0; i < colorArray.length; i++) {
        colorArray[i] = Math.round(Math.floor(i / step) * step + center);
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
    this.quantizer = new MedianCut(
      imageData.data,
      imageData.width,
      imageData.height,
    );
  }

  apply() {
    const { inputs, filterPanel } = this;
    const color = Number(inputs.color.value);
    if (color === 9) {
      filterPanel.canvasContext.drawImage(filterPanel.offscreenCanvas, 0, 0);
    } else {
      const { width, height } = this.quantizer;
      const newImage = this.quantizer.apply(2 ** color);
      const newImageData = new ImageData(newImage, width, height);
      filterPanel.canvasContext.putImageData(newImageData, 0, 0);
    }
  }
}

class OctreeQuantizationFilter extends Filter {
  constructor(filterPanel) {
    const root = filterPanel.panel.querySelector(".octreeQuantization");
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
    this.quantizer = new OctreeQuantization(
      imageData.data,
      imageData.width,
      imageData.height,
    );
  }

  apply() {
    const { inputs, filterPanel } = this;
    const color = Number(inputs.color.value);
    if (color === 9) {
      filterPanel.canvasContext.drawImage(filterPanel.offscreenCanvas, 0, 0);
    } else {
      const { width, height } = this.quantizer;
      const newImage = this.quantizer.apply(2 ** color);
      const newImageData = new ImageData(newImage, width, height);
      filterPanel.canvasContext.putImageData(newImageData, 0, 0);
    }
  }
}

const filterPanel = new FilterPanel(document.getElementById("filterPanel"));
const loadPanel = new LoadPanel(document.getElementById("loadPanel"));
loadConfig();
initLangSelect();
initTooltip();
setTransparentCSSVariables();
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
