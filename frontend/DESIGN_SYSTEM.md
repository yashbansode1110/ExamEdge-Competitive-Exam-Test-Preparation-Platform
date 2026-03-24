# ExamEdge Design System Documentation

## Overview

ExamEdge uses a modern, clean, and exam-focused design system built with **Tailwind CSS** and **React**. The design prioritizes clarity, speed, and accessibility during exams while maintaining a professional appearance across all interfaces.

---

## Color Palette

### Primary Colors
- **Primary Blue**: `#2563EB` - Main brand color for CTAs and highlights
- **Success Green**: `#16A34A` - Positive actions and correct answers
- **Warning Orange**: `#F59E0B` - Caution states and pending actions
- **Error Red**: `#DC2626` - Errors and incorrect answers
- **Secondary Gray**: `#F3F4F6` - Neutral backgrounds and borders

### Exam Question Status Colors
- **Not Visited**: `#9CA3AF` (Gray)
- **Answered**: `#16A34A` (Green)
- **Not Answered**: `#DC2626` (Red)
- **Marked for Review**: `#9333EA` (Purple)

### Color Usage in Tailwind Config
```js
colors: {
  primary: { /* Blue shades */ },
  secondary: { /* Gray shades */ },
  success: { /* Green shades */ },
  warning: { /* Orange shades */ },
  error: { /* Red shades */ },
  exam: {
    notVisited: '#9CA3AF',
    answered: '#16A34A',
    notAnswered: '#DC2626',
    markedReview: '#9333EA',
  }
}
```

---

## Typography

### Font Family
- **Sans-serif**: Inter, system-ui (body and UI text)
- **Monospace**: Fira Code (code snippets, technical content)

### Font Sizes (Tailwind-based)
- `h1`: 30px, 700 weight (bold) - Page titles
- `h2`: 24px, 700 weight - Section headers
- `h3`: 20px, 600 weight - Subsection titles
- `h4`: 18px, 600 weight - Card titles
- `body`: 16px, 400 weight - Regular text
- `small`: 14px, 400 weight - Secondary text
- `xs`: 12px - Captions and labels

### Line Heights
- Headings: 1.2x
- Body text: 1.5x
- Compact text: 1.25x

---

## Spacing System

Consistent 4px-based spacing scale:

```
xs: 4px    (0.25rem)
sm: 8px    (0.5rem)
md: 12px   (0.75rem)
lg: 16px   (1rem)
xl: 24px   (1.5rem)
2xl: 32px  (2rem)
3xl: 48px  (3rem)
```

### Common Spacing Patterns
- **Button padding**: `px-4 py-2` (16px horizontal, 8px vertical)
- **Card padding**: `p-5` or `px-5 py-4`
- **Section margins**: `mb-8` or `gap-6`
- **Content margins**: `md: 16px` (between sections)

---

## Component Library

### 1. **Button Component**

```jsx
<Button
  variant="primary"     // primary | secondary | outline | ghost | danger | success
  size="md"            // sm | md | lg
  isLoading={false}
  disabled={false}
  onClick={handler}
>
  Click me
</Button>
```

**Variants:**
- `primary`: Blue background, white text
- `secondary`: Gray background, dark text
- `outline`: Blue border, blue text
- `ghost`: Transparent with hover effect
- `danger`: Red background, white text
- `success`: Green background, white text

### 2. **Card Component**

```jsx
<Card className="optional-classes">
  <CardHeader>Header content</CardHeader>
  <CardBody>Main content</CardBody>
  <CardFooter>Footer content</CardFooter>
</Card>
```

### 3. **Badge Component**

```jsx
<Badge variant="success">
  Label text
</Badge>
```

**Variants**: primary | success | warning | error | neutral

### 4. **Alert Component**

```jsx
<Alert
  variant="warning"
  title="Alert Title"
  dismissible={true}
  onDismiss={handleDismiss}
>
  Alert message content
</Alert>
```

### 5. **Modal Component**

```jsx
<Modal
  isOpen={true}
  onClose={handleClose}
  title="Modal Title"
  submitLabel="Save"
  closeLabel="Cancel"
  onSubmit={handleSubmit}
>
  Modal content
</Modal>
```

### 6. **Navbar Component**

```jsx
<Navbar
  logo="ExamEdge"
  user={{ name: "John", role: "student" }}
  onLogout={handleLogout}
  links={[
    { href: '/analytics', label: 'Analytics', active: true }
  ]}
/>
```

### 7. **Sidebar Component**

```jsx
<Sidebar
  items={[
    { section: 'Navigation', label: 'Dashboard', href: '/', active: true },
    { label: 'Analytics', href: '/analytics' }
  ]}
  isOpen={true}
  onClose={handleClose}
/>
```

---

## Exam Interface Components

### JEE Exam Interface

**Layout Structure:**
```
┌─ Header ─────────────────────────────────────┐
│ Logo | Info | Time | Submit                  │
├─ Content ────────────────────────────────────┤
│ ┌─ Palette ─┬─ Question Area ────────────┐   │
│ │  Q1  Q2   │ Question Text               │   │
│ │  Q3  Q4   │ [Image if needed]           │   │
│ │  ...      │ ○ Option A                  │   │
│ │  Legend   │ ○ Option B                  │   │
│ │           │ ○ Option C                  │   │
│ │           │ ○ Option D                  │   │
│ └─────────┴─────────────────────────────────┘   │
├─ Footer ─────────────────────────────────────┤
│ Q X/90      Prev | Mark | Next                │
└───────────────────────────────────────────────┘
```

**Key Components:**
- `ExamHeaderJEE`: Timer and exam metadata
- `QuestionPalette`: Left panel with question grid
- `QuestionCard`: Central question display
- `OptionButton`: Radio button styled options
- `ExamFooter`: Navigation controls
- `QuestionPaletteButton`: Individual question buttons

### MHT-CET Exam Interface

**Layout Structure:**
```
┌─ Header ─────────────────────────────┐
│ Title          Time  | End Exam      │
├─ Content ────────────────────────────┤
│     ┌─ Question Card ───────────┐    │
│     │ Q X / Total               │    │
│     │                           │    │
│     │ Question text here...     │    │
│     │ ○ Option A                │    │
│     │ ○ Option B                │    │
│     │ ○ Option C                │    │
│     │ ○ Option D                │    │
│     └───────────────────────────┘    │
├─ Footer ─────────────────────────────┤
│ Prev | Next       Q X / Total        │
└───────────────────────────────────────┘
```

---

## Exam Security CSS

Security features applied to prevent cheating:

```css
/* Disable text selection */
.exam-container {
  user-select: none;
  -webkit-user-select: none;
}

/* Disable drag operations */
.exam-question {
  -webkit-user-drag: none;
}

/* Disable copy-paste */
.exam-question {
  -webkit-user-modify: read-only;
}

/* Control pointer events */
.exam-option button {
  pointer-events: auto;
}
```

---

## Page Layouts

### 1. Dashboard
- **Hero section** with welcome message and quick stats
- **Statistics grid** (4 columns on desktop, responsive)
- **Tests grid** with cards
- **Quick links** section

### 2. Login/Register
- **Centered card layout**
- **Gradient background** (primary to secondary)
- **Form with proper spacing**
- **Footer with navigation**

### 3. Analytics
- **Header with filters**
- **Statistics cards grid**
- **Performance charts and heatmaps**
- **Topic-wise breakdowns**
- **Time analysis section**

### 4. Results Page
- **Score card** (centered, prominent)
- **Section-wise performance** with progress bars
- **Insights cards** (top/weak topics)
- **Action buttons** (dashboard, retake, etc.)

---

## Responsive Design

### Breakpoints
- **xs**: 320px - Extra small phones
- **sm**: 640px - Small phones
- **md**: 768px - Tablets
- **lg**: 1024px - Desktops
- **xl**: 1280px - Large desktops
- **2xl**: 1536px - Very large screens

### Grid Patterns
```
1 column: xs-sm
2 columns: md and up
3 columns: lg and up
4 columns: xl and up
```

### Exam Interface (Mobile)
- **Stack layout** on tablets and below
- **Palette becomes compact** or collapsible
- **Landscape mode** recommended for exams
- **Full-screen** experience prioritized

---

## Accessibility

### Color Contrast
- All text meets WCAG AA standards (4.5:1 ratio)
- Semantic HTML elements used throughout
- Proper `aria-labels` on interactive elements

### Focus States
```css
button:focus-visible {
  outline: none;
  ring: 2px;
  ring-offset: 2px;
}
```

### Keyboard Navigation
- All interactive elements reachable via Tab
- Modal dialogs trap focus
- Escape key closes modals

---

## Performance Considerations

### Lazy Loading
- Question palette uses virtualization
- Images lazy-loaded in questions
- Charts rendered on demand

### CSS Optimization
- Utility-first approach reduces file size
- Tailwind purges unused classes in production
- Minimal custom CSS

### Component Optimization
- React.memo for exam components
- useCallback for event handlers
- Controlled re-renders on state changes

---

## Usage Examples

### Creating a Test Page
```jsx
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { StatCard } from '../components/dashboard/StatCard';

export function MyPage() {
  return (
    <div className="container-centered py-8">
      <div className="stats-grid">
        <StatCard title="Score" value={85} unit="%" />
      </div>
      
      <Card>
        <CardBody>
          <Button variant="primary">Submit</Button>
        </CardBody>
      </Card>
    </div>
  );
}
```

### Custom Styling with Tailwind
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <Card
      key={item.id}
      className="hover-card cursor-pointer transition-all"
    >
      {/* Card content */}
    </Card>
  ))}
</div>
```

---

## File Structure

```
frontend/src/
├── components/
│   ├── ui/           # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Badge.jsx
│   │   ├── Alert.jsx
│   │   ├── Modal.jsx
│   │   ├── Navbar.jsx
│   │   └── Sidebar.jsx
│   ├── exam/         # Exam-specific components
│   │   ├── ExamInterfaceJEE.jsx
│   │   ├── ExamInterfaceMHTCET.jsx
│   │   ├── QuestionPalette.jsx
│   │   ├── QuestionCard.jsx
│   │   ├── OptionButton.jsx
│   │   ├── ExamFooter.jsx
│   │   └── ExamHeaderJEE.jsx
│   └── dashboard/    # Dashboard components
│       ├── StatCard.jsx
│       └── TestCard.jsx
├── pages/            # Page layouts
│   ├── LoginPageStyled.jsx
│   ├── RegisterPageStyled.jsx
│   ├── DashboardPageStyled.jsx
│   ├── AnalyticsPageStyled.jsx
│   └── ResultsPage.jsx
└── utils/
    └── styles.css    # Global styles and CSS layers
```

---

## Best Practices

1. **Use semantic HTML** - Always use proper heading levels and semantic elements
2. **Consistent spacing** - Use the spacing scale (xs, sm, md, lg, etc.)
3. **Component reusability** - Break down complex UI into smaller components
4. **Mobile-first** - Design for mobile, then enhance for larger screens
5. **Accessibility first** - Include proper labels, ARIA attributes, and keyboard support
6. **Performance** - Lazy load images, virtualize lists, minimize re-renders
7. **Consistency** - Follow the established patterns and colors throughout

---

## Tailwind Configuration Reference

See `tailwind.config.js` for:
- Custom color palette
- Extended spacing system
- Custom animations
- Font configurations
- Shadow definitions
- Border radius values

All CSS layers and utilities defined in `src/utils/styles.css`
