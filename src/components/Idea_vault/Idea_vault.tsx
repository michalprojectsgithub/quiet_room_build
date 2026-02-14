import React, { useState, useCallback, useMemo } from 'react';
import './Idea_vault.css';
import Moodboards from './Moodboards/Moodboards';
import Notes from './Notes/Notes';
import References from './References/References';

// Sub-tab type definition
export type IdeaVaultTabType = 'moodboards' | 'notes' | 'references';

// Sub-tab configuration interface
interface SubTabConfig {
  id: IdeaVaultTabType;
  label: string;
  icon: string;
  description: string;
  component: React.ComponentType<any>;
}

// Props interface
interface Idea_vaultProps {
  API_BASE: string;
  className?: string;
  disabled?: boolean;
  moodboardsRefreshToken?: number;
}

// Sub-tab configuration data
const SUB_TAB_CONFIG: SubTabConfig[] = [
  {
    id: 'moodboards',
    label: 'Moodboards',
    icon: '',
    description: 'Create and organize visual moodboards for your projects',
    component: Moodboards
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: '',
    description: 'Write and organize your creative notes and ideas',
    component: Notes
  },
  {
    id: 'references',
    label: 'References',
    icon: '',
    description: 'Manage reference images and inspiration sources',
    component: References
  }
];

// Custom hook for sub-tab management
const useIdeaVaultTabs = () => {
  const [activeTab, setActiveTab] = useState<IdeaVaultTabType>('moodboards');

  const handleTabChange = useCallback((tabId: IdeaVaultTabType) => {
    setActiveTab(tabId);
  }, []);

  const activeTabConfig = useMemo(() => {
    return SUB_TAB_CONFIG.find(tab => tab.id === activeTab);
  }, [activeTab]);

  return {
    activeTab,
    activeTabConfig,
    handleTabChange
  };
};

// Sub-tab Button Component
interface SubTabButtonProps {
  tab: SubTabConfig;
  isActive: boolean;
  isDisabled: boolean;
  onClick: (tabId: IdeaVaultTabType) => void;
}

const SubTabButton: React.FC<SubTabButtonProps> = ({
  tab,
  isActive,
  isDisabled,
  onClick
}) => {
  const buttonClass = useMemo(() => {
    const baseClass = 'sub-tab-button';
    const activeClass = isActive ? 'active' : '';
    const disabledClass = isDisabled ? 'disabled' : '';
    return [baseClass, activeClass, disabledClass].filter(Boolean).join(' ');
  }, [isActive, isDisabled]);

  return (
    <button
      className={buttonClass}
      onClick={() => onClick(tab.id)}
      disabled={isDisabled}
      aria-selected={isActive}
      aria-label={`${tab.label} - ${tab.description}`}
      role="tab"
      tabIndex={isActive ? 0 : -1}
      title={tab.description}
    >
      {tab.icon ? (
        <span className="sub-tab-icon" aria-hidden="true">
          {tab.icon}
        </span>
      ) : null}
      <span className="sub-tab-label">
        {tab.label}
      </span>
    </button>
  );
};

// Header Component
interface IdeaVaultHeaderProps {
  title: string;
  subtitle: string;
  icon: string;
}

const IdeaVaultHeader: React.FC<IdeaVaultHeaderProps> = ({
  title,
  subtitle,
  icon
}) => {
  return (
    <div className="idea-vault-header">
      <div className="idea-vault-header-content">
        <h2 className="idea-vault-title">
          {icon ? (
            <span className="idea-vault-title-icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          {title}
        </h2>
        <p className="idea-vault-subtitle">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

// Sub-tabs Navigation Component
interface SubTabsNavigationProps {
  tabs: SubTabConfig[];
  activeTab: IdeaVaultTabType;
  isDisabled: boolean;
  onTabChange: (tabId: IdeaVaultTabType) => void;
}

const SubTabsNavigation: React.FC<SubTabsNavigationProps> = ({
  tabs,
  activeTab,
  isDisabled,
  onTabChange
}) => {
  return (
    <nav 
      className="idea-vault-sub-tabs"
      role="tablist"
      aria-label="Idea Vault section navigation"
      aria-disabled={isDisabled}
    >
      {tabs.map((tab) => (
        <SubTabButton
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          isDisabled={isDisabled}
          onClick={onTabChange}
        />
      ))}
    </nav>
  );
};

// Content Area Component
interface ContentAreaProps {
  activeTabConfig: SubTabConfig | undefined;
  API_BASE: string;
  ideaVaultTab: IdeaVaultTabType;
  moodboardsRefreshToken?: number;
}

const ContentArea: React.FC<ContentAreaProps> = ({
  activeTabConfig,
  API_BASE,
  ideaVaultTab,
  moodboardsRefreshToken
}) => {
  if (!activeTabConfig) {
    return (
      <div className="idea-vault-content-error">
        <p>No content available for the selected tab.</p>
      </div>
    );
  }

  const Component = activeTabConfig.component;

  // Render component with appropriate props based on tab type
  switch (activeTabConfig.id) {
    case 'moodboards':
      return (
        <div className="idea-vault-content">
          <Component
            ideaVaultTab={ideaVaultTab}
            API_BASE={API_BASE}
            refreshSignal={moodboardsRefreshToken}
          />
        </div>
      );
    
    case 'notes':
      return (
        <div className="idea-vault-content">
          <Component />
        </div>
      );
    
    case 'references':
      return (
        <div className="idea-vault-content">
          <Component
            ideaVaultTab={ideaVaultTab}
            API_BASE={API_BASE}
          />
        </div>
      );
    
    default:
      return (
        <div className="idea-vault-content-error">
          <p>Unknown tab type: {activeTabConfig.id}</p>
        </div>
      );
  }
};

// Main Idea_vault Component
const Idea_vault: React.FC<Idea_vaultProps> = ({
  API_BASE,
  className = '',
  disabled = false,
  moodboardsRefreshToken
}) => {
  const {
    activeTab,
    activeTabConfig,
    handleTabChange
  } = useIdeaVaultTabs();

  const containerClass = useMemo(() => {
    const baseClass = 'idea-vault-container';
    const disabledClass = disabled ? 'disabled' : '';
    return [baseClass, disabledClass, className].filter(Boolean).join(' ');
  }, [disabled, className]);

  return (
    <div className={containerClass}>
      {/* Header */}
      <IdeaVaultHeader
        title="Idea Vault"
        subtitle="Organize your creative ideas with moodboards, notes, and references"
        icon=""
      />

      {/* Sub-tabs Navigation */}
      <SubTabsNavigation
        tabs={SUB_TAB_CONFIG}
        activeTab={activeTab}
        isDisabled={disabled}
        onTabChange={handleTabChange}
      />

      {/* Content Area */}
      <ContentArea
        activeTabConfig={activeTabConfig}
        API_BASE={API_BASE}
        ideaVaultTab={activeTab}
        moodboardsRefreshToken={moodboardsRefreshToken}
      />
    </div>
  );
};

export default Idea_vault;
export type { Idea_vaultProps, SubTabConfig };
