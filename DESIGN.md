---
version: alpha
colors:
  background: "#f3f1ec"
  surface: "#fffefa"
  ink: "#292c2b"
  graphite: "#272b2a"
  border: "#dedbd3"
  primary: "#815139"
  action: "#815139"
  focus: "#a14b2f"
typography:
  display:
    fontFamily: "Sora, Segoe UI, sans-serif"
  body:
    fontFamily: "Inter, Segoe UI, sans-serif"
  data:
    fontFamily: "JetBrains Mono, Cascadia Mono, monospace"
rounded:
  panel: "3px"
  control: "7px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "28px"
---

# Capri Gestiona design context

## Overview

The authenticated product is an industrial management desk for Capricórnio Têxtil: useful in a results meeting and in daily indicator review. Its signature is a graphite navigation rail beside a warm, ruled work surface. The supplied institutional logo at `public/capricornio-logo.png` retains its original pixels, square proportions and blue; the 80-year campaign art is not a product logo.

This first vertical slice covers the authenticated shell and the initial dashboard. Other routes still have legacy component treatments and should migrate through shared primitives as they are touched. Never use decorative indigo/blue gradients, glow, glass panels, excessive cards or invented metrics.

## Colors

`src/app/globals.css` is the runtime source of truth (Model B). The frontmatter records visual intent; CSS variables carry the values consumed by components. The light mapping is `background → --color-bg`, `surface → --color-surface`, `ink → --color-ink-900`, `graphite → --color-shell`, `border → --color-border`, `action → --color-brand-600`, and `focus → --color-focus`. Dark mode maps the same semantic variables to graphite surfaces and readable warm text; it does not invert fixed brand artwork.

`--color-brand-*` names the product interaction family for compatibility with existing routes, not the institutional blue. The blue in the logo is preserved. Quattrus domain blue remains valid when it denotes a functional status. Green, amber, red and critical tones retain status meaning and always accompany text or values. Chart series are neutral and copper rather than decorative blue.

## Typography

Sora sets restrained headings, Inter carries controls and reading text, and JetBrains Mono aligns scores and measured values. The dashboard uses one large score figure, with uppercase small labels reserved for true section or metric headings. Body text stays readable at compact density.

## Layout

Desktop uses a 248px navigation rail, a 68px header and a document work area. Mobile replaces the rail with a modal navigation drawer and keeps the same route and permission set. The dashboard begins with a ruled page heading, then places cycle score and distribution before pending FCA and monthly comparison. Narrow screens use one column; content keeps natural document scrolling inside the application main region.

## Elevation & Depth

The shell and dashboard use borders and surface contrast for hierarchy. Dashboard panels are flat with a 3px radius; status rails and one short copper rule identify the score and attention states. Avoid hover lift and stacked floating shadows on these surfaces.

## Shapes

Panels are nearly square; controls retain a small radius for comfortable hit targets. The institutional logo remains a square image with its built-in breathing room. Rounded status dots keep their established Quattrus meaning.

## Components

The shared `Sidebar`, `Header` and `MobileSidebarToggle` own shell navigation. `DashboardCharts` and `StatusMeter` own summary graphics and keep textual equivalents. `--color-scrollbar-*` applies to every application scroll surface. Focus uses `--color-focus`; reduced motion removes decorative transitions. Density and light/dark preferences retain their current behavior.

## Do's and Don'ts

- Keep tools near the data they act on and preserve server-owned permissions, routes, and actions.
- Use status labels and values alongside color.
- Keep the logo intact and reserve blue decoration for verified domain meaning.
- Do not add marketing copy, gratuitous animation, gradient heroes or repeated icon cards to operational views.
