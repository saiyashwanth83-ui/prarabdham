/**
 * parihara-sadhana.js
 * Builds the Parihara and Sadhana Map sections for the individual chart report.
 * Reads dignity.js output already in the pipeline — no new calculation logic.
 *
 * Integration: call buildPariharaSection() and buildSadhanaMapSection() from
 * interpretation.js (or main.js), placing them after House Readings and before Summary.
 *
 * Depends on:
 *   - dignityData   : output of dignity.js (planet → { dignity, strength, combust, sign })
 *   - chartData     : { lagna, dashaLord, dashaYear, planets: { name, house, dignity } }
 *   - CONTENT       : the interpretations.js CONTENT export (parihara + sadhanaMap keys added)
 */

import { CONTENT } from './js/content/interpretations.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the list of planets that are challenged in this chart.
 * A planet is challenged if it is debilitated, combust, or in enemy sign with
 * strength below the threshold (uses existing dignity.js strength score < 40).
 *
 * @param {Object} dignityData  — output already produced by dignity.js
 * @returns {Array<{ planet, reason }>}
 */
function getChallengedPlanets(dignityData) {
  const challenged = [];
  for (const [planet, data] of Object.entries(dignityData)) {
    if (!data) continue;
    if (data.dignity === 'debilitated') {
      challenged.push({ planet, reason: 'debilitated' });
    } else if (data.combust === true) {
      challenged.push({ planet, reason: 'combust' });
    } else if (data.dignity === 'enemy' && (data.strength ?? 100) < 40) {
      challenged.push({ planet, reason: 'enemy-sign-weak' });
    }
  }
  return challenged;
}

/**
 * Returns the planet with the highest absolute strength score from dignityData.
 * Used by the Sadhana Map to identify the strongest indicator.
 *
 * @param {Object} dignityData
 * @returns {string}  planet name
 */
function getStrongestPlanet(dignityData) {
  let strongest = null;
  let highestStrength = -Infinity;
  for (const [planet, data] of Object.entries(dignityData)) {
    if (!data) continue;
    const s = data.strength ?? 0;
    if (s > highestStrength) {
      highestStrength = s;
      strongest = planet;
    }
  }
  return strongest;
}

/**
 * Returns the most challenged planet (lowest strength among challenged set).
 *
 * @param {Array<{ planet, reason }>} challengedList
 * @param {Object} dignityData
 * @returns {string|null}
 */
function getMostChallengedPlanet(challengedList, dignityData) {
  if (!challengedList.length) return null;
  return challengedList.reduce((worst, curr) => {
    const wStrength = dignityData[worst.planet]?.strength ?? 100;
    const cStrength = dignityData[curr.planet]?.strength ?? 100;
    return cStrength < wStrength ? curr : worst;
  }).planet;
}

/**
 * Infers the sadhana path most suited to this chart.
 * Logic mirrors the prompt's guidelines:
 *   Mercury/9th → Jnana  |  Moon/Venus/12th → Bhakti
 *   Mars/Saturn/10th → Karma Yoga  |  sustained discipline → Raja Yoga
 *
 * @param {Object} dignityData
 * @param {Object} chartData   { lagna, planets: [{ name, house }] }
 * @returns {{ path: string, reasoning: string }}
 */
function inferSadhanaPath(dignityData, chartData) {
  const planetHouseMap = {};
  for (const p of (chartData.planets || [])) {
    planetHouseMap[p.name] = p.house;
  }

  const mercuryStrength  = dignityData['Mercury']?.strength ?? 0;
  const moonStrength     = dignityData['Moon']?.strength    ?? 0;
  const venusStrength    = dignityData['Venus']?.strength   ?? 0;
  const marsStrength     = dignityData['Mars']?.strength    ?? 0;
  const saturnStrength   = dignityData['Saturn']?.strength  ?? 0;
  const jupiterStrength  = dignityData['Jupiter']?.strength ?? 0;

  const ninth  = (planetHouseMap['Mercury'] === 9 || planetHouseMap['Jupiter'] === 9);
  const twelfth = (planetHouseMap['Moon'] === 12 || planetHouseMap['Venus'] === 12);
  const tenth  = (planetHouseMap['Mars'] === 10 || planetHouseMap['Saturn'] === 10);

  const jnanaScore   = mercuryStrength + (ninth ? 20 : 0);
  const bhaktiScore  = moonStrength + venusStrength + (twelfth ? 20 : 0);
  const karmaScore   = marsStrength + saturnStrength + (tenth ? 20 : 0);
  const rajaScore    = saturnStrength + jupiterStrength;

  const scores = [
    { path: 'Jnana Yoga',  score: jnanaScore,  key: 'jnana'  },
    { path: 'Bhakti Yoga', score: bhaktiScore, key: 'bhakti' },
    { path: 'Karma Yoga',  score: karmaScore,  key: 'karma'  },
    { path: 'Raja Yoga',   score: rajaScore,   key: 'raja'   },
  ];
  scores.sort((a, b) => b.score - a.score);
  return scores[0]; // strongest indicator
}

// ─── section builders ─────────────────────────────────────────────────────────

/**
 * Builds the Parihara section HTML string.
 * Placement: after House Readings, before Sadhana Map.
 *
 * @param {Object} dignityData   — from dignity.js
 * @param {Object} chartData     — { lagna, dashaLord, planets }
 * @returns {string}  HTML
 */
export function buildPariharaSection(dignityData, chartData) {
  const challenged = getChallengedPlanets(dignityData);
  const pariharaContent = CONTENT.parihara;

  let html = `<section class="report-section parihara-section">`;
  html += `<h2>Parihara — Working Consciously with Challenging Placements</h2>`;

  // Opening context paragraph
  html += `<p>${pariharaContent.introduction}</p>`;

  // Per-planet challenged paragraphs
  if (challenged.length === 0) {
    html += `<p>${pariharaContent.noChallengedPlanets}</p>`;
  } else {
    html += `<div class="parihara-planets">`;
    for (const { planet, reason } of challenged) {
      const planetKey = planet.toLowerCase();
      const entry = pariharaContent.planets?.[planetKey];
      if (!entry) continue;

      const reasonLabel = {
        debilitated:    'debilitated',
        combust:        'combust — too close to the Sun in this chart',
        'enemy-sign-weak': 'placed in an enemy sign with reduced strength',
      }[reason] || reason;

      html += `<div class="parihara-planet-block">`;
      html += `<h3>${planet} — ${reasonLabel}</h3>`;
      html += `<p>${entry}</p>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  // Ashtanga Yoga — four basic practices (verbatim from parihara.html)
  html += `<div class="parihara-ashtanga">`;
  html += `<h3>Ashtanga Yoga as Universal Parihara</h3>`;
  html += `<p>${pariharaContent.ashtangaYogaIntro}</p>`;
  html += `<ul>`;
  for (const practice of pariharaContent.ashtangaPractices) {
    html += `<li><strong>${practice.name}:</strong> ${practice.description}</li>`;
  }
  html += `</ul>`;
  html += `<p>${pariharaContent.ashtangaYogaClose}</p>`;
  html += `</div>`;

  // Gemstone / yantra / homam caution (verbatim from parihara.html)
  html += `<div class="parihara-caution">`;
  html += `<p>${pariharaContent.gemstoneCaution}</p>`;
  html += `</div>`;

  // Released-arrow grounding statement
  html += `<p class="parihara-closing">${pariharaContent.closingStatement}</p>`;

  html += `</section>`;
  return html;
}

/**
 * Builds the Sadhana Map section HTML string.
 * Placement: after Parihara, before Summary.
 *
 * @param {Object} dignityData   — from dignity.js
 * @param {Object} chartData     — { lagna, dashaLord, dashaYear, planets }
 * @returns {string}  HTML
 */
export function buildSadhanaMapSection(dignityData, chartData) {
  const sadhanaContent = CONTENT.sadhanaMap;
  const strongest   = getStrongestPlanet(dignityData);
  const challenged  = getChallengedPlanets(dignityData);
  const mostChallenged = getMostChallengedPlanet(challenged, dignityData);
  const { path, key } = inferSadhanaPath(dignityData, chartData);

  const lagna     = chartData.lagna     || 'this Lagna';
  const dashaLord = chartData.dashaLord || 'the current Dasha lord';

  // Primary karmic theme — synthesised from Lagna + strongest + current Dasha
  const karmicTheme = sadhanaContent.karmicTheme(lagna, strongest, dashaLord);

  // Sadhana path paragraph
  const pathParagraph = sadhanaContent.pathRecommendations[key];

  // Emotional pattern paragraph — most prominent challenge as sadhana material
  let emotionalPattern = '';
  if (mostChallenged) {
    const patternKey = mostChallenged.toLowerCase();
    emotionalPattern = sadhanaContent.emotionalPatterns?.[patternKey] || '';
  }

  let html = `<section class="report-section sadhana-map-section">`;
  html += `<h2>Sadhana Map</h2>`;

  // Primary karmic theme
  html += `<p>${karmicTheme}</p>`;

  // Sadhana path recommendation
  if (pathParagraph) {
    html += `<h3>Primary Sadhana Direction: ${path}</h3>`;
    html += `<p>${pathParagraph}</p>`;
  }

  // Emotional pattern as sadhana material
  if (emotionalPattern) {
    html += `<h3>Emotional Pattern as Sadhana Material</h3>`;
    html += `<p>${emotionalPattern}</p>`;
  }

  // Closing line — exact wording specified in prompt
  html += `<p class="sadhana-closing"><em>The chart shows the terrain. The walking is entirely your own.</em></p>`;

  html += `</section>`;
  return html;
}
