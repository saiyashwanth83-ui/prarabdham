/**
 * southindian.js — South Indian Style Vedic Birth Chart SVG Renderer
 * Pure SVG, no external dependencies, ES module.
 *
 * SOUTH INDIAN GRID LAYOUT (4×4, fixed signs, planets move):
 *
 *  [0,0] Pisces   | [0,1] Aries    | [0,2] Taurus   | [0,3] Gemini
 *  [1,0] Aquarius | [1,1] EMPTY    | [1,2] EMPTY     | [1,3] Cancer
 *  [2,0] Capricorn| [2,1] EMPTY    | [2,2] EMPTY     | [2,3] Leo
 *  [3,0] Sagitt.  | [3,1] Scorpio  | [3,2] Libra     | [3,3] Virgo
 *
 * The 4 inner cells ([1,1],[1,2],[2,1],[2,2]) are empty/decorative.
 * Signs never move — planets are placed in the cell matching their sign.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maps sign name → [row, col] in the 4×4 grid (0-indexed).
 * This is the canonical South Indian sign placement.
 */
const SIGN_POSITIONS = {
  Pisces:      [0, 0],
  Aries:       [0, 1],
  Taurus:      [0, 2],
  Gemini:      [0, 3],
  Cancer:      [1, 3],
  Leo:         [2, 3],
  Virgo:       [3, 3],
  Libra:       [3, 2],
  Scorpio:     [3, 1],
  Sagittarius: [3, 0],
  Capricorn:   [2, 0],
  Aquarius:    [1, 0],
};

/** Short sign labels shown in cell corners. */
const SIGN_SHORT = {
  Pisces: 'Pi', Aries: 'Ar', Taurus: 'Ta', Gemini: 'Ge',
  Cancer: 'Cn', Leo: 'Le', Virgo: 'Vi', Libra: 'Li',
  Scorpio: 'Sc', Sagittarius: 'Sg', Capricorn: 'Cp', Aquarius: 'Aq',
};

/** Planet abbreviations. */
const PLANET_ABBR = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
  Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

/** Inner cells that are empty (no sign). */
const INNER_CELLS = new Set(['1,1', '1,2', '2,1', '2,2']);

/** Theme definitions. */
const THEMES = {
  light: {
    bg:        '#ffffff',
    outerBg:   '#f8f6f2',
    innerBg:   '#ede8e0',
    grid:      '#444444',
    gridInner: '#999999',
    planet:    '#1a1a1a',
    lagna:     '#8B0000',
    sign:      '#888888',
    retro:     '#8B0000',
    title:     '#2a2a2a',
    cellBg:    '#ffffff',
  },
  dark: {
    bg:        '#1a1625',
    outerBg:   '#1a1625',
    innerBg:   '#0f0c18',
    grid:      '#4a4260',
    gridInner: '#2a2240',
    planet:    '#e8e0f0',
    lagna:     '#C9A84C',
    sign:      '#7a6e8a',
    retro:     '#C9A84C',
    title:     '#e8e0f0',
    cellBg:    '#1e1a2e',
  },
};

// ---------------------------------------------------------------------------
// Core SVG builder
// ---------------------------------------------------------------------------

/**
 * Build a complete South Indian chart SVG string.
 *
 * @param {object} chartData - { planets, lagna, chartName }
 * @param {object} opts      - { size, theme, showDegrees, language }
 * @returns {string} SVG markup string
 */
function buildSVG(chartData, opts) {
  const size        = opts.size || 400;
  const theme       = THEMES[opts.theme] || THEMES.light;
  const showDegrees = opts.showDegrees !== false;
  const { planets, lagna, chartName } = chartData;

  // Layout metrics
  const titleH   = chartName ? Math.round(size * 0.072) : 0;
  const padding  = Math.round(size * 0.025);
  const gridSize = size - padding * 2;
  const cell     = Math.round(gridSize / 4);
  const gx       = padding;  // grid origin x
  const gy       = padding + titleH; // grid origin y
  const totalH   = size + titleH;

  // Font sizes scaled to cell
  const fSign   = Math.max(8,  Math.round(cell * 0.13));
  const fPlanet = Math.max(9,  Math.round(cell * 0.155));
  const fTitle  = Math.max(11, Math.round(size * 0.042));

  // Group planets + lagna by sign
  const cellContents = {}; // key: "row,col" → [{ label, isLagna, isRetro }]

  // Place Lagna
  if (lagna?.sign && SIGN_POSITIONS[lagna.sign]) {
    const [r, c] = SIGN_POSITIONS[lagna.sign];
    const key    = `${r},${c}`;
    if (!cellContents[key]) cellContents[key] = [];
    // Lagna is rendered via diagonal marker, not a text entry.
    cellContents[key].unshift({ label: 'As', isLagna: true, isRetro: false,
      deg: lagna.degrees, min: lagna.minutes });
  }

  // Place planets
  for (const [name, p] of Object.entries(planets || {})) {
    const sign = p.sign;
    if (!sign || !SIGN_POSITIONS[sign]) continue;
    const [r, c] = SIGN_POSITIONS[sign];
    const key    = `${r},${c}`;
    if (!cellContents[key]) cellContents[key] = [];
    cellContents[key].push({
      label:   PLANET_ABBR[name] || name.slice(0, 2),
      isLagna: false,
      isRetro: !!p.isRetrograde,
      deg:     p.degrees,
      min:     p.minutes,
    });
  }

  // ── SVG assembly ──
  const lines = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${totalH}" viewBox="0 0 ${size} ${totalH}">`);
  lines.push(`<rect width="${size}" height="${totalH}" fill="${theme.bg}"/>`);

  // Title
  if (chartName) {
    lines.push(`<text x="${size / 2}" y="${padding + titleH * 0.68}"
      text-anchor="middle" fill="${theme.title}"
      font-family="Georgia, serif" font-size="${fTitle}" font-weight="bold"
      letter-spacing="0.03em">${esc(chartName)}</text>`);
  }

  // Draw cells
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const key     = `${row},${col}`;
      const isInner = INNER_CELLS.has(key);
      const cx      = gx + col * cell;
      const cy      = gy + row * cell;

      // Cell background
      const cellFill = isInner ? theme.innerBg : theme.cellBg;
      lines.push(`<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}"
        fill="${cellFill}" stroke="${isInner ? theme.gridInner : theme.grid}"
        stroke-width="${isInner ? 0.5 : 1}"/>`);

      if (isInner) continue;

      // Sign label (small, top-left corner)
      const signName = getSignForCell(row, col);
      if (signName) {
        lines.push(`<text x="${cx + 4}" y="${cy + fSign + 2}"
          fill="${theme.sign}" font-family="Georgia, serif"
          font-size="${fSign}" font-style="italic">${SIGN_SHORT[signName]}</text>`);
      }

      // Lagna diagonal marker — top-left triangle in the Lagna cell
      const items  = cellContents[key] || [];
      const hasLagna = items.some(i => i.isLagna);
      if (hasLagna) {
        const triSize = Math.round(cell * 0.28);
        lines.push(`<polygon points="${cx},${cy} ${cx + triSize},${cy} ${cx},${cy + triSize}"
          fill="${theme.lagna}" opacity="0.85"/>`);
      }

      // Planet labels — stacked vertically in cell center
      const planets_  = items.filter(i => !i.isLagna);
      const lagnaItem = items.find(i => i.isLagna);

      // All items to render as text (lagna "As" + planets)
      const textItems = [];
      if (lagnaItem) textItems.push(lagnaItem);
      textItems.push(...planets_);

      if (textItems.length === 0) continue;

      // Vertical stacking: center the block in the cell
      const lineH     = fPlanet + 3;
      const blockH    = textItems.length * lineH;
      const startY    = cy + (cell - blockH) / 2 + fPlanet;
      const centerX   = cx + cell / 2;

      textItems.forEach((item, i) => {
        const ty    = startY + i * lineH;
        let label   = item.label;
        let retroMark = '';
        if (item.isRetro) retroMark = '℞';

        const color = item.isLagna ? theme.lagna : theme.planet;

        if (showDegrees && item.deg !== undefined) {
          // Format: "Su 1°03'"  or  "Mo 20°07'"
          const degStr = `${item.deg}°${String(item.min ?? 0).padStart(2, '0')}'`;
          // Planet abbr
          lines.push(`<text x="${centerX}" y="${ty}"
            text-anchor="middle" fill="${color}"
            font-family="Georgia, serif" font-size="${fPlanet}" font-weight="600"
            >${esc(label)}${retroMark ? ' ' + retroMark : ''} <tspan font-size="${Math.round(fPlanet * 0.78)}" fill="${theme.sign}">${degStr}</tspan></text>`);
        } else {
          lines.push(`<text x="${centerX}" y="${ty}"
            text-anchor="middle" fill="${color}"
            font-family="Georgia, serif" font-size="${fPlanet}" font-weight="600"
            >${esc(label)}${retroMark ? ' <tspan fill="' + theme.retro + '">' + retroMark + '</tspan>' : ''}</text>`);
        }
      });
    }
  }

  // Outer border (drawn last so it sits on top)
  lines.push(`<rect x="${gx}" y="${gy}" width="${gridSize}" height="${gridSize}"
    fill="none" stroke="${theme.grid}" stroke-width="1.5"/>`);

  lines.push('</svg>');
  return lines.join('\n');
}

/** Get sign name for a given [row, col]. Reverse lookup from SIGN_POSITIONS. */
function getSignForCell(row, col) {
  for (const [sign, [r, c]] of Object.entries(SIGN_POSITIONS)) {
    if (r === row && c === col) return sign;
  }
  return null;
}

/** Escape special XML chars. */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a single South Indian chart into a container element.
 *
 * @param {string} containerId - ID of the HTML element to render into
 * @param {object} chartData   - { planets, lagna, chartName }
 * @param {object} options     - { size, theme, showDegrees, language }
 */
export function renderChart(containerId, chartData, options = {}) {
  const el = document.getElementById(containerId);
  if (!el) throw new Error(`renderChart: element #${containerId} not found`);
  el.innerHTML = buildSVG(chartData, options);
}

/**
 * Render all 16 divisional charts in a responsive grid.
 *
 * @param {string} containerId  - ID of the HTML container
 * @param {object} allChartsData - {
 *   D1: { planets, lagna, chartName },
 *   D9: { ... },
 *   ... (all 16)
 * }
 */
export function renderAllCharts(containerId, allChartsData) {
  const el = document.getElementById(containerId);
  if (!el) throw new Error(`renderAllCharts: element #${containerId} not found`);

  // Mukhya Varga — shown first, prominently
  const MUKHYA  = ['D1', 'D9', 'D10', 'D7', 'D12', 'D24', 'D20', 'D60'];
  const ADVANCED = ['D2', 'D3', 'D4', 'D16', 'D27', 'D30', 'D40', 'D45'];

  const SIZE_MUKHYA   = 280;
  const SIZE_ADVANCED = 240;

  function buildGrid(keys, size, theme = 'dark') {
    return keys.map(key => {
      const data = allChartsData[key];
      if (!data) return '';
      const svg = buildSVG(data, { size, theme, showDegrees: false });
      return `<div style="display:inline-block;margin:6px;vertical-align:top">${svg}</div>`;
    }).join('');
  }

  el.innerHTML = `
    <div style="font-family:Georgia,serif;background:#0f0c18;padding:1.5rem;border-radius:8px;">
      <h2 style="color:#C9A84C;font-size:1rem;text-transform:uppercase;letter-spacing:.1em;
        margin:0 0 1rem;padding-bottom:.5rem;border-bottom:1px solid #2a2240;">
        Mukhya Varga — Primary Charts
      </h2>
      <div style="text-align:center">
        ${buildGrid(MUKHYA, SIZE_MUKHYA, 'dark')}
      </div>

      <details style="margin-top:1.5rem;">
        <summary style="color:#7a6e8a;font-size:.85rem;letter-spacing:.08em;
          text-transform:uppercase;cursor:pointer;padding:.5rem 0;
          border-top:1px solid #2a2240;list-style:none;user-select:none;">
          ▸ Advanced Charts (D2 D3 D4 D16 D27 D30 D40 D45)
        </summary>
        <div style="text-align:center;margin-top:1rem;">
          ${buildGrid(ADVANCED, SIZE_ADVANCED, 'dark')}
        </div>
      </details>
    </div>`;
}

// Re-export theme/position constants for external use
export { SIGN_POSITIONS, PLANET_ABBR, THEMES };
