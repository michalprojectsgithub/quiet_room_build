import React, { useCallback, useMemo } from 'react';
import './TabNavigation.css';

// Tab type definition
export type TabType = 'inspiration' | 'gallery' | 'ideaVault' | 'studyRoom';

// Tab configuration interface
interface TabConfig {
  id: TabType;
  label: string;
  icon: string;
  description: string;
}

// Props interface
interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  disabled?: boolean;
  className?: string;
}

// Tab configuration data
const TAB_CONFIG: TabConfig[] = [
  {
    id: 'inspiration',
    label: 'Inspiration Board',
    icon: '',
    description: 'Generate creative prompts and AI sketches'
  },
  {
    id: 'gallery',
    label: 'Artwork Journal',
    icon: '',
    description: 'Upload and manage your artwork and reference images'
  },
  {
    id: 'ideaVault',
    label: 'Idea Vault',
    icon: '',
    description: 'Organize moodboards, notes, and references'
  },
  // Practice Corner hidden for now - uncomment when ready to expose to users
  // {
  //   id: 'studyRoom',
  //   label: 'Practice Corner',
  //   icon: '',
  //   description: 'Practice: master studies, live study, and art library'
  // }
];

// Custom hook for tab navigation logic
const useTabNavigation = (activeTab: TabType, onTabChange: (tab: TabType) => void) => {
  const handleTabClick = useCallback((tabId: TabType) => {
    if (tabId !== activeTab) {
      onTabChange(tabId);
    }
  }, [activeTab, onTabChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, tabId: TabType) => {
    const currentIndex = TAB_CONFIG.findIndex(tab => tab.id === activeTab);
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleTabClick(tabId);
        break;
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % TAB_CONFIG.length;
        handleTabClick(TAB_CONFIG[nextIndex].id);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = currentIndex === 0 ? TAB_CONFIG.length - 1 : currentIndex - 1;
        handleTabClick(TAB_CONFIG[prevIndex].id);
        break;
    }
  }, [activeTab, handleTabClick]);

  return {
    handleTabClick,
    handleKeyDown
  };
};

// Tab Button Component
interface TabButtonProps {
  tab: TabConfig;
  isActive: boolean;
  isDisabled: boolean;
  onClick: (tabId: TabType) => void;
  onKeyDown: (event: React.KeyboardEvent, tabId: TabType) => void;
}

const TabButton: React.FC<TabButtonProps> = ({
  tab,
  isActive,
  isDisabled,
  onClick,
  onKeyDown
}) => {
  const buttonClass = useMemo(() => {
    const baseClass = 'tab-button';
    const activeClass = isActive ? 'active' : '';
    const disabledClass = isDisabled ? 'disabled' : '';
    return [baseClass, activeClass, disabledClass].filter(Boolean).join(' ');
  }, [isActive, isDisabled]);

  return (
    <button
      className={buttonClass}
      onClick={() => onClick(tab.id)}
      onKeyDown={(e) => onKeyDown(e, tab.id)}
      disabled={isDisabled}
      aria-selected={isActive}
      aria-label={`${tab.label} - ${tab.description}`}
      role="tab"
      tabIndex={isActive ? 0 : -1}
      title={tab.description}
    >
      {tab.icon ? (
        <span className="tab-icon" aria-hidden="true">
          {tab.icon}
        </span>
      ) : null}
      <span className="tab-label">
        {tab.label}
      </span>
    </button>
  );
};

// Main TabNavigation Component
const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  disabled = false,
  className = ''
}) => {
  const { handleTabClick, handleKeyDown } = useTabNavigation(activeTab, onTabChange);

  const containerClass = useMemo(() => {
    const baseClass = 'tab-navigation';
    const disabledClass = disabled ? 'disabled' : '';
    return [baseClass, disabledClass, className].filter(Boolean).join(' ');
  }, [disabled, className]);

  return (
    <nav 
      className={containerClass}
      role="tablist"
      aria-label="Main application navigation"
      aria-disabled={disabled}
    >
      {TAB_CONFIG.map((tab) => (
        <TabButton
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          isDisabled={disabled}
          onClick={handleTabClick}
          onKeyDown={handleKeyDown}
        />
      ))}
    </nav>
  );
};

export default TabNavigation;
export type { TabNavigationProps, TabConfig };
