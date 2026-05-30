"use strict";
(() => {
  // src/code.ts
  var PAPER_SIZES = {
    A3: { w: 297, h: 420 },
    A4: { w: 210, h: 297 },
    A5: { w: 148, h: 210 },
    A6: { w: 105, h: 148 },
    "\u540D\u523AJP": { w: 55, h: 91 },
    "\u540D\u523AUS": { w: 51, h: 89 }
  };
  function mmToPx(mm, dpi) {
    return Math.round(mm * dpi / 25.4);
  }
  function createGuideRects(frameW, frameH, offset, color, opacity, namePrefix, lineThickness = 2) {
    const defs = [
      { x: 0, y: offset, w: frameW, h: lineThickness, name: `${namePrefix}_\u4E0A` },
      { x: 0, y: frameH - offset - lineThickness, w: frameW, h: lineThickness, name: `${namePrefix}_\u4E0B` },
      { x: offset, y: 0, w: lineThickness, h: frameH, name: `${namePrefix}_\u5DE6` },
      { x: frameW - offset - lineThickness, y: 0, w: lineThickness, h: frameH, name: `${namePrefix}_\u53F3` }
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
        figma.notify("\u5E45\u30FB\u9AD8\u3055\u3092\u6B63\u3057\u304F\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      wMm = msg.customW;
      hMm = msg.customH;
    } else {
      const paper = PAPER_SIZES[msg.paperSize];
      if (!paper) {
        figma.notify("\u4E0D\u660E\u306A\u7528\u7D19\u30B5\u30A4\u30BA\u3067\u3059");
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
    const orientLabel = msg.orientation === "landscape" ? "\u6A2A" : "\u7E26";
    const sizeLabel = msg.paperSize === "custom" ? `\u4EFB\u610F${msg.customW}x${msg.customH}mm` : msg.paperSize;
    frame.name = `${sizeLabel}_${orientLabel}_${dpi}dpi_bleed${msg.bleedMm}mm`;
    frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    const frameW = wPx + bleedPx * 2;
    const frameH = hPx + bleedPx * 2;
    const cutRects = createGuideRects(frameW, frameH, bleedPx, { r: 0.9, g: 0.1, b: 0.5 }, 0.3, "\u30AB\u30C3\u30C8\u30E9\u30A4\u30F3");
    const safeRects = createGuideRects(frameW, frameH, bleedPx + safelinePx, { r: 0, g: 0.8, b: 0.9 }, 0.3, "\u30BB\u30FC\u30D5\u30E9\u30A4\u30F3");
    const guideGroup = figma.group([...cutRects, ...safeRects], frame);
    guideGroup.name = "guide";
    guideGroup.locked = true;
    figma.currentPage.appendChild(frame);
    figma.viewport.scrollAndZoomIntoView([frame]);
    figma.currentPage.selection = [frame];
    figma.notify(
      `${sizeLabel} ${orientLabel} \u30D5\u30EC\u30FC\u30E0\u3092\u751F\u6210\u3057\u307E\u3057\u305F (${frame.width}\xD7${frame.height}px)`
    );
  };
})();
