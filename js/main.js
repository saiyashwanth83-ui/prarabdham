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
    return `<div class="house-item">
      <div class="house-item-head">
        <span class="house-num-badge">H${h.houseNumber}</span>
        <span class="house-sign-label">${h.sign}</span>
        <div class="house-planets">${badges}</div>
      </div>
      <div class="house-item-body">${renderText(h.reading)}</div>
    </div>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// Divisional Chart Readings
// ---------------------------------------------------------------------------

/**
 * Generate written readings for D9 and other Mukhya Varga charts.
 * Uses varga data already computed by getAllVargaCharts().
 */
function renderVargaReadings(varga, lagna, planets, planetHouses) {
  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
    'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const SIGN_LORD_MAP = {
    Aries:'Mars',Taurus:'Venus',Gemini:'Mercury',Cancer:'Moon',
    Leo:'Sun',Virgo:'Mercury',Libra:'Venus',Scorpio:'Mars',
    Sagittarius:'Jupiter',Capricorn:'Saturn',Aquarius:'Saturn',Pisces:'Jupiter'
  };
  const NAK_SPAN = 360/27;

  // Helper: get sign from varga position
  function getSign(pos) { return pos?.sign || '—'; }

  // Helper: find lagna sign in a varga chart (Lagna key)
  function getVargaLagna(key) {
    return varga[key]?.Lagna?.sign || '—';
  }

  // Helper: find which sign a planet occupies in a varga chart
  function getPlanetSign(key, planet) {
    return varga[key]?.[planet]?.sign || '—';
  }

  // Helper: detect dignity in a varga
  const EXALTATION = {Sun:'Aries',Moon:'Taurus',Mars:'Capricorn',Mercury:'Virgo',
    Jupiter:'Cancer',Venus:'Pisces',Saturn:'Libra'};
  const OWN_SIGNS = {Sun:['Leo'],Moon:['Cancer'],Mars:['Aries','Scorpio'],
    Mercury:['Gemini','Virgo'],Jupiter:['Sagittarius','Pisces'],
    Venus:['Taurus','Libra'],Saturn:['Capricorn','Aquarius']};
  const DEBILITATION = {Sun:'Libra',Moon:'Scorpio',Mars:'Cancer',Mercury:'Pisces',
    Jupiter:'Capricorn',Venus:'Virgo',Saturn:'Aries'};

  function vargaDignity(planet, sign) {
    if (EXALTATION[planet] === sign) return 'exalted';
    if ((OWN_SIGNS[planet]||[]).includes(sign)) return 'own sign';
    if (DEBILITATION[planet] === sign) return 'debilitated';
    return null;
  }

  // Find most significant D9 planets (exalted/own/debilitated)
  function getSignificantD9() {
    const notable = [];
    const planets9 = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
    for (const p of planets9) {
      const s = getPlanetSign('D9', p);
      const dig = vargaDignity(p, s);
      if (dig) notable.push({ planet:p, sign:s, dignity:dig });
    }
    return notable;
  }

  const d9Lagna = getVargaLagna('D9');
  const d9LagnaLord = SIGN_LORD_MAP[d9Lagna] || '—';
  const d9LagnaLordSign = getPlanetSign('D9', d9LagnaLord);
  const d9Notable = getSignificantD9();

  // D9 notable planet sentence
  let d9NotableSent = '';
  if (d9Notable.length > 0) {
    d9NotableSent = d9Notable.map(n =>
      `${n.planet} is ${n.dignity} in ${n.sign} in the Navamsa — ${
        n.dignity === 'exalted' ? 'indicating a strengthened and refined expression of this planet\u2019s qualities in the soul\u2019s deeper dharmic life'
        : n.dignity === 'own sign' ? 'suggesting this planet\u2019s energy is at ease in the deeper chart, supporting the soul\u2019s inherent dharmic direction'
        : 'indicating a specific challenge or area of karmic friction in the soul\u2019s deeper nature that asks for conscious work rather than avoidance'
      }.`
    ).join(' ');
  } else {
    d9NotableSent = 'No planets are exalted or debilitated in the Navamsa for this chart — the energy distributes across the chart without a single dominant point of intensity or challenge at the Navamsa level.';
  }

  // D9 Lagna quality
  const D9_LAGNA_QUALITY = {
    Aries:"a courageous, initiating quality — the soul's dharmic direction involves direct, purposeful engagement with life rather than contemplation from a distance",
    Taurus:"a steady, grounded orientation — the soul's dharmic direction involves building something of lasting value and learning the right relationship with beauty and material form",
    Gemini:"a curious, relational quality — the soul's dharmic direction involves communication, learning, and the development of genuine discrimination in the use of intelligence",
    Cancer:"a deeply nurturing, emotionally perceptive nature — the soul's dharmic direction involves learning the right relationship with care, belonging, and emotional truth",
    Leo:"a quality of inherent dignity and the drive toward genuine self-expression — the soul's dharmic direction involves developing authentic authority rather than performed confidence",
    Virgo:"a precise, service-oriented nature — the soul's dharmic direction involves the refinement of skill and discrimination, and the practice of honest, grounded service",
    Libra:"a relational, harmonising orientation — the soul's dharmic direction involves genuine fairness, conscious partnership, and developing clarity about what one actually values",
    Scorpio:"a deep, penetrating quality — the soul's dharmic direction involves genuine transformation, the willingness to see through surface reality, and the honest engagement with what is hidden",
    Sagittarius:"a philosophical, meaning-seeking orientation — the soul's dharmic direction involves the honest pursuit of wisdom and the development of genuine understanding over comfortable belief",
    Capricorn:"a disciplined, structured orientation — the soul's dharmic direction involves sustained effort, integrity, and the patient building of something genuinely durable",
    Aquarius:"a principled, collective orientation — the soul's dharmic direction involves genuine service to a larger purpose and the development of detachment grounded in understanding rather than distance",
    Pisces:"a fluid, spiritually permeable orientation — the soul's dharmic direction involves compassion, the dissolution of unnecessary ego boundaries, and the genuine recognition of what is real beneath appearances",
  };

  const d9LagnaDesc = D9_LAGNA_QUALITY[d9Lagna] || 'a specific dharmic orientation whose full quality is best assessed in context of the complete Navamsa chart';

  const D9_READ = `The Navamsa — D9 — is the most important of the divisional charts. It reveals the soul's deeper nature, the quality of the dharmic life beneath the surface of the D1, and is traditionally read for themes of marriage, inner resilience, and the soul's direction of growth. In this chart, the Navamsa Lagna is ${d9Lagna} — indicating ${d9LagnaDesc}. The Navamsa Lagna lord ${d9LagnaLord} is placed in ${d9LagnaLordSign} in the Navamsa — the lord's placement shows how this dharmic orientation finds its most natural channel of expression. ${d9NotableSent} The D9 should always be read alongside the D1 — a planet that appears weak in the Rasi chart but is strong in the Navamsa often recovers significant strength in lived experience; the reverse is also true.`;

  // Other Mukhya Varga readings
  const d10Lagna = getVargaLagna('D10');
  const D10_READ = `The Dashamsa — D10 — examines career, public role, and the nature of one's conscious contribution to the world. It is the primary chart for understanding professional life and the specific quality of action through which a person engages the world. In this chart, the D10 Lagna is ${d10Lagna} — ruled by ${SIGN_LORD_MAP[d10Lagna]}, indicating the general quality and direction of the native's most purposeful worldly engagement. The D10 is best understood not as a predictor of profession but as a map of the kind of action that is most naturally aligned with the soul's direction in this life.`;

  const d7Lagna = getVargaLagna('D7');
  const D7_READ = `The Saptamsa — D7 — examines children, creative progeny, and the quality of courage and effort through which one brings new life into existence (in the broadest sense — creative works, projects, and actual children). The D7 Lagna here is ${d7Lagna}, indicating the general quality of this creative and generative domain. Saturn's traditional role in D7 is particularly significant — its placement shapes whether creative effort flows with relative ease or requires sustained patient discipline.`;

  const d12Lagna = getVargaLagna('D12');
  const D12_READ = `The Dwadashamsa — D12 — examines the parents, ancestral inheritance, and the karmic material carried from the family of origin. It also has significance for the quality of liberation and the themes of the 12th house writ larger across the life. The D12 Lagna is ${d12Lagna} here — the quality of the Lagna sign and the placement of its lord in the D12 indicate the specific texture of the ancestral inheritance this soul carries and works through in this life.`;

  const d24Lagna = getVargaLagna('D24');
  const D24_READ = `The Chaturvimshamsa — D24 — examines education, learning, and the quality of fortune available in this life through knowledge. It is the primary chart for understanding formal and informal education, intellectual development, and the specific kind of knowledge the soul is oriented toward in this life. The D24 Lagna here is ${d24Lagna} — this sign and the placement of its lord in the D24 indicate the native's deepest orientation toward learning and the specific domain of knowledge most naturally aligned with this soul's development.`;

  const d20Lagna = getVargaLagna('D20');
  const D20_READ = `The Vimshamsa — D20 — examines spiritual merit, religious practice, and the soul's orientation toward sadhana and devotional life. Of the Mukhya Varga charts, D20 is the most directly connected to inner practice rather than outer life domain. The D20 Lagna here is ${d20Lagna} — the quality of this sign and the placement of its lord in the D20 indicate the specific spiritual orientation most naturally available to this soul and the kind of practice that is most genuinely aligned with its dharmic direction.`;

  const d60Lagna = getVargaLagna('D60');
  const D60_READ = `The Shashtiamsa — D60 — is considered by classical texts to be the most sensitive and comprehensive of all divisional charts, encompassing the total karma of the life. It requires precise birth time — even a few minutes' variation significantly shifts D60 positions. The D60 Lagna here is ${d60Lagna}. Because of its extreme sensitivity to birth time accuracy, D60 placements should be verified against life events by a qualified practitioner before drawing conclusions. What the D60 shows when correctly calibrated is the overall karmic texture of the life — the specific quality of Prarabdha being worked through in this incarnation.`;

  // Advanced charts status
  const ADVANCED_STATUS = `The eight advanced divisional charts — D2 (Hora), D3 (Drekkana), D4 (Chaturthamsa), D16 (Shodashamsa), D27 (Bhamsa), D30 (Trimshamsa), D40 (Khavedamsa), D45 (Akshavedamsa) — are computed and displayed in the collapsible "Advanced Charts" section above. Detailed written readings for these eight charts are not provided here as each requires specialist interpretation in context of the complete chart. Their primary use is for specialist Jyotish analysis rather than general self-understanding.`;

  function block(title, content) {
    return `<div class="interp-section" style="margin-bottom:1.5rem">
      <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;color:var(--gold-dim);
        font-family:var(--font-mono);margin-bottom:.6rem;padding-bottom:.3rem;
        border-bottom:1px solid var(--border)">${title}</div>
      <div class="interp-block">${renderText(content)}</div>
    </div>`;
  }

  return [
    block('D9 — Navamsa', D9_READ),
    block('D10 — Dashamsa', D10_READ),
    block('D7 — Saptamsa', D7_READ),
    block('D12 — Dwadashamsa', D12_READ),
    block('D24 — Chaturvimshamsa', D24_READ),
    block('D20 — Vimshamsa', D20_READ),
    block('D60 — Shashtiamsa', D60_READ),
    block('Advanced Charts — D2 D3 D4 D16 D27 D30 D40 D45', ADVANCED_STATUS),
  ].join('');
}

// ---------------------------------------------------------------------------
// Parihara Section
// ---------------------------------------------------------------------------

/**
 * Identifies challenged planets and provides chart-specific parihara guidance.
 * Uses dignity.js output — debilitated, combust, or enemy+challenged = triggered.
 */
function renderPariharaSection(dignityReport, currentDasha, lagna, planets, planetHouses) {
  const PLANET_ORDER = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];

  // Planet-specific parihara directions
  const PLANET_PARIHARA = {
    Sun: "The Sun's challenge in this chart calls for practices that strengthen authentic self-expression and the capacity to act from genuine inner authority rather than from need for external validation. Surya Namaskar — Sun Salutations — practiced with full attention at sunrise on Sunday mornings is the most direct and universally accessible Sun parihara. Chanting the Aditya Hridayam or the Surya Beeja mantra (Om Hraam Hreem Hraum Sah Suryaya Namaha) 108 times, preferably on Sundays, is widely practiced. The deeper sadhana direction for a challenged Sun is Svadhyaya — honest self-reflection — regularly asking what one genuinely is independent of how one is perceived.",
    Moon: "The Moon's challenge in this chart points toward the need for deliberate cultivation of genuine inner stillness and emotional clarity. Chandra mantra (Om Som Somaya Namaha) practiced on Monday evenings, particularly on Purnima (full moon), is the classical approach. Nadi Shodhana — alternate nostril breathing — practiced regularly before sleep genuinely supports the Moon's domain of mind and emotional stability. Water-based practices and the regular offering of water to the Moon on full moon nights are simple and widely practiced forms of Chandra parihara.",
    Mars: "The challenge of Mars in this chart calls for the conscious channelling of energy into purposeful, disciplined action rather than reactive force. Mangal mantra (Om Kraam Kreem Kraum Sah Bhaumaya Namaha) practiced on Tuesdays is the classical approach. Physical practice — Surya Namaskar with sustained focus, or any physical discipline maintained with genuine consistency — directly addresses Mars's domain of energy and directed will. Dana on Tuesdays, particularly of red lentils or copper items to those genuinely in need, is a traditional approach.",
    Mercury: "The challenge of Mercury in this chart calls for the deliberate development of genuine discriminating intelligence alongside whatever communicative or analytical difficulty is present. Budha mantra (Om Braam Breem Braum Sah Budhaya Namaha) practiced on Wednesdays supports Mercury's domain. Reading genuine philosophy or wisdom texts with concentrated attention — Svadhyaya as a direct Mercury practice — is particularly appropriate. Green foods and items offered to students or those engaged in learning on Wednesdays is a simple and widely practiced Dana approach.",
    Jupiter: "The challenge of Jupiter in this chart calls for genuine engagement with wisdom and dharmic practice rather than comfortable philosophical familiarity without lived depth. Guru mantra (Om Graam Greem Graum Sah Gurave Namaha) practiced on Thursdays is the classical approach. Offering food or teaching to those genuinely in need on Thursdays is a direct form of Guru parihara. The deeper sadhana direction for a challenged Jupiter is ensuring that whatever philosophical or spiritual framework is held is actually being lived — Jnana Yoga practiced honestly rather than as intellectual accumulation.",
    Venus: "The challenge of Venus in this chart calls for the conscious development of genuine discernment in the domains of relationship, creativity, and value — developing the capacity to recognise what is genuinely beautiful and genuinely worth valuing rather than merely what is pleasant. Shukra mantra (Om Draam Dreem Draum Sah Shukraya Namaha) practiced on Fridays is the classical approach. Offering white flowers or sweets to those genuinely in need on Fridays is traditional. The deeper direction is developing genuine aesthetic discernment rather than merely sensory indulgence.",
    Saturn: "The challenge of Saturn in this chart calls for the deliberate embrace of discipline, patience, and the honest confrontation of what is real rather than what is comfortable. Shani mantra (Om Praam Preem Praum Sah Shanaischaraya Namaha) practiced on Saturdays is the classical approach. Service to the elderly, the marginalised, or those engaged in difficult physical labour — offered without expectation of recognition — is among the most direct forms of Saturn parihara. The deeper direction is engaging consciously with whatever Saturn is asking for rather than resisting its demands.",
    Rahu: "The challenge of Rahu in this chart calls for the development of genuine inner grounding and discriminating awareness in the face of amplified desire and the pull toward the novel and the unconventional. Rahu mantra (Om Raam Rahave Namaha) practiced on Saturdays is widely used. Charitable giving without expectation — particularly to causes that address collective suffering — is a traditional Rahu parihara. The deeper direction is developing genuine Pratyahara — the conscious withdrawal of attention from the consuming pull of desire — through sustained daily practice.",
    Ketu: "The challenge of Ketu in this chart calls for the honest engagement with what Ketu's placement is asking to be released — the development of conscious detachment in the specific domain Ketu occupies. Ketu mantra (Om Sraam Sreem Sraum Sah Ketave Namaha) practiced regularly is the classical approach. Charitable giving to spiritual institutions or to those engaged in genuine inner work is a traditional form of Ketu parihara. The deeper direction is developing genuine Dhyana — meditative absorption — allowing the natural dissolving quality of Ketu to become genuine spiritual practice rather than a source of vagueness or disconnection.",
  };

  // Identify challenged planets
  const challenged = [];
  for (const name of PLANET_ORDER) {
    const d = dignityReport[name];
    if (!d) continue;
    const isChallenged =
      d.dignity === 'debilitated' ||
      (d.combust && d.combust.combust) ||
      (d.dignity === 'enemy' && d.strength && d.strength.rating === 'challenged');
    if (isChallenged) {
      challenged.push({ name, dignity: d.dignity, combust: d.combust?.combust, strength: d.strength?.rating });
    }
  }

  let html = '';

  if (challenged.length === 0) {
    html += `<div class="interp-block"><p>No planets in this chart meet the classical criteria for challenged placement — debilitation, combustion, or enemy sign with low overall strength. The four foundational practices below remain universally applicable regardless of chart condition.</p></div>`;
  } else {
    html += `<div class="interp-block">`;
    html += `<p>The following planets in this chart carry specific challenges — debilitation, combustion close to the Sun, or placement in an enemy sign with low overall strength. Each calls for a specific direction of conscious engagement.</p>`;
    html += `</div>`;

    for (const p of challenged) {
      const reasons = [];
      if (p.dignity === 'debilitated') reasons.push('debilitated');
      if (p.combust) reasons.push('combust');
      if (p.dignity === 'enemy' && p.strength === 'challenged') reasons.push('in enemy sign with low strength');
      const reasonStr = reasons.join(', ');

      html += `<div class="interp-section" style="margin-bottom:1rem">
        <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--gold-dim);font-family:var(--font-mono);margin-bottom:.5rem">${p.name} — ${reasonStr}</div>
        <div class="interp-block">${PLANET_PARIHARA[p.name] || `${p.name} parihara: mantra practice on the day associated with this planet, dana appropriate to its domain, and the sadhana direction described in the house reading above.`}</div>
      </div>`;
    }
  }

  // Universal practices — verbatim from parihara.html content
  html += `<div class="interp-section" style="margin-top:1.5rem">
    <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--gold-dim);font-family:var(--font-mono);margin-bottom:.5rem">Universal Practices — Safe for Every Chart</div>
    <div class="interp-block">
      <p><strong>Surya Namaskar — Asana.</strong> Twelve postures moving in rhythm with the breath. A complete foundational practice accessible to most people. Daily practice — even a small number of rounds done with full attention — builds the physical foundation for everything else.</p>
      <p><strong>Nadi Shodhana — Pranayama.</strong> Alternate nostril breathing. The most widely recommended foundational Pranayama practice. Balances both energy channels, calms the nervous system. Safe for general practice without intensive guidance. Begin with five to ten minutes daily.</p>
      <p><strong>Svadhyaya — Self Study.</strong> Honest daily self-reflection. Turning the attention honestly toward one's own patterns, reactions, and inner states. This costs nothing, requires no teacher, and is perhaps the most powerful parihara available.</p>
      <p><strong>Pratyahara — Conscious Withdrawal.</strong> Five to ten minutes daily of simply sitting, withdrawing attention from external stimulation, and turning it inward.</p>
      <p style="font-style:italic;color:var(--text-3)">Gemstones, Yantra, and Homam require guidance from a qualified and experienced Pandit who has examined your complete chart. Prarabdham does not recommend specific gemstones for specific individuals. Approach all such recommendations with caution and always seek a second opinion.</p>
    </div>
  </div>`;

  return html;
}

// ---------------------------------------------------------------------------
// Sadhana Map Section
// ---------------------------------------------------------------------------

/**
 * Chart-specific sadhana direction based on Lagna, strongest/challenged planets,
 * and current Dasha. Uses logic from how-it-helps.html content.
 */
function renderSadhanaMap(lagna, planets, planetHouses, dignityReport, currentDasha, report) {
  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
    'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const SIGN_LORD = {
    Aries:'Mars',Taurus:'Venus',Gemini:'Mercury',Cancer:'Moon',
    Leo:'Sun',Virgo:'Mercury',Libra:'Venus',Scorpio:'Mars',
    Sagittarius:'Jupiter',Capricorn:'Saturn',Aquarius:'Saturn',Pisces:'Jupiter'
  };

  const lagnaSign = lagna.sign;
  const lagnaLord = SIGN_LORD[lagnaSign];
  const lagnaLordH = planetHouses[lagnaLord] || '?';
  const mdPlanet = currentDasha?.mahaDasha?.planet || '—';

  // Determine sadhana path indicators
  const mercury = dignityReport['Mercury'];
  const moon    = dignityReport['Moon'];
  const venus   = dignityReport['Venus'];
  const mars    = dignityReport['Mars'];
  const saturn  = dignityReport['Saturn'];
  const jupiter = dignityReport['Jupiter'];

  const mercuryH = planetHouses['Mercury'];
  const moonH    = planetHouses['Moon'];
  const venusH   = planetHouses['Venus'];
  const marsH    = planetHouses['Mars'];
  const saturnH  = planetHouses['Saturn'];

  // Score each path
  let jnana = 0, bhakti = 0, karma = 0, raja = 0;

  // Jnana indicators: strong Mercury, prominent 9th house, Jupiter strong
  if (mercury && ['own','exalted','friendly'].includes(mercury.dignity)) jnana += 2;
  if (mercuryH === 9 || mercuryH === 1) jnana += 1;
  if (jupiter && ['own','exalted'].includes(jupiter.dignity)) jnana += 1;
  if (['Gemini','Virgo'].includes(lagnaSign)) jnana += 1;

  // Bhakti indicators: strong Moon/Venus, 12th house occupied, water Lagna
  if (moon && ['own','exalted','friendly'].includes(moon.dignity)) bhakti += 2;
  if (venus && ['own','exalted','friendly'].includes(venus.dignity)) bhakti += 1;
  if (moonH === 12 || venusH === 12) bhakti += 1;
  if (['Cancer','Scorpio','Pisces'].includes(lagnaSign)) bhakti += 2;

  // Karma Yoga indicators: strong Mars/Saturn, 10th house occupied
  if (mars && ['own','exalted'].includes(mars.dignity)) karma += 2;
  if (saturn && ['own','exalted'].includes(saturn.dignity)) karma += 2;
  if (marsH === 10 || saturnH === 10) karma += 1;
  if (['Aries','Scorpio','Capricorn','Aquarius'].includes(lagnaSign)) karma += 1;

  // Raja Yoga / Ashtanga indicators: Saturn dignified, disciplined Lagna, Jupiter+Saturn
  if (saturn && ['own','exalted','friendly'].includes(saturn.dignity)) raja += 2;
  if (['Capricorn','Aquarius','Virgo'].includes(lagnaSign)) raja += 1;
  if (jupiter && saturn && ['own','exalted'].includes(jupiter.dignity)) raja += 1;

  // Find highest scoring path(s)
  const scores = { 'Jnana Yoga': jnana, 'Bhakti Yoga': bhakti, 'Karma Yoga': karma, 'Raja Yoga (Ashtanga)': raja };
  const maxScore = Math.max(...Object.values(scores));
  const primaryPaths = Object.entries(scores).filter(([,v]) => v === maxScore).map(([k]) => k);
  const pathStr = primaryPaths.join(' and ');

  // Path descriptions
  const PATH_DESC = {
    'Jnana Yoga': "The chart's indicators — a prominent Mercury, strong analytical capacity, and orientation toward the 9th house domain of wisdom and teaching — point toward Jnana Yoga as a natural sadhana direction. Jnana Yoga is the path of knowledge and honest self-inquiry: the sustained, patient practice of distinguishing the real from the unreal, the consciousness that observes from the patterns it observes. For this chart, the practice of Svadhyaya — systematic self-reflection and the study of genuine wisdom texts — is the most naturally aligned foundational approach.",
    'Bhakti Yoga': "The chart's indicators — a prominent Moon and/or Venus, sensitivity to the subtle, and an orientation toward the water element — point toward Bhakti Yoga as a natural sadhana direction. Bhakti Yoga is the path of devotion: the complete offering of the self toward the source, dissolving the sense of separation through love rather than understanding. For this chart, the cultivation of genuine devotional practice — mantra, puja, or any form of heartfelt offering to what is genuinely sacred — is the most naturally aligned foundational approach.",
    'Karma Yoga': "The chart's indicators — a strong Mars and/or Saturn, occupation of the 10th house, and an orientation toward disciplined purposeful action — point toward Karma Yoga as a natural sadhana direction. Karma Yoga is the path of conscious action: acting fully and completely in whatever domain calls for action, without attachment to results, working as an instrument of Dharma rather than for personal gain. For this chart, the key practice is bringing genuine inner presence and non-attachment to the work and effort that the chart already indicates are central life themes.",
    'Raja Yoga (Ashtanga)': "The chart's indicators — a dignified Saturn, the capacity for sustained inner discipline, and the orientation toward systematic inner work — point toward Raja Yoga as a natural sadhana direction. Raja Yoga, as systematised by Patanjali in the Yoga Sutras, works directly with the mind and energy through the eight limbs of Ashtanga Yoga: from ethical conduct and personal discipline through to deep meditative absorption. For this chart, the regular practice of the foundational limbs — Surya Namaskar, Nadi Shodhana, Svadhyaya, and Pratyahara — is the most naturally aligned approach, with the deeper limbs developed under genuine guidance.",
  };

  const pathContent = primaryPaths.map(p => PATH_DESC[p] || '').join(' ');

  // Find most significant emotional pattern from challenged or prominent planet
  const PLANET_ORDER = ['Saturn','Mars','Moon','Rahu','Ketu','Sun','Jupiter','Venus','Mercury'];
  let emotionPlanet = null;
  for (const name of PLANET_ORDER) {
    const d = dignityReport[name];
    if (!d) continue;
    if (d.dignity === 'debilitated' || (d.combust && d.combust.combust) ||
        (d.dignity === 'enemy' && d.strength && d.strength.rating === 'challenged')) {
      emotionPlanet = name;
      break;
    }
  }
  // Fallback: use Lagna lord
  if (!emotionPlanet) emotionPlanet = lagnaLord;

  const EMOTIONAL_PATTERNS = {
    Sun:     "The emotional pattern most relevant as sadhana material in this chart is the relationship with recognition and authentic self-expression. The question that arises repeatedly is whether one's actions are coming from genuine inner clarity or from the need to be seen as significant, capable, or right. This is not a flaw — it is the specific friction this soul is working through. The practice is developing the capacity to act with full engagement and then release the result completely: doing without needing the doing to prove anything.",
    Moon:    "The emotional pattern most relevant as sadhana material in this chart is the relationship with emotional security — the recurring question of whether genuine inner stability is available independent of outer circumstances. The mind tends to seek nourishment and reassurance from what is outside rather than from what is within. This is not a weakness — it is the specific terrain this soul is navigating. The practice is the deliberate cultivation of inner stillness — returning, again and again, to the awareness that is present beneath the fluctuation.",
    Mars:    "The emotional pattern most relevant as sadhana material in this chart is the relationship with energy, frustration, and the impulse to force outcomes. The recurring experience is of encountering resistance and responding with an intensification of effort or an assertion of will. This is not a deficiency — it is the specific charge this soul is working with. The practice is developing the pause between impulse and action: the moment of genuine discernment that distinguishes courageous purposeful action from reactive force.",
    Mercury: "The emotional pattern most relevant as sadhana material in this chart is the relationship with mental restlessness — the recurring experience of the mind moving from one thing to the next without settling. There may be anxiety around the gathering and processing of information, or a tendency to intellectualise emotional experience rather than feeling it directly. This is not a problem to be eliminated — it is the specific quality of mind this soul is refining. The practice is developing genuine Dharana: the capacity to hold the attention on one point without scattering.",
    Jupiter: "The emotional pattern most relevant as sadhana material in this chart is the relationship with meaning and the recurring question of whether one's life is genuinely aligned with what matters most. There may be a tendency toward philosophical comfort — holding correct views about what is important while the actual living remains partial. This is not a spiritual failure — it is the specific gap this soul is being asked to close. The practice is the deliberate narrowing of the distance between what is understood and what is actually lived.",
    Venus:   "The emotional pattern most relevant as sadhana material in this chart is the relationship with desire, attachment, and the recurring question of what is genuinely worth valuing. The soul tends to seek genuine beauty and genuine connection and may repeatedly encounter the gap between what is pleasant and what is genuinely nourishing. This is not a defect — it is the specific refinement this life is asking for. The practice is developing genuine Viveka in the domain of relationship and desire: the discriminating capacity to recognise what genuinely satisfies versus what merely temporarily appeases.",
    Saturn:  "The emotional pattern most relevant as sadhana material in this chart is the relationship with difficulty, limitation, and the recurring experience of effort that seems disproportionate to result. There may be a tendency to experience Saturn's demands as punishment or unfairness rather than as the specific friction this soul needs in order to develop genuine inner strength. This is not misfortune — it is the specific material this life is made of. The practice is the deliberate cultivation of patient, non-resistant engagement with difficulty: Tapas as conscious purification rather than as mere endurance.",
    Rahu:    "The emotional pattern most relevant as sadhana material in this chart is the relationship with desire's amplification — the recurring experience of intense wanting in specific domains of life that can feel consuming and disorienting. There may be difficulty distinguishing genuine need from amplified craving. This is not a corruption — it is the specific intensity this soul is learning to work with consciously. The practice is developing genuine Pratyahara: the cultivation of the capacity to witness desire without being identified with it.",
    Ketu:    "The emotional pattern most relevant as sadhana material in this chart is the relationship with detachment and the recurring experience of not quite fitting — of feeling complete in domains where others still want more, and unfulfilled where others seem easily satisfied. This is not alienation — it is the specific quality of a soul that has already completed significant development and is now learning to engage with the present life from a place of genuine non-attachment rather than mere disconnection. The practice is the deliberate cultivation of conscious presence in the domains where Ketu is most active.",
  };

  const emotionContent = EMOTIONAL_PATTERNS[emotionPlanet] || "The emotional patterns most relevant as sadhana material are visible in the house readings above — each area of challenge is not a deficiency but specific material this soul is working through consciously.";

  const block = (text) => `<div class="interp-block" style="margin-bottom:1rem"><p>${text}</p></div>`;

  let html = '';

  // Primary theme paragraph
  html += block(`This chart is navigating through ${lagnaSign} Lagna — its primary lens is ${lagnaSign}'s quality of attention and engagement with the world. The Lagna lord ${lagnaLord} is placed in the ${lagnaLordH}th house, which is the primary channel through which this orientation finds concrete expression. The current Maha Dasha of ${mdPlanet} activates whatever ${mdPlanet} carries in this natal chart — bringing its specific sign, house, and dignity condition into primary focus as the quality of engagement this period is asking for.`);

  // Sadhana path recommendation
  html += `<div class="interp-block" style="margin-bottom:1rem">
    <p><strong>Natural sadhana direction: ${pathStr}.</strong> ${pathContent}</p>
  </div>`;

  // Emotional pattern
  html += block(emotionContent);

  // Closing line
  html += `<div class="interp-block">
    <p style="font-style:italic;color:var(--text-2)">The chart shows the terrain. The walking is entirely your own.</p>
  </div>`;

  return html;
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

  // Parihara section
  if ($('parihara-content')) {
    $('parihara-content').innerHTML = renderPariharaSection(dignityReport, currentDasha, lagna, planets, planetHouses);
  }

  // Sadhana Map section
  if ($('sadhana-content')) {
    $('sadhana-content').innerHTML = renderSadhanaMap(lagna, planets, planetHouses, dignityReport, currentDasha, report);
  }

  // Closing note (always shown)
  $('closing-note-text').textContent = report.closingNote;

  // Varga charts
  renderChartGrid(varga, planets, planetHouses, $('mukhya-charts'), MUKHYA_KEYS);
  renderChartGrid(varga, planets, planetHouses, $('advanced-chart-grid'), ADVANCED_KEYS);

  // Divisional chart readings
  if ($('varga-readings')) {
    $('varga-readings').innerHTML = renderVargaReadings(varga, lagna, planets, planetHouses);
  }

  // Show output
  $('chart-output').style.display = 'block';
  $('chart-output').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Wire PDF button
  $('pdf-btn').onclick = () => window.print();
}

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
