// Glitch Brush Toolkit - "Noise Palette"
// Cam Mansanarez

let userImg, scaledImg;
let imgX, imgY, imgW, imgH;

let cnv;

let currentBrush = "Pixel Shift";
let brushes = ["Pixel Shift", "Data Noise", "Signal Bloom", "Spectral Swap", "Chromatic Aberration", "Scan Line", "Bitcrush", "Pixel Sort"];
let history = [];
let maxHistory = 10;
let isDrawing = false;
let compareSnapshot = null;
let brushSizeMultiplier = 1.0;
let brushIntensity = 1.0;
let brushOpacity = 1.0;
let pixelSortDir      = "Auto";  // "Auto" | "H" | "V"
let caMinOffset       = 0;       // 0–20 px base fringe
let spectralHueTarget = 180;     // 0–360 target hue
let bitDepthVal       = 3;       // 1–6 bit depth
let bitBlockSize      = 4;       // 1–8 block size
let bitDither         = false;
let dataNoiseDir      = "Both";  // "H" | "V" | "Both"
let scanLineDir       = "H";     // "H" | "V"
let signalAmpMin      = 1.0;     // lower amp bound
let signalAmpMax      = 2.5;     // upper amp bound
let signalMode        = "Bloom"; // "Bloom" | "Burn"
let brushShape = "circle";
let bgColor = '#141414';

const bayer4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

// UI elements
let brushSelector, uploadButton, undoButton, clearButton, saveButton;

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  background(bgColor);
}

function draw() {
  if (!userImg || !isDrawing) return;

  let preRegion, rx, ry, rw, rh;
  if (brushOpacity < 1.0) {
    let pad = getBrushPad();
    rx = max(0, mouseX - pad);
    ry = max(0, mouseY - pad);
    rw = min(width,  mouseX + pad) - rx;
    rh = min(height, mouseY + pad) - ry;
    preRegion = get(rx, ry, rw, rh);
  }

  switch (currentBrush) {
    case "Pixel Shift":          applyPixelShift();          break;
    case "Data Noise":           applyDataNoise();           break;
    case "Signal Bloom":         applySignalBloom();         break;
    case "Spectral Swap":        applySpectralSwap();        break;
    case "Chromatic Aberration": applyChromaticAberration(); break;
    case "Scan Line":            applyScanLine();            break;
    case "Bitcrush":             applyBitcrush();            break;
    case "Pixel Sort":           applyPixelSort();           break;
  }

  if (preRegion) {
    tint(255, (1 - brushOpacity) * 255);
    image(preRegion, rx, ry);
    noTint();
  }
}

function mousePressed(event) {
  // Only capture history when the click lands on the p5 canvas itself,
  // not on toolbar buttons (which also bubble up to the document).
  if (event.target !== cnv.elt) return;
  if (userImg) {
    history.push(get());
    if (history.length > maxHistory) history.shift();
    isDrawing = true;
  }
}

function mouseReleased() {
  isDrawing = false;
}

function keyPressed() {
  // Don't intercept when user is typing in a form field
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  // 1–8: select brush
  if (key >= '1' && key <= '8') {
    let idx = int(key) - 1;
    if (idx < brushes.length) {
      currentBrush = brushes[idx];
      // Sync HTML select + trigger cursor resize
      let sel = document.getElementById('brush-select');
      if (sel) {
        sel.value = currentBrush;
        sel.dispatchEvent(new Event('change'));
      }
    }
  }
  // Z: undo
  if (key === 'z' || key === 'Z') undoLast();
  // C: clear
  if (key === 'c' || key === 'C') resetCanvas();
  // S: save
  if (key === 's' || key === 'S') saveCanvas('GlitchArt', 'png');
  // O: hold to compare with original
  if ((key === 'o' || key === 'O') && userImg && !compareSnapshot) {
    compareSnapshot = get();
    background(bgColor);
    image(scaledImg, imgX, imgY, imgW, imgH);
  }
  // G: generate canvas
  if (key === 'g' || key === 'G') {
    generateCanvas();
    if (typeof window.hideHint === 'function') window.hideHint();
  }
}

function keyReleased() {
  if ((key === 'o' || key === 'O') && compareSnapshot) {
    image(compareSnapshot, 0, 0);
    compareSnapshot = null;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (userImg) {
    scaleAndCenterImage();
    image(scaledImg, imgX, imgY, imgW, imgH);
  } else {
    background(bgColor);
  }
}

// Returns true if (x, y) offset from brush centre is inside the active brush shape.
// Square mode just returns true — the for-loop bounds already define the square.
function inBrushShape(x, y, r) {
  return brushShape === "square" ? true : dist(0, 0, x, y) <= r;
}

// ---------------------------
// Brush Implementations
// ---------------------------

// 1. Pixel Shift Brush
function applyPixelShift() {
  noStroke();

  if (random(1) < 0.2 * brushIntensity) {
    let brushSize = int(random(1, 20));
    let scatter   = 50 * brushSizeMultiplier;
    let glitchX   = mouseX + random(-scatter, scatter);
    let glitchY   = mouseY + random(-scatter, scatter);

    // Sample colors from source image at brush and scatter positions
    let mx = constrain(int(mouseX - imgX), 0, imgW - 1);
    let my = constrain(int(mouseY - imgY), 0, imgH - 1);
    let mc = scaledImg.get(mx, my);

    let sx = constrain(int(glitchX - imgX), 0, imgW - 1);
    let sy = constrain(int(glitchY - imgY), 0, imgH - 1);
    let sc = scaledImg.get(sx, sy);

    if (random(1) < 0.1) {
      erasePixel(glitchX, glitchY, brushSize);
    } else {
      fill(sc);
      square(glitchX, glitchY, brushSize);
    }

    fill(red(mc), 0, 0);
    square(mouseX + random(-5, 5), mouseY, brushSize);

    fill(0, green(mc), 0);
    square(mouseX, mouseY + random(-5, 5), brushSize);

    fill(0, 0, blue(mc));
    square(mouseX, mouseY, brushSize);
  }
}

function erasePixel(x, y, size) {
  let localX = constrain(int(x - imgX), 0, imgW - 1);
  let localY = constrain(int(y - imgY), 0, imgH - 1);
  let c = scaledImg.get(localX, localY);
  noStroke();
  fill(c);
  square(x, y, size);
}

// 2. Data Noise Brush
function applyDataNoise() {
  loadPixels();
  scaledImg.loadPixels();

  let r = int(40 * brushSizeMultiplier);
  for (let x = -r; x < r; x++) {
    for (let y = -r; y < r; y++) {
      if (!inBrushShape(x, y, r)) continue;
      let px = int(mouseX + x);
      let py = int(mouseY + y);
      if (px >= 0 && px < width && py >= 0 && py < height) {
        let n = noise(px * 0.01, py * 0.01, frameCount * 0.02);
        let offsetX = dataNoiseDir !== "V" ? int(map(n, 0, 1, -30 * brushIntensity, 30 * brushIntensity)) : 0;
        let offsetY = dataNoiseDir !== "H" ? int(map(n, 0, 1, -3  * brushIntensity,  3 * brushIntensity)) : 0;
        let sx = constrain(px + offsetX, 0, width - 1);
        let sy = constrain(py + offsetY, 0, height - 1);
        let c = scaledImg.get(sx - imgX, sy - imgY);
        set(px, py, c);
      }
    }
  }
  updatePixels();
}

// 3. Signal Bloom Brush
function applySignalBloom() {
  loadPixels();

  let r   = int(10 * brushSizeMultiplier);
  let raw = lerp(signalAmpMin, signalAmpMax, brushIntensity * random(0.5, 1.0));
  let amp = signalMode === "Burn" ? 1.0 / raw : raw;

  for (let x = -r; x < r; x++) {
    for (let y = -r; y < r; y++) {
      if (!inBrushShape(x, y, r)) continue;
      let px = int(mouseX + x);
      let py = int(mouseY + y);
      if (px >= 0 && px < width && py >= 0 && py < height) {
        let index = (py * width + px) * 4;
        pixels[index + 0] = constrain(pixels[index + 0] * amp, 0, 255);
        pixels[index + 1] = constrain(pixels[index + 1] * amp, 0, 255);
        pixels[index + 2] = constrain(pixels[index + 2] * amp, 0, 255);
      }
    }
  }

  updatePixels();
}

// 4. Spectral Swap Brush
function applySpectralSwap() {
  loadPixels();
  let r = int(15 * brushSizeMultiplier);
  for (let x = -r; x < r; x++) {
    for (let y = -r; y < r; y++) {
      if (!inBrushShape(x, y, r)) continue;
      let px = int(mouseX + x);
      let py = int(mouseY + y);
      if (px >= 0 && px < width && py >= 0 && py < height) {
        let index = (py * width + px) * 4;
        let rVal = pixels[index + 0];
        let gVal = pixels[index + 1];
        let bVal = pixels[index + 2];
        if (random(1) < 0.02) {
          let temp = rVal;
          rVal = gVal;
          gVal = bVal;
          bVal = temp;
        }
        let hsb = rgbToHsb(rVal, gVal, bVal);
        // Pull hue toward target via shortest angular path
        let diff = spectralHueTarget - hsb[0];
        if (diff >  180) diff -= 360;
        if (diff < -180) diff += 360;
        hsb[0] = (hsb[0] + diff * brushIntensity + 360) % 360;
        hsb[1] = constrain(hsb[1] * random(0.9, 1.2), 0, 100);
        let rgb = hsbToRgb(hsb[0], hsb[1], hsb[2]);
        pixels[index + 0] = rgb[0];
        pixels[index + 1] = rgb[1];
        pixels[index + 2] = rgb[2];
      }
    }
  }
  updatePixels();
}

// 5. Chromatic Aberration Brush
function applyChromaticAberration() {
  loadPixels();

  // Snapshot source pixels — read from this, write to pixels[].
  // Prevents read-after-write contamination that would cause smearing.
  let src = new Uint8ClampedArray(pixels);

  let r = int(20 * brushSizeMultiplier);
  let speed = dist(mouseX, mouseY, pmouseX, pmouseY);
  let speedBonus = map(speed, 0, 40, 0, 14, true);
  let maxOffset  = int((caMinOffset + speedBonus) * brushIntensity);

  // Offset channels along the axis of mouse movement.
  // Red trails behind, blue leads ahead — matches real lens fringe direction.
  let angle = atan2(mouseY - pmouseY, mouseX - pmouseX);
  let dx = cos(angle);
  let dy = sin(angle);

  for (let x = -r; x < r; x++) {
    for (let y = -r; y < r; y++) {
      let d = dist(0, 0, x, y);
      if (!inBrushShape(x, y, r)) continue;

      let px = int(mouseX + x);
      let py = int(mouseY + y);
      if (px < 0 || px >= width || py < 0 || py >= height) continue;

      // Falloff: full offset at centre, fades to zero at edge (clamped for square mode)
      let falloff = constrain(map(d, 0, r, 1, 0), 0, 1);
      let offset = int(maxOffset * falloff);

      let rx = constrain(px - int(dx * offset), 0, width - 1);
      let ry = constrain(py - int(dy * offset), 0, height - 1);
      let bx = constrain(px + int(dx * offset), 0, width - 1);
      let by = constrain(py + int(dy * offset), 0, height - 1);

      let rIdx  = (ry * width + rx) * 4;
      let gIdx  = (py * width + px) * 4;
      let bIdx  = (by * width + bx) * 4;
      let dest  = (py * width + px) * 4;

      pixels[dest + 0] = src[rIdx + 0];
      pixels[dest + 1] = src[gIdx + 1];
      pixels[dest + 2] = src[bIdx + 2];
    }
  }

  updatePixels();
}

// 6. Scan Line Brush
function applyScanLine() {
  loadPixels();
  let src = new Uint8ClampedArray(pixels);

  if (scanLineDir === "V") {
    // Column mode — shifts pixels up/down within each column
    let rX = int(60 * brushSizeMultiplier);
    let rY = int(80 * brushSizeMultiplier);

    for (let x = -rX; x < rX; x++) {
      let px = int(mouseX + x);
      if (px < 0 || px >= width) continue;

      let n        = noise(px * 0.04, frameCount * 0.01);
      let maxShift = 60 * brushIntensity;
      let shift    = int(map(n, 0, 1, -maxShift, maxShift));
      let hFalloff = map(abs(x), 0, rX, 1, 0);
      shift = int(shift * hFalloff);

      for (let y = -rY; y < rY; y++) {
        let py = int(mouseY + y);
        if (py < 0 || py >= height) continue;

        let sy     = constrain(py + shift, 0, height - 1);
        let dest   = (py * width + px) * 4;
        let srcIdx = (sy * width + px) * 4;

        pixels[dest]     = src[srcIdx];
        pixels[dest + 1] = src[srcIdx + 1];
        pixels[dest + 2] = src[srcIdx + 2];
      }
    }
  } else {
    // Row mode — shifts pixels left/right within each row
    let rY = int(60 * brushSizeMultiplier);
    let rX = int(80 * brushSizeMultiplier);

    for (let y = -rY; y < rY; y++) {
      let py = int(mouseY + y);
      if (py < 0 || py >= height) continue;

      let n        = noise(py * 0.04, frameCount * 0.01);
      let maxShift = 60 * brushIntensity;
      let shift    = int(map(n, 0, 1, -maxShift, maxShift));
      let vFalloff = map(abs(y), 0, rY, 1, 0);
      shift = int(shift * vFalloff);

      for (let x = -rX; x < rX; x++) {
        let px = int(mouseX + x);
        if (px < 0 || px >= width) continue;

        let sx     = constrain(px + shift, 0, width - 1);
        let dest   = (py * width + px) * 4;
        let srcIdx = (py * width + sx) * 4;

        pixels[dest]     = src[srcIdx];
        pixels[dest + 1] = src[srcIdx + 1];
        pixels[dest + 2] = src[srcIdx + 2];
      }
    }
  }

  updatePixels();
}

// 7. Bitcrush Brush
function applyBitcrush() {
  loadPixels();

  let r    = int(30 * brushSizeMultiplier);
  let step = 256 / pow(2, bitDepthVal);

  if (bitDither) {
    // Ordered dither — per-pixel Bayer quantization
    for (let x = -r; x <= r; x++) {
      for (let y = -r; y <= r; y++) {
        if (!inBrushShape(x, y, r)) continue;
        let px = int(mouseX + x);
        let py = int(mouseY + y);
        if (px < 0 || px >= width || py < 0 || py >= height) continue;
        let idx       = (py * width + px) * 4;
        let threshold = (bayer4[py % 4][px % 4] / 16 - 0.5) * step;
        pixels[idx]     = constrain(floor((pixels[idx]     + threshold) / step) * step, 0, 255);
        pixels[idx + 1] = constrain(floor((pixels[idx + 1] + threshold) / step) * step, 0, 255);
        pixels[idx + 2] = constrain(floor((pixels[idx + 2] + threshold) / step) * step, 0, 255);
      }
    }
  } else {
    // Block quantization — flood each NxN block with one quantized color
    for (let x = -r; x <= r; x += bitBlockSize) {
      for (let y = -r; y <= r; y += bitBlockSize) {
        if (!inBrushShape(x, y, r)) continue;
        let px = int(mouseX + x);
        let py = int(mouseY + y);
        if (px < 0 || px >= width || py < 0 || py >= height) continue;
        let repIdx = (py * width + px) * 4;
        let qR = floor(pixels[repIdx]     / step) * step;
        let qG = floor(pixels[repIdx + 1] / step) * step;
        let qB = floor(pixels[repIdx + 2] / step) * step;
        for (let bx = 0; bx < bitBlockSize; bx++) {
          for (let by = 0; by < bitBlockSize; by++) {
            let fpx = constrain(px + bx, 0, width - 1);
            let fpy = constrain(py + by, 0, height - 1);
            let fi  = (fpy * width + fpx) * 4;
            pixels[fi]     = qR;
            pixels[fi + 1] = qG;
            pixels[fi + 2] = qB;
          }
        }
      }
    }
  }

  updatePixels();
}

// 8. Pixel Sort Brush
function applyPixelSort() {
  loadPixels();

  let r = int(40 * brushSizeMultiplier);
  let speed = dist(mouseX, mouseY, pmouseX, pmouseY);
  // When nearly stationary default to column sort; otherwise follow movement axis
  let angle = atan2(mouseY - pmouseY, mouseX - pmouseX);
  let sortVertical;
  if (pixelSortDir === "H") {
    sortVertical = false;
  } else if (pixelSortDir === "V") {
    sortVertical = true;
  } else {
    sortVertical = speed < 0.5 ? true : abs(sin(angle)) >= abs(cos(angle));
  }

  if (sortVertical) {
    // Column sort — vertical movement: dark pixels sink, bright rise (or reverse)
    for (let x = -r; x <= r; x++) {
      let px = int(mouseX + x);
      if (px < 0 || px >= width) continue;

      let positions = [];
      let pixelData = [];

      for (let y = -r; y <= r; y++) {
        if (!inBrushShape(x, y, r)) continue;
        let py = int(mouseY + y);
        if (py < 0 || py >= height) continue;

        let index = (py * width + px) * 4;
        positions.push(py);
        pixelData.push({
          r: pixels[index],
          g: pixels[index + 1],
          b: pixels[index + 2],
          luma: pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114
        });
      }

      if (pixelData.length < 2) continue;
      pixelData.sort((a, b) => a.luma - b.luma);

      for (let i = 0; i < positions.length; i++) {
        let index = (positions[i] * width + px) * 4;
        pixels[index + 0] = pixelData[i].r;
        pixels[index + 1] = pixelData[i].g;
        pixels[index + 2] = pixelData[i].b;
      }
    }
  } else {
    // Row sort — horizontal movement: pixels reorder left-to-right by brightness
    for (let y = -r; y <= r; y++) {
      let py = int(mouseY + y);
      if (py < 0 || py >= height) continue;

      let positions = [];
      let pixelData = [];

      for (let x = -r; x <= r; x++) {
        if (!inBrushShape(x, y, r)) continue;
        let px = int(mouseX + x);
        if (px < 0 || px >= width) continue;

        let index = (py * width + px) * 4;
        positions.push(px);
        pixelData.push({
          r: pixels[index],
          g: pixels[index + 1],
          b: pixels[index + 2],
          luma: pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114
        });
      }

      if (pixelData.length < 2) continue;
      pixelData.sort((a, b) => a.luma - b.luma);

      for (let i = 0; i < positions.length; i++) {
        let index = (py * width + positions[i]) * 4;
        pixels[index + 0] = pixelData[i].r;
        pixels[index + 1] = pixelData[i].g;
        pixels[index + 2] = pixelData[i].b;
      }
    }
  }

  updatePixels();
}

// ---------------------------
// UI + Utilities
// ---------------------------
function getBrushPad() {
  const pads = {
    "Pixel Shift":           55,
    "Data Noise":            40,
    "Signal Bloom":          10,
    "Spectral Swap":         15,
    "Chromatic Aberration":  20,
    "Scan Line":             80,
    "Bitcrush":              30,
    "Pixel Sort":            40
  };
  return int((pads[currentBrush] || 40) * brushSizeMultiplier);
}

function setupUI() {
  brushSelector = createSelect();
  brushSelector.position(20, 20);
  brushSelector.attribute("title", "Select brush");
  for (let b of brushes) brushSelector.option(b);
  brushSelector.changed(() => currentBrush = brushSelector.value());

  uploadButton = createFileInput(handleImageUpload);
  uploadButton.position(160, 20);
  uploadButton.attribute("accept", "image/png, image/jpeg");

  undoButton = createButton("Undo");
  undoButton.position(300, 20);
  undoButton.mousePressed(undoLast);

  clearButton = createButton("Clear");
  clearButton.position(360, 20);
  clearButton.mousePressed(resetCanvas);

  saveButton = createButton("Save");
  saveButton.position(430, 20);
  saveButton.mousePressed(() => saveCanvas("GlitchArt", "png"));
}

function handleImageUpload(file) {
  if (file.type === "image") {
    userImg = loadImage(file.data, () => {
      background(bgColor);
      scaleAndCenterImage();
      image(scaledImg, imgX, imgY, imgW, imgH);
      history = [];
    });
  }
}

function undoLast() {
  if (history.length > 0) {
    let last = history.pop();
    image(last, 0, 0);
  }
}

function resetCanvas() {
  if (scaledImg) {
    background(bgColor);
    image(scaledImg, imgX, imgY, imgW, imgH);
    history = [];
  }
}

function scaleAndCenterImage() {
  let imgRatio = userImg.width / userImg.height;
  let canvasRatio = width / height;
  if (imgRatio > canvasRatio) {
    imgW = width;
    imgH = width / imgRatio;
  } else {
    imgH = height;
    imgW = height * imgRatio;
  }
  imgX = (width - imgW) / 2;
  imgY = (height - imgH) / 2;
  scaledImg = createImage(imgW, imgH);
  scaledImg.copy(userImg, 0, 0, userImg.width, userImg.height, 0, 0, imgW, imgH);
}

// --- RGB <-> HSB conversions ---
function rgbToHsb(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max, d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, v * 100];
}

function hsbToRgb(h, s, v) {
  let r, g, b;
  let i = Math.floor(h / 60) % 6;
  let f = h / 60 - i;
  s /= 100; v /= 100;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);
  switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [r * 255, g * 255, b * 255];
}
1


// ---------------------------
// Generative Canvas
// ---------------------------

function generateCanvas() {
  // Palette: Chartreuse, Pure Red, Black, Azure Blue, Vivid Tangerine, Lipstick Red, Parchment
  const pal = [
    [188, 248,   4],
    [250,  19,  15],
    [  0,   0,   0],
    [ 29, 127, 250],
    [252, 130,  23],
    [246,  40,  71],
    [245, 239, 237],
  ];

  noiseSeed(floor(millis()));
  randomSeed(floor(millis() + 1));

  background(0);

  // ── Layer 1: Block-sampled Perlin noise field ─────────────────────────
  // Three octaves: large region shapes + mid detail + fine grain
  const bs  = floor(random(4, 9));        // block pixel size 4–8
  const sc1 = random(0.003, 0.007);       // coarse → big colour regions
  const sc2 = random(0.015, 0.035);       // medium → panel detail
  const sc3 = random(0.07, 0.16);         // fine   → texture grain
  noStroke();
  for (let y = 0; y < height; y += bs) {
    for (let x = 0; x < width; x += bs) {
      let n = noise(x * sc1,       y * sc1      ) * 0.55
            + noise(x * sc2 + 40,  y * sc2 + 40 ) * 0.30
            + noise(x * sc3 + 80,  y * sc3 + 80 ) * 0.15;
      let ci = floor(n * pal.length) % pal.length;
      let c  = pal[ci];
      fill(c[0], c[1], c[2]);
      rect(x, y, bs, bs);
    }
  }

  // ── Layer 2: Scan-shift bands ─────────────────────────────────────────
  // Pixel-shift horizontal slices — baked glitch before any brush touches it
  loadPixels();
  let numBands = floor(random(4, 10));
  for (let b = 0; b < numBands; b++) {
    let src   = new Uint8ClampedArray(pixels);
    let by    = floor(random(height));
    let bh    = floor(random(1, 11));
    let shift = floor(random(-130, 130));
    for (let y = by; y < min(by + bh, height); y++) {
      for (let x = 0; x < width; x++) {
        let sx = constrain(x + shift, 0, width - 1);
        let di = (y * width + x)  * 4;
        let si = (y * width + sx) * 4;
        pixels[di]     = src[si];
        pixels[di + 1] = src[si + 1];
        pixels[di + 2] = src[si + 2];
      }
    }
  }
  updatePixels();

  // ── Layer 3: Translucent geometric overlays ───────────────────────────
  noStroke();
  let numRects = floor(random(5, 14));
  for (let i = 0; i < numRects; i++) {
    let ci = floor(random(pal.length));
    let c  = pal[ci];
    fill(c[0], c[1], c[2], floor(random(20, 165)));
    if (random(1) < 0.38) {
      // Wide, thin scan-band stripe — full canvas width
      rect(0, floor(random(height)), width, floor(random(1, 7)));
    } else {
      // Rectangular block — varying sizes and positions
      rect(
        floor(random(-60, width  * 0.72)),
        floor(random(-40, height)),
        floor(random(20,  width  * 0.7)),
        floor(random(8,   height * 0.42))
      );
    }
  }

  // ── Layer 4: Hard palette lines ───────────────────────────────────────
  let numLines = floor(random(2, 8));
  for (let i = 0; i < numLines; i++) {
    let c = pal[floor(random(pal.length))];
    stroke(c[0], c[1], c[2]);
    strokeWeight(random(1) < 0.68 ? 1 : floor(random(2, 5)));
    line(0, floor(random(height)), width, floor(random(height)));
  }
  noStroke();

  // ── Layer 5: Sparse pixel scatter ─────────────────────────────────────
  loadPixels();
  let grainCount = floor(width * height * 0.004);
  for (let i = 0; i < grainCount; i++) {
    let px  = floor(random(width));
    let py  = floor(random(height));
    let c   = pal[floor(random(pal.length))];
    let idx = (py * width + px) * 4;
    pixels[idx]     = c[0];
    pixels[idx + 1] = c[1];
    pixels[idx + 2] = c[2];
  }
  updatePixels();

  // ── Register as active image so all brushes work immediately ─────────
  userImg   = get();
  scaledImg = createImage(width, height);
  scaledImg.copy(userImg, 0, 0, width, height, 0, 0, width, height);
  imgX = 0;  imgY = 0;
  imgW = width;  imgH = height;
  history = [];
}
