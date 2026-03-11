/* ============================================================
   Shared Utilities — Claude Toolkit Diagrams
   ============================================================ */

const Shared = (() => {

  // ── Category Color Map ──
  const COLORS = {
    hub:           '#7C3AED',
    mcp:           '#0D9488',
    plugin:        '#2563EB',
    'global-skill':'#D97706',
    'project-skill':'#EA580C',
    agent:         '#E11D48',
    command:       '#4F46E5',
    template:      '#059669',
    external:      '#475569',
    process:       '#0284C7',
    decision:      '#CA8A04',
    'sub-skill':   '#6366F1',
  };

  function color(category) {
    return COLORS[category] || '#64748B';
  }

  // ── Zoom / Pan ──
  function setupZoom(svg, g, onZoom) {
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (e) => {
        g.attr('transform', e.transform);
        if (onZoom) onZoom(e);
      });
    svg.call(zoom);
    return zoom;
  }

  function resetZoom(svg, zoom, width, height) {
    svg.transition().duration(500)
      .call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.9));
  }

  // ── Tooltip ──
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
        let x = event.clientX + pad;
        let y = event.clientY + pad;
        if (x + 310 > window.innerWidth) x = event.clientX - 310;
        if (y + el.offsetHeight > window.innerHeight) y = event.clientY - el.offsetHeight - pad;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
      },
      hide() {
        el.classList.remove('visible');
      }
    };
  }

  // ── Sidebar ──
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

  // ── Legend ──
  function createLegend(categories, onToggle) {
    const el = document.createElement('div');
    el.className = 'legend';
    categories.forEach(cat => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.dataset.category = cat.key;
      item.innerHTML = `<span class="legend-swatch" style="background:${color(cat.key)}"></span>${cat.label}`;
      if (onToggle) item.onclick = () => onToggle(cat.key, item);
      el.appendChild(item);
    });
    document.body.appendChild(el);
    return el;
  }

  // ── Highlight Helpers ──
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
      return (src === nodeId || tgt === nodeId) ? 0.8 : 0.05;
    }).classed('highlighted', e => {
      const src = typeof e.source === 'object' ? e.source.id : e.source;
      const tgt = typeof e.target === 'object' ? e.target.id : e.target;
      return (src === nodeId || tgt === nodeId);
    });
  }

  function clearHighlight(nodeEls, edgeEls) {
    nodeEls.style('opacity', 1);
    edgeEls.style('opacity', 0.5).classed('highlighted', false);
  }

  // ── Search ──
  function setupSearch(inputEl, nodes, onResult) {
    inputEl.addEventListener('input', () => {
      const q = inputEl.value.toLowerCase().trim();
      if (!q) { onResult(null); return; }
      const matches = nodes.filter(n =>
        (n.name || n.id).toLowerCase().includes(q) ||
        (n.category || '').toLowerCase().includes(q)
      );
      onResult(matches);
    });
  }

  // ── Node Rendering ──
  function drawNodes(g, nodes, opts = {}) {
    const radius = opts.radius || (d => d.category === 'hub' ? 28 : 16);
    const nodeG = g.selectAll('.node')
      .data(nodes, d => d.id)
      .join('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer');

    nodeG.append('circle')
      .attr('r', radius)
      .attr('fill', d => color(d.category))
      .attr('stroke', d => d3.color(color(d.category)).brighter(0.6))
      .attr('stroke-width', d => d.category === 'hub' ? 3 : 1.5);

    nodeG.append('text')
      .attr('class', d => d.mono ? 'node-label node-label-mono' : 'node-label')
      .attr('dy', d => (typeof radius === 'function' ? radius(d) : radius) + 14)
      .text(d => d.name || d.id);

    return nodeG;
  }

  // ── Edge Rendering ──
  function drawEdges(g, edges) {
    return g.selectAll('.edge')
      .data(edges)
      .join('line')
      .attr('class', 'edge');
  }

  // ── Convex Hull ──
  function drawHulls(g, nodes, categories) {
    const hullG = g.append('g').attr('class', 'hulls');

    function update() {
      const groups = {};
      nodes.forEach(n => {
        if (n.category === 'hub') return;
        if (!groups[n.category]) groups[n.category] = [];
        groups[n.category].push([n.x, n.y]);
      });

      const hulls = Object.entries(groups)
        .filter(([, pts]) => pts.length >= 3)
        .map(([cat, pts]) => {
          // Add padding points
          const padded = [];
          pts.forEach(p => {
            padded.push([p[0]-30, p[1]-30], [p[0]+30, p[1]+30],
                        [p[0]-30, p[1]+30], [p[0]+30, p[1]-30]);
          });
          return { category: cat, hull: d3.polygonHull(padded) };
        })
        .filter(h => h.hull);

      hullG.selectAll('.hull')
        .data(hulls, d => d.category)
        .join('path')
        .attr('class', 'hull')
        .attr('d', d => 'M' + d.hull.join('L') + 'Z')
        .attr('fill', d => color(d.category))
        .attr('fill-opacity', 0.06)
        .attr('stroke', d => color(d.category))
        .attr('stroke-opacity', 0.15)
        .attr('stroke-width', 1);
    }

    return { update };
  }

  return {
    COLORS, color, setupZoom, resetZoom,
    createTooltip, createSidebar, createLegend,
    highlightConnections, clearHighlight, setupSearch,
    drawNodes, drawEdges, drawHulls
  };
})();
