/**
 * main.js — Prarabdham Application Controller
 * Connects all modules, handles form state, renders chart output.
 * Pure ES module, no frameworks.
 */

import { getCoordinates, getTimezone, getJulianDay, getLagna, getPlanets, getHouses } from './calculations/core.js';
import { getMahaDashas, getCurrentDasha, getAntardashas, getPratyantardashas } from './calculations/dasha.js';
import { getAllVargaCharts } from './calculations/divisional.js';
import { getFullDignityReport } from './calculations/dignity.js';
import { getAllYogas, getHouseLords } from './calculations/yoga.js';
import { buildChartReport } from './rendering/interpretation.js';
import { renderChart } from './rendering/southindian.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIGNS_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

const PLANET_ORDER = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];

const MUKHYA_KEYS   = ['D1','D9','D10','D7','D12','D24','D20','D60'];
const ADVANCED_KEYS = ['D2','D3','D4','D16','D27','D30','D40','D45'];

const CHART_NAMES = {
  D1:'D1 Rasi', D2:'D2 Hora', D3:'D3 Drekkana', D4:'D4 Chaturthamsa',
  D7:'D7 Saptamsa', D9:'D9 Navamsa', D10:'D10 Dashamsa', D12:'D12 Dwadashamsa',
  D16:'D16 Shodashamsa', D20:'D20 Vimshamsa', D24:'D24 Chaturvimshamsa',
  D27:'D27 Bhamsa', D30:'D30 Trimshamsa', D40:'D40 Khavedamsa',
  D45:'D45 Akshavedamsa', D60:'D60 Shashtiamsa',
};

const AYANAMSA_NOTES = {
  lahiri:      'Most widely used in traditional Jyotish. Recommended if unsure.',
  raman:       'Developed by B.V. Raman. Used in many South Indian traditions.',
  krishnamurti:'Used in Krishnamurti Paddhati (KP) system. Slightly different from Lahiri.',
  yukteshwar:  'From Sri Yukteshwar\'s Holy Science. Closer to Western sidereal.',
  true_citra:  'Precise variant of Lahiri, aligns Chitra nakshatra star exactly.',
};

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const $ = id => document.getElementById(id);

// ---------------------------------------------------------------------------
// Place search via OpenStreetMap Nominatim
// ---------------------------------------------------------------------------

let selectedPlace = null;
let searchTimeout = null;

function setupPlaceSearch() {
  const input   = $('f-place');
  const results = $('place-results');
  const confirmed = $('place-confirmed');

  input.addEventListener('input', () => {
    const q = input.value.trim();
    confirmed.textContent = '';
    selectedPlace = null;

    clearTimeout(searchTimeout);
    if (q.length < 3) { results.classList.remove('open'); return; }

    searchTimeout = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();

        results.innerHTML = '';
        if (!data.length) {
          results.innerHTML = '<div class="place-result-item" style="color:var(--text-3)">No results found — try a different spelling or add the country name.</div>';
          results.classList.add('open');
          return;
        }

        data.forEach(place => {
          const item = document.createElement('div');
          item.className = 'place-result-item';
          item.textContent = place.display_name;
          item.addEventListener('click', () => {
            selectedPlace = {
              name:      place.display_name,
              latitude:  parseFloat(place.lat),
              longitude: parseFloat(place.lon),
            };
            input.value = place.display_name;
            confirmed.textContent = `✓ ${place.display_name}`;
            results.classList.remove('open');
          });
          results.appendChild(item);
        });
        results.classList.add('open');
      } catch (e) {
        results.innerHTML = '<div class="place-result-item" style="color:var(--text-3)">Place search unavailable. Enter coordinates manually or try again.</div>';
        results.classList.add('open');
      }
    }, 400);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#f-place') && !e.target.closest('#place-results')) {
      results.classList.remove('open');
    }
  });
}

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------

function setupNoTimeCheckbox() {
  const cb   = $('f-no-time');
  const time = $('f-time');
  const note = $('noon-note');
  cb.addEventListener('change', () => {
    time.disabled = cb.checked;
    if (cb.checked) { time.value = '12:00'; note.classList.add('show'); }
    else            { note.classList.remove('show'); }
  });
}

function setupAyanamsaNote() {
  const sel  = $('f-ayanamsa');
  const note = $('ayanamsa-note');
  sel.addEventListener('change', () => {
    note.textContent = AYANAMSA_NOTES[sel.value] || '';
  });
}

function showError(msg) {
  const el = $('form-error');
  el.textContent = msg;
  el.classList.add('show');
}
function clearError() { $('form-error').classList.remove('show'); }

function setLoading(msg = 'Calculating planetary positions…') {
  $('chart-input-section').style.display = 'none';
  $('loading-overlay').classList.add('show');
  $('loading-msg').textContent = msg;
}
function setLoadingMsg(msg) { $('loading-msg').textContent = msg; }
function hideLoading() { $('loading-overlay').classList.remove('show'); }

// ---------------------------------------------------------------------------
// Whole Sign house assignment
// ---------------------------------------------------------------------------

function buildPlanetHouses(planets, lagnaSign) {
  const lagnaIdx = SIGNS_ORDER.indexOf(lagnaSign);
  const map = {};
  for (const [name, planet] of Object.entries(planets)) {
    const pIdx = SIGNS_ORDER.indexOf(planet.sign);
    map[name] = ((pIdx - lagnaIdx + 12) % 12) + 1;
  }
  map['Lagna'] = 1;
  return map;
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function chip(label, value) {
  return `<div class="qi-chip"><span class="qi-label">${label}</span><span class="qi-val">${value}</span></div>`;
}

function isPlaceholder(text) {
  return text && String(text).startsWith('PLACEHOLDER');
}

function renderText(text) {
  if (!text) return '';
  const str = String(text);
  if (isPlaceholder(str)) return `<span class="placeholder-text">[${str}]</span>`;
  return str.split('\n\n').map(p => `<p>${p}</p>`).join('');
}

function renderPlanetTable(planets, planetHouses, dignityReport) {
  return PLANET_ORDER.map(name => {
    const p  = planets[name];
    const dr = dignityReport[name] || {};
    if (!p) return '';
    const deg     = `${p.degrees}°${String(p.minutes).padStart(2,'0')}'`;
    const dig     = dr.dignity || '—';
    const digCls  = `dig-${dig.toLowerCase().replace(' ','-')}`;
    const str     = dr.strength?.rating || '—';
    const strCls  = `strength-${str}`;
    const retro   = p.isRetrograde ? '<span class="retro-mark">℞</span>' : '—';
    const comb    = dr.combust?.combust ? `<span class="combust-mark">yes ${dr.combust.degrees}°</span>` : '—';
    const h       = planetHouses[name] || '—';
    return `<tr>
      <td>${name}</td>
      <td>${p.sign}</td>
      <td>${h}</td>
      <td style="font-family:var(--font-mono)">${deg}</td>
      <td><span class="${digCls}">${dig}</span></td>
      <td><span class="${strCls}">${str}</span></td>
      <td>${retro}</td>
      <td>${comb}</td>
    </tr>`;
  }).join('');
}

function renderDashaTable(mahaDashas, currentDasha) {
  const today = new Date();
  return mahaDashas.map(d => {
    const isCurrent = currentDasha?.mahaDasha?.planet === d.planet &&
      currentDasha?.mahaDasha?.startDate === d.startDate;
    return `<tr class="${isCurrent ? 'dasha-current' : ''}">
      <td>${d.planet}${isCurrent ? ' ◄' : ''}</td>
      <td>${d.startDate}</td>
      <td>${d.endDate}</td>
      <td>${d.durationYears}</td>
    </tr>`;
  }).join('');
}

function renderHouseList(houseReadings, planets) {
  const ABBR = { Sun:'Su', Moon:'Mo', Mars:'Ma', Mercury:'Me', Jupiter:'Ju', Venus:'Ve', Saturn:'Sa', Rahu:'Ra', Ketu:'Ke' };
  return houseReadings.map(h => {
    const badges = h.occupants.map(o => {
      const retro = planets[o]?.isRetrograde;
      return `<span class="hp-badge${retro?' retro':''}">${ABBR[o]||o}${retro?'℞':''}</span>`;
    }).join('');
    const aspStr = h.aspects.length
      ? `<div style="font-size:.72rem;color:var(--text-3);font-family:var(--font-mono);margin-top:.5rem">Aspects: ${h.aspects.map(a=>`${a.planet}(${a.aspectType})`).join(' · ')}</div>` : '';
    return `<div class="house-item">
      <div class="house-item-head">
        <span class="house-num-badge">H${h.houseNumber}</span>
        <span class="house-sign-label">${h.sign}</span>
        <div class="house-planets">${badges}</div>
      </div>
      <div class="house-item-body">${renderText(h.reading)}${aspStr}</div>
    </div>`;
  }).join('');
}

function renderYogaList(yogaReadings) {
  if (!yogaReadings.length) return '<p style="color:var(--text-3);font-size:.88rem">No Yogas detected in this chart.</p>';
  return yogaReadings.map(y => `
    <div class="yoga-item">
      <div class="yoga-item-name">${y.name}</div>
      <div class="yoga-item-detected">${y.description}</div>
      <div class="yoga-item-reading">${renderText(y.reading)}</div>
      ${y.uncertainty ? `<div class="yoga-uncertainty">⚠ ${y.uncertainty}</div>` : ''}
    </div>`).join('');
}

// ---------------------------------------------------------------------------
// Chart rendering (South Indian SVG)
// ---------------------------------------------------------------------------

function renderChartGrid(varga, planets, planetHouses, containerEl, keys) {
  containerEl.innerHTML = '';
  const size = Math.min(260, Math.floor((window.innerWidth - 80) / 2));

  keys.forEach(key => {
    const data = varga[key];
    if (!data) return;

    // Build chartData for southindian.js
    const chartPlanets = {};
    for (const [name, pos] of Object.entries(data)) {
      if (name === 'Lagna') continue;
      chartPlanets[name] = { sign: pos.sign, degrees: pos.degrees, minutes: pos.minutes, isRetrograde: planets[name]?.isRetrograde || false };
    }
    const lagnaData = data.Lagna || {};

    const cell = document.createElement('div');
    cell.className = 'chart-cell';
    cell.innerHTML = `<div class="chart-cell-label">${CHART_NAMES[key] || key}</div><div id="chart-${key}"></div>`;
    containerEl.appendChild(cell);

    const inner = document.createElement('div');
    inner.id = `sv-${key}`;
    cell.appendChild(inner);

    try {
      renderChart(`sv-${key}`, { planets: chartPlanets, lagna: lagnaData, chartName: '' },
        { size, theme: 'dark', showDegrees: key === 'D1' });
    } catch(e) {
      inner.textContent = `${key} render error`;
    }
  });
}

// ---------------------------------------------------------------------------
// Advanced charts toggle
// ---------------------------------------------------------------------------

function setupAdvancedToggle() {
  const btn = $('advanced-toggle');
  const panel = $('advanced-charts');
  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    panel.classList.toggle('open');
  });
}

// ---------------------------------------------------------------------------
// Main chart generation
// ---------------------------------------------------------------------------

async function generateChart() {
  clearError();

  // ── Validate inputs ──
  const name     = $('f-name').value.trim();
  const dateVal  = $('f-date').value;
  const timeVal  = $('f-time').value || '12:00';
  const noTime   = $('f-no-time').checked;
  const ayanamsa = $('f-ayanamsa').value;

  if (!dateVal) { showError('Please enter your date of birth.'); return; }

  // Place: either from search or try to geocode the raw input
  let place = selectedPlace;
  if (!place) {
    const rawPlace = $('f-place').value.trim();
    if (!rawPlace) { showError('Please enter your place of birth.'); return; }
    // Try geocoding
    try {
      setLoading('Finding your birth place…');
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(rawPlace)}&format=json&limit=1`;
      const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (!data.length) {
        hideLoading();
        $('chart-input-section').style.display = 'block';
        showError(`Could not find "${rawPlace}". Please select a location from the dropdown suggestions.`);
        return;
      }
      place = { name: data[0].display_name, latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    } catch(e) {
      hideLoading();
      $('chart-input-section').style.display = 'block';
      showError('Place lookup failed. Check your internet connection and try again.');
      return;
    }
  }

  // ── Parse date/time ──
  const [year, month, day] = dateVal.split('-').map(Number);
  const [hour, minute]     = timeVal.split(':').map(Number);

  try {
    // ── Step 1: Julian Day ──
    setLoading('Calculating Julian Day…');
    let tz;
    try {
      const tzResult = await getTimezone(place.latitude, place.longitude);
      tz = tzResult.timezone;
    } catch(e) {
      // Fallback: estimate from longitude
      tz = `Etc/GMT${place.longitude >= 0 ? '-' : '+'}${Math.round(Math.abs(place.longitude)/15)}`;
    }
    const jdr = await getJulianDay(year, month, day, hour, minute, tz);
    const jd  = jdr.julianDay;

    // ── Step 2: Planets + Lagna ──
    setLoadingMsg('Computing planetary positions with Swiss Ephemeris…');
    const [planets, lagna] = await Promise.all([
      getPlanets(jd, ayanamsa),
      getLagna(jd, place.latitude, place.longitude, ayanamsa),
    ]);

    // ── Step 3: Whole Sign houses ──
    const planetHouses = buildPlanetHouses(planets, lagna.sign);

    // ── Step 4: Divisional charts ──
    setLoadingMsg('Calculating 16 Varga charts…');
    const varga = getAllVargaCharts(planets, lagna);

    // ── Step 5: Dasha ──
    setLoadingMsg('Computing Vimshottari Dasha…');
    const birthDate    = new Date(Date.UTC(year, month-1, day, hour - Math.floor(place.longitude/15), minute));
    const mahaDashas   = getMahaDashas(planets.Moon.longitude, birthDate);
    const currentDasha = getCurrentDasha(mahaDashas, new Date());
    let antardasha = null, pratyantardasha = null;
    if (currentDasha?.mahaDasha) {
      const ads = getAntardashas(currentDasha.mahaDasha);
      const now = new Date();
      antardasha = ads.find(a => {
        const s = new Date(a.startDate), e = new Date(a.endDate);
        return now >= s && now < e;
      }) || ads[0];
      if (antardasha) {
        const pds = getPratyantardashas(antardasha);
        pratyantardasha = pds.find(p => {
          const s = new Date(p.startDate), e = new Date(p.endDate);
          return now >= s && now < e;
        }) || pds[0];
      }
    }

    // ── Step 6: Dignity ──
    setLoadingMsg('Assessing planetary dignities…');
    const dignityReport = getFullDignityReport(planets, lagna, planetHouses, planets.Sun?.longitude);

    // ── Step 7: Yogas ──
    setLoadingMsg('Detecting Yogas…');
    const yogas = getAllYogas(planets, planetHouses, lagna.sign);

    // ── Step 8: Interpretation ──
    setLoadingMsg('Building interpretation…');
    const chartData = {
      lagna, planets,
      dashas: {
        current: { mahaDasha: currentDasha?.mahaDasha, antardasha, pratyantardasha },
        sequence: mahaDashas,
      },
      yogas, dignityReport,
    };
    const report = buildChartReport(chartData);

    // ── Render output ──
    hideLoading();
    renderOutput({
      name, place, year, month, day, hour, minute, noTime, ayanamsa,
      lagna, planets, planetHouses, varga, mahaDashas, currentDasha,
      antardasha, pratyantardasha, dignityReport, yogas, report,
    });

  } catch(err) {
    hideLoading();
    $('chart-input-section').style.display = 'block';
    showError(`Calculation failed: ${err.message}. If this persists, try refreshing the page.`);
    console.error(err);
  }
}

// ---------------------------------------------------------------------------
// Render chart output
// ---------------------------------------------------------------------------

function renderOutput(data) {
  const {
    name, place, year, month, day, hour, minute, noTime, ayanamsa,
    lagna, planets, planetHouses, varga, mahaDashas, currentDasha,
    antardasha, pratyantardasha, dignityReport, yogas, report,
  } = data;

  // Header
  const months = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
  $('out-name').textContent = name || 'Birth Chart';
  const timeStr = noTime ? '12:00 noon (approximate)' : `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
  $('out-details').textContent = `${months[month]} ${day}, ${year} · ${timeStr} · ${place.name.split(',').slice(0,2).join(',')} · ${ayanamsa.charAt(0).toUpperCase()+ayanamsa.slice(1)} Ayanamsa`;

  // Quick info
  const moon = planets.Moon;
  const md   = currentDasha?.mahaDasha;
  $('quick-info').innerHTML = [
    chip('Lagna',    lagna.sign),
    chip('Moon',     moon?.sign || '—'),
    chip('Nakshatra', lagna.nakshatra || '—'),
    chip('Pada',     lagna.pada || '—'),
    md ? chip('Maha Dasha', md.planet) : '',
    antardasha ? chip('Antardasha', antardasha.planet) : '',
  ].join('');

  // Planet table
  $('planet-tbody').innerHTML = renderPlanetTable(planets, planetHouses, dignityReport);

  // Dasha strip
  if (md) {
    $('dasha-strip').innerHTML = [
      `<div style="background:var(--bg-2);border:1px solid var(--border);border-radius:5px;padding:.3rem .75rem;font-family:var(--font-mono);font-size:.78rem"><span style="color:var(--text-3);display:block;font-size:.65rem;text-transform:uppercase;letter-spacing:.06em">Maha Dasha</span><span style="color:var(--gold)">${md.planet} · ${md.startDate} — ${md.endDate}</span></div>`,
      antardasha ? `<div style="background:var(--bg-2);border:1px solid var(--border);border-radius:5px;padding:.3rem .75rem;font-family:var(--font-mono);font-size:.78rem"><span style="color:var(--text-3);display:block;font-size:.65rem;text-transform:uppercase;letter-spacing:.06em">Antardasha</span><span style="color:var(--text-2)">${antardasha.planet} · ${antardasha.startDate} — ${antardasha.endDate}</span></div>` : '',
      pratyantardasha ? `<div style="background:var(--bg-2);border:1px solid var(--border);border-radius:5px;padding:.3rem .75rem;font-family:var(--font-mono);font-size:.78rem"><span style="color:var(--text-3);display:block;font-size:.65rem;text-transform:uppercase;letter-spacing:.06em">Pratyantardasha</span><span style="color:var(--text-2)">${pratyantardasha.planet}</span></div>` : '',
    ].join('');
  }

  // Dasha table
  $('dasha-tbody').innerHTML = renderDashaTable(mahaDashas, currentDasha);

  // Yogas
  $('yoga-list').innerHTML = renderYogaList(report.yogaReadings);

  // Interpretation sections
  $('interp-lagna').innerHTML   = renderText(report.lagnaReading);
  $('interp-dasha').innerHTML   = renderText(report.dashaReading);
  $('house-list').innerHTML     = renderHouseList(report.houseReadings, planets);
  $('interp-summary').innerHTML = renderText(report.summary);

  // Closing note (always shown)
  $('closing-note-text').textContent = report.closingNote;

  // Varga charts
  renderChartGrid(varga, planets, planetHouses, $('mukhya-charts'), MUKHYA_KEYS);
  renderChartGrid(varga, planets, planetHouses, $('advanced-chart-grid'), ADVANCED_KEYS);

  // Show output
  $('chart-output').style.display = 'block';
  $('chart-output').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Wire PDF button
  $('pdf-btn').onclick = () => window.print();

// ---------------------------------------------------------------------------
// Start over
// ---------------------------------------------------------------------------

function setupRestart() {
  $('restart-btn').addEventListener('click', () => {
    $('chart-output').style.display = 'none';
    $('chart-input-section').style.display = 'block';
    $('chart-input-section').scrollIntoView({ behavior: 'smooth' });
  });

  // PDF — enable button and wire up window.print()
  const pdfBtn = $('pdf-btn');
  pdfBtn.disabled = false;
  pdfBtn.title = 'Print or save as PDF';
  pdfBtn.textContent = 'Download PDF';
  pdfBtn.addEventListener('click', () => {
    // Expand advanced charts so they print if open
    window.print();
  });
}


// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Only run on chart page
  if (!$('generate-btn')) return;

  setupPlaceSearch();
  setupNoTimeCheckbox();
  setupAyanamsaNote();
  setupAdvancedToggle();
  setupRestart();

  $('generate-btn').addEventListener('click', generateChart);
  $('f-date').addEventListener('keydown', e => { if (e.key === 'Enter') generateChart(); });
});
