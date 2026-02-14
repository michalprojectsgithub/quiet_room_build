import React, { useMemo, useState, useCallback, useEffect } from 'react';
import masterStudyData from '../../../library/master_studies/data/masterstudy.json';
import MasterStudyViewer from './MasterStudyViewer';
import type { Reference } from '../Idea_vault/References/types';
import './Study_room.css';

type LevelOneKey = 'artists' | 'subjects' | 'techniques';

interface MasterStudyItem {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  periods: string[];
  subjects: string[];
  techniques: string[];
  imagePath: string;
  museum?: string;
  license?: string;
  sourceUrl?: string;
}

const levelOneOptions: { id: LevelOneKey; label: string; icon: string }[] = [
  { id: 'artists', label: 'Artists', icon: '' },
  { id: 'subjects', label: 'Subjects', icon: '' },
  { id: 'techniques', label: 'Techniques', icon: '' },
];

function normalizePath(p: string): string {
  return p.replace(/"/g, '').replace(/\\/g, '/');
}

function slugify(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getThumbUrl(item: MasterStudyItem): string {
  const normalized = normalizePath(item.imagePath);
  const fileBase = (normalized.split('/').pop() || '').replace(/\.[^.]+$/, '');

  const artistSlug = slugify(item.artist || '');
  const artistFirst = artistSlug.split('_')[0] || '';
  const artistLast = artistSlug.split('_').pop() || '';

  const knownFolders = new Set([
    'rembrandt',
    'velazquez',
    'canaletto',
    'cezanne',
    'gogh',
    'lorrain',
    'melendez',
    'monet',
    'ruysch',
  ]);

  const ordered = [artistLast, artistFirst, artistSlug].filter(Boolean);
  const folder =
    ordered.find((c) => knownFolders.has(c)) ||
    ordered[0] ||
    '';

  const fileNameWebp = `${fileBase}.webp`;

  // try artist-derived folder, then root
  return folder
    ? `/library/master_studies/thumbnails/${folder}/${fileNameWebp}`
    : `/library/master_studies/thumbnails/${fileNameWebp}`;
}

function getFullUrl(item: MasterStudyItem): string {
  const normalized = normalizePath(item.imagePath);
  return `/${normalized}`;
}

export const MasterStudies: React.FC = () => {
  const [levelOne, setLevelOne] = useState<LevelOneKey | null>(null);
  const [levelTwo, setLevelTwo] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const data = masterStudyData as MasterStudyItem[];

  const optionsLevelTwo = useMemo(() => {
    if (!levelOne) return [];
    if (levelOne === 'artists') {
      return Array.from(new Set(data.map((d) => d.artist).filter(Boolean))).sort();
    }
    if (levelOne === 'subjects') {
      return Array.from(new Set(data.flatMap((d) => d.subjects || []).filter(Boolean))).sort();
    }
    if (levelOne === 'techniques') {
      return Array.from(new Set(data.flatMap((d) => d.techniques || []).filter(Boolean))).sort();
    }
    return [];
  }, [levelOne, data]);

  const filteredItems = useMemo(() => {
    if (!levelOne || !levelTwo) return [];
    if (levelOne === 'artists') {
      return data.filter((d) => d.artist === levelTwo);
    }
    if (levelOne === 'subjects') {
      return data.filter((d) => (d.subjects || []).includes(levelTwo));
    }
    if (levelOne === 'techniques') {
      return data.filter((d) => (d.techniques || []).includes(levelTwo));
    }
    return [];
  }, [levelOne, levelTwo, data]);

  const atLevelOne = levelOne === null;
  const atLevelTwo = levelOne !== null && levelTwo === null;
  const levelOneLabel = levelOne ? levelOneOptions.find((o) => o.id === levelOne)?.label ?? 'Selection' : 'Select category';
  const levelTwoLabel = levelTwo ?? 'Pick a filter';
  const levelThreeLabel = !atLevelOne && !atLevelTwo ? `${filteredItems.length} artwork(s)` : 'Artworks';

  // Determine current list based on navigation state
  const currentList = useMemo(() => {
    if (!atLevelOne && !atLevelTwo) {
      return filteredItems;
    }
    return data;
  }, [atLevelOne, atLevelTwo, filteredItems, data]);

  // Handlers for viewer
  const handleImageClick = useCallback((index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false);
  }, []);

  const handleNext = useCallback(() => {
    setViewerIndex((prev) => (prev + 1) % currentList.length);
  }, [currentList.length]);

  const handlePrev = useCallback(() => {
    setViewerIndex((prev) => (prev - 1 + currentList.length) % currentList.length);
  }, [currentList.length]);

  // Keyboard shortcuts for viewer
  useEffect(() => {
    if (!viewerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseViewer();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerOpen, handleCloseViewer, handlePrev, handleNext]);

  // Convert MasterStudyItem to Reference format for viewer
  const currentReference: Reference | null = useMemo(() => {
    if (!viewerOpen || !currentList[viewerIndex]) return null;

    const item = currentList[viewerIndex];
    return {
      id: item.id,
      filename: item.id,
      original_name: item.title,
      url: getFullUrl(item),
      created_at: item.year || 0,
      tags: [],
      rotation: 0,
    };
  }, [viewerOpen, viewerIndex, currentList]);

  return (
    <div className="master-studies">
      <div className="master-studies-breadcrumb">
        <button
          className="master-studies-crumb"
          disabled={atLevelOne}
          onClick={() => {
            setLevelOne(null);
            setLevelTwo(null);
          }}
          title="Back to category selection"
        >
          {levelOne ? levelOneLabel : 'Level 1'}
        </button>
        <span>›</span>
        <button
          className="master-studies-crumb"
          disabled={atLevelOne || atLevelTwo}
          onClick={() => setLevelTwo(null)}
          title="Back to filter selection"
        >
          {(!atLevelOne && !atLevelTwo) ? levelTwoLabel : 'Level 2'}
        </button>
        <span>›</span>
        <span className="master-studies-crumb current">{levelThreeLabel}</span>
      </div>

      {atLevelOne && (
        <>
          <div className="master-studies-grid">
            {levelOneOptions.map((opt) => (
              <button
                key={opt.id}
                className="master-studies-card"
                onClick={() => {
                  setLevelOne(opt.id);
                  setLevelTwo(null);
                }}
              >
                {opt.icon ? (
                  <div className="master-studies-card-icon">{opt.icon}</div>
                ) : null}
                <div className="master-studies-card-title">{opt.label}</div>
              </button>
            ))}
          </div>

          <div className="master-studies-section-title">All artworks</div>
          <div className="master-studies-grid thumbs">
            {data.map((item, idx) => (
              <button
                key={item.id}
                className="master-studies-thumb"
                onClick={() => handleImageClick(idx)}
              >
                <div className="master-studies-thumb-image">
                  <img src={getThumbUrl(item)} alt={item.title} loading="lazy" />
                </div>
                <div className="master-studies-thumb-meta">
                  <div className="master-studies-thumb-title">{item.title}</div>
                  <div className="master-studies-thumb-sub">
                    {item.artist} {item.year ? `· ${item.year}` : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {atLevelTwo && !atLevelOne && (
        <div className="master-studies-grid">
          {optionsLevelTwo.map((value) => (
            <button
              key={value}
              className="master-studies-card"
              onClick={() => setLevelTwo(value)}
              title={value}
            >
              <div className="master-studies-card-title">{value}</div>
            </button>
          ))}
        </div>
      )}

      {!atLevelOne && !atLevelTwo && (
        <div className="master-studies-grid thumbs">
          {filteredItems.map((item, idx) => (
            <button
              key={item.id}
              className="master-studies-thumb"
              onClick={() => handleImageClick(idx)}
            >
              <div className="master-studies-thumb-image">
                <img src={getThumbUrl(item)} alt={item.title} loading="lazy" />
              </div>
              <div className="master-studies-thumb-meta">
                <div className="master-studies-thumb-title">{item.title}</div>
                <div className="master-studies-thumb-sub">
                  {item.artist} {item.year ? `· ${item.year}` : ''}
                </div>
              </div>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <div className="master-studies-empty">No items found.</div>
          )}
        </div>
      )}

      {/* Master Study Viewer */}
      {viewerOpen && currentReference && currentList[viewerIndex] && (
        <MasterStudyViewer
          reference={currentReference}
          imageUrl={getFullUrl(currentList[viewerIndex])}
          isLoading={false}
          currentIndex={viewerIndex}
          totalReferences={currentList.length}
          artist={currentList[viewerIndex].artist}
          year={currentList[viewerIndex].year}
          onClose={handleCloseViewer}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}
    </div>
  );
};

export default MasterStudies;
