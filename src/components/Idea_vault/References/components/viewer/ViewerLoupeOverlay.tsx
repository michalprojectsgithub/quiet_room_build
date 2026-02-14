import React from 'react';

type StagePx = { stageW: number; stageH: number; imgW: number; imgH: number };

type Props = {
  imageUrl: string;
  loupeOn: boolean;
  loupeReady: boolean;
  isHoveringImage: boolean;
  stagePx: StagePx;
  zoom: number;
  loupeStagePos: { sx: number; sy: number };
  loupeScreenPos: { x: number; y: number };
  cropClipPath?: string;
  normalizedRotation: number;
  isMonochrome: boolean;
};

const ViewerLoupeOverlay: React.FC<Props> = ({
  imageUrl,
  loupeOn,
  loupeReady,
  isHoveringImage,
  stagePx,
  zoom,
  loupeStagePos,
  loupeScreenPos,
  cropClipPath,
  normalizedRotation,
  isMonochrome,
}) => {
  if (!imageUrl || !loupeOn || !loupeReady || !isHoveringImage) return null;

  const radius = 120;
  const scale = 2.0;
  const left = loupeScreenPos.x - radius;
  const top = loupeScreenPos.y - radius;

  const stageW = stagePx.stageW * zoom;
  const stageH = stagePx.stageH * zoom;
  const imgW = stagePx.imgW * zoom;
  const imgH = stagePx.imgH * zoom;
  if (!(stageW > 0 && stageH > 0 && imgW > 0 && imgH > 0)) return null;

  const tx = radius - loupeStagePos.sx * stageW * scale;
  const ty = radius - loupeStagePos.sy * stageH * scale;

  const miniStageOuter: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: `${stageW}px`,
    height: `${stageH}px`,
    transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
    transformOrigin: 'top left'
  };
  const miniStageInner: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    clipPath: cropClipPath,
    WebkitClipPath: cropClipPath
  };
  const miniImgWrap: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: `${imgW}px`,
    height: `${imgH}px`,
    transform: `translate(-50%, -50%) rotate(${normalizedRotation}deg)`,
    transformOrigin: 'center center'
  };
  const miniImgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'block',
    filter: isMonochrome ? 'grayscale(100%)' : 'none'
  };

  return (
    <div className="references-loupe" style={{ left, top }}>
      <div className="references-loupe-inner" style={{ position: 'absolute', inset: 0 }}>
        <div style={miniStageOuter}>
          <div style={miniStageInner}>
            <div style={miniImgWrap}>
              <img src={imageUrl} alt="" draggable={false} style={miniImgStyle} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewerLoupeOverlay;

