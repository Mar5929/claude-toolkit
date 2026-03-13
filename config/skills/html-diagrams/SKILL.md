---
name: html-diagrams
description: Create interactive HTML diagrams using D3.js with a dark-theme design system. Produces single self-contained HTML files with force-directed graphs, swimlane flowcharts, or circular ring diagrams. Features include zoom/pan, tooltips, click-to-inspect sidebars, animated edges, and category legends. Use when the user asks for an interactive diagram, HTML visualization, D3 diagram, force graph, network diagram, system architecture visualization, workflow diagram, cycle diagram, or any interactive visual that should open in a browser. Also trigger for "interactive diagram", "HTML diagram", "D3 visualization", or "dark theme diagram". Do NOT use for draw.io, Excalidraw, Mermaid, or static image diagrams.
allowed-tools: Bash, Write, Read
---

# Interactive HTML Diagram Skill

Create beautiful, interactive HTML diagrams using D3.js with a consistent dark-theme design system. Each diagram is a single self-contained `.html` file that opens directly in a browser.

## Workflow

1. **Understand the data** — What entities/steps exist? What are the relationships? What categories/groups do they belong to?
2. **Choose diagram type** — See the quick reference below, or read `references/diagram-types.md` for detailed guidance
3. **Read the template** — Read the appropriate template from `references/templates/`
4. **Adapt the template** — Replace the `DATA SECTION` with the user's actual data. Update `DIAGRAM_TITLE` and `DIAGRAM_SUBTITLE`
5. **Customize categories** — Map the user's domain concepts to category colors (see below)
6. **Write the HTML file** — Use the Write tool to create the file
7. **Open in browser** — Run `start <file>` (Windows), `open <file>` (macOS), or `xdg-open <file>` (Linux)

## Diagram Type Quick Reference

| Use Case | Diagram Type | Template |
|----------|-------------|----------|
| System architecture, dependencies, hub-and-spoke, network topology | **Force Graph** | `references/templates/force-graph-template.html` |
| Sequential workflow, pipeline, phased process with swim lanes | **Swimlane Flowchart** | `references/templates/flowchart-template.html` |
| Iterative cycle, continuous loop, recurring process | **Circular Ring** | `references/templates/circular-template.html` |

Read `references/diagram-types.md` for detailed guidance on choosing types and layout parameters.

## Data Structure Convention

Every diagram has a clearly marked `DATA SECTION` in the template. Replace the placeholder data with the user's actual data following the same structure.

### Force Graph data

```javascript
const categories = [
  { key: 'core',    label: 'Core System',  color: '#7C3AED' },
  { key: 'service', label: 'Service',      color: '#0D9488' },
  // ... map user's domain concepts to color slots
];

const nodes = [
  { id: 'unique-id', name: 'Display Name', category: 'core', description: 'What this node does' },
  // ...
];

const edges = [
  { source: 'node-id-1', target: 'node-id-2', label: '...', style: 'dashed', weight: 'bold', arrowhead: 'open' },
  // ...
];
```

### Flowchart data

```javascript
const phases = [
  { id: 'phase-id', label: 'Phase Name', color: '#7C3AED' },
  // ...
];

const nodes = [
  { id: 'step-id', name: 'Step Name', phase: 'phase-id', x: 0, category: 'process', description: '...', shape: 'rect' },
  // x = column index (0-based)
  // shape: 'terminal' | 'rect' | 'diamond' | 'io' | 'cylinder' | 'document'
];

const edges = [
  { source: 'step-1', target: 'step-2', label: 'optional label', style: 'dashed', weight: 'bold', arrowhead: 'open' },
  // ...
];
```

#### Flowchart Shape Reference (ISO 5807)

| Shape | Meaning | Visual |
|-------|---------|--------|
| `terminal` | Start / End | Pill (rounded ends) |
| `rect` | Process step (default) | Rectangle, rx:8 |
| `diamond` | Decision / branch | Rotated 45° square |
| `io` | Input / Output | Parallelogram (skewed) |
| `cylinder` | Database / data store | Cylinder with elliptical caps |
| `document` | Document / report | Rect with wavy bottom |

Default to `rect`. Use `terminal` for start/end nodes. Use `diamond` only for nodes with 2+ outgoing conditional edges.

### Circular Ring data

```javascript
const steps = [
  { id: 'step-id', name: 'Step Name', order: 0, category: 'process', description: '...' },
  // order determines position on the ring (0 = top, clockwise)
];

const edges = [
  { source: 'step-1', target: 'step-2', label: '...', style: 'dashed', weight: 'bold', arrowhead: 'open' },
  // last step should connect back to first for a complete cycle
];

const centerLabel = 'Cycle Name';
```

## Edge Type Properties

All edge data structures support optional properties for distinguishing relationship types:

| Property | Values | Use Case |
|----------|--------|----------|
| `style` | `solid` (default), `dashed`, `dotted` | Primary / optional / async flow |
| `weight` | `normal` (default), `thin`, `bold` | Standard / minor / critical path |
| `arrowhead` | `filled` (default), `open`, `hollow`, `none` | Directed / influence / interface / undirected |

Decision branch edges MUST have labels (yes/no, pass/fail). Back-edges use `style: 'dashed'`.

## Category Color Palette

Map the user's domain concepts to these 12 color slots. The first color is typically used for the primary/hub/core element. Use `contrastText(hex)` to determine text color for each slot.

| Slot | Hex | Suggested Use | Text Color |
|------|-----|--------------|------------|
| 1 | `#7C3AED` | Primary / Hub / Core | white |
| 2 | `#0D9488` | Teal — Integration / API | white |
| 3 | `#2563EB` | Blue — Data / Storage | white |
| 4 | `#D97706` | Amber — Configuration | **dark** |
| 5 | `#EA580C` | Orange — Alert / Warning | white |
| 6 | `#E11D48` | Rose — Critical / Auth | white |
| 7 | `#4F46E5` | Indigo — Tooling | white |
| 8 | `#059669` | Emerald — Success / Output | white |
| 9 | `#475569` | Slate — External / Third-party | white |
| 10 | `#0284C7` | Sky — Process step | white |
| 11 | `#CA8A04` | Yellow — Decision / Branch | **dark** |
| 12 | `#6366F1` | Violet — Sub-component | white |

For flowcharts and circular diagrams, typically only 2 categories are needed:
- `process` = `#0284C7` (sky blue)
- `decision` = `#CA8A04` (yellow)

### Status Color Overrides

Use these when nodes represent state or status (overrides category colors when applicable):

| Status | Color | When to use |
|--------|-------|------------|
| Error / Failed | `#E11D48` | Failed steps, broken connections |
| Success / Healthy | `#059669` | Completed, passing, healthy |
| Warning / At-risk | `#EA580C` | Degraded, at-risk |
| Disabled / Inactive | `#475569` | Skipped, deprecated, inactive |

## Required Interactive Features

Every diagram MUST include all of these:

1. **Zoom & Pan** — D3 zoom with scale extent `[0.2, 4]`
2. **Tooltips** — Show name, category, and description on hover
3. **Click Sidebar** — 380px right panel with details and connections list
4. **Animated Edges** — `stroke-dasharray: 6 4` with `pulse-flow` animation
5. **Legend** — Bottom-left with color swatches and category labels
6. **Reset Zoom button** — Top-left controls bar

Force graphs additionally require:
- **Filter buttons** per category with solo-toggle
- **Search input** for finding nodes
- **Draggable nodes** (hub fixed at center)
- **Convex hulls** around category clusters

## Visual Quality & Readability Rules

These rules ensure edges, labels, and nodes are clearly visible without hovering.

### Edge & Line Contrast
- Default edge stroke: `#94A3B8` (not `#334155`) at opacity 0.7
- Highlighted edges: opacity 1.0 with `drop-shadow(0 0 3px rgba(148,163,184,0.4))`
- Minimum stroke-width: 1.5px
- Arrow markers must match the edge stroke color (never hardcode `#64748B`)
- Edge labels: 11px minimum font size with a background rect (`fill: var(--bg)`, `opacity: 0.85`) for readability

### Text Readability
- Minimum font sizes: node labels 12px, edge labels 11px, center/group labels 13px
- Use `contrastText(hex)` for text on colored node backgrounds — returns `#F1F5F9` (white) for dark fills, `#0F172A` (dark) for light fills like yellow (#CA8A04) and amber (#D97706)
- Node labels on dark backgrounds should have `text-shadow: 0 1px 3px rgba(0,0,0,0.8)`

### Node Visibility
- Minimum node sizes: 14px radius (force graph), 26px radius (circular), 140x50px (flowchart rectangles)
- Slate-colored nodes (`#475569`) must have an explicit lighter border for visibility
- All nodes must have a visible stroke

### SVG Quality
- Add `shape-rendering="geometricPrecision"` and `text-rendering="optimizeLegibility"` to the SVG tag

### contrastText Utility
```javascript
function contrastText(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#0F172A' : '#F1F5F9';
}
```

### Node Label Rules
- Max 3 words for node labels — abbreviate longer names, put full name in `description`
- Title case (not UPPERCASE or lowercase)
- Flowchart rects: allow 2-line wrapping (split at ~15 chars)
- Circle nodes (force graph, circular): single-line only

## Complexity & Cognitive Load

- **Force graph**: max ~25-30 nodes. Beyond that, group into cluster nodes or split into multiple diagrams.
- **Flowchart**: max ~15-20 nodes. Decompose large processes into sub-process diagrams.
- **Circular ring**: max ~8-10 steps. Use sub-loop ring for additional detail.
- **Visual hierarchy**: hub/primary node is largest; use `weight: 'bold'` on critical-path edges; `weight: 'thin'` or `style: 'dotted'` for supporting paths.
- **Progressive disclosure**: details in tooltips/sidebar, not labels. Node labels = 1-3 words max.
- **When to split**: if legend > 6 categories or edges form an unreadable hairball.

## Design System

Read `references/design-system.md` for the complete CSS variables, typography specs, and JS utility code.

Key visual rules:
- **Background**: `#0F172A` (dark navy)
- **Cards/panels**: `#1E293B`
- **Text**: `#F1F5F9` primary, `#94A3B8` secondary, `#64748B` muted
- **Typography**: Inter for UI, JetBrains Mono for code/categories
- **Borders**: `#334155`, 1px solid
- **Shadows**: `0 8px 24px rgba(0,0,0,.4)` on tooltips

## File Naming

- Use `lowercase-with-hyphens.html`
- Name should describe the diagram content (e.g., `microservices-architecture.html`, `sprint-workflow.html`)
- Place in the current working directory unless the user specifies otherwise

## Extending to Other Diagram Types

The three templates cover most cases. For other layouts:
- **Tree / Hierarchy**: Adapt the force graph template — replace radial force with `d3.forceY` per depth level
- **Timeline**: Adapt the flowchart template — single lane, time axis
- **Sankey**: Adapt the flowchart template — variable-width edges

See `references/diagram-types.md` for detailed extension guidance.
