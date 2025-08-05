# Content Catalyst Engine - UI/UX Design Specifications

## Design Philosophy and Principles

### Core Design Philosophy
The Content Catalyst Engine interface embodies the principle of "Intelligent Simplicity" - making complex AI automation accessible to creators of all technical levels while maintaining professional capabilities for advanced users.

### Design Principles

#### 1. Clarity Over Complexity
- **Progressive Disclosure**: Show essential features first, advanced options on demand
- **Clear Information Hierarchy**: Important information stands out visually
- **Contextual Help**: Guidance appears when and where users need it
- **Visual Simplicity**: Clean layouts that don't overwhelm or distract

#### 2. Efficiency Through Intelligence
- **Predictive Interface**: Anticipate user needs and pre-populate common choices
- **Smart Defaults**: Intelligent defaults based on user behavior and best practices
- **Reduced Cognitive Load**: Minimize decisions required for routine tasks
- **Workflow Automation**: Streamline repetitive actions into single-click operations

#### 3. Trust Through Transparency
- **Visible System Status**: Always show what the system is doing
- **Clear Data Usage**: Transparent about how user data is processed
- **Control Points**: Users maintain control at every automation step
- **Honest Communication**: Clear about limitations and expectations

#### 4. Accessibility First
- **Universal Design**: Accessible to users with varying abilities
- **Mobile-First**: Optimized for mobile devices and touch interfaces
- **Keyboard Navigation**: Full functionality without mouse/touch
- **International Support**: Designed for Dutch and English languages

## Visual Design System

### Color Palette

#### Primary Colors
```css
/* YouTube Brand Colors */
--youtube-red: #FF0000;        /* Primary brand, CTAs */
--youtube-red-dark: #CC0000;   /* Hover states */
--youtube-red-light: #FF3333;  /* Success states */

/* Brand Identity Colors */
--catalyst-blue: #1E40AF;      /* Primary brand color */
--catalyst-blue-dark: #1E3A8A; /* Dark variant */
--catalyst-blue-light: #3B82F6; /* Light variant */
--catalyst-accent: #8B5CF6;    /* AI/automation accent */
```

#### Neutral Colors
```css
/* Light Theme */
--bg-primary: #FFFFFF;         /* Main background */
--bg-secondary: #F8FAFC;       /* Secondary background */
--bg-tertiary: #F1F5F9;        /* Cards, panels */
--text-primary: #0F172A;       /* Primary text */
--text-secondary: #475569;     /* Secondary text */
--text-tertiary: #94A3B8;      /* Muted text */
--border-primary: #E2E8F0;     /* Primary borders */
--border-secondary: #CBD5E1;   /* Secondary borders */

/* Dark Theme */
--bg-primary-dark: #0F172A;    /* Main background */
--bg-secondary-dark: #1E293B;  /* Secondary background */
--bg-tertiary-dark: #334155;   /* Cards, panels */
--text-primary-dark: #F8FAFC;  /* Primary text */
--text-secondary-dark: #CBD5E1; /* Secondary text */
--text-tertiary-dark: #64748B; /* Muted text */
```

#### Semantic Colors
```css
/* Status Colors */
--success: #10B981;            /* Success states */
--warning: #F59E0B;            /* Warning states */
--error: #EF4444;              /* Error states */
--info: #3B82F6;               /* Information */

/* Video Generation Status */
--status-pending: #6B7280;     /* Pending/queued */
--status-processing: #F59E0B;  /* In progress */
--status-completed: #10B981;   /* Completed */
--status-failed: #EF4444;      /* Failed */
```

### Typography System

#### Font Stack
```css
/* Primary Font Stack */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;

/* Monospace (code, technical data) */
font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

#### Type Scale
```css
/* Heading Styles */
.text-h1 { font-size: 2.25rem; font-weight: 700; line-height: 2.5rem; } /* 36px */
.text-h2 { font-size: 1.875rem; font-weight: 600; line-height: 2.25rem; } /* 30px */
.text-h3 { font-size: 1.5rem; font-weight: 600; line-height: 2rem; } /* 24px */
.text-h4 { font-size: 1.25rem; font-weight: 500; line-height: 1.75rem; } /* 20px */
.text-h5 { font-size: 1.125rem; font-weight: 500; line-height: 1.75rem; } /* 18px */

/* Body Text */
.text-lg { font-size: 1.125rem; line-height: 1.75rem; } /* 18px */
.text-base { font-size: 1rem; line-height: 1.5rem; } /* 16px */
.text-sm { font-size: 0.875rem; line-height: 1.25rem; } /* 14px */
.text-xs { font-size: 0.75rem; line-height: 1rem; } /* 12px */

/* Special Text Styles */
.text-label { font-size: 0.875rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
.text-caption { font-size: 0.75rem; color: var(--text-tertiary); }
```

### Spacing System

#### Spacing Scale
```css
/* Spacing Variables */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
--space-20: 5rem;    /* 80px */
--space-24: 6rem;    /* 96px */
```

#### Layout Grid
```css
/* Container Sizes */
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;

/* Component Spacing */
--component-padding: var(--space-6);
--component-margin: var(--space-4);
--section-padding: var(--space-12);
```

## Component Library

### Base Components

#### Button System
```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

// Primary Button (main actions)
<Button variant="primary" size="md">
  Generate Video
</Button>

// Secondary Button (secondary actions)
<Button variant="secondary" size="md">
  Preview Script
</Button>

// Ghost Button (subtle actions)
<Button variant="ghost" size="sm" icon={<EditIcon />}>
  Edit
</Button>

// Danger Button (destructive actions)
<Button variant="danger" size="md">
  Delete Video
</Button>
```

#### Input System
```tsx
interface InputProps {
  type: 'text' | 'email' | 'password' | 'number' | 'textarea';
  label?: string;
  placeholder?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

// Text Input
<Input
  type="text"
  label="Video Title"
  placeholder="Enter compelling title..."
  helpText="Keep it under 60 characters for best results"
  required
/>

// Textarea
<Input
  type="textarea"
  label="Video Description"
  placeholder="Describe your video content..."
  helpText="Minimum 150 words recommended for SEO"
/>
```

#### Status Indicators
```tsx
interface StatusBadgeProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  text?: string;
}

// Status Badge
<StatusBadge status="processing" text="Generating Video..." />
<StatusBadge status="completed" text="Upload Successful" />
<StatusBadge status="failed" text="Generation Failed" />
```

### Navigation Components

#### Main Navigation
```tsx
interface NavigationProps {
  currentPath: string;
  user: User;
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, path: '/dashboard' },
  { id: 'analytics', label: 'Analytics', icon: ChartIcon, path: '/analytics' },
  { id: 'content', label: 'Content', icon: VideoIcon, path: '/content' },
  { id: 'schedule', label: 'Schedule', icon: CalendarIcon, path: '/schedule' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, path: '/settings' }
];
```

#### Breadcrumb Navigation
```tsx
interface BreadcrumbProps {
  items: Array<{
    label: string;
    href?: string;
  }>;
}

// Usage example
<Breadcrumb items={[
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Content Generation', href: '/content' },
  { label: 'New Video' }
]} />
```

### Data Display Components

#### Analytics Cards
```tsx
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
  };
  trend?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
}

// Metric Card
<MetricCard
  title="Total Views"
  value="125,430"
  change={{ value: 15.3, period: "vs last month" }}
  trend="up"
  icon={<EyeIcon />}
/>
```

#### Progress Indicators
```tsx
interface ProgressProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

// Progress Bar
<Progress
  value={65}
  label="Video Generation Progress"
  showPercentage
  color="primary"
/>

// Circular Progress
<CircularProgress
  value={75}
  size="lg"
  color="success"
/>
```

#### Data Tables
```tsx
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: boolean;
  sorting?: boolean;
  filtering?: boolean;
}

// Video List Table
<DataTable
  data={videos}
  columns={[
    { key: 'title', label: 'Title', sortable: true },
    { key: 'views', label: 'Views', sortable: true },
    { key: 'published_at', label: 'Published', sortable: true },
    { key: 'status', label: 'Status', render: (status) => <StatusBadge status={status} /> }
  ]}
  pagination
  sorting
/>
```

## Layout Specifications

### Dashboard Layout Structure

#### Main Dashboard Layout
```tsx
interface DashboardLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
}

const DashboardLayout = () => (
  <div className="min-h-screen bg-bg-primary">
    {/* Header */}
    <header className="h-16 border-b border-border-primary bg-bg-primary">
      <div className="flex h-full items-center justify-between px-6">
        {/* Logo and Navigation */}
        <div className="flex items-center space-x-8">
          <Logo />
          <MainNavigation />
        </div>
        
        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
    
    {/* Main Content */}
    <div className="flex">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-secondary border-r border-border-primary">
        <SidebarNavigation />
      </aside>
      
      {/* Content Area */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  </div>
);
```

#### Grid System
```css
/* Dashboard Grid Layout */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
}

/* Common Grid Patterns */
.grid-full { grid-column: span 12; }
.grid-half { grid-column: span 6; }
.grid-third { grid-column: span 4; }
.grid-quarter { grid-column: span 3; }
.grid-two-thirds { grid-column: span 8; }

/* Responsive Adjustments */
@media (max-width: 768px) {
  .grid-half, .grid-third, .grid-quarter, .grid-two-thirds {
    grid-column: span 12;
  }
}
```

### Page-Specific Layouts

#### Dashboard Overview
```tsx
const DashboardOverview = () => (
  <div className="dashboard-grid">
    {/* Key Metrics Row */}
    <div className="grid-quarter">
      <MetricCard title="Videos Generated" value="47" trend="up" />
    </div>
    <div className="grid-quarter">
      <MetricCard title="Total Views" value="125K" trend="up" />
    </div>
    <div className="grid-quarter">
      <MetricCard title="Avg. Performance" value="+23%" trend="up" />
    </div>
    <div className="grid-quarter">
      <MetricCard title="Time Saved" value="89h" trend="neutral" />
    </div>
    
    {/* Content Pipeline Status */}
    <div className="grid-two-thirds">
      <Card title="Content Pipeline">
        <PipelineVisualization />
      </Card>
    </div>
    
    {/* Quick Actions */}
    <div className="grid-third">
      <Card title="Quick Actions">
        <QuickActionButtons />
      </Card>
    </div>
    
    {/* Recent Activity */}
    <div className="grid-full">
      <Card title="Recent Activity">
        <ActivityFeed />
      </Card>
    </div>
  </div>
);
```

#### Content Generation Interface
```tsx
const ContentGeneration = () => (
  <div className="max-w-4xl mx-auto">
    {/* Progress Steps */}
    <StepIndicator 
      steps={['Analyze', 'Generate Titles', 'Create Script', 'Produce Video']}
      currentStep={2}
    />
    
    {/* Main Content Area */}
    <Card className="mt-6">
      <div className="grid-system">
        {/* Left Panel - Controls */}
        <div className="grid-third">
          <GenerationControls />
        </div>
        
        {/* Right Panel - Preview */}
        <div className="grid-two-thirds">
          <ContentPreview />
        </div>
      </div>
    </Card>
    
    {/* Action Bar */}
    <div className="flex justify-between mt-6">
      <Button variant="secondary">Previous Step</Button>
      <Button variant="primary">Generate Video</Button>
    </div>
  </div>
);
```

## Responsive Design Specifications

### Breakpoint System
```css
/* Breakpoint Variables */
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;

/* Media Query Mixins */
@media (max-width: 640px) { /* Mobile */ }
@media (min-width: 641px) and (max-width: 768px) { /* Tablet Portrait */ }
@media (min-width: 769px) and (max-width: 1024px) { /* Tablet Landscape */ }
@media (min-width: 1025px) { /* Desktop */ }
```

### Mobile-First Approach

#### Navigation Adaptation
```tsx
const ResponsiveNavigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <>
      {/* Desktop Navigation */}
      {!isMobile && <DesktopNavigation />}
      
      {/* Mobile Navigation */}
      {isMobile && (
        <>
          <MobileHeader onMenuToggle={() => setMobileMenuOpen(true)} />
          <MobileDrawer 
            open={mobileMenuOpen} 
            onClose={() => setMobileMenuOpen(false)}
          />
        </>
      )}
    </>
  );
};
```

#### Content Adaptation
```css
/* Dashboard Cards - Responsive Stacking */
.dashboard-grid {
  grid-template-columns: repeat(4, 1fr);
}

@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
}

/* Content Generation - Mobile Stack */
.content-generation-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--space-6);
}

@media (max-width: 768px) {
  .content-generation-layout {
    grid-template-columns: 1fr;
  }
  
  .generation-controls {
    order: 2;
  }
  
  .content-preview {
    order: 1;
  }
}
```

## Interactive Elements and Animations

### Micro-Interactions

#### Button Hover Effects
```css
.button-primary {
  transition: all 0.2s ease-in-out;
  transform: translateY(0);
}

.button-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
}

.button-primary:active {
  transform: translateY(0);
  transition-duration: 0.1s;
}
```

#### Loading States
```tsx
const LoadingButton = ({ loading, children, ...props }) => (
  <button {...props} disabled={loading}>
    {loading && <Spinner className="mr-2" />}
    {children}
  </button>
);

const LoadingCard = ({ loading, children }) => (
  <div className={`relative ${loading ? 'opacity-50' : ''}`}>
    {loading && (
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
        <Spinner size="lg" />
      </div>
    )}
    {children}
  </div>
);
```

#### Progress Animations
```tsx
const AnimatedProgress = ({ value, duration = 1000 }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [value]);
  
  return (
    <div className="progress-bar">
      <div 
        className="progress-fill"
        style={{
          width: `${animatedValue}%`,
          transition: `width ${duration}ms ease-out`
        }}
      />
    </div>
  );
};
```

### Page Transitions
```tsx
// Page transition wrapper
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);
```

## Accessibility Specifications

### WCAG 2.1 AA Compliance

#### Color Contrast Requirements
```css
/* Minimum Contrast Ratios */
/* Normal text: 4.5:1 */
/* Large text (18px+): 3:1 */
/* UI components: 3:1 */

/* Verified Color Combinations */
.text-on-white { color: #0F172A; } /* 21:1 ratio */
.text-secondary-on-white { color: #475569; } /* 7.5:1 ratio */
.text-on-primary { color: #FFFFFF; } /* 4.8:1 ratio on blue */
.link-color { color: #1E40AF; } /* 5.9:1 ratio */
```

#### Keyboard Navigation
```tsx
const AccessibleButton = ({ children, onClick, ...props }) => (
  <button
    {...props}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    }}
    role="button"
    tabIndex={0}
  >
    {children}
  </button>
);

// Skip navigation link
const SkipNav = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded"
  >
    Skip to main content
  </a>
);
```

#### Screen Reader Support
```tsx
// ARIA labels and descriptions
const VideoCard = ({ video }) => (
  <div role="article" aria-labelledby={`video-${video.id}-title`}>
    <h3 id={`video-${video.id}-title`}>{video.title}</h3>
    <p aria-describedby={`video-${video.id}-stats`}>
      <span id={`video-${video.id}-stats`} className="sr-only">
        Video statistics: {video.views} views, {video.likes} likes
      </span>
      {video.views} views • {video.likes} likes
    </p>
    <button
      aria-label={`Edit video: ${video.title}`}
      onClick={() => editVideo(video.id)}
    >
      <EditIcon aria-hidden="true" />
    </button>
  </div>
);

// Live regions for dynamic content
const LiveStatus = ({ status }) => (
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    className="sr-only"
  >
    {status}
  </div>
);
```

### Focus Management
```tsx
// Focus trap for modals
const Modal = ({ isOpen, onClose, children }) => {
  const modalRef = useRef(null);
  
  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
    
    // Trap tab navigation within modal
    if (e.key === 'Tab') {
      trapFocus(e, modalRef.current);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      ref={modalRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
};
```

## Internationalization (Dutch/English)

### Language Support Structure
```tsx
// Language context
const LanguageContext = createContext({
  language: 'nl',
  setLanguage: (lang: 'nl' | 'en') => {},
  t: (key: string) => key
});

// Translation keys structure
const translations = {
  nl: {
    'dashboard.title': 'Dashboard',
    'content.generate.title': 'Nieuwe Video Genereren',
    'analytics.views': 'Weergaven',
    'video.status.processing': 'Bezig met genereren...',
    'button.generate': 'Genereren',
    'nav.dashboard': 'Dashboard',
    'nav.content': 'Content',
    'nav.analytics': 'Statistieken',
    'nav.schedule': 'Planning'
  },
  en: {
    'dashboard.title': 'Dashboard',
    'content.generate.title': 'Generate New Video',
    'analytics.views': 'Views',
    'video.status.processing': 'Generating...',
    'button.generate': 'Generate',
    'nav.dashboard': 'Dashboard',
    'nav.content': 'Content',
    'nav.analytics': 'Analytics',
    'nav.schedule': 'Schedule'
  }
};
```

### Regional Adaptations
```tsx
// Number and date formatting
const formatNumber = (num: number, locale: string = 'nl-NL') => {
  return new Intl.NumberFormat(locale).format(num);
};

const formatDate = (date: Date, locale: string = 'nl-NL') => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

// Currency formatting (Euro)
const formatCurrency = (amount: number, locale: string = 'nl-NL') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};
```

**[ ] TASK**: Create comprehensive component library with Storybook documentation
**[ ] TASK**: Implement design system tokens and CSS custom properties
**[ ] TASK**: Build responsive prototypes for all major user flows
**[ ] TASK**: Conduct accessibility audit and testing with screen readers
**[ ] TASK**: Design and implement dark mode theme variant