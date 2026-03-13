# HTML Diagram Design System

This is the canonical design system for all HTML diagrams. When building templates or adapting them for users, these values are the source of truth.

## Google Fonts Import

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

## CSS Variables

```css
:root {
  /* 12 Category Colors — map user's domain concepts to these slots */
  --cat-1:  #7C3AED;  /* purple — primary/hub/core */
  --cat-2:  #0D9488;  /* teal */
  --cat-3:  #2563EB;  /* blue */
  --cat-4:  #D97706;  /* amber */
  --cat-5:  #EA580C;  /* orange */
  --cat-6:  #E11D48;  /* rose/red */
  --cat-7:  #4F46E5;  /* indigo */
  --cat-8:  #059669;  /* emerald */
  --cat-9:  #475569;  /* slate — external/secondary */
  --cat-10: #0284C7;  /* sky — process */
  --cat-11: #CA8A04;  /* yellow — decision/warning */
  --cat-12: #6366F1;  /* violet */

  /* UI Colors */
  --bg:         #0F172A;  /* navy background */
  --bg-card:    #1E293B;  /* card/panel background */
  --bg-hover:   #334155;  /* hover state */
  --border:     #334155;  /* borders */
  --text:       #F1F5F9;  /* primary text */
  --text-dim:   #94A3B8;  /* secondary text */
  --text-muted: #64748B;  /* muted/placeholder text */
  --accent:     #7C3AED;  /* accent (matches cat-1) */

  /* Edge Colors */
  --edge-stroke: #94A3B8;  /* edge default stroke — high contrast on dark bg */
  --edge-opacity: 0.7;     /* default edge opacity */
  --edge-width: 1.5;       /* default edge stroke-width */

  /* Fonts */
  --font-ui:   'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

## Typography

| Element | Font | Size (min) | Weight | Color |
|---------|------|------------|--------|-------|
| Title h1 | Inter | 18px | 700 | `--text` |
| Subtitle | Inter | 12px | 400 | `--text-dim` |
| Node label | Inter | **12px** | 400 | `--text` |
| Edge label | JetBrains Mono | **11px** | 400 | `--text-dim` |
| Center/group label | Inter | **13px** | 600 | `--text-dim` |
| Mono label | JetBrains Mono | 10px | 400 | `--text` |
| Tooltip name | Inter | 13px | 600 | `--text` |
| Tooltip category | JetBrains Mono | 11px | 400 | `--text-dim` |
| Tooltip description | Inter | 12px | 400 | `--text-dim` |
| Sidebar h2 | Inter | 18px | 700 | `--text` |
| Sidebar h3 | Inter | 13px | 600 | `--text-dim`, uppercase |
| Legend item | Inter | 12px | 400 | `--text-dim` |
| Phase label | Inter | 13px | 600 | `--text-dim`, uppercase |
| Button/input | Inter | 13px | 400 | `--text` |

## Animation

```css
@keyframes pulse-flow {
  0%   { stroke-dashoffset: 20; }
  100% { stroke-dashoffset: 0; }
}

.edge-animated {
  stroke-dasharray: 6 4;
  animation: pulse-flow .8s linear infinite;
}
```

## Node Rendering Conventions

- **Circle nodes** (force graph, circular): `fill` = category color, `stroke` = category color brightened 0.6, `stroke-width` = 1.5 (hub: 3)
- **Rect nodes** (flowchart): `fill` = category color, `opacity` = 0.85, `rx` = 8
- **Diamond nodes** (decisions): rotated 45deg rect, `fill` = category color
- **Terminal nodes** (start/end): same as rect but `rx = stepH/2` (pill/stadium shape), same fill/opacity as rect
- **IO nodes** (input/output): `<polygon>` with 4 points, offset ~15px for parallelogram skew: `points="15,0 W,0 W-15,H 0,H"`
- **Cylinder nodes** (database): `<path>` with rect body + elliptical top/bottom arcs. Body height = stepH, ellipse ry = 8. Path: `M0,8 A(W/2),8 0 0,1 W,8 L W,(H-8) A(W/2),8 0 0,1 0,(H-8) Z` plus top ellipse `M0,8 A(W/2),8 0 0,0 W,8`
- **Document nodes** (report): `<path>` with 3 straight sides + quadratic bezier wave bottom: `M0,0 L W,0 L W,(H-10) Q(W*0.75),(H+5) (W/2),(H-10) Q(W*0.25),(H-25) 0,(H-10) Z`

## Edge Rendering

- Default: `stroke` = `--edge-stroke` (#94A3B8), `stroke-width` = 1.5, `opacity` = 0.7
- Highlighted: `opacity` = 1.0, `stroke-width` = 2, `filter: drop-shadow(0 0 3px rgba(148,163,184,0.4))`
- Dimmed: `opacity` = 0.08
- Animated: add `edge-animated` class for flowing dash animation
- Arrow markers: viewBox `0 0 10 10`, refX=10 refY=5, fill must **match the edge stroke color** (use `context-stroke` or set dynamically)
- Edge labels: must have a background rect behind text (`fill: var(--bg)`, `opacity: 0.85`) for readability, minimum 11px font size
- Critical-path emphasis: use `weight: 'bold'` + `filter: drop-shadow(0 0 6px <edgeColor>)` for glow effect

### Edge Style Classes

```css
.edge-dashed { stroke-dasharray: 8 4; }
.edge-dotted { stroke-dasharray: 2 4; }
.edge-bold { stroke-width: 3; }
.edge-thin { stroke-width: 1; }
```

**Note:** `dashed`/`dotted` edges should NOT get the `edge-animated` class (conflicting dash patterns).

### Arrowhead Marker Variants

In addition to the default filled arrowhead, define these in `<defs>`:

- **`open`** — stroked chevron, no fill: `<path d="M0,0 L10,5 L0,10" fill="none" stroke="<color>" stroke-width="1.5"/>`
- **`hollow`** — outlined triangle with background fill: `<path d="M0,0 L10,5 L0,10 Z" fill="var(--bg)" stroke="<color>" stroke-width="1.5"/>`
- **`none`** — no marker-end attribute

## SVG Quality Attributes

Add these attributes to the `<svg>` tag for crisp rendering:
```html
<svg shape-rendering="geometricPrecision" text-rendering="optimizeLegibility">
```

## Text Contrast Utility

Use this function to pick white or dark text based on background luminance:
```javascript
function contrastText(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#0F172A' : '#F1F5F9';
}

## UI Components

### Controls Bar
- Fixed `top: 16px; left: 16px`, flex row with 8px gap
- Buttons: `bg-card` background, `border` border, 6px radius, 6px 12px padding

### Title Bar
- Fixed top-center, centered text, `pointer-events: none`

### Tooltip
- Fixed position follows cursor, 8px radius, `bg-card` background, 300px max-width
- Shadow: `0 8px 24px rgba(0,0,0,.4)`
- Fade transition: `opacity .15s`

### Sidebar
- Fixed right panel, 380px wide, slides in/out with `right .25s ease`
- Contains: name (h2), category (mono), description, connections list

### Legend
- Fixed bottom-left, semi-transparent backdrop with blur
- `rgba(15,23,42,.85)` background, `backdrop-filter: blur(8px)`
- Clickable items toggle category visibility
- Swatch: 12x12px, 3px radius

## D3.js Utilities (inline in each template)

### Zoom/Pan Setup
```javascript
const zoom = d3.zoom()
  .scaleExtent([0.2, 4])
  .on('zoom', (e) => g.attr('transform', e.transform));
svg.call(zoom);
```

### Tooltip Helper
```javascript
function createTooltip() {
  const el = document.createElement('div');
  el.className = 'tooltip';
  el.innerHTML = '<div class="tt-name"></div><div class="tt-category"></div><div class="tt-desc"></div>';
  document.body.appendChild(el);
  return {
    show(d, event) {
      el.querySelector('.tt-name').textContent = d.name || d.id;
      el.querySelector('.tt-category').textContent = d.category || '';
      el.querySelector('.tt-desc').textContent = d.description || '';
      el.classList.add('visible');
      const pad = 12;
      let x = event.clientX + pad, y = event.clientY + pad;
      if (x + 310 > window.innerWidth) x = event.clientX - 310;
      if (y + el.offsetHeight > window.innerHeight) y = event.clientY - el.offsetHeight - pad;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    },
    hide() { el.classList.remove('visible'); }
  };
}
```

### Sidebar Helper
```javascript
function createSidebar() {
  const el = document.createElement('div');
  el.className = 'sidebar';
  el.innerHTML = `
    <button class="sidebar-close">&times;</button>
    <h2 class="sb-name"></h2>
    <div class="sb-category"></div>
    <div class="sb-desc"></div>
    <h3>Connections</h3>
    <ul class="sb-connections"></ul>
  `;
  document.body.appendChild(el);
  el.querySelector('.sidebar-close').onclick = () => el.classList.remove('open');
  return {
    show(d, edges, nodes) {
      el.querySelector('.sb-name').textContent = d.name || d.id;
      el.querySelector('.sb-category').textContent = d.category || '';
      el.querySelector('.sb-desc').textContent = d.description || '';
      const connIds = new Set();
      edges.forEach(e => {
        const src = typeof e.source === 'object' ? e.source.id : e.source;
        const tgt = typeof e.target === 'object' ? e.target.id : e.target;
        if (src === d.id) connIds.add(tgt);
        if (tgt === d.id) connIds.add(src);
      });
      const ul = el.querySelector('.sb-connections');
      ul.innerHTML = '';
      connIds.forEach(id => {
        const n = nodes.find(n => n.id === id);
        const li = document.createElement('li');
        li.textContent = n ? (n.name || n.id) : id;
        ul.appendChild(li);
      });
      el.classList.add('open');
    },
    close() { el.classList.remove('open'); }
  };
}
```

### Legend Helper
```javascript
function createLegend(categories, colorFn, onToggle) {
  const el = document.createElement('div');
  el.className = 'legend';
  categories.forEach(cat => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.dataset.category = cat.key;
    item.innerHTML = `<span class="legend-swatch" style="background:${colorFn(cat.key)}"></span>${cat.label}`;
    if (onToggle) item.onclick = () => onToggle(cat.key, item);
    el.appendChild(item);
  });
  document.body.appendChild(el);
  return el;
}
```

### Highlight Helpers
```javascript
function highlightConnections(nodeId, nodeEls, edgeEls, edges) {
  const connIds = new Set([nodeId]);
  edges.forEach(e => {
    const src = typeof e.source === 'object' ? e.source.id : e.source;
    const tgt = typeof e.target === 'object' ? e.target.id : e.target;
    if (src === nodeId) connIds.add(tgt);
    if (tgt === nodeId) connIds.add(src);
  });
  nodeEls.style('opacity', d => connIds.has(d.id) ? 1 : 0.12);
  edgeEls.style('opacity', e => {
    const src = typeof e.source === 'object' ? e.source.id : e.source;
    const tgt = typeof e.target === 'object' ? e.target.id : e.target;
    return (src === nodeId || tgt === nodeId) ? 1.0 : 0.08;
  }).classed('highlighted', e => {
    const src = typeof e.source === 'object' ? e.source.id : e.source;
    const tgt = typeof e.target === 'object' ? e.target.id : e.target;
    return (src === nodeId || tgt === nodeId);
  });
}

function clearHighlight(nodeEls, edgeEls) {
  nodeEls.style('opacity', 1);
  edgeEls.style('opacity', 0.7).classed('highlighted', false);
}
```

### Text Wrapping Utility
```javascript
function wrapText(textEl, maxWidth) {
  const text = d3.select(textEl);
  const words = text.text().split(/\s+/).reverse();
  const x = text.attr('x') || 0;
  const dy = parseFloat(text.attr('dy') || 0);
  let word, line = [], lineNumber = 0;
  const lineHeight = 1.2; // ems
  let tspan = text.text(null).append('tspan').attr('x', x).attr('dy', dy + 'px');
  while (word = words.pop()) {
    line.push(word);
    tspan.text(line.join(' '));
    if (tspan.node().getComputedTextLength() > maxWidth && line.length > 1) {
      line.pop();
      tspan.text(line.join(' '));
      line = [word];
      tspan = text.append('tspan').attr('x', x).attr('dy', lineHeight + 'em').text(word);
      lineNumber++;
    }
  }
  // Center vertically: shift up by half the total height
  if (lineNumber > 0) {
    text.selectAll('tspan').attr('dy', (d, i) => i === 0 ? (dy - lineNumber * 0.6 + 'em') : lineHeight + 'em');
  }
}
```

### Edge Style Helper
```javascript
function applyEdgeStyle(edgeEl, e) {
  // Style: dashed, dotted, solid (default)
  if (e.style === 'dashed') {
    edgeEl.attr('stroke-dasharray', '8 4').classed('edge-animated', false);
  } else if (e.style === 'dotted') {
    edgeEl.attr('stroke-dasharray', '2 4').classed('edge-animated', false);
  } else {
    edgeEl.classed('edge-animated', true);
  }
  // Weight: thin, bold, normal (default)
  if (e.weight === 'bold') {
    edgeEl.attr('stroke-width', 3);
    if (e.weight === 'bold') edgeEl.style('filter', 'drop-shadow(0 0 6px ' + (edgeEl.attr('stroke') || '#94A3B8') + ')');
  } else if (e.weight === 'thin') {
    edgeEl.attr('stroke-width', 1);
  }
}
```
