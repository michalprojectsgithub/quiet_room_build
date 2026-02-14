import * as React from "react";
import "./focus_mode.css";

interface DrawingSession {
  id: string;
  prompt: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  mode: 'countdown' | 'counter';
  preset?: number; // for countdown mode
  completed: boolean;
}

interface FocusModeProps {
  focusMode: boolean;
  index: number | null;
  filteredInspirations: string[];
  onExitFocusMode: () => void;
}

const FocusMode: React.FC<FocusModeProps> = ({
  focusMode,
  index,
  filteredInspirations,
  onExitFocusMode
}) => {
  // Focus mode state
  const [timerMode, setTimerMode] = React.useState<'countdown' | 'counter'>('counter');
  const [countdownPreset, setCountdownPreset] = React.useState(20); // minutes
  const [timeLeft, setTimeLeft] = React.useState(0); // seconds
  const [timeElapsed, setTimeElapsed] = React.useState(0); // seconds
  const [isRunning, setIsRunning] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [sessionStartTime, setSessionStartTime] = React.useState<number | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = React.useState(false);
  const [showSessionComplete, setShowSessionComplete] = React.useState(false);
  const [completedSession, setCompletedSession] = React.useState<DrawingSession | null>(null);
  
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Focus mode functions
  const finishSession = React.useCallback(() => {
    if (!sessionStartTime) return;
    
    const endTime = Date.now();
    const duration = Math.floor((endTime - sessionStartTime) / 1000);
    
    const session: DrawingSession = {
      id: Date.now().toString(),
      prompt: filteredInspirations[index!],
      startTime: sessionStartTime,
      endTime: endTime,
      duration: duration,
      mode: timerMode,
      preset: timerMode === 'countdown' ? countdownPreset : undefined,
      completed: true
    };
    
    setCompletedSession(session);
    setShowSessionComplete(true);
    setIsRunning(false);
    setIsPaused(false);
  }, [sessionStartTime, filteredInspirations, index, timerMode, countdownPreset]);

  // Timer effect
  React.useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        if (timerMode === 'countdown') {
          setTimeLeft(prev => {
            if (prev <= 1) {
              finishSession();
              return 0;
            }
            return prev - 1;
          });
        } else {
          setTimeElapsed(prev => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, isPaused, timerMode, finishSession]);

  // Focus mode functions
  const startTimer = () => {
    setIsRunning(true);
    setIsPaused(false);
    setSessionStartTime(Date.now());
  };

  const pauseResume = () => {
    setIsPaused(!isPaused);
  };

  const switchTimerMode = (newMode: 'countdown' | 'counter') => {
    if (timerMode === newMode) return;
    
    setTimerMode(newMode);
    
    // Reset timer when switching modes
    if (newMode === 'countdown') {
      setTimeLeft(countdownPreset * 60);
      setTimeElapsed(0);
    } else {
      setTimeElapsed(0);
      setTimeLeft(0);
    }
  };

  const updateCountdownPreset = (newPreset: number) => {
    const clampedPreset = Math.min(180, Math.max(1, newPreset));
    setCountdownPreset(clampedPreset);
    
    // If currently in countdown mode and timer is not running, update the display
    if (timerMode === 'countdown' && !isRunning) {
      setTimeLeft(clampedPreset * 60);
    }
    // If currently in countdown mode and timer is running, update the remaining time
    else if (timerMode === 'countdown' && isRunning) {
      setTimeLeft(clampedPreset * 60);
    }
  };

  // Initialize timer when focus mode starts
  React.useEffect(() => {
    if (focusMode) {
      // Set initial timer values based on current mode and preset
      if (timerMode === 'countdown') {
        setTimeLeft(countdownPreset * 60);
        setTimeElapsed(0);
      } else {
        setTimeElapsed(0);
        setTimeLeft(0);
      }
      
      // Don't start the timer automatically - let user configure first
      setIsRunning(false);
      setIsPaused(false);
      setSessionStartTime(null);
      setShowQuitConfirm(false);
      setShowSessionComplete(false);
    }
  }, [focusMode, timerMode, countdownPreset]);

  const quitFocusMode = () => {
    if (isRunning && !isPaused) {
      setShowQuitConfirm(true);
    } else {
      exitFocusMode();
    }
  };

  const exitFocusMode = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(0);
    setTimeElapsed(0);
    setSessionStartTime(null);
    setShowQuitConfirm(false);
    setShowSessionComplete(false);
    setCompletedSession(null);
    onExitFocusMode();
  };

  const saveSession = () => {
    if (!completedSession) return;
    
    const savedSessions = JSON.parse(localStorage.getItem('drawing-sessions') || '[]');
    savedSessions.push(completedSession);
    localStorage.setItem('drawing-sessions', JSON.stringify(savedSessions));
    
    exitFocusMode();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };



  // Focus Mode UI
  if (focusMode) {
    const currentTime = timerMode === 'countdown' ? timeLeft : timeElapsed;
    
    console.log('FocusMode rendering with focusMode:', focusMode, 'index:', index);
    
    const promptText = index !== null && filteredInspirations[index]
      ? filteredInspirations[index]
      : "No prompt selected";

    return (
      <div className="focus-container">
        {/* Close button */}
        <button
          className="focus-close-button"
          onClick={quitFocusMode}
          title="Exit focus mode"
          aria-label="Exit focus mode"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Quit Confirmation Modal */}
        {showQuitConfirm && (
          <div className="focus-modal">
            <div className="focus-modal-content">
              <h3>Quit Drawing Session?</h3>
              <p>Are you sure you want to quit? Your progress will be lost.</p>
              <div className="focus-modal-buttons">
                <button 
                  className="focus-button focus-button-danger"
                  onClick={exitFocusMode}
                >
                  Quit Session
                </button>
                <button 
                  className="focus-button focus-button-secondary"
                  onClick={() => setShowQuitConfirm(false)}
                >
                  Continue Drawing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session Complete Modal */}
        {showSessionComplete && completedSession && (
          <div className="focus-modal">
            <div className="focus-modal-content">
              <h3>Session Complete!</h3>
              <p><strong>Prompt:</strong> {completedSession.prompt}</p>
              <p><strong>Time Spent:</strong> {formatTime(completedSession.duration)}</p>
              <p><strong>Mode:</strong> {completedSession.mode === 'countdown' ? `Countdown (${completedSession.preset}min)` : 'Counter'}</p>
              <div className="focus-modal-buttons">
                <button 
                  className="focus-button focus-button-success"
                  onClick={saveSession}
                >
                  Save Session
                </button>
                <button 
                  className="focus-button focus-button-secondary"
                  onClick={exitFocusMode}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Focus Interface */}
        <div className="focus-content">
          {/* Prompt */}
          <div className="focus-prompt">
            {promptText}
          </div>

          {/* Timer */}
          <div className="focus-timer">
            <div className="focus-timer-display">
              {formatTime(currentTime)}
            </div>
            
            {/* Show current mode when running */}
            {isRunning && (
              <div className="focus-timer-mode">
                {timerMode === 'countdown' ? `Countdown (${countdownPreset}min)` : 'Counter'}
              </div>
            )}
          </div>

          {/* Timer Settings - Show when not running, above Start button */}
          {!isRunning && (
            <div className="focus-timer-settings">
              {/* Mode Toggle */}
              <div className="focus-mode-toggle">
                <button
                  className={`focus-mode-button ${timerMode === 'countdown' ? 'focus-mode-button-active' : 'focus-mode-button-inactive'}`}
                  onClick={() => switchTimerMode('countdown')}
                  title="Switch to countdown mode"
                >
                  Countdown
                </button>
                <button
                  className={`focus-mode-button ${timerMode === 'counter' ? 'focus-mode-button-active' : 'focus-mode-button-inactive'}`}
                  onClick={() => switchTimerMode('counter')}
                  title="Switch to counter mode"
                >
                  Counter
                </button>
              </div>

              {/* Countdown Presets */}
              {timerMode === 'countdown' && (
                <div className="focus-presets">
                  {[10, 20, 40].map(preset => (
                    <button
                      key={preset}
                      className={`focus-preset-button ${countdownPreset === preset ? 'focus-preset-button-active' : 'focus-preset-button-inactive'}`}
                      onClick={() => updateCountdownPreset(preset)}
                      title={`Set ${preset} minute countdown`}
                    >
                      {preset}min
                    </button>
                  ))}
                  <div className="focus-custom-duration" role="group" aria-label="Adjust countdown duration">
                    <button
                      className="focus-duration-button"
                      onClick={() => updateCountdownPreset(countdownPreset - 1)}
                      disabled={countdownPreset <= 1}
                      title="Decrease by 1 minute"
                      aria-label="Decrease by 1 minute"
                    >
                      −
                    </button>
                    <span className="focus-duration-value">{countdownPreset} min</span>
                    <button
                      className="focus-duration-button"
                      onClick={() => updateCountdownPreset(countdownPreset + 1)}
                      disabled={countdownPreset >= 180}
                      title="Increase by 1 minute"
                      aria-label="Increase by 1 minute"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="focus-controls">
            {!isRunning ? (
              <button 
                className="focus-button focus-button-success"
                onClick={startTimer}
                disabled={index === null}
              >
                Start Timer
              </button>
            ) : (
              <>
                <button 
                  className={`focus-button ${isPaused ? 'focus-button-success' : 'focus-button-warning'}`}
                  onClick={pauseResume}
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button 
                  className="focus-button focus-button-info"
                  onClick={finishSession}
                >
                  Finish
                </button>
                <button 
                  className="focus-button focus-button-danger"
                  onClick={quitFocusMode}
                >
                  Quit
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default FocusMode;