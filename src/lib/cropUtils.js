// Shared crop math — używane przez PhotoEditor.jsx i MvpEditor.jsx.
// Operują na container preview (scaled down) i target graphic (1080×1080 / 1080×1920).

export function getRenderedImageSize(containerW, containerH, natW, natH, zoom) {
  const imgW = containerW * (zoom / 100);
  const imgH = imgW * (natH / natW);
  return { imgW, imgH };
}

/**
 * Konwersja background-position w pikselach (z DOM-u preview) na procenty,
 * które trafiają do sport-graphics-api jako `photo_position`.
 */
export function pxToPercent(bgPos, zoom, targetW, targetH, previewW, natW, natH) {
  const parts = bgPos.replace(/px/g, "").split(" ");
  const px = parseFloat(parts[0]) || 0;
  const py = parseFloat(parts[1]) || 0;
  const scale = previewW / targetW;
  const previewH = targetH * scale;
  const { imgW, imgH } = getRenderedImageSize(previewW, previewH, natW, natH, zoom);
  const maxX = imgW - previewW;
  const maxY = imgH - previewH;
  const xPct = maxX > 0 ? (-px / maxX) * 100 : 50;
  const yPct = maxY > 0 ? (-py / maxY) * 100 : 50;
  return `${xPct.toFixed(1)}% ${yPct.toFixed(1)}%`;
}

/**
 * Początkowa pozycja background gdy obraz dopiero załadowany (centrowanie).
 */
export function initialBgPos(zoom, targetW, targetH, previewW, natW, natH) {
  if (!natW || !natH) return "0px 0px";
  const scale = previewW / targetW;
  const previewH = targetH * scale;
  const { imgW, imgH } = getRenderedImageSize(previewW, previewH, natW, natH, zoom);
  return `${(-(imgW - previewW) * 0.5).toFixed(0)}px ${(-(imgH - previewH) * 0.5).toFixed(0)}px`;
}

/**
 * Rescale background-position przy zmianie zoom — zachowuje relatywną pozycję
 * kadru w obrazie (żeby zoom nie "skakał").
 */
export function rescaleBgPos(bgPos, oldZoom, newZoom, targetW, targetH, previewW, natW, natH) {
  const parts = bgPos.replace(/px/g, "").split(" ");
  const oldPx = parseFloat(parts[0]) || 0;
  const oldPy = parseFloat(parts[1]) || 0;
  const scale = previewW / targetW;
  const previewH = targetH * scale;
  const oldImg = getRenderedImageSize(previewW, previewH, natW, natH, oldZoom);
  const newImg = getRenderedImageSize(previewW, previewH, natW, natH, newZoom);
  const newPx =
    oldImg.imgW - previewW > 0
      ? (oldPx / (oldImg.imgW - previewW)) * (newImg.imgW - previewW)
      : -((newImg.imgW - previewW) * 0.5);
  const newPy =
    oldImg.imgH - previewH > 0
      ? (oldPy / (oldImg.imgH - previewH)) * (newImg.imgH - previewH)
      : -((newImg.imgH - previewH) * 0.5);
  return `${newPx.toFixed(0)}px ${newPy.toFixed(0)}px`;
}

/**
 * Factory wywołania dla <input type="file"> — po załadowaniu obrazu wywoła
 * `onLoaded(src, natDim, initialPos)`.
 */
export function makeImageLoader(onLoaded, targetW, targetH, previewW) {
  return (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      const img = new Image();
      img.onload = () => {
        const nat = { w: img.naturalWidth, h: img.naturalHeight };
        onLoaded(src, nat, initialBgPos(150, targetW, targetH, previewW, nat.w, nat.h));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };
}
