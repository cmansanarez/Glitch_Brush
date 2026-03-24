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
let brushSizeMultiplier = 1.0;
let brushIntensity = 1.0;
let brushShape = "circle";
let bgColor = '#141414';

// UI elements
let brushSelector, uploadButton, undoButton, clearButton, saveButton;

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  background(bgColor);
}

function draw() {
  if (!userImg || !isDrawing) return;
  switch (currentBrush) {
      case "Pixel Shift":
        applyPixelShift();
        break;
      case "Data Noise":
        applyDataNoise();
        break;
      case "Signal Bloom":
        applySignalBloom();
        break;
      case "Spectral Swap":
        applySpectralSwap();
        break;
      case "Chromatic Aberration":
        applyChromaticAberration();
        break;
      case "Scan Line":
        applyScanLine();
        break;
      case "Bitcrush":
        applyBitcrush();
        break;
      case "Pixel Sort":
        applyPixelSort();
        break;
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

    let choice = int(random(3));
    let brushColor = choice === 0 ? color(255, 0, 0) :
                     choice === 1 ? color(0, 255, 0) :
                                    color(0, 0, 255);

    let scatter = 50 * brushSizeMultiplier;
    let glitchX = mouseX + random(-scatter, scatter);
    let glitchY = mouseY + random(-scatter, scatter);

    if (random(1) < 0.1) {
      erasePixel(glitchX, glitchY, brushSize);
    } else {
      fill(brushColor);
      square(glitchX, glitchY, brushSize);
    }

    fill(255, 0, 0);
    square(mouseX + random(-5, 5), mouseY, brushSize);

    fill(0, 255, 0);
    square(mouseX, mouseY + random(-5, 5), brushSize);

    fill(0, 0, 255);
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
        let offsetX = int(map(n, 0, 1, -30 * brushIntensity, 30 * brushIntensity));
        let offsetY = int(map(n, 0, 1, -3 * brushIntensity, 3 * brushIntensity));
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
  noStroke();
  loadPixels();

  let r = int(10 * brushSizeMultiplier);
  let amp = lerp(1.0, random(0.15, 2.5), brushIntensity);

  for (let x = -r; x < r; x++) {
    for (let y = -r; y < r; y++) {
      if (!inBrushShape(x, y, r)) continue;
      let px = int(mouseX + x);
      let py = int(mouseY + y);

      if (px >= 0 && px < width && py >= 0 && py < height) {
        let index = (py * width + px) * 4;

        let rVal = pixels[index + 0] * amp;
        let gVal = pixels[index + 1] * amp;
        let bVal = pixels[index + 2] * amp;

        if (random(1) < 0.03) {
          rVal = 255;
          gVal = 255;
          bVal = random(200, 255);
        }

        pixels[index + 0] = constrain(rVal, 0, 255);
        pixels[index + 1] = constrain(gVal, 0, 255);
        pixels[index + 2] = constrain(bVal, 0, 255);
      }
    }
  }

  updatePixels();
}

// 4. Spectral Swap Brush
function applySpectralSwap() {
  loadPixels();
  let r = int(15 * brushSizeMultiplier);
  let hueShift = (frameCount * 0.8 * brushIntensity) % 360;
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
        hsb[0] = (hsb[0] + hueShift) % 360;
        hsb[1] = constrain(hsb[1] * random(0.9, 1.2), 0, 100);
        if (random(1) < 0.03) hsb[1] *= 0.3;
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
  let maxOffset = int(map(speed, 0, 40, 2, 14, true) * brushIntensity);

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
  // Source buffer prevents shifted rows from reading already-shifted neighbours
  let src = new Uint8ClampedArray(pixels);

  let rY = int(60 * brushSizeMultiplier); // vertical half-height
  let rX = int(80 * brushSizeMultiplier); // horizontal half-width (wider for TV-band feel)

  for (let y = -rY; y < rY; y++) {
    let py = int(mouseY + y);
    if (py < 0 || py >= height) continue;

    // Noise keyed on row y gives each row a spatially consistent shift
    let n = noise(py * 0.04, frameCount * 0.01);
    let maxShift = 60 * brushIntensity;
    let shift = int(map(n, 0, 1, -maxShift, maxShift));

    // Fade shift out toward top/bottom edges of brush
    let vFalloff = map(abs(y), 0, rY, 1, 0);
    shift = int(shift * vFalloff);

    for (let x = -rX; x < rX; x++) {
      let px = int(mouseX + x);
      if (px < 0 || px >= width) continue;

      let sx      = constrain(px + shift, 0, width - 1);
      let dest    = (py * width + px) * 4;
      let srcIdx  = (py * width + sx) * 4;

      pixels[dest + 0] = src[srcIdx + 0];
      pixels[dest + 1] = src[srcIdx + 1];
      pixels[dest + 2] = src[srcIdx + 2];
    }
  }

  updatePixels();
}

// 7. Bitcrush Brush
function applyBitcrush() {
  loadPixels();

  let r = int(30 * brushSizeMultiplier);

  // High intensity → fewer bits (down to 1-bit binary) + larger blocks
  // Low intensity  → 6-bit (subtle quantization), block = 1px (per-pixel)
  let bitDepth  = round(map(brushIntensity, 0, 1, 6, 1));
  let step      = 256 / pow(2, bitDepth);
  let blockSize = max(1, round(map(brushIntensity, 0, 1, 1, 8)));

  for (let x = -r; x <= r; x += blockSize) {
    for (let y = -r; y <= r; y += blockSize) {
      if (!inBrushShape(x, y, r)) continue;

      let px = int(mouseX + x);
      let py = int(mouseY + y);
      if (px < 0 || px >= width || py < 0 || py >= height) continue;

      // Quantize the top-left pixel of the block as the representative value
      let repIdx = (py * width + px) * 4;
      let qR = floor(pixels[repIdx + 0] / step) * step;
      let qG = floor(pixels[repIdx + 1] / step) * step;
      let qB = floor(pixels[repIdx + 2] / step) * step;

      // Flood the entire block with the quantized color
      for (let bx = 0; bx < blockSize; bx++) {
        for (let by = 0; by < blockSize; by++) {
          let fpx = constrain(px + bx, 0, width - 1);
          let fpy = constrain(py + by, 0, height - 1);
          let fi  = (fpy * width + fpx) * 4;
          pixels[fi + 0] = qR;
          pixels[fi + 1] = qG;
          pixels[fi + 2] = qB;
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
  let sortVertical = speed < 0.5 ? true : abs(sin(angle)) >= abs(cos(angle));

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
