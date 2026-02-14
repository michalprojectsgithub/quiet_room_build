import React from 'react';

export type Size = { w: number; h: number };
export type StageLayout = { imgW: number; imgH: number; stageW: number; stageH: number };

export const computeStageLayout = (
  containerSize: Size,
  naturalSize: Size,
  rotationDeg: number
): StageLayout => {
  const cw = containerSize.w;
  const ch = containerSize.h;
  const nw = naturalSize.w;
  const nh = naturalSize.h;
  if (!(cw > 0 && ch > 0 && nw > 0 && nh > 0)) {
    return { imgW: 0, imgH: 0, stageW: 0, stageH: 0 };
  }
  const baseScale = Math.min(1, cw / nw, ch / nh);
  let imgW = nw * baseScale;
  let imgH = nh * baseScale;
  if (!(imgW > 0 && imgH > 0)) return { imgW: 0, imgH: 0, stageW: 0, stageH: 0 };
  const t = (rotationDeg * Math.PI) / 180;
  const c = Math.abs(Math.cos(t));
  const s = Math.abs(Math.sin(t));
  let stageW = imgW * c + imgH * s;
  let stageH = imgW * s + imgH * c;
  if (!(stageW > 0 && stageH > 0)) return { imgW: 0, imgH: 0, stageW: 0, stageH: 0 };
  const extra = Math.min(1, cw / stageW, ch / stageH);
  imgW *= extra;
  imgH *= extra;
  stageW *= extra;
  stageH *= extra;
  return { imgW, imgH, stageW, stageH };
};

export const computeStageLayoutFor = (
  containerSize: Size,
  naturalSize: Size,
  rotationDeg: number
): StageLayout => computeStageLayout(containerSize, naturalSize, rotationDeg);

export const imageRectToStageCrop = (
  rect: { x: number; y: number; w: number; h: number },
  rotDeg: number,
  layout: StageLayout
) => {
  const { imgW, imgH, stageW, stageH } = layout;
  if (!(imgW > 0 && imgH > 0 && stageW > 0 && stageH > 0)) return null;
  const theta = (((rotDeg % 360) + 360) % 360) * Math.PI / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const corners = [
    { nx: rect.x, ny: rect.y },
    { nx: rect.x + rect.w, ny: rect.y },
    { nx: rect.x, ny: rect.y + rect.h },
    { nx: rect.x + rect.w, ny: rect.y + rect.h },
  ];
  const mapped = corners.map(pt => {
    const ix = (pt.nx - 0.5) * imgW;
    const iy = (pt.ny - 0.5) * imgH;
    const sx = ix * cos - iy * sin;
    const sy = ix * sin + iy * cos;
    const nx = (sx + stageW / 2) / stageW;
    const ny = (sy + stageH / 2) / stageH;
    return { nx, ny };
  });
  const xs = mapped.map(p => p.nx);
  const ys = mapped.map(p => p.ny);
  const minX = Math.max(0, Math.min(...xs));
  const maxX = Math.min(1, Math.max(...xs));
  const minY = Math.max(0, Math.min(...ys));
  const maxY = Math.min(1, Math.max(...ys));
  if (maxX <= minX || maxY <= minY) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

export const stageToImageRect = (
  c: { x: number; y: number; w: number; h: number },
  rotDeg: number,
  layout: StageLayout
) => {
  const { imgW, imgH, stageW, stageH } = layout;
  if (!(imgW > 0 && imgH > 0 && stageW > 0 && stageH > 0)) return null;
  const theta = (-((rotDeg % 360) + 360) % 360) * Math.PI / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const corners = [
    { x: c.x, y: c.y },
    { x: c.x + c.w, y: c.y },
    { x: c.x, y: c.y + c.h },
    { x: c.x + c.w, y: c.y + c.h },
  ];
  const mapped = corners.map(pt => {
    const sx = (pt.x - 0.5) * stageW;
    const sy = (pt.y - 0.5) * stageH;
    const ix = sx * cos - sy * sin;
    const iy = sx * sin + sy * cos;
    const nx = (ix + imgW / 2) / imgW;
    const ny = (iy + imgH / 2) / imgH;
    return { nx, ny };
  });
  const xs = mapped.map(p => p.nx);
  const ys = mapped.map(p => p.ny);
  const minX = Math.max(0, Math.min(...xs));
  const maxX = Math.min(1, Math.max(...xs));
  const minY = Math.max(0, Math.min(...ys));
  const maxY = Math.min(1, Math.max(...ys));
  if (maxX <= minX || maxY <= minY) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

export const useStageLayout = (
  containerSize: Size,
  naturalSize: Size,
  normalizedRotation: number
): StageLayout => {
  return React.useMemo(
    () => computeStageLayout(containerSize, naturalSize, normalizedRotation),
    [containerSize.w, containerSize.h, naturalSize.w, naturalSize.h, normalizedRotation]
  );
};

