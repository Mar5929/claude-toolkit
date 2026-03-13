# Diagram Type Guide

## When to Use Each Type

| Diagram Type | Best For | Examples |
|-------------|----------|---------|
| **Force Graph** | Relationships, dependencies, hub-and-spoke, network topology | Microservices architecture, system dependencies, org charts, knowledge graphs |
| **Swimlane Flowchart** | Sequential processes with phases/stages, workflows, pipelines | Sprint workflow, CI/CD pipeline, onboarding process, approval flows |
| **Circular Ring** | Iterative cycles, continuous loops, recurring processes | Dev loop, feedback cycles, Agile ceremonies, PDCA cycles |

## Force Graph Layout

### When to choose
- Data has **many-to-many relationships** (not just linear flow)
- There's a **central hub** or core system
- Nodes belong to **distinct categories** that cluster together
- The user says: architecture, dependencies, connections, network, relationships

### Force parameters
```javascript
// Radial layout: categories orbit at different distances from center
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(edges).id(d => d.id).distance(d => {
    // Hub connections: longer distance; peer connections: shorter
    return isHub(d.source) ? 180 : 80;
  }).strength(0.3))
  .force('charge', d3.forceManyBody().strength(-120))
  .force('radial', d3.forceRadial(d => {
    if (isHub(d)) return 0;       // Hub at center
    return radiusForCategory(d);   // Others at category-specific radius
  }, 0, 0).strength(d => isHub(d) ? 1 : 0.6))
  .force('collision', d3.forceCollide(d => isHub(d) ? 40 : 24));
```

### Sizing guidance
- Hub node radius: 28-30px
- Regular node radius: **minimum 14px** (never smaller)
- Radial distances: inner ring ~220px, middle ~320px, outer ~430px
- Collision radius: hub 40px, others 24px

### Edge & text rules
- Edge stroke: `#94A3B8` at opacity 0.7 (default), 1.0 when highlighted
- Node labels: **12px minimum**, add `text-shadow: 0 1px 3px rgba(0,0,0,0.8)` for readability on dark background
- Use `contrastText()` if node labels are placed inside filled circles

### Recommended limits
- Max ~30 nodes, ~6 categories. Beyond that, group into cluster nodes or split diagrams.

### Flow direction
- No inherent flow direction. For dependency graphs, arrows point from dependent → dependency.
- Use edge `style`/`arrowhead` to differentiate relationship types (e.g., `dashed` for optional deps, `bold` for critical path).

### Features to include
- Convex hulls around category clusters (fill-opacity 0.06, stroke-opacity 0.15)
- Draggable nodes (hub fixed at center)
- Filter buttons per category (solo-toggle behavior)
- Search input for finding nodes by name/category

## Swimlane Flowchart Layout

### When to choose
- Process has **distinct sequential phases** or stages
- Steps can be grouped into **horizontal swim lanes**
- Flow is primarily **left-to-right** with occasional back-edges
- The user says: workflow, pipeline, process, stages, phases, steps

### Layout parameters
```javascript
const stepW = 160;      // Node width
const stepH = 60;       // Node height
const gapX = 200;       // Horizontal spacing between steps
const laneH = 140;      // Swim lane height
const laneGap = 10;     // Gap between lanes
const startX = 60;      // Left margin
const startY = 80;      // Top margin
```

### Node shapes (ISO 5807)

| Shape | Meaning | SVG Element | Key attributes |
|-------|---------|-------------|----------------|
| `terminal` | Start / End | `<rect>` | `rx = stepH/2` (pill shape) |
| `rect` | Process step (default) | `<rect>` | `rx: 8` |
| `diamond` | Decision / branch | `<rect>` | rotated 45deg |
| `io` | Input / Output | `<polygon>` | parallelogram, ~15px skew |
| `cylinder` | Database / data store | `<path>` | rect body + elliptical caps |
| `document` | Document / report | `<path>` | rect with wavy bottom |

All shapes: category color fill, text color via `contrastText(fillColor)`. Default to `rect`. Use `terminal` for start/end nodes. Use `diamond` only for nodes with 2+ outgoing conditional edges.

- Minimum node size: 140x50px for rectangles

### Edge & text rules
- Arrow markers must match edge stroke color (not hardcoded `#64748B`)
- Edge labels: **11px minimum**, add background rect (`fill: var(--bg)`, `opacity: 0.85`) behind text
- Node text: use `contrastText()` — fixes white-on-yellow/amber issue

### Edge routing
- Forward edges: straight lines between adjacent steps
- Cross-lane edges: diagonal lines stepping down
- Back-edges (loops): curved paths below the lanes using cubic bezier
- All edges get animated dashes and arrow markers

### Flow direction rules
- Primary flow: left-to-right within a phase, top-to-bottom across phases
- Back-edges (loops): use `style: 'dashed'` and `#CA8A04` color
- Decision nodes: happy path exits right; exception/rejection path exits down or curves back
- Node `x` values must increase left-to-right for forward flow

### Edge labeling guidelines
- Decision branches MUST be labeled ("yes"/"no", "approved"/"rejected")
- Obvious sequential flow needs no label
- Keep labels to 2-3 words max; longer explanations go in tooltip/description
- Back-edge labels placed at curve apex

### Recommended limits
- Max ~20 nodes, ~5 phases. Decompose large processes into sub-process diagrams.

### Swim lane rendering
- Semi-transparent fill: `rgba(255,255,255,0.02)`
- Dashed border: `stroke-dasharray: 4 3`
- Phase label: uppercase, left-aligned, colored to match phase

## Circular Ring Layout

### When to choose
- Process is an **iterative cycle** that repeats
- Steps form a **continuous loop** (last step leads back to first)
- May have **sub-loops** (inner rings for sub-cycles)
- The user says: cycle, loop, iterative, recurring, continuous

### Layout parameters
```javascript
const outerR = Math.min(width, height) * 0.32;  // Main ring radius
const innerR = outerR * 0.5;                     // Sub-loop ring radius
const nodeR = 26;                                 // Step node radius
```

### Step positioning
```javascript
// Evenly distribute steps around the ring
steps.forEach((s, i) => {
  const angle = (i / n) * 2 * Math.PI - Math.PI / 2;  // Start from top
  s.x = cx + outerR * Math.cos(angle);
  s.y = cy + outerR * Math.sin(angle);
});
```

### Edge & text rules
- Center label: `#94A3B8` fill (not `#64748B`), minimum 14px
- Step numbers inside nodes: use `contrastText(nodeColor)` for text fill
- Edge labels: **11px minimum**
- Arrow markers must match edge stroke color
- Node labels outside: 12px minimum

### Flow direction
- Flow is always clockwise. Wrap-around edge (last→first) uses curved path through center.

### Recommended limits
- Max ~10 steps. Use sub-loop ring for additional detail.

### Features
- Outer ring: thick semi-transparent track (`stroke-width: 40`, `opacity: 0.5`)
- Sub-loop ring (optional): dashed circle at inner radius
- Step numbers inside nodes (use `contrastText()` for fill, bold)
- Labels outside nodes
- Edges: straight lines for adjacent steps, quadratic curves for sub-loop connections
- Center label describing the cycle

## Extending to Other Types

### Tree / Hierarchy
Adapt the **force graph** template:
- Use `d3.forceY` to create vertical layers
- Remove radial force, add strong `forceY` per depth level
- Use `d3.tree()` or `d3.cluster()` for initial positioning

### Timeline
Adapt the **flowchart** template:
- Single swim lane
- Horizontal axis = time
- Vertical position for parallel tracks
- Add time markers along the x-axis

### Sankey / Flow
Adapt the **flowchart** template:
- Variable-width edges representing flow volume
- Use `d3.sankey()` layout from d3-sankey plugin
