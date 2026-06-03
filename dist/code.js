"use strict";
(() => {
  // src/code.ts
  var PAPER_SIZES = {
    A3: { w: 297, h: 420 },
    A4: { w: 210, h: 297 },
    A5: { w: 148, h: 210 },
    A6: { w: 105, h: 148 },
    "BusinessCardJP": { w: 55, h: 91 },
    "BusinessCardUS": { w: 51, h: 89 }
  };
  function mmToPx(mm, dpi) {
    return Math.round(mm * dpi / 25.4);
  }
  function createGuideRects(frameW, frameH, offset, color, opacity, namePrefix, lineThickness = 2) {
    const defs = [
      { x: 0, y: offset, w: frameW, h: lineThickness, name: `${namePrefix}_Top` },
      { x: 0, y: frameH - offset - lineThickness, w: frameW, h: lineThickness, name: `${namePrefix}_Bottom` },
      { x: offset, y: 0, w: lineThickness, h: frameH, name: `${namePrefix}_Left` },
      { x: frameW - offset - lineThickness, y: 0, w: lineThickness, h: frameH, name: `${namePrefix}_Right` }
    ];
    return defs.map((d) => {
      const rect = figma.createRectangle();
      rect.name = d.name;
      rect.x = d.x;
      rect.y = d.y;
      rect.resize(d.w, d.h);
      rect.fills = [{ type: "SOLID", color, opacity }];
      return rect;
    });
  }
  figma.showUI(__html__, { width: 280, height: 420 });
  figma.ui.onmessage = (msg) => {
    if (msg.type !== "generate")
      return;
    let wMm;
    let hMm;
    if (msg.paperSize === "custom") {
      if (!(msg.customW > 0) || !(msg.customH > 0)) {
        figma.notify("Please enter a valid width and height");
        return;
      }
      wMm = msg.customW;
      hMm = msg.customH;
    } else {
      const paper = PAPER_SIZES[msg.paperSize];
      if (!paper) {
        figma.notify("Unknown paper size");
        return;
      }
      wMm = paper.w;
      hMm = paper.h;
    }
    if (msg.orientation === "landscape") {
      [wMm, hMm] = [hMm, wMm];
    }
    const dpi = msg.dpi;
    const wPx = mmToPx(wMm, dpi);
    const hPx = mmToPx(hMm, dpi);
    const bleedPx = mmToPx(msg.bleedMm, dpi);
    const safelinePx = mmToPx(msg.safelineMm, dpi);
    const frame = figma.createFrame();
    frame.resize(wPx + bleedPx * 2, hPx + bleedPx * 2);
    const orientLabel = msg.orientation === "landscape" ? "Landscape" : "Portrait";
    const sizeLabel = msg.paperSize === "custom" ? `Custom${msg.customW}x${msg.customH}mm` : msg.paperSize;
    frame.name = `${sizeLabel}_${orientLabel}_${dpi}dpi_bleed${msg.bleedMm}mm`;
    frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    const frameW = wPx + bleedPx * 2;
    const frameH = hPx + bleedPx * 2;
    const trimRects = createGuideRects(frameW, frameH, bleedPx, { r: 0.9, g: 0.1, b: 0.5 }, 0.3, "TrimLine");
    const safeRects = createGuideRects(frameW, frameH, bleedPx + safelinePx, { r: 0, g: 0.8, b: 0.9 }, 0.3, "SafeLine");
    const guideGroup = figma.group([...trimRects, ...safeRects], frame);
    guideGroup.name = "guide";
    guideGroup.locked = true;
    figma.currentPage.appendChild(frame);
    figma.viewport.scrollAndZoomIntoView([frame]);
    figma.currentPage.selection = [frame];
    figma.notify(
      `Generated ${sizeLabel} ${orientLabel} frame (${frame.width}\xD7${frame.height}px)`
    );
  };
})();
