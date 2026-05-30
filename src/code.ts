// 用紙サイズ定義 (mm)
const PAPER_SIZES: Record<string, { w: number; h: number }> = {
  A3: { w: 297, h: 420 },
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  A6: { w: 105, h: 148 },
  "名刺JP": { w: 55, h: 91 },
  "名刺US": { w: 51, h: 89 },
};

// mm → px 変換
function mmToPx(mm: number, dpi: number): number {
  return Math.round(mm * dpi / 25.4);
}

// ガイドライン矩形を生成する共通関数（矩形ノードの配列を返す）
function createGuideRects(
  frameW: number,
  frameH: number,
  offset: number,
  color: RGB,
  opacity: number,
  namePrefix: string,
  lineThickness: number = 2
): RectangleNode[] {
  const defs: Array<{ x: number; y: number; w: number; h: number; name: string }> = [
    { x: 0, y: offset, w: frameW, h: lineThickness, name: `${namePrefix}_上` },
    { x: 0, y: frameH - offset - lineThickness, w: frameW, h: lineThickness, name: `${namePrefix}_下` },
    { x: offset, y: 0, w: lineThickness, h: frameH, name: `${namePrefix}_左` },
    { x: frameW - offset - lineThickness, y: 0, w: lineThickness, h: frameH, name: `${namePrefix}_右` },
  ];

  return defs.map(d => {
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

figma.ui.onmessage = (msg: {
  type: string;
  paperSize: string;
  orientation: string;
  dpi: number;
  bleedMm: number;
  safelineMm: number;
  customW: number;
  customH: number;
}) => {
  if (msg.type !== "generate") return;

  // 用紙サイズ（mm）を決定。任意サイズの場合は入力値を使う
  let wMm: number;
  let hMm: number;
  if (msg.paperSize === "custom") {
    if (!(msg.customW > 0) || !(msg.customH > 0)) {
      figma.notify("幅・高さを正しく入力してください");
      return;
    }
    wMm = msg.customW;
    hMm = msg.customH;
  } else {
    const paper = PAPER_SIZES[msg.paperSize];
    if (!paper) {
      figma.notify("不明な用紙サイズです");
      return;
    }
    wMm = paper.w;
    hMm = paper.h;
  }

  // 向きに応じて幅と高さを決定
  if (msg.orientation === "landscape") {
    [wMm, hMm] = [hMm, wMm];
  }

  const dpi = msg.dpi;
  const wPx = mmToPx(wMm, dpi);
  const hPx = mmToPx(hMm, dpi);
  const bleedPx = mmToPx(msg.bleedMm, dpi);
  const safelinePx = mmToPx(msg.safelineMm, dpi);

  // フレーム作成（仕上がりサイズ + 塗り足し両側）
  const frame = figma.createFrame();
  frame.resize(wPx + bleedPx * 2, hPx + bleedPx * 2);

  // レイヤー名
  const orientLabel = msg.orientation === "landscape" ? "横" : "縦";
  const sizeLabel =
    msg.paperSize === "custom" ? `任意${msg.customW}x${msg.customH}mm` : msg.paperSize;
  frame.name = `${sizeLabel}_${orientLabel}_${dpi}dpi_bleed${msg.bleedMm}mm`;

  // 背景白
  frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

  const frameW = wPx + bleedPx * 2;
  const frameH = hPx + bleedPx * 2;

  // カットライン（マゼンタ30%線、bleed位置）
  const cutRects = createGuideRects(frameW, frameH, bleedPx, { r: 0.9, g: 0.1, b: 0.5 }, 0.3, "カットライン");

  // セーフライン（シアン30%線、bleed + safeline位置）
  const safeRects = createGuideRects(frameW, frameH, bleedPx + safelinePx, { r: 0, g: 0.8, b: 0.9 }, 0.3, "セーフライン");

  // guide グループにまとめてロック
  const guideGroup = figma.group([...cutRects, ...safeRects], frame);
  guideGroup.name = "guide";
  guideGroup.locked = true;

  // ビューポートを生成フレームに移動
  figma.currentPage.appendChild(frame);
  figma.viewport.scrollAndZoomIntoView([frame]);
  figma.currentPage.selection = [frame];

  figma.notify(
    `${sizeLabel} ${orientLabel} フレームを生成しました (${frame.width}×${frame.height}px)`
  );
};
