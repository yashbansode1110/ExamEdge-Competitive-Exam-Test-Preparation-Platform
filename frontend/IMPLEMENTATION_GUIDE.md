# ExamEdge Frontend Implementation Guide

## Quick Start

### 1. CSS Setup ✅
The main global styles are in `src/utils/styles.css`. This file includes:
- Tailwind base, components, and utilities layers
- Design system component classes (buttons, cards, badges, etc.)
- Exam-specific security CSS rules
- JEE and MHT-CET exam interface styling

### 2. Component Organization

#### UI Components (`components/ui/`)
These are reusable, generic UI components for the entire application:
- `Button.jsx` - Versatile button with variants
- `Card.jsx` - Card containers with header/body/footer
- `Badge.jsx` - Tag/label components
- `Alert.jsx` - Alert/notification messages
- `Modal.jsx` - Dialog/modal overlays
- `Navbar.jsx` - Top navigation bar
- `Sidebar.jsx` - Side navigation panel

#### Exam Components (`components/exam/`)
Components specific to exam interface functionality:
- `ExamInterfaceJEE.jsx` - Complete JEE exam interface
- `ExamInterfaceMHTCET.jsx` - Complete MHT-CET exam interface
- `QuestionCard.jsx` - Question display area
- `OptionButton.jsx` - Multiple choice option
- `QuestionPalette.jsx` - Question grid/palette (JEE)
- `QuestionPaletteButton.jsx` - Individual question button
- `ExamHeaderJEE.jsx` - JEE exam header with timer
- `ExamHeaderMHTCET.jsx` - MHT-CET exam header
- `ExamFooter.jsx` - Navigation footer

#### Dashboard Components (`components/dashboard/`)
Dashboard-specific components:
- `StatCard.jsx` - Statistics card with metrics
- `TestCard.jsx` - Test selection card

#### Page Components (`pages/`)
Full page layouts:
- `LoginPageStyled.jsx` - Modern login page
- `RegisterPageStyled.jsx` - Modern registration page
- `DashboardPageStyled.jsx` - Student dashboard
- `AnalyticsPageStyled.jsx` - Analytics dashboard
- `ResultsPage.jsx` - Exam results display

---

## Integration Steps

### Step 1: Update Main App Router

Replace or update `src/App.jsx` to include new styled pages:

```jsx
import React from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayoutStyled } from "./components/RootLayoutStyled.jsx";
import { LoginPageStyled } from "./pages/LoginPageStyled.jsx";
import { RegisterPageStyled } from "./pages/RegisterPageStyled.jsx";
import { DashboardPageStyled } from "./pages/DashboardPageStyled.jsx";
import { AnalyticsPageStyled } from "./pages/AnalyticsPageStyled.jsx";
import { ExamInterfaceJEE } from "./components/exam/ExamInterfaceJEE.jsx";
import { ExamInterfaceMHTCET } from "./components/exam/ExamInterfaceMHTCET.jsx";
import { ResultsPage } from "./pages/ResultsPage.jsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayoutStyled />,
    children: [
      { index: true, element: <DashboardPageStyled /> },
      { path: "login", element: <LoginPageStyled /> },
      { path: "register", element: <RegisterPageStyled /> },
      { path: "analytics", element: <AnalyticsPageStyled /> },
      { path: "results", element: <ResultsPage /> },
    ],
  },
  {
    path: "/exam/:testId",
    element: <ExamInterfaceJEE />, // Swap based on exam type
  },
]);
```

### Step 2: Create Styled Root Layout

Create `src/components/RootLayoutStyled.jsx`:

```jsx
import React, { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { apiFetch } from "../services/api.js";
import { clearSession, setSession } from "../store/authSlice.js";
import { Navbar } from "./ui/Navbar";

export function RootLayoutStyled() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const { user, accessToken } = useSelector((s) => s.auth);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await apiFetch("/auth/me", { token: accessToken });
        if (!cancelled) dispatch(setSession({ user: data.user }));
      } catch {
        if (!cancelled) dispatch(clearSession());
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadMe();
    return () => {
      cancelled = true;
    };
  }, [accessToken, dispatch]);

  const navLinks = [
    { href: "/", label: "Dashboard", active: location.pathname === "/" },
    { href: "/analytics", label: "Analytics", active: location.pathname === "/analytics" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-secondary-50">
      <Navbar
        logo="ExamEdge"
        user={user}
        onLogout={() => {
          dispatch(clearSession());
          nav("/login");
        }}
        links={navLinks}
      />

      <main className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4" />
              <p className="text-secondary-700">Loading...</p>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <footer className="border-t border-secondary-200 bg-white py-6 text-center text-sm text-secondary-600">
        <p>© 2024 ExamEdge. Master your exam preparation.</p>
      </footer>
    </div>
  );
}

export default RootLayoutStyled;
```

### Step 3: Import Global Styles

In `src/main.jsx`, ensure the styles are imported:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './utils/styles.css'  // Import before App
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { store } from './store/store'
import { router } from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>,
)
```

---

## Key CSS Classes Available

### Buttons
```html
<button class="btn btn-primary">Primary Button</button>
<button class="btn btn-secondary">Secondary Button</button>
<button class="btn btn-outline">Outline Button</button>
<button class="btn btn-ghost">Ghost Button</button>
<button class="btn btn-danger">Danger Button</button>
<button class="btn btn-success">Success Button</button>
<button class="btn btn-sm">Small Button</button>
<button class="btn btn-lg">Large Button</button>
```

### Cards
```html
<div class="card">
  <div class="card-header">Header</div>
  <div class="card-body">Body Content</div>
  <div class="card-footer">Footer</div>
</div>
```

### Badges
```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-error">Error</span>
<span class="badge badge-neutral">Neutral</span>
```

### Alerts
```html
<div class="alert alert-info">Info message</div>
<div class="alert alert-success">Success message</div>
<div class="alert alert-warning">Warning message</div>
<div class="alert alert-error">Error message</div>
```

### Text Utilities
```html
<p class="text-muted">Muted text</p>
<p class="text-light">Light text</p>
<p class="text-strong">Strong text</p>
<a class="link">Link</a>
<a class="link-muted">Muted link</a>
```

### Exam Interface Classes
```html
<!-- Exam Container -->
<div class="exam-container jee-exam">
  <div class="jee-header">...</div>
  <div class="jee-content">
    <div class="question-palette">...</div>
    <div class="question-area">...</div>
  </div>
  <div class="exam-footer">...</div>
</div>

<!-- Question Palette -->
<div class="palette-buttons">
  <button class="question-btn question-btn-answered">1</button>
  <button class="question-btn question-btn-not-answered">2</button>
  <button class="question-btn question-btn-marked-review">3</button>
  <button class="question-btn question-btn-not-visited">4</button>
</div>

<!-- Question Options -->
<label class="option-wrapper">
  <input class="option-input" type="radio" />
  <span class="option-label">Option Text</span>
</label>
<label class="option-wrapper selected">
  <input class="option-input" type="radio" checked />
  <span class="option-label">Selected Option</span>
</label>
```

---

## Component Usage Examples

### Using Button
```jsx
import { Button } from '@/components/ui/Button';

<Button 
  variant="primary" 
  size="lg" 
  onClick={handleClick}
  isLoading={isLoading}
  disabled={isDisabled}
>
  Click Me
</Button>
```

### Using Card
```jsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';

<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content goes here</CardBody>
  <CardFooter>Footer action</CardFooter>
</Card>
```

### Using Modal
```jsx
import { Modal } from '@/components/ui/Modal';

<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Confirm Action"
  submitLabel="Confirm"
  onSubmit={handleSubmit}
>
  Are you sure?
</Modal>
```

### Using Exam Question Card
```jsx
import { QuestionCard } from '@/components/exam/QuestionCard';
import { OptionButton } from '@/components/exam/OptionButton';

<QuestionCard
  questionNumber={5}
  totalQuestions={50}
  section="Physics"
  difficulty="Hard"
  questionText="What is the acceleration due to gravity?"
>
  <OptionButton
    id="a"
    label="9.8 m/s²"
    value="a"
    selected={selectedAnswer === 'a'}
    onChange={setSelectedAnswer}
  />
</QuestionCard>
```

### Using Dashboard Components
```jsx
import { StatCard } from '@/components/dashboard/StatCard';
import { TestCard } from '@/components/dashboard/TestCard';

<StatCard 
  title="Average Score" 
  value={85} 
  unit="%" 
  change="+5% this month"
  color="success"
  icon="📊"
/>

<TestCard
  testId="test-1"
  title="Full Length Test 1"
  examType="JEE Main"
  duration={180}
  totalQuestions={90}
  difficulty="Hard"
  status="available"
  onClick={() => navigate('/exam/test-1')}
/>
```

---

## Customization

### Modifying Colors
Edit `tailwind.config.js` under `theme.extend.colors`:

```js
colors: {
  primary: {
    600: '#2563EB',  // Change primary color
    // ... other shades
  }
}
```

### Modifying Spacing
Edit `tailwind.config.js` under `theme.extend.spacing`:

```js
spacing: {
  xs: '4px',
  sm: '8px',
  md: '12px',
  // ... add custom values
}
```

### Adding Custom Styles
Add to `styles.css` in `@layer components` block:

```css
@layer components {
  .my-custom-class {
    @apply bg-primary-100 text-primary-700 rounded-lg p-4;
  }
}
```

---

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Performance Tips

1. **Lazy load images** in question cards
2. **Virtualize** the question palette for large lists
3. **Memoize** expensive components with `React.memo()`
4. **Use `useCallback`** for event handlers
5. **Code split** exam pages using Suspense

---

## Troubleshooting

### Styles Not Applying
- Ensure `styles.css` is imported before app render
- Check Tailwind config for content paths
- Verify build includes `src/**/*.{js,jsx}`

### Component Not Showing
- Check React import statements
- Verify component export/import paths
- Check browser console for errors

### Exam Interface Issues
- Ensure security CSS rules don't conflict with other styles
- Test in different browsers
- Check for z-index conflicts with overlays

---

## Next Steps

1. Replace existing pages with styled versions
2. Update exam interface based on actual data structure
3. Connect components to backend APIs
4. Add navigation between pages
5. Test all responsive breakpoints
6. Implement analytics charts with Chart.js

---

## Support

For questions about the design system, refer to `DESIGN_SYSTEM.md`.
