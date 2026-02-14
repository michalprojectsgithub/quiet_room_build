import React from 'react';
import type { Reference } from '../types';

export interface ViewerRightPanelProps {
  reference: Reference;
  onNoteChange?: (referenceId: string, note: { text: string; updatedAt: number } | null) => void;
  onSourceChange?: (referenceId: string, source: { text: string; updatedAt: number } | null) => void;
  onTagsChange?: (referenceId: string, tags: string[]) => void;
  onToggleItemTag?: (reference: Reference, tag: string, op: 'add' | 'remove') => Promise<void> | void;
}

const ViewerRightPanel: React.FC<ViewerRightPanelProps> = ({
  reference,
  onNoteChange,
  onSourceChange,
  onTagsChange,
  onToggleItemTag
}) => {
  const [noteValue, setNoteValue] = React.useState<string>(reference.image_note?.text || '');
  const [sourceValue, setSourceValue] = React.useState<string>(reference.image_source?.text || '');
  const [tagsLocal, setTagsLocal] = React.useState<string[]>(Array.isArray(reference.tags) ? reference.tags : []);
  const [tagPickerOpen, setTagPickerOpen] = React.useState(false);
  const [availableTags, setAvailableTags] = React.useState<string[]>([]);
  const tagPickerRef = React.useRef<HTMLDivElement | null>(null);
  const addTagBtnRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    setNoteValue(reference.image_note?.text || '');
    setSourceValue(reference.image_source?.text || '');
    setTagsLocal(Array.isArray(reference.tags) ? reference.tags : []);
  }, [reference.id, reference.image_note?.text, reference.image_source?.text, reference.tags]);

  React.useEffect(() => {
    if (!tagPickerOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const insidePanel = tagPickerRef.current?.contains(target);
      const onButton = addTagBtnRef.current?.contains(target);
      if (!insidePanel && !onButton) {
        setTagPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [tagPickerOpen]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { ReferencesService } = await import('../../../../services/referencesService');
        const all = await ReferencesService.getReferences();
        const fresh = (all as any[]).find(r => r.id === reference.id);
        if (!cancelled && fresh && Array.isArray(fresh.tags)) {
          setTagsLocal(fresh.tags);
          if (onTagsChange) onTagsChange(reference.id, fresh.tags);
          try { window.dispatchEvent(new CustomEvent('reference-tags-updated', { detail: { id: reference.id, tags: fresh.tags } } as any)); } catch {}
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [reference.id]);

  return (
    <div className="references-viewer-right">
      <div className="references-note-section">
        <div className="references-note-header">Image note</div>
        <textarea
          className="references-note-textarea"
          placeholder="Add a note about this image..."
          value={noteValue}
          onChange={(e) => setNoteValue(e.currentTarget.value)}
          onKeyDown={(e) => { e.stopPropagation(); }}
          onBlur={async (e) => {
            const value = e.currentTarget.value.trim();
            try {
              const { ReferencesService } = await import('../../../../services/referencesService');
              if (value) {
                await ReferencesService.setImageNote(reference.id, value);
                if (onNoteChange) onNoteChange(reference.id, { text: value, updatedAt: Date.now() });
              } else {
                await ReferencesService.deleteImageNote(reference.id);
                if (onNoteChange) onNoteChange(reference.id, null);
              }
            } catch (err) {
              console.error('Failed to save image note', err);
            }
          }}
        />
      </div>

      <div className="references-note-section">
        <div className="references-note-header">Image source</div>
        <textarea
          className="references-note-textarea references-source-textarea"
          placeholder="Add the source (URL, author, collection, etc.)..."
          value={sourceValue}
          onChange={(e) => setSourceValue(e.currentTarget.value)}
          onKeyDown={(e) => { e.stopPropagation(); }}
          rows={1}
          onBlur={async (e) => {
            const value = e.currentTarget.value.trim();
            try {
              const { ReferencesService } = await import('../../../../services/referencesService');
              if (value) {
                await ReferencesService.setImageSource(reference.id, value);
                if (onSourceChange) onSourceChange(reference.id, { text: value, updatedAt: Date.now() });
              } else {
                await ReferencesService.deleteImageSource(reference.id);
                if (onSourceChange) onSourceChange(reference.id, null);
              }
            } catch (err) {
              console.error('Failed to save image source', err);
            }
          }}
        />
      </div>

      <div className="references-note-section">
        <div className="references-note-header">Tags</div>
        {Array.isArray(tagsLocal) && tagsLocal.length > 0 ? (
          <div className="references-tags-list">
            {tagsLocal.map((t, idx) => (
              <button
                key={idx}
                className="references-tag-chip"
                title={`Remove tag ${t}`}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const { ReferencesService } = await import('../../../../services/referencesService');
                    const isAssigned = tagsLocal.some(tt => tt.toLowerCase() === t.toLowerCase());
                    if (!isAssigned) return;
                    const nextComputed = tagsLocal.filter(tag => tag.toLowerCase() !== t.toLowerCase());
                    await ReferencesService.setTags(reference.id, nextComputed);
                    setTagsLocal(nextComputed);
                    try {
                      const all = await ReferencesService.getReferences();
                      const fresh = (all as any[]).find(r => r.id === reference.id);
                      const freshTags: string[] = Array.isArray(fresh?.tags) ? fresh.tags : [];
                      setTagsLocal(freshTags);
                      if (onTagsChange) onTagsChange(reference.id, freshTags);
                      window.dispatchEvent(new CustomEvent('reference-tags-updated', { detail: { id: reference.id, tags: freshTags } } as any));
                      window.dispatchEvent(new CustomEvent('references-list-updated', { detail: all } as any));
                    } catch {}
                  } catch (err) {
                    console.error('Failed to remove tag', err);
                  }
                }}
              >
                <span className="references-tag-text">{t}</span>
                <span className="references-tag-close">✕</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="references-tags-empty">No tags assigned</div>
        )}
        <div style={{ marginTop: 10 }}>
          <button
            className="references-add-tag-button"
            ref={addTagBtnRef}
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const { ReferencesService } = await import('../../../../services/referencesService');
                const list = await ReferencesService.listCustomTags();
                setAvailableTags(list || []);
                const all = await ReferencesService.getReferences();
                const fresh = (all as any[]).find(r => r.id === reference.id);
                const freshTags: string[] = Array.isArray(fresh?.tags) ? fresh.tags : tagsLocal;
                setTagsLocal(freshTags);
              } catch {}
              setTagPickerOpen(prev => !prev);
            }}
          >
            + Add tag
          </button>
        </div>
        {tagPickerOpen && (
          <div className="references-addtag-list" ref={tagPickerRef}>
            {availableTags.length === 0 ? (
              <div className="references-tags-empty">No tags yet</div>
            ) : (
              availableTags.map((t) => {
                const assigned = tagsLocal.some(tt => tt.toLowerCase() === t.toLowerCase());
                return (
                  <div
                    key={t}
                    className={`references-context-item selectable ${assigned ? 'assigned' : ''}`}
                    role={'button'}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={async () => {
                      try {
                        if (onToggleItemTag) {
                          await onToggleItemTag(reference as any, t, assigned ? 'remove' : 'add');
                        }
                        const { ReferencesService } = await import('../../../../services/referencesService');
                        const all = await ReferencesService.getReferences();
                        const fresh = (all as any[]).find(r => r.id === reference.id);
                        const freshTags: string[] = Array.isArray(fresh?.tags) ? fresh.tags : [];
                        setTagsLocal(freshTags);
                        if (onTagsChange) onTagsChange(reference.id, freshTags);
                        window.dispatchEvent(new CustomEvent('reference-tags-updated', { detail: { id: reference.id, tags: freshTags } } as any));
                        window.dispatchEvent(new CustomEvent('references-list-updated', { detail: all } as any));
                        setTagPickerOpen(false);
                      } catch (err) {
                        console.error('Failed to toggle tag from modal picker', err);
                      }
                    }}
                  >
                    <span className={`references-context-check ${assigned ? 'visible' : ''}`}>✓</span>
                    <span className="references-context-label">{t}</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewerRightPanel;


