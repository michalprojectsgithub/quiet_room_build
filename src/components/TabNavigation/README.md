# Tab Navigation Component

## Overview
Top-level tab bar for the app (Inspiration Board, Artwork Journal, Idea Vault, Practice Corner). Parent owns the active tab; this component renders ARIA-friendly buttons with keyboard support.

## Current behavior
- Tabs defined statically in `TAB_CONFIG` (emoji, label, description).
- Controlled by `activeTab`/`onTabChange` from the parent.
- Keyboard: Enter/Space activate; ArrowLeft/ArrowRight cycle; Tab follows normal order.
- Disabled state blocks interaction and sets `aria-disabled`.

## Props
```ts
type TabType = 'inspiration' | 'gallery' | 'ideaVault';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  disabled?: boolean;
  className?: string;
}
```

## Usage
```tsx
<TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
```

## Manual checks
- Click tabs updates selection and ARIA `aria-selected`.
- Arrow keys cycle; Enter/Space activate.
- Disabled prop prevents interaction.
- Buttons remain usable on narrow widths.

---
Last updated: 2026-01-11
# Tab Navigation Component

## Overview

The Tab Navigation component is a responsive, accessible navigation system that provides the main application navigation between different sections: Inspiration Board, Artwork Journal, Idea Vault, and Practice Corner. It features keyboard navigation, ARIA support, and a modern design with smooth animations.

## Features

### ✨ Core Functionality
- **Tab Navigation**: Switch between main application sections
- **Active State Management**: Visual indication of current tab
- **Keyboard Navigation**: Full keyboard accessibility support
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: ARIA labels and semantic HTML structure

### 🎨 User Experience
- **Visual Feedback**: Hover effects and active state styling
- **Smooth Animations**: CSS transitions for interactions
- **Icon Support**: Emoji icons for each tab section
- **Tooltips**: Descriptive tooltips on hover
- **Focus Management**: Proper focus indicators and tab order

### ♿ Accessibility Features
- **ARIA Support**: Proper ARIA labels and roles
- **Keyboard Navigation**: Arrow keys, Enter, and Spacebar support
- **Screen Reader Support**: Semantic HTML and descriptive labels
- **High Contrast Mode**: Enhanced visibility in high contrast
- **Reduced Motion**: Respects user motion preferences

## Architecture

### Component Structure

```
TabNavigation/
├── TabNavigation.tsx          # Main component
├── TabNavigation.css          # Styling
└── README.md                  # This file
```

### Custom Hooks

#### useTabNavigation
- Manages tab click and keyboard navigation logic
- Handles arrow key navigation between tabs
- Provides click and keyboard event handlers
- Manages tab state transitions

### Data Flow

1. **Tab Configuration**: Static configuration defines available tabs
2. **State Management**: Parent component manages active tab state
3. **Event Handling**: Custom hook handles user interactions
4. **UI Updates**: Component re-renders based on state changes

## Data Structure

### Tab Configuration

```typescript
interface TabConfig {
  id: TabType;
  label: string;
  icon: string;
  description: string;
}
```

### Available Tabs

- **Inspiration** (✨): Generate creative prompts and AI sketches
- **Photo Journal** (📷): Upload and manage reference images
- **Idea Vault** (💡): Organize moodboards, notes, and references

### Tab Types

```typescript
type TabType = 'inspiration' | 'gallery' | 'ideaVault';
```

## Props Interface

```typescript
interface TabNavigationProps {
  activeTab: TabType;                    // Currently active tab
  onTabChange: (tab: TabType) => void;   // Tab change callback
  disabled?: boolean;                    // Disable all tabs
  className?: string;                    // Additional CSS classes
}
```

## Styling

### Design System
- **Color Scheme**: Dark theme with blue accent for active state
- **Typography**: System fonts with proper hierarchy
- **Spacing**: Consistent padding and margins
- **Animations**: Smooth transitions and hover effects
- **Responsive**: Mobile-first design approach

### CSS Classes

#### Layout
- `.tab-navigation`: Main container with flexbox layout
- `.tab-navigation.disabled`: Disabled state styling

#### Buttons
- `.tab-button`: Base button styles
- `.tab-button.active`: Active tab styling
- `.tab-button.disabled`: Disabled button styling
- `.tab-button:hover`: Hover state effects
- `.tab-button:focus-visible`: Focus indicator

#### Elements
- `.tab-icon`: Icon styling and animations
- `.tab-label`: Text label styling

#### Responsive
- Mobile breakpoints for different screen sizes
- Stacked layout on small screens
- Adjusted spacing and typography

## Usage

### Basic Implementation

```tsx
import TabNavigation from './components/TabNavigation/TabNavigation';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('inspiration');

  return (
    <div>
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* Tab content based on activeTab */}
      {activeTab === 'inspiration' && <Inspiration />}
      {activeTab === 'gallery' && <PhotoJournal />}
      {activeTab === 'ideaVault' && <IdeaVault />}
    </div>
  );
}
```

### With Additional Props

```tsx
<TabNavigation
  activeTab={activeTab}
  onTabChange={setActiveTab}
  disabled={isLoading}
  className="custom-tab-navigation"
/>
```

### Integration with Main App

The TabNavigation component is designed to work with the main application:

```tsx
// In App.tsx
<TabNavigation
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

## Keyboard Navigation

### Supported Keys
- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate selected tab
- **Arrow Left**: Navigate to previous tab
- **Arrow Right**: Navigate to next tab
- **Home**: Navigate to first tab
- **End**: Navigate to last tab

### Focus Management
- Active tab receives focus on mount
- Focus moves with tab selection
- Proper tabindex management
- Focus indicators for accessibility

## Accessibility Features

### ARIA Support
- `role="tablist"` on navigation container
- `role="tab"` on individual tab buttons
- `aria-selected` for active tab state
- `aria-label` for descriptive labels
- `aria-disabled` for disabled state

### Screen Reader Support
- Semantic HTML structure
- Descriptive labels and descriptions
- Proper heading hierarchy
- Announcement of tab changes

### Keyboard Accessibility
- Full keyboard navigation support
- Visible focus indicators
- Logical tab order
- Escape key handling

## Responsive Design

### Breakpoints
- **Desktop**: Horizontal layout with full labels
- **Tablet**: Adjusted spacing and typography
- **Mobile**: Stacked vertical layout

### Mobile Adaptations
- Vertical stacking on small screens
- Larger touch targets
- Adjusted padding and margins
- Simplified animations

## Performance Considerations

### Optimization Strategies
- **Memoization**: React.memo for expensive calculations
- **Callback Optimization**: useCallback for event handlers
- **Class Name Optimization**: useMemo for dynamic classes
- **Minimal Re-renders**: Efficient state management

### Best Practices
- **Lazy Loading**: Load tab content on demand
- **Code Splitting**: Separate tab components
- **Bundle Optimization**: Tree shaking for unused features
- **Memory Management**: Proper cleanup on unmount

## Browser Support

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Required Features
- ES6+ support
- CSS Grid and Flexbox
- CSS Custom Properties
- Focus-visible pseudo-class
- Media queries

## Testing

### Component Testing
- Unit tests for tab selection logic
- Integration tests for keyboard navigation
- Accessibility testing with screen readers
- Visual regression testing

### Manual Testing Checklist
- [ ] Click navigation between tabs
- [ ] Keyboard navigation with arrow keys
- [ ] Enter/Space activation
- [ ] Focus management and indicators
- [ ] Screen reader compatibility
- [ ] Responsive design on mobile
- [ ] High contrast mode support
- [ ] Reduced motion preferences
- [ ] Disabled state functionality
- [ ] Custom className support

## Future Enhancements

### Planned Features
- **Tab Badges**: Notification indicators
- **Custom Icons**: SVG icon support
- **Tab Animations**: Smooth transitions
- **Tab Persistence**: Remember last active tab
- **Tab Reordering**: Drag and drop support

### Performance Improvements
- **Virtual Scrolling**: For many tabs
- **Lazy Loading**: Load tab content on demand
- **Preloading**: Preload adjacent tabs
- **Caching**: Cache tab state

### Accessibility Improvements
- **Voice Control**: Voice command support
- **Gesture Support**: Touch gestures
- **High DPI**: Retina display optimization
- **Print Styles**: Better print layout

## Dependencies

### Required Dependencies
- React 18+
- TypeScript

### Optional Dependencies
- React Router (for navigation)
- Styled Components (for styling)
- Framer Motion (for animations)

## Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Use functional components with hooks
3. Implement proper accessibility features
4. Add comprehensive tests
5. Maintain responsive design
6. Follow ARIA guidelines

### Code Style
- Use TypeScript for type safety
- Implement proper prop interfaces
- Use meaningful component names
- Add JSDoc comments for complex functions
- Follow React best practices

## Troubleshooting

### Common Issues

#### Tabs Not Responding
- Check `onTabChange` callback implementation
- Verify `activeTab` prop is properly set
- Ensure component is not disabled
- Check for JavaScript errors

#### Keyboard Navigation Not Working
- Verify focus management
- Check tabindex values
- Ensure proper event handling
- Test with different browsers

#### Styling Issues
- Check CSS class names
- Verify responsive breakpoints
- Test in different browsers
- Check for CSS conflicts

#### Accessibility Problems
- Test with screen readers
- Verify ARIA attributes
- Check keyboard navigation
- Test high contrast mode

### Debug Tips
- Use React DevTools for state inspection
- Check browser accessibility tools
- Test with keyboard only navigation
- Verify ARIA attributes in dev tools
- Test with different screen readers

## Browser Support

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Required Features
- ES6+ support
- CSS Grid and Flexbox
- CSS Custom Properties
- Focus-visible pseudo-class
- Media queries
- ARIA support

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainer**: Development Team
