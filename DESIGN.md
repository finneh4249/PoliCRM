---
name: PoliCRM
description: A bold, campaign-ready political operations console for Australian political parties.
colors:
  primary: "#3553eb"
  neutral-bg: "#f8fafc"
  neutral-text: "#0f172a"
  success: "#10b981"
  warning: "#f59e0b"
  destructive: "#ef4444"
  border: "#e2e8f0"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "#2563eb"
  input-base:
    backgroundColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: PoliCRM

## 1. Overview

**Creative North Star: "The Political Operations Console"**

PoliCRM is a high-performance political tool that balances the urgency of campaign operations with the absolute trust required for voter compliance. Rather than looking like a generic SaaS or administrative tool, it evokes the vibe of a modern agency operations center. The interface utilizes a high-contrast palette, vibrant state indicators, and a clean, high-density dashboard that prioritizes speed and clarity above all else.

This system rejects flat, un-tinted gray tones, cluttered SaaS-slop dashboards, and overly playful animations. It focuses on crisp, micro-interactions, responsive grid structures, and clear typographic hierarchy.

**Key Characteristics:**
- High-contrast typography and clear visual hierarchy.
- Highly visible, color-rich status badges for fast member sorting.
- Tinted neutrals that evoke a premium, solid brand identity.
- Minimalistic yet purposeful animations (150ms-250ms transitions).

## 2. Colors

PoliCRM employs a Committed color strategy. A single saturated political blue drives primary interactions, while high-contrast status colors are reserved specifically for data validation metrics (Pass, Partial, Fail, Captcha).

### Primary
- **Operations Blue** (#3553eb / oklch(52% 0.22 260)): The primary accent color for active navigation states, primary buttons, and critical operations.

### Neutral
- **Tinted Canvas** (#f8fafc / oklch(98.5% 0.006 240)): Main dashboard background, tinted slightly cool.
- **Console Navy** (#0f172a / oklch(19% 0.03 260)): Text color and dark header components.
- **Muted Slate** (#64748b / oklch(54% 0.02 250)): Used for secondary text, labels, and helper notes.
- **Console Border** (#e2e8f0 / oklch(93% 0.01 250)): High-frequency layout dividers and element outlines.

### Semantic States
- **Pass Status** (#10b981 / oklch(62% 0.17 145)): Indicating a successful AEC check.
- **Partial Status** (#f59e0b / oklch(75% 0.15 70)): Indicating partial postcode/address matches.
- **Fail Status** (#ef4444 / oklch(58% 0.22 25)): Indicating validation failures.

**The Tinted Neutral Rule.** Pure grays, pure white (#ffffff), and pure black (#000000) are forbidden. All neutral shades must carry a subtle cool/navy undertone (chroma 0.005–0.03) to ensure branding cohesion across the entire surface.

**The Accent Discipline Rule.** Saturated operations blue is restricted to active controls, buttons, and state indicator highlights. No decorative colored accents, side-stripes, or gradient overlays are allowed on container elements.

## 3. Typography

**Display Font:** Plus Jakarta Sans
**Body Font:** Inter

The display font provides structural headers with a punchy, geometric weight, while the body font ensures data-rich components remain legible at small sizes.

### Hierarchy
- **Display** (800, 2.5rem (40px), 1.2): Primary page headers and main login titles.
- **Headline** (700, 1.75rem (28px), 1.3): Major page subsections.
- **Title** (600, 1.25rem (20px), 1.4): Card headings and modal headers.
- **Body** (400, 0.875rem (14px), 1.5): Standard prose, forms, and table cell content. Max line length is 75ch.
- **Label** (500, 0.75rem (12px), 1.4, tracking-wider, uppercase): Column headers, badges, and helper labels.

**The Numeric Hierarchy Rule.** Display scales do not scale dynamically based on viewport width. Headings use fixed sizes to avoid breaking grid structures on smaller screens, falling back to clean wraps.

## 4. Elevation

PoliCRM is flat-by-default. It relies on crisp border transitions and light/dark surface layering to indicate depth, avoiding muddy shadows and slop.

### Shadow Vocabulary
- **Control Lift** (`box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05)`): Subtle ambient shadow applied only on hover to interactive cards or primary buttons.

**The Border-First Rule.** Depth is established first by contrasting backgrounds (`#f8fafc` canvas against `#ffffff` cards) and borders (`1px solid #e2e8f0`). Shadows are never decorative and are only active on hover.

## 5. Components

Every interactive element responds to hover, focus, active, and disabled states.

### Buttons
- **Shape:** Gently rounded corners (10px border-radius).
- **Primary:** Background Operations Blue (`#3553eb`), Text White (`#ffffff`), 10px 18px padding.
- **Hover / Focus:** Shift to `#2563eb` with a double-ring focus outline (`#3553eb` outline).

### Chips / Badges
- **Style:** Compact with a subtle background tint of their respective status and dark text.
- **Verification States:**
  - *Pass:* Green tint with a checkmark icon.
  - *Partial:* Orange tint with an alert icon.
  - *Fail:* Red tint with a cross icon.

### Cards / Containers
- **Corner Style:** Rounded (16px border-radius).
- **Background:** White (`#ffffff`).
- **Border:** `1px solid #e2e8f0`.
- **Internal Padding:** Spaced spacing (24px padding).

### Inputs / Fields
- **Style:** White background (`#ffffff`), `1px solid #e2e8f0` border, 10px 14px padding.
- **Focus:** Border transitions to Operations Blue (`#3553eb`) with a quiet glow.

### Navigation (Sidebar)
- **Style:** Dark solid Console Navy (`#0f172a`) backdrop with semi-transparent active states (`rgba(255,255,255,0.08)`). Employs Lucide icons instead of generic emojis for a clean, pro look.

## 6. Do's and Don'ts

### Do:
- **Do** tint all neutral surfaces with a cool navy blue undertone.
- **Do** support keyboard focus states on all form controls and table rows.
- **Do** keep spacing tight and data density high (no loose empty spaces in members table).
- **Do** use distinct status icons alongside color indicators for accessibility.

### Don't:
- **Don't** use pure `#000` or `#fff` for text or card fills.
- **Don't** use side-stripe borders as indicators on list items or cards.
- **Don't** use text gradients or decorative blurs.
- **Don't** mix emoji symbols with professional typography inside core navigation.
