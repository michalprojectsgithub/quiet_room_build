import React, { useCallback, useEffect, useMemo, useState } from 'react';

const DEFAULT_MINUTES = 5;
const MIN_MINUTES = 1;
const MAX_MINUTES = 60;

function formatTime(totalSeconds: number): string {
  const m = Math.max(0, Math.floor(totalSeconds / 60));
  const s = Math.max(0, totalSeconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const Warmups: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [autoSwitch, setAutoSwitch] = useState(false);

  const isTauri = useMemo(
    () => typeof window !== 'undefined' && '__TAURI_IPC__' in window,
    []
  );

  // Load warm-up images
  useEffect(() => {
    const loadImages = async () => {
      try {
        if (isTauri) {
          const { invoke } = await import('@tauri-apps/api/tauri');
          const relativePaths = await invoke<string[]>('list_warmups');
          console.log('Warm-ups: resolved relative paths', relativePaths);
          
          // Extract just filenames from paths like "library/warmups/file.jpg"
          const filenames = relativePaths.map(p => {
            const parts = p.split('/');
            return parts[parts.length - 1];
          });
          
          // Load each image as base64 data URL using dedicated warmup loader
          const dataUrls = await Promise.all(
            filenames.map(async (filename) => {
              try {
                return await invoke<string>('get_warmup_image_data', { filename });
              } catch (err) {
                console.error(`Failed to load warmup image ${filename}:`, err);
                return null;
              }
            })
          );
          
          const validUrls = dataUrls.filter((url): url is string => url !== null);
          console.log(`Warm-ups: loaded ${validUrls.length}/${relativePaths.length} images as data URLs`);
          
          if (validUrls.length) {
            setImages(validUrls);
            setCurrentIndex(Math.floor(Math.random() * validUrls.length));
            return;
          }
        }
      } catch (error) {
        console.warn('Warm-ups: failed to load via Tauri fs, using fallback list', error);
      }

      // Fallback list (limited) to keep feature working in web mode
      const fallback = [
        '/library/warmups/2e7b3bf790d6ea5ca0e04cbfbcbe6d2f.jpg',
        '/library/warmups/991f072f4a01d2734d6a6c28024e9b86.jpg',
        '/library/warmups/f7ee10bcc82f3c6407ecbbe132226b9c.jpg',
        '/library/warmups/sketch-59a636c80d327a00107a2764.jpg',
        '/library/warmups/the-stroller-_michael-chesley-johnson_airport-sketch-1024x512.jpg'
      ];
      setImages(fallback);
      setCurrentIndex(fallback.length ? Math.floor(Math.random() * fallback.length) : null);
    };

    loadImages();
  }, [isTauri]);

  const setMinutesClamped = useCallback(
    (next: number) => {
      const clamped = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, next));
      setMinutes(clamped);
      setSecondsLeft(clamped * 60);
    },
    []
  );

  const resetTimer = useCallback(() => {
    setRunning(false);
    setSecondsLeft(minutes * 60);
  }, [minutes]);

  const handleNext = useCallback(() => {
    if (!images.length) return;
    setHistory((prev) => (currentIndex !== null ? [...prev, currentIndex] : prev));
    let nextIndex = Math.floor(Math.random() * images.length);
    if (images.length > 1 && nextIndex === currentIndex) {
      nextIndex = (nextIndex + 1) % images.length;
    }
    setCurrentIndex(nextIndex);
    resetTimer();
  }, [currentIndex, images.length, resetTimer]);

  // Timer ticking
  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) {
      if (autoSwitch && images.length > 0) {
        handleNext();
        setRunning(true);
      } else {
        setRunning(false);
      }
      return;
    }
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, secondsLeft, autoSwitch, images.length, handleNext]);

  const handlePrev = useCallback(() => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const newHistory = [...prev];
      const last = newHistory.pop() as number;
      setCurrentIndex(last);
      return newHistory;
    });
    resetTimer();
  }, [resetTimer]);

  const handlePlayPause = useCallback(() => {
    if (secondsLeft <= 0) {
      setSecondsLeft(minutes * 60);
    }
    setRunning((r) => !r);
  }, [minutes, secondsLeft]);

  const handleReset = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const canGoPrev = history.length > 0;

  const Header = (opts?: { inlineControls?: boolean }) => {
    if (opts?.inlineControls) {
      return (
        <div className="warmups-header modal">
          <div className="warmups-header-left">
            <label className="warmups-auto-switch">
              <input
                type="checkbox"
                checked={autoSwitch}
                onChange={(e) => setAutoSwitch(e.target.checked)}
              />
              <span>Auto switch</span>
            </label>
          </div>
          <div className="warmups-header-center">
            <div className="warmups-prev">
              {canGoPrev && (
                <button className="warmups-link" onClick={handlePrev}>
                  &lt; PREVIOUS
                </button>
              )}
            </div>
            <div className="warmups-timer-group">
              <button className="warmups-round-btn play" onClick={handlePlayPause}>
                {running ? '⏸' : '▶'}
              </button>
              <button className="warmups-round-btn" onClick={handleReset} aria-label="Reset timer">
                ⟳
              </button>
              <div className="warmups-timer">
                <button
                  className="warmups-timer-adjust"
                  onClick={() => setMinutesClamped(minutes - 1)}
                  aria-label="Decrease timer"
                >
                  -
                </button>
                <div
                  className={`warmups-timer-display ${secondsLeft <= 10 ? 'low' : ''}`}
                >
                  {formatTime(secondsLeft)}
                </div>
                <button
                  className="warmups-timer-adjust"
                  onClick={() => setMinutesClamped(minutes + 1)}
                  aria-label="Increase timer"
                >
                  +
                </button>
              </div>
            </div>
            <div className="warmups-next">
              <button className="warmups-link" onClick={handleNext}>
                NEXT &gt;
              </button>
            </div>
          </div>
          <div className="warmups-header-right">
            <button
              className="warmups-modal-close"
              onClick={() => setModalOpen(false)}
              aria-label="Close fullscreen"
            >
              ✕
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="warmups-header">
        <div className="warmups-prev">
          {canGoPrev && (
            <button className="warmups-link" onClick={handlePrev}>
              &lt; PREVIOUS
            </button>
          )}
        </div>

        <div className="warmups-timer-group">
          <div className="warmups-timer">
            <button
              className="warmups-timer-adjust"
              onClick={() => setMinutesClamped(minutes - 1)}
              aria-label="Decrease timer"
            >
              -
            </button>
            <div
              className={`warmups-timer-display ${secondsLeft <= 10 ? 'low' : ''}`}
            >
              {formatTime(secondsLeft)}
            </div>
            <button
              className="warmups-timer-adjust"
              onClick={() => setMinutesClamped(minutes + 1)}
              aria-label="Increase timer"
            >
              +
            </button>
          </div>
        </div>

        <div className="warmups-next">
          <button className="warmups-link" onClick={handleNext}>
            NEXT &gt;
          </button>
        </div>
      </div>
    );
  };

  const Controls = (
    <div className="warmups-controls">
      <button className="warmups-round-btn play" onClick={handlePlayPause}>
        {running ? '⏸' : '▶'}
      </button>
      <button className="warmups-round-btn" onClick={handleReset} aria-label="Reset timer">
        ⟳
      </button>
    </div>
  );

  const Footer = (
    <div className="warmups-footer">
      <label className="warmups-auto-switch">
        <input
          type="checkbox"
          checked={autoSwitch}
          onChange={(e) => setAutoSwitch(e.target.checked)}
        />
        <span>Auto switch</span>
      </label>
      {Controls}
    </div>
  );

  const Viewer = (props: { className?: string; hideOpen?: boolean }) => (
    <div className={`warmups-viewer ${props.className ?? ''}`}>
      {currentIndex !== null && images[currentIndex] ? (
        <img src={images[currentIndex]} alt="Warm-up reference" />
      ) : (
        <div className="warmups-empty">No warm-up images found.</div>
      )}
      {!props.hideOpen && (
        <button
          className="warmups-open-modal"
          onClick={() => setModalOpen(true)}
          aria-label="Open warm-up fullscreen"
        >
          ⤢
        </button>
      )}
    </div>
  );

  return (
    <div className="warmups">
    {Header()}
      <Viewer />
      {Footer}

      {modalOpen && (
        <div className="warmups-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="warmups-modal" onClick={(e) => e.stopPropagation()}>
            {Header({ inlineControls: true })}
            <div className="warmups-modal-viewer">
              <Viewer className="large" hideOpen />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warmups;
