# Design Guidelines for Help152FZ.ru

## Design Approach

**System Selected**: Clean, minimalistic design system emphasizing trust, clarity, and efficiency - critical for a legal compliance platform.

**Key Principles**:
- Professional credibility through restrained visual design
- Immediate clarity in status indicators and results
- Efficient information hierarchy for dense compliance data
- Trustworthy, authoritative presentation

---

## Typography System

**Font Stack**: 
- Primary: Inter or similar system font via Google Fonts CDN
- Headings: 600-700 weight
- Body: 400-500 weight

**Hierarchy**:
- Hero Headlines: text-5xl md:text-6xl font-bold
- Section Headers: text-3xl md:text-4xl font-semibold
- Subsections: text-xl md:text-2xl font-semibold
- Body Text: text-base md:text-lg
- Small Text/Captions: text-sm
- Legal/Fine Print: text-xs

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 4, 6, 8, 12, 16, 20, 24 consistently
- Section padding: py-16 md:py-24
- Container max-width: max-w-7xl mx-auto px-6 md:px-8
- Card/Component spacing: p-6 md:p-8
- Element gaps: gap-4, gap-6, gap-8

**Grid Structure**:
- Feature grids: grid-cols-1 md:grid-cols-3
- Package pricing: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Audit results: Single column for clarity, max-w-4xl

---

## Component Library

### Navigation
- Sticky header with subtle shadow on scroll
- Logo left, navigation center, CTA button right
- Mobile: Hamburger menu
- Height: h-16 md:h-20

### Hero Section
- Clean, focused design without background image
- Centered layout with max-w-4xl
- Prominent headline + concise subheadline
- Embedded audit form immediately visible
- Height: Natural flow, not forced viewport

### Audit Check Form (Critical Component)
- Clean card design with rounded-lg border
- Input fields with clear labels above
- Large, prominent "Start Check" button
- Required checkbox with clear privacy policy link
- Dropdown selector styled consistently
- Spacing: p-8, gap-6 between elements

### Progress Indicator
- Horizontal progress bar with percentage
- Current step text below bar
- Estimated time remaining
- Mini status messages for each criterion being checked
- Use container with max-w-2xl mx-auto

### Results Display (Critical)
- **Status Indicators**: Large, clear icons (✓ ✗ ⚠) 
- Three-tier visual system for compliance levels
- Table format: Criterion name | Status | Brief note
- Overall score: Large number with progress ring
- Card-based layout for each criterion
- Clear separation between free preview and paid upsell

### Pricing Cards
- Grid layout with elevation on hover
- Card structure: Package name, price (prominent), feature list, CTA button
- Recommended package: Subtle border highlight
- Consistent spacing: p-6, gap-4

### FAQ Section
- Accordion/spoiler pattern
- Question in semibold, answer revealed on click
- Subtle border between items
- Spacing: py-4 between items

### Forms (Contact, Payment)
- Stacked layout for clarity
- Input groups: Label + Input + Helper text/error
- Wide inputs (w-full) with comfortable height (h-12)
- Button placement: Right-aligned or full-width on mobile
- Error states: Red border + error message below

### Admin Dashboard
- Sidebar navigation (w-64) with main content area
- Data tables: Striped rows, sortable headers
- Metrics cards: Grid layout with icon + number + label
- CRUD forms: Modal overlays or dedicated pages

### Footer
- **Critical Legal Requirements**: Must be comprehensive
- Multi-column layout (grid-cols-1 md:grid-cols-4)
- Sections: Company info, Legal docs, Payment info, Contact
- Dense information presentation acceptable here
- Payment icons row
- Legal text: text-xs with adequate line-height

---

## Images

**Hero Section**: No large hero image - focus on immediate form accessibility

**Trust Indicators**: 
- Payment provider logos (YooKassa, payment methods) in footer
- SSL/security badges near forms if needed
- Small illustrative icons for each audit criterion

**Package Cards**: Optional small icons representing each package type

**About/Team Section**: Professional photos if team is shown

---

## Animations

Use minimally:
- Progress bar fill animation (smooth, 300ms)
- Accordion expand/collapse (200ms ease)
- Form validation feedback (quick shake or highlight)
- NO scroll-triggered animations
- NO complex hero animations

---

## Page-Specific Layouts

### Landing Page
1. Hero with embedded form (no image, focus on functionality)
2. Criteria explanation (3-column grid of cards)
3. Pricing packages (grid layout)
4. FAQ (single column, max-w-4xl)
5. Contact/Footer (multi-column)

### Results Page
- Clean, focused single-column layout
- Score at top (large, prominent)
- Results table/cards below
- Clear CTA for paid report
- Secondary CTA for package selection

### Post-Payment Form Page
- Centered form (max-w-2xl)
- Progress indicator showing current step
- Clear instructions
- Submit button prominent

### Admin Panel
- Traditional dashboard layout
- Left sidebar navigation
- Main content area with breadcrumbs
- Data-dense tables and forms
- Action buttons clearly visible

---

## Accessibility

- Form labels always visible
- High contrast for status indicators
- Focus states on all interactive elements
- Skip navigation link
- ARIA labels for icon-only buttons
- Keyboard navigation throughout