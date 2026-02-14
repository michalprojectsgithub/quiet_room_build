import React from 'react';
import { createPortal } from 'react-dom';
import { ReferencesService } from '../../../../services/referencesService';
import type { ReferenceItemProps } from '../types';

const ReferenceItem: React.FC<ReferenceItemProps> = ({
  reference,
  imageUrl,
  index,
  onView,
  onDelete,
  onAddTag,
  onDragStart,
  draggable = false,
  isGloballyDragging = false
}) => {
  const rotation = ((reference as any)?.rotation ?? 0) as number;
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const crop = ((reference as any)?.crop ?? null) as { x: number; y: number; w: number; h: number } | null;
  const thumbWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [naturalSize, setNaturalSize] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [thumbBox, setThumbBox] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [contextOpen, setContextOpen] = React.useState(false);
  const [contextPos, setContextPos] = React.useState<{x: number, y: number}>({ x: 0, y: 0 });
  const [tags, setTags] = React.useState<string[]>([]);
  const [assignedTags, setAssignedTags] = React.useState<string[]>(reference.tags || []);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  // Track thumbnail box size (so rotated thumbs can still "cover" the card with no blank corners)
  React.useEffect(() => {
    const el = thumbWrapRef.current;
    if (!el) return;

    const update = () => {
      try {
        const rect = el.getBoundingClientRect();
        setThumbBox({ w: rect.width || 0, h: rect.height || 0 });
      } catch {}
    };

    update();
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    } catch {
      window.addEventListener('resize', update);
    }

    return () => {
      try { ro?.disconnect(); } catch {}
      try { window.removeEventListener('resize', update); } catch {}
    };
  }, []);

  const thumbTransform = React.useMemo(() => {
    const w = naturalSize.w;
    const h = naturalSize.h;
    const cw = thumbBox.w;
    const ch = thumbBox.h;
    const deg = normalizedRotation;

    // Base styles if we can't compute yet
    if (!(w > 0 && h > 0 && cw > 0 && ch > 0)) {
      return {
        widthPx: '100%',
        heightPx: '100%',
        rotateTransform: deg ? `translate(-50%, -50%) rotate(${deg}deg)` : 'translate(-50%, -50%)',
        cropTransform: 'none',
      };
    }

    // First, compute the unrotated "cover" size (like object-fit: cover)
    const coverScale = Math.max(cw / w, ch / h);
    const w0 = w * coverScale;
    const h0 = h * coverScale;

    // Then, compute minimal extra scale so the rotated bounding box still covers the container
    const theta = (deg * Math.PI) / 180;
    const cos = Math.abs(Math.cos(theta));
    const sin = Math.abs(Math.sin(theta));
    const bw = w0 * cos + h0 * sin;
    const bh = w0 * sin + h0 * cos;
    const extraScale = Math.max(cw / bw, ch / bh, 1);

    // Crop clip-path is applied to the STAGE (.references-thumb-wrap), not the image,
    // so the crop frame stays screen-aligned while the image rotates underneath.
    let cropClipPath = 'none';
    if (crop && crop.w > 0 && crop.h > 0) {
      const x = Math.max(0, Math.min(1, crop.x));
      const y = Math.max(0, Math.min(1, crop.y));
      const ww = Math.max(0, Math.min(1 - x, crop.w));
      const hh = Math.max(0, Math.min(1 - y, crop.h));
      const top = y * 100;
      const left = x * 100;
      const right = (1 - x - ww) * 100;
      const bottom = (1 - y - hh) * 100;
      cropClipPath = `inset(${top}% ${right}% ${bottom}% ${left}%)`;
    }

    return {
      widthPx: `${w0}px`,
      heightPx: `${h0}px`,
      rotateTransform: `translate(-50%, -50%) rotate(${deg}deg) scale(${extraScale})`,
      cropClipPath,
    };
  }, [naturalSize.w, naturalSize.h, thumbBox.w, thumbBox.h, normalizedRotation, crop?.x, crop?.y, crop?.w, crop?.h]);

  React.useEffect(() => {
    setAssignedTags(reference.tags || []);
  }, [reference.id, reference.tags]);

  React.useEffect(() => {
    const handler = (ev: any) => {
      const detail = ev.detail as any;
      if (detail && detail.id === reference.id && Array.isArray(detail.tags)) {
        setAssignedTags(detail.tags);
      }
    };
    window.addEventListener('reference-tags-updated', handler as EventListener);
    return () => window.removeEventListener('reference-tags-updated', handler as EventListener);
  }, [reference.id]);

  React.useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideCard = containerRef.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideCard && !insideMenu) {
        setContextOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openContextMenu = async (e: React.MouseEvent) => {
    e.preventDefault();
    // Clamp position to viewport so the menu stays on screen
    const padding = 8;
    const approxWidth = 220;
    const approxHeight = 260;
    const clampedX = Math.max(padding, Math.min(e.clientX, window.innerWidth - approxWidth - padding));
    const clampedY = Math.max(padding, Math.min(e.clientY, window.innerHeight - approxHeight - padding));
    setContextPos({ x: clampedX, y: clampedY });
    try {
      const list = await ReferencesService.listCustomTags();
      setTags(list);
      // Fetch latest tags for this reference to avoid stale state after navigation/filter changes
      try {
        const all = await ReferencesService.getReferences();
        const fresh = (all as any[]).find(r => r.id === reference.id);
        if (fresh && Array.isArray(fresh.tags)) {
          setAssignedTags(fresh.tags);
        }
      } catch (err) {
        // Non-blocking: keep current assignedTags
      }
    } catch {}
    setContextOpen(true);
  };

  const handleToggleTag = async (tag: string) => {
    // Always base on freshest tags from disk to avoid stale selection state
    const getFresh = async () => {
      try {
        const all = await ReferencesService.getReferences();
        const fresh = (all as any[]).find(r => r.id === reference.id);
        const freshTags = Array.isArray(fresh?.tags) ? fresh.tags : [];
        setAssignedTags(freshTags);
        return freshTags;
      } catch {
        return assignedTags;
      }
    };
    const baseTags = await getFresh();
    const isAssigned = baseTags.some((t: string) => t.toLowerCase() === tag.toLowerCase());
    try {
      if (isAssigned) {
        await ReferencesService.removeTag(reference.id, tag);
        setAssignedTags(prev => prev.filter(t => t.toLowerCase() !== tag.toLowerCase()));
        if (onAddTag) onAddTag(reference, tag, 'remove');
      } else {
        await ReferencesService.addTag(reference.id, tag);
        setAssignedTags(prev => [...prev, tag]);
        if (onAddTag) onAddTag(reference, tag, 'add');
      }
      // After mutation, fetch fresh tags from disk to avoid stale selections
      try {
        const all = await ReferencesService.getReferences();
        const fresh = (all as any[]).find(r => r.id === reference.id);
        if (fresh && Array.isArray(fresh.tags)) {
          setAssignedTags(fresh.tags);
          try { window.dispatchEvent(new CustomEvent('reference-tags-updated', { detail: { id: reference.id, tags: fresh.tags } } as any)); } catch {}
        }
      } catch {}
    } catch (err) {
      console.error('Failed to toggle tag', err);
    }
  };
  // Removed debug logging for performance
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStartPos, setDragStartPos] = React.useState<{x: number, y: number} | null>(null);
  const [hasMoved, setHasMoved] = React.useState(false);
  const [isMouseDown, setIsMouseDown] = React.useState(false);

  // Reset internal drag state when global drag state changes
  React.useEffect(() => {
    if (!isGloballyDragging && isDragging) {
      setIsDragging(false);
      setDragStartPos(null);
      setHasMoved(false);
      setIsMouseDown(false);
    }
  }, [isGloballyDragging, isDragging, reference.filename]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (draggable) {
      setDragStartPos({ x: e.clientX, y: e.clientY });
      setHasMoved(false);
      setIsMouseDown(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggable && dragStartPos && isMouseDown && !hasMoved) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - dragStartPos.x, 2) + 
        Math.pow(e.clientY - dragStartPos.y, 2)
      );
      if (distance > 5) {
        setHasMoved(true);
        setIsDragging(true);
        
        // Trigger custom drag start
        if (onDragStart) {
          onDragStart(reference);
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    if (isDragging) {
      setIsDragging(false);
      // Notify parent that drag ended
      if (onDragStart) {
        // We can add a callback here if needed
      }
    }
    setDragStartPos(null);
    setHasMoved(false);
  };

  const handleClick = () => {
    // Only trigger view if we're not dragging and haven't moved much
    if (!isDragging && !hasMoved) {
      onView(index);
    }
  };

  return (
    <div 
      className={`references-item ${draggable ? 'draggable' : ''} ${(isDragging || isGloballyDragging) ? 'dragging' : ''} ${contextOpen ? 'tagging-target' : ''}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={openContextMenu}
      draggable={false}
      style={{
        cursor: draggable ? 'grab' : 'pointer',
        userSelect: 'none'
      }}
      ref={containerRef}
      onMouseEnter={(e) => {
        const deleteButton = e.currentTarget.querySelector('button');
        if (deleteButton) {
          deleteButton.style.opacity = "1";
        }
      }}
      onMouseLeave={(e) => {
        const deleteButton = e.currentTarget.querySelector('button');
        if (deleteButton) {
          deleteButton.style.opacity = "0";
        }
        handleMouseUp();
      }}
    >
      <div
        className="references-thumb-wrap"
        ref={thumbWrapRef}
        style={{
          clipPath: thumbTransform.cropClipPath !== 'none' ? thumbTransform.cropClipPath : undefined,
          WebkitClipPath: thumbTransform.cropClipPath !== 'none' ? thumbTransform.cropClipPath : undefined
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: thumbTransform.widthPx,
            height: thumbTransform.heightPx,
            transform: thumbTransform.rotateTransform,
            transformOrigin: 'center center',
            transition: 'none',
            willChange: 'transform'
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              transition: 'none'
            }}
          >
            <img
              src={imageUrl}
              alt={`Reference: ${reference.original_name}`}
              loading="lazy"
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
              }}
              onLoad={(e) => {
                try {
                  const img = e.currentTarget as HTMLImageElement;
                  setNaturalSize({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
                } catch {}
              }}
              onError={(e) => {
                console.error(`Failed to load image for ${reference.filename}:`, {
                  src: imageUrl,
                  error: e
                });
              }}
            />
          </div>
        </div>
      </div>
      <button
        className="references-delete-button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(reference.id);
        }}
        title="Delete reference"
        draggable={false}
      >
        ×
      </button>

      {contextOpen && createPortal(
        <div
          className="references-context-menu"
          style={{ left: contextPos.x, top: contextPos.y }}
          ref={menuRef}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="references-context-title">Add/remove tag</div>
          <div className="references-context-separator" />
          {tags.length === 0 ? (
            <div className="references-context-empty">No tags yet</div>
          ) : (
            tags.map((t) => {
              const assigned = assignedTags.some(at => at.toLowerCase() === t.toLowerCase());
              return (
                <div
                  key={t}
                  className={`references-context-item ${assigned ? 'assigned' : ''}`}
                  role={'button'}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => handleToggleTag(t)}
                >
                  <span className={`references-context-check ${assigned ? 'visible' : ''}`}>✓</span>
                  <span className="references-context-label">{t}</span>
                </div>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ReferenceItem;
