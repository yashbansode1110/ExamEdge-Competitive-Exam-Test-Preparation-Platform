# ExamEdge Color Palette & Quick Reference

## Primary Color Palette

### Blue (Primary Brand Color)
```
Primary-50:   #EFF6FF
Primary-100:  #DBEAFE
Primary-200:  #BFDBFE
Primary-300:  #93C5FD
Primary-400:  #60A5FA
Primary-500:  #3B82F6
Primary-600:  #2563EB   ⭐ MAIN
Primary-700:  #1D4ED8
Primary-800:  #1E40AF
Primary-900:  #1E3A8A
```

### Gray (Secondary/Neutral)
```
Secondary-50:   #FAFBFC
Secondary-100:  #F3F4F6   ⭐ LIGHT BG
Secondary-200:  #E5E7EB   ← Borders
Secondary-300:  #D1D5DB
Secondary-400:  #9CA3AF
Secondary-500:  #6B7280
Secondary-600:  #4B5563
Secondary-700:  #374151   ⭐ DARK TEXT
Secondary-800:  #1F2937
Secondary-900:  #111827   ← DARK TEXT
```

### Green (Success)
```
Success-50:   #F0FDF4
Success-100:  #DCFCE7
Success-200:  #BBFBEE
Success-500:  #16A34A   ⭐ MAIN
Success-600:  #16A34A
Success-700:  #15803D
```

### Orange (Warning)
```
Warning-50:   #FFFBEB
Warning-100:  #FEF3C7
Warning-500:  #F59E0B   ⭐ MAIN
Warning-600:  #D97706
Warning-700:  #B45309
```

### Red (Error)
```
Error-50:   #FEF2F2
Error-100:  #FEE2E2
Error-500:  #DC2626   ⭐ MAIN
Error-600:  #DC2626
Error-700:  #B91C1C
```

## Exam Status Colors

```
Not Visited     → Gray     #9CA3AF
Answered        → Green    #16A34A   ✓
Not Answered    → Red      #DC2626   ✗
Marked Review   → Purple   #9333EA   ⚡
```

## Semantic Color Usage

### Standard Usage
- **Primary (Blue #2563EB)**: CTAs, highlights, active states
- **Success (Green #16A34A)**: Correct answers, positive actions
- **Warning (Orange #F59E0B)**: Caution, pending states, low time
- **Error (Red #DC2626)**: Wrong answers, failures, critical time
- **Secondary (Gray)**: Backgrounds, text, borders, disabled states

### Component-Specific
- **Buttons**: Primary → use primary-600, Secondary → use secondary-200
- **Cards**: Background → secondary-50, Border → secondary-200
- **Text**: Strong → secondary-900, Muted → secondary-600, Light → secondary-400
- **Alerts**: Each alert type uses its respective color

## Tailwind CSS Class Names

### Using Colors in Classes

```jsx
// Background colors
<div className="bg-primary-600">Blue background</div>
<div className="bg-secondary-100">Light gray background</div>
<div className="bg-success-500">Green background</div>
<div className="bg-warning-500">Orange background</div>
<div className="bg-error-500">Red background</div>

// Text colors
<p className="text-primary-700">Blue text</p>
<p className="text-secondary-900">Dark gray text</p>
<p className="text-success-700">Green text</p>
<p className="text-warning-700">Orange text</p>
<p className="text-error-700">Red text</p>

// Border colors
<div className="border-2 border-primary-300">Blue border</div>
<div className="border-2 border-secondary-200">Gray border</div>
<div className="border-2 border-error-500">Red border</div>

// Hover states
<button className="bg-primary-600 hover:bg-primary-700">
  Hover changes to darker blue
</button>

// Exam question palette
<button className="bg-success-100 text-success-700">Answered</button>
<button className="bg-error-100 text-error-700">Not Answered</button>
<button className="bg-purple-100 text-purple-700">Marked Review</button>
<button className="bg-secondary-100 text-secondary-700">Not Visited</button>
```

## Component Color Variants

### Button Variants
- `primary`: Primary-600 background, white text
- `secondary`: Secondary-200 background, secondary-900 text
- `outline`: Transparent with Primary-600 border and text
- `ghost`: Transparent, Primary-600 text on hover
- `success`: Success-600 background, white text
- `danger`: Error-600 background, white text

### Badge Variants
- `primary`: Primary-100 background, Primary-700 text
- `success`: Success-100 background, Success-700 text
- `warning`: Warning-100 background, Warning-700 text
- `error`: Error-100 background, Error-700 text
- `neutral`: Secondary-100 background, Secondary-700 text

### Alert Variants
- `info`: Primary-50 background, Primary-200 border, Primary-700 text
- `success`: Success-50 background, Success-200 border, Success-700 text
- `warning`: Warning-50 background, Warning-200 border, Warning-700 text
- `error`: Error-50 background, Error-200 border, Error-700 text

## Accessibility Color Contrast

### WCAG AA Compliant (4.5:1 minimum)
✅ Dark text (Secondary-900) on all light backgrounds
✅ White text on all dark backgrounds (Primary-600, Error-600, Success-600)
✅ Primary-700 text on Secondary-100 background
✅ All status indicator combinations

## Dark Mode Preparation

The color palette is designed for light mode. For dark mode, follow this mapping:
```
Light Background → Dark Background
Secondary-50 → Secondary-900
Secondary-100 → Secondary-800
Secondary-200 → Secondary-700
Primary-600 → Primary-400
```

## Copy-Paste Ready Colors

### Hex Values (for external tools)
```
Primary Blue:       #2563EB
Secondary Gray:     #F3F4F6
Success Green:      #16A34A
Warning Orange:     #F59E0B
Error Red:          #DC2626

Exam Palette:
- Not Visited:      #9CA3AF
- Answered:         #16A34A
- Not Answered:     #DC2626
- Marked Review:    #9333EA
```

### RGB Values
```
Primary Blue:       rgb(37, 99, 235)
Secondary Gray:     rgb(243, 244, 246)
Success Green:      rgb(22, 163, 74)
Warning Orange:     rgb(245, 158, 11)
Error Red:          rgb(220, 38, 38)
```

## Design Rules

1. **Never** use pure black (#000000) or pure white (#FFFFFF)
2. **Always** use secondary-900 for dark text and white for light text
3. **Maintain** 4.5:1 contrast ratio for accessibility
4. **Use** primary-600 as main contrast color
5. **Apply** consistent spacing around colored elements
6. **Test** color combinations for colorblind users

## Quick Reference Table

| Component | Variant | Background | Text | Border |
|-----------|---------|-----------|------|--------|
| Button | Primary | Primary-600 | White | - |
| Button | Secondary | Secondary-200 | Secondary-900 | - |
| Button | Danger | Error-600 | White | - |
| Button | Success | Success-600 | White | - |
| Card | Default | White | Secondary-900 | Secondary-200 |
| Card | Hover | White | Secondary-900 | Primary-200 |
| Badge | Primary | Primary-100 | Primary-700 | - |
| Badge | Success | Success-100 | Success-700 | - |
| Alert | Info | Primary-50 | Primary-700 | Primary-200 |
| Alert | Success | Success-50 | Success-700 | Success-200 |
| Alert | Warning | Warning-50 | Warning-700 | Warning-200 |
| Alert | Error | Error-50 | Error-700 | Error-200 |

## Usage Examples

### Login/Register Pages
```
Background: Secondary-50
Card: White with Secondary-200 border
Button: Primary-600
Links: Primary-600
```

### Dashboard
```
Header: White with Secondary-200 border
Stat Cards: White with hover shadow
Stats: Mix of Primary-600, Success-500, Warning-500
Card Text: Secondary-900
Muted Text: Secondary-600
```

### Exam Interface
```
Header: White
Timer (Normal): Secondary-900
Timer (Warning): Warning-600
Timer (Critical): Error-600 with animation
Question Palette:
  - Not Visited: Secondary-100 / Secondary-700
  - Answered: Success-100 / Success-700
  - Not Answered: Error-100 / Error-700
  - Marked: Purple-100 / Purple-700
```

### Analytics
```
Charts: Primary, Success, Warning, Error (varied)
Trends: Success-500 (improving) / Error-500 (declining)
Performance Bars: Success/Warning/Error based on percentage
```

---

**Print-friendly Reference** - Use for design handoffs and development discussions
