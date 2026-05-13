// ── constants ────────────────────────────────────────────────
const COLORS = {
  'historical': '#444441',
  'SSP2-4.5':   '#ba7517',
  'SSP5-8.5':   '#a32d2d',
};

const BTN_ID = {
  'historical': 'btn-hist',
  'SSP2-4.5':   'btn-s245',
  'SSP5-8.5':   'btn-s585',
};

const BTN_CLASS = {
  'historical': 'on-hist',
  'SSP2-4.5':   'on-s245',
  'SSP5-8.5':   'on-s585',
};

const scenarios = ['historical', 'SSP2-4.5', 'SSP5-8.5'];
const visible   = { 'historical': true, 'SSP2-4.5': true, 'SSP5-8.5': true };

// ── dimensions ───────────────────────────────────────────────
const margin = { top: 20, right: 20, bottom: 45, left: 55 };
const totalW  = document.getElementById('chart').clientWidth - 32 || 820;
const totalH  = 420;
const W = totalW - margin.left - margin.right;
const H = totalH - margin.top  - margin.bottom;

// ── svg setup ────────────────────────────────────────────────
const svg = d3.select('#viz')
  .attr('width', totalW)
  .attr('height', totalH)
  .style('overflow', 'visible');

const g = svg.append('g')
  .attr('transform', `translate(${margin.left},${margin.top})`);

// ── scales ───────────────────────────────────────────────────
const xScale = d3.scaleLinear().domain([1850, 2100]).range([0, W]);
const yScale = d3.scaleLinear().domain([3, 34]).range([H, 0]);

// ── gridlines ────────────────────────────────────────────────
g.append('g')
  .attr('class', 'gridline')
  .call(d3.axisLeft(yScale).tickSize(-W).tickFormat(''));

// ── axes ─────────────────────────────────────────────────────
g.append('g')
  .attr('class', 'axis')
  .attr('transform', `translate(0,${H})`)
  .call(d3.axisBottom(xScale).tickFormat(d3.format('d')).ticks(10));

g.append('g')
  .attr('class', 'axis')
  .call(d3.axisLeft(yScale).ticks(8).tickFormat(d => d + '°C'));

// ── axis labels ──────────────────────────────────────────────
g.append('text')
  .attr('x', W / 2).attr('y', H + 38)
  .attr('text-anchor', 'middle')
  .attr('font-size', '12px').attr('fill', '#888780')
  .text('Year');

g.append('text')
  .attr('transform', 'rotate(-90)')
  .attr('x', -H / 2).attr('y', -42)
  .attr('text-anchor', 'middle')
  .attr('font-size', '12px').attr('fill', '#888780')
  .text('Temperature (°C)');

// ── 2015 projection marker ───────────────────────────────────
g.append('line')
  .attr('class', 'proj-line')
  .attr('x1', xScale(2015)).attr('x2', xScale(2015))
  .attr('y1', 0).attr('y2', H);

g.append('text')
  .attr('class', 'proj-label')
  .attr('x', xScale(2015) + 4).attr('y', 12)
  .text('projections →');

// ── hover line ────────────────────────────────────────────────
const hoverLine = g.append('line')
  .attr('stroke', '#b4b2a9')
  .attr('stroke-width', 1)
  .attr('y1', 0).attr('y2', H)
  .attr('opacity', 0)
  .attr('pointer-events', 'none');

// ── data group ────────────────────────────────────────────────
const gData = g.append('g');
let grouped  = {};

// ── line / area generators ───────────────────────────────────
const areaGen = d3.area()
  .x(d => xScale(d.year))
  .y0(d => yScale(d.min))
  .y1(d => yScale(d.max))
  .curve(d3.curveCatmullRom.alpha(0.5));

const lineGen = key => d3.line()
  .x(d => xScale(d.year))
  .y(d => yScale(d[key]))
  .curve(d3.curveCatmullRom.alpha(0.5));

// ── draw one scenario ─────────────────────────────────────────
function drawScenario(s, data) {
  const c   = COLORS[s];
  const cls = s.replace(/[\.\-]/g, '_');

  gData.append('path')
    .datum(data)
    .attr('class', `band band-${cls}`)
    .attr('fill', c)
    .attr('opacity', 0.12)
    .attr('d', areaGen);

  ['min', 'max'].forEach(k => {
    gData.append('path')
      .datum(data)
      .attr('class', `line-ext line-${cls}`)
      .attr('stroke', c)
      .attr('d', lineGen(k));
  });

  gData.append('path')
    .datum(data)
    .attr('class', `line-mean line-${cls}`)
    .attr('stroke', c)
    .attr('d', lineGen('mean'));
}

// ── tooltip ───────────────────────────────────────────────────
const tooltip = document.getElementById('tooltip');
const bisect  = d3.bisector(d => d.year).left;
let hideTimer;

function showTooltip(event, year) {
  document.getElementById('tt-year').textContent = year;

  let html = '';
  scenarios.forEach(s => {
    if (!visible[s] || !grouped[s]) return;
    const arr = grouped[s];
    const i   = bisect(arr, year, 1);
    const d   = arr[Math.min(i, arr.length - 1)];
    if (!d) return;
    const c = COLORS[s];
    html += `
      <div class="tt-block" style="border-left:3px solid ${c};">
        <div class="label">${s}</div>
        <div class="tt-row"><span>Max</span><span>${d.max.toFixed(1)}°C</span></div>
        <div class="tt-row"><span>Mean</span><span>${d.mean.toFixed(1)}°C</span></div>
        <div class="tt-row"><span>Min</span><span>${d.min.toFixed(1)}°C</span></div>
      </div>`;
  });

  document.getElementById('tt-content').innerHTML = html;
  tooltip.style.opacity = '1';

  // keep tooltip on screen
  const ttW  = tooltip.offsetWidth;
  const ttH  = tooltip.offsetHeight;
  let left   = event.clientX + 18;
  let top    = event.clientY - 20;
  if (left + ttW > window.innerWidth  - 10) left = event.clientX - ttW - 18;
  if (top  + ttH > window.innerHeight - 10) top  = window.innerHeight - ttH - 10;

  tooltip.style.left = left + 'px';
  tooltip.style.top  = top  + 'px';
}

function hideTooltip() {
  hideTimer = setTimeout(() => {
    hoverLine.attr('opacity', 0);
    tooltip.style.opacity = '0';
  }, 120);
}

// ── overlay for mouse events ──────────────────────────────────
const overlay = g.append('rect')
  .attr('width', W)
  .attr('height', H)
  .attr('fill', 'none')
  .attr('pointer-events', 'all');

overlay.on('mousemove', function(event) {
  clearTimeout(hideTimer);
  const [mx] = d3.pointer(event);
  const year  = Math.round(xScale.invert(mx));
  hoverLine.attr('x1', mx).attr('x2', mx).attr('opacity', 1);
  showTooltip(event, year);
});

overlay.on('mouseleave', hideTooltip);

// ── toggle button handler ─────────────────────────────────────
function toggle(s) {
  visible[s]  = !visible[s];
  const cls   = s.replace(/[\.\-]/g, '_');

  d3.selectAll(`.band-${cls}`).attr('opacity', visible[s] ? 0.12 : 0);
  d3.selectAll(`.line-${cls}`).attr('opacity', visible[s] ? 1    : 0);

  const btn = document.getElementById(BTN_ID[s]);
  if (visible[s]) btn.classList.add(BTN_CLASS[s]);
  else            btn.classList.remove(BTN_CLASS[s]);
}

// ── load data and draw ────────────────────────────────────────
d3.csv('sd_extremes.csv', d => ({
  year:     +d.year,
  min:      +d.min,
  mean:     +d.mean,
  max:      +d.max,
  scenario:  d.scenario,
})).then(data => {
  scenarios.forEach(s => {
    grouped[s] = data
      .filter(d => d.scenario === s)
      .sort((a, b) => a.year - b.year);
    drawScenario(s, grouped[s]);
  });

  // raise hover elements above drawn lines
  hoverLine.raise();
  overlay.raise();
});