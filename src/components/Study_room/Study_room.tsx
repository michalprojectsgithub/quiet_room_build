import React, { useCallback, useMemo, useState } from 'react';
import '../Idea_vault/Idea_vault.css';
import './Study_room.css';
import MasterStudies from './MasterStudies';
import LiveStudy from './LiveStudy';

type StudyRoomTab = 'masterStudies' | 'liveStudy';

interface SubTabConfig {
  id: StudyRoomTab;
  label: string;
  icon: string;
  description: string;
}

const SUB_TABS: SubTabConfig[] = [
  { id: 'masterStudies', label: 'Master Studies', icon: '', description: 'Planned studies of reference works' },
  { id: 'liveStudy', label: 'Live Study', icon: '', description: 'Live or timed study sessions' },
];

const Study_room: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<StudyRoomTab>('masterStudies');

  const handleTabChange = useCallback((tab: StudyRoomTab) => {
    setActiveSubTab(tab);
  }, []);

  const content = useMemo(() => {
    if (activeSubTab === 'masterStudies') {
      return <MasterStudies />;
    }
    if (activeSubTab === 'liveStudy') {
      return <LiveStudy />;
    }
    const sub = SUB_TABS.find((t) => t.id === activeSubTab);
    return (
      <div className="study-room-placeholder-panel">
        <div className="study-room-placeholder-title">
          {sub?.icon ? `${sub.icon} ` : ''}{sub?.label}
        </div>
        <div className="study-room-placeholder-subtitle">
          {sub?.description} — coming soon.
        </div>
      </div>
    );
  }, [activeSubTab]);

  return (
    <div className="idea-vault-container study-room-container">
      <div className="idea-vault-header">
        <div className="idea-vault-header-content">
          <h2 className="idea-vault-title">Practice Corner</h2>
          <p className="idea-vault-subtitle">
            Workspace for practice. Master Studies and Live Study sessions.
          </p>
        </div>
      </div>

      <nav
        className="idea-vault-sub-tabs"
        role="tablist"
        aria-label="Study Room sections"
      >
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`sub-tab-button ${activeSubTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
            role="tab"
            aria-selected={activeSubTab === tab.id}
            aria-label={`${tab.label} - ${tab.description}`}
            tabIndex={activeSubTab === tab.id ? 0 : -1}
          >
            <span className="sub-tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="sub-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="idea-vault-content">
        {content}
      </div>
    </div>
  );
};

export default Study_room;
