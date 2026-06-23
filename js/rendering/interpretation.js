/**
 * interpretation.js — Chart Interpretation Display Engine
 * Pure ES module, no external dependencies.
 *
 * This engine connects verified chart calculation data to educational content.
 * It does NOT generate personalised predictions.
 * It presents accurate chart data with honest educational framing.
 *
 * All content comes from interpretations.js — this file is structural only.
 */

import { CONTENT } from '../content/interpretations.js';

// ---------------------------------------------------------------------------
// Sign and house constants
// ---------------------------------------------------------------------------

const SIGNS_ORDER = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

const SIGN_LORD = {
  Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon',
  Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars',
  Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
};

// ---------------------------------------------------------------------------
// getAspects — critical for honest house readings
// ---------------------------------------------------------------------------

/**
 * Returns which planets aspect a given house number.
 *
 * Classical Parashari Graha Drishti:
 *   All planets:  7th house from their position (mutual opposition)
 *   Mars:        additionally 4th and 8th from its position
 *   Jupiter:     additionally 5th and 9th from its position
 *   Saturn:      additionally 3rd and 10th from its position
 *
 * NOTE: "4th from Mars" means the house that is 4 houses away (not 4 signs).
 * In Whole Sign houses, house N aspects house (N + offset - 1) % 12 + 1.
 *
 * @param {number} targetHouse   - House number 1–12 being aspected
 * @param {object} planetHouses  - { Sun: 10, Moon: 6, ... }
 * @returns {Array<{ planet: string, aspectType: string, fromHouse: number }>}
 */
export function getAspects(targetHouse, planetHouses) {
  const aspects = [];

  for (const [planet, fromHouse] of Object.entries(planetHouses)) {
    if (!fromHouse) continue;

    // All planets: 7th aspect
    const seventh = ((fromHouse - 1 + 6) % 12) + 1;
    if (seventh === targetHouse) {
      aspects.push({ planet, aspectType: '7th aspect', fromHouse });
    }

    // Mars: additionally 4th and 8th
    if (planet === 'Mars') {
      const fourth = ((fromHouse - 1 + 3) % 12) + 1;
      const eighth = ((fromHouse - 1 + 7) % 12) + 1;
      if (fourth === targetHouse) aspects.push({ planet, aspectType: '4th aspect', fromHouse });
      if (eighth === targetHouse) aspects.push({ planet, aspectType: '8th aspect', fromHouse });
    }

    // Jupiter: additionally 5th and 9th
    if (planet === 'Jupiter') {
      const fifth = ((fromHouse - 1 + 4) % 12) + 1;
      const ninth = ((fromHouse - 1 + 8) % 12) + 1;
      if (fifth === targetHouse)  aspects.push({ planet, aspectType: '5th aspect', fromHouse });
      if (ninth === targetHouse)  aspects.push({ planet, aspectType: '9th aspect', fromHouse });
    }

    // Saturn: additionally 3rd and 10th
    if (planet === 'Saturn') {
      const third  = ((fromHouse - 1 + 2) % 12) + 1;
      const tenth  = ((fromHouse - 1 + 9) % 12) + 1;
      if (third  === targetHouse) aspects.push({ planet, aspectType: '3rd aspect', fromHouse });
      if (tenth  === targetHouse) aspects.push({ planet, aspectType: '10th aspect', fromHouse });
    }
  }

  return aspects;
}

// ---------------------------------------------------------------------------
// buildLagnaReading
// ---------------------------------------------------------------------------

/**
 * Returns educational content about the Lagna sign and its lord's placement.
 *
 * @param {object} lagna   - { sign, degrees, minutes, nakshatra, pada }
 * @param {object} planets - all 9 planets with house numbers
 * @returns {string}
 */
export function buildLagnaReading(lagna, planets, planetHouses = {}) {
  const lagnaContent = CONTENT.lagna[lagna.sign] || `PLACEHOLDER: ${lagna.sign} Lagna content not yet written.`;
  const lagnaLord    = SIGN_LORD[lagna.sign];
  const lordSign     = planets[lagnaLord]?.sign || '?';
  const lordHouse    = planetHouses[lagnaLord] || '?';
  const lordDignity  = planets[lagnaLord]?.dignity || '';
  const dignityNote  = lordDignity ? ` (${lordDignity})` : '';

  return `${lagnaContent}\n\nThe lord of this Lagna is ${lagnaLord}, placed in ${lordSign} in the ${ordinal(lordHouse)} house${dignityNote}. The lord's placement gives the primary channel through which Lagna energy finds expression in this life.`;
}

// ---------------------------------------------------------------------------
// buildHouseReading
// ---------------------------------------------------------------------------

/**
 * Returns educational content for one occupied or significant house.
 * Integrates: Rashi (sign), Adhipati (lord placement), Occupants, Drishti (aspects).
 * Presents as integrated prose — not as separate labelled points.
 *
 * @param {number}   houseNumber   - 1–12
 * @param {string}   sign          - Sign on this house cusp
 * @param {string[]} occupants     - Planet names in this house
 * @param {Array}    aspects       - Output of getAspects()
 * @param {string}   lordPlacement - Human-readable lord placement string
 * @param {object}   planets       - Full planet data
 * @returns {string}
 */
export function buildHouseReading(houseNumber, sign, occupants, aspects, lordPlacement, planets = {}) {
  const parts = [];

  // Lord context
  parts.push(`The ${ordinal(houseNumber)} house carries ${sign} — ruled by ${SIGN_LORD[sign]}${lordPlacement ? ', placed ' + lordPlacement : ''}.`);

  // Occupants
  if (occupants.length > 0) {
    for (const occ of occupants) {
      const pData   = planets[occ] || {};
      const dignity = pData.dignity ? ` (${pData.dignity})` : '';
      const retro   = pData.isRetrograde ? ' retrograde' : '';
      const content = CONTENT.planetInHouse?.[occ]?.[houseNumber]
        || `PLACEHOLDER: ${occ} in ${ordinal(houseNumber)} house content not yet written.`;
      parts.push(`${occ}${retro}${dignity} is placed here. ${content}`);
    }
  }

  // Aspects
  if (aspects.length > 0) {
    const aspNames = aspects.map(a => `${a.planet} (${a.aspectType} from H${a.fromHouse})`).join(', ');
    parts.push(`This house receives the aspect of: ${aspNames}.`);
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// buildDashaReading
// ---------------------------------------------------------------------------

/**
 * Returns educational content about the current Dasha period.
 *
 * @param {object} currentDasha - { mahaDasha, antardasha, pratyantardasha }
 * @param {object} planets      - full planet data
 * @param {object} planetHouses - planet → house number
 * @returns {string}
 */
export function buildDashaReading(currentDasha, planets = {}, planetHouses = {}) {
  if (!currentDasha?.mahaDasha) return 'Dasha data not available.';

  const md     = currentDasha.mahaDasha;
  const ad     = currentDasha.antardasha;
  const pd     = currentDasha.pratyantardasha;

  const mdPlanet  = md.planet;
  const mdContent = CONTENT.dashaReadings[mdPlanet]
    || `PLACEHOLDER: ${mdPlanet} Dasha content not yet written.`;

  const mdSign    = planets[mdPlanet]?.sign || '?';
  const mdHouse   = planetHouses[mdPlanet]  || '?';
  const mdDig     = planets[mdPlanet]?.dignity || '';

  let reading = `Current Maha Dasha: ${mdPlanet} (${md.startDate} — ${md.endDate}).\n\n${mdContent}`;
  reading += `\n\nIn this nativity, ${mdPlanet} is placed in ${mdSign} in the ${ordinal(mdHouse)} house${mdDig ? ' (' + mdDig + ')' : ''}. This natal placement colours the themes that the ${mdPlanet} Dasha is asking to be worked with.`;

  if (ad) {
    reading += `\n\nCurrent Antardasha: ${ad.planet} (${ad.startDate} — ${ad.endDate}). Within the larger ${mdPlanet} period, ${ad.planet}'s sub-period brings its own natal placement into focus alongside the Maha Dasha lord.`;
  }
  if (pd) {
    reading += ` Present sub-sub-period: ${pd.planet} (${pd.startDate} — ${pd.endDate}).`;
  }

  return reading;
}

// ---------------------------------------------------------------------------
// buildYogaReading
// ---------------------------------------------------------------------------

/**
 * Returns educational content about detected Yogas.
 * Only shows Yogas that are genuinely present.
 *
 * @param {object} yogas - output of getAllYogas() from yoga.js
 * @returns {Array<{ name, reading, uncertainty }>}
 */
export function buildYogaReading(yogas) {
  const readings = [];

  const YOGA_MAP = {
    rajaYoga:            { label: 'Raja Yoga',             key: 'rajaYoga' },
    dhanaYoga:           { label: 'Dhana Yoga',            key: 'dhanaYoga' },
    viparitaRajaYoga:    { label: 'Vipareeta Raja Yoga',   key: 'viparitaRajaYoga' },
    panchaMahapurusha:   { label: 'Pancha Mahapurusha Yoga', key: 'panchaMahapurusha' },
    guruMangalaYoga:     { label: 'Guru Mangala Yoga',     key: 'guruMangalaYoga' },
    neechaBhangaYoga:    { label: 'Neecha Bhanga Raja Yoga', key: 'neechaBhangaRajaYoga' },
  };

  for (const [key, meta] of Object.entries(YOGA_MAP)) {
    const yoga = yogas[key];
    if (!yoga?.present) continue;

    const content = CONTENT.yogaReadings[meta.key]
      || `PLACEHOLDER: ${meta.label} content not yet written.`;

    readings.push({
      name:        meta.label,
      description: yoga.description,
      reading:     content,
      uncertainty: yoga.uncertainty || null,
    });
  }

  return readings;
}

// ---------------------------------------------------------------------------
// buildSummary
// ---------------------------------------------------------------------------

/**
 * Returns a brief synthesis of dominant chart themes.
 * Not a repetition — connects Lagna orientation, key house themes, Dasha context.
 *
 * @param {string} lagnaReading
 * @param {Array}  houseReadings
 * @param {string} dashaReading
 * @param {object} lagna
 * @param {object} planets
 * @param {object} planetHouses
 * @returns {string}
 */
export function buildSummary(lagnaReading, houseReadings, dashaReading, lagna, planets, planetHouses) {
  const lagnaLord     = SIGN_LORD[lagna.sign];
  const lagnaLordSign = planets[lagnaLord]?.sign || '?';
  const lagnaLordH    = planetHouses[lagnaLord] || '?';

  // Find which Dasha lord is mentioned in dashaReading
  const dashaLordMatch = dashaReading.match(/Maha Dasha: (\w+)/);
  const dashaLord = dashaLordMatch ? dashaLordMatch[1] : null;
  const dashaLordH = dashaLord ? (planetHouses[dashaLord] || '?') : null;

  let summary = `This chart is oriented through ${lagna.sign} Lagna — its primary lens is ${lagna.sign}'s quality of attention and engagement with the world. `;
  summary += `The Lagna lord ${lagnaLord} is placed in ${lagnaLordSign} in the ${ordinal(lagnaLordH)} house, which is the primary channel through which this orientation finds concrete expression. `;

  if (dashaLord) {
    const dashaLordDig = planets[dashaLord]?.dignity || '';
    summary += `The current Maha Dasha of ${dashaLord}${dashaLordDig ? ' (' + dashaLordDig + ')' : ''} in the ${ordinal(dashaLordH)} house is the primary temporal context — the area of life and quality of energy that this period is asking to be engaged with directly. `;
  }

  // Note occupied angular houses if any
  const angularOccupied = houseReadings.filter(h => [1,4,7,10].includes(h.houseNumber) && h.occupants.length > 0);
  if (angularOccupied.length > 0) {
    const angNotes = angularOccupied.map(h => `the ${ordinal(h.houseNumber)} house (${h.occupants.join(', ')})`).join(', ');
    summary += `Angular houses carry particular weight in expression of the chart; here ${angNotes} ${angularOccupied.length === 1 ? 'is' : 'are'} occupied. `;
  }

  summary += `The interplay between the Lagna\'s orientation, the Dasha period\'s focus, and the houses that are most activated creates the specific terrain this chart is navigating at this time.`;

  return summary;
}

// ---------------------------------------------------------------------------
// buildChartReport — main export
// ---------------------------------------------------------------------------

/**
 * Builds a complete structured report from chart data.
 *
 * @param {object} chartData - Full chart data (see JSDoc at top of file)
 * @returns {object} Structured report
 */
export function buildChartReport(chartData) {
  const { lagna, planets, dashas, yogas, dignityReport } = chartData;

  // Build planet houses map from dignityReport (which has house numbers)
  const planetHouses = {};
  for (const [name, data] of Object.entries(dignityReport || {})) {
    if (data.houseNumber) planetHouses[name] = data.houseNumber;
  }

  // Merge dignity/retrograde data into planets for reading functions
  const enrichedPlanets = {};
  for (const [name, planet] of Object.entries(planets || {})) {
    enrichedPlanets[name] = {
      ...planet,
      dignity:     dignityReport?.[name]?.dignity,
      isRetrograde: planet.isRetrograde || dignityReport?.[name]?.isRetrograde,
    };
  }

  // ── Lagna reading ──
  const lagnaReading = buildLagnaReading(lagna, enrichedPlanets, planetHouses);

  // ── House readings — all 12, noting occupants and aspects ──
  const houseReadings = [];
  const lagnaSignIdx  = SIGNS_ORDER.indexOf(lagna.sign);

  for (let h = 1; h <= 12; h++) {
    const signIdx  = (lagnaSignIdx + h - 1) % 12;
    const sign     = SIGNS_ORDER[signIdx];
    const lord     = SIGN_LORD[sign];
    const lordH    = planetHouses[lord];
    const lordSign = enrichedPlanets[lord]?.sign || '?';
    const lordPlacement = lordH ? `in ${lordSign} in the ${ordinal(lordH)} house` : '';

    // Find planets in this house
    const occupants = Object.entries(planetHouses)
      .filter(([, hNum]) => hNum === h)
      .map(([name]) => name);

    // Get aspects
    const aspects = getAspects(h, planetHouses);

    // Only include in report if occupied OR aspected (skip completely empty/unaspected)
    const isActive = occupants.length > 0 || aspects.length > 0;

    const reading = buildHouseReading(h, sign, occupants, aspects, lordPlacement, enrichedPlanets);

    houseReadings.push({
      houseNumber:  h,
      sign,
      lord,
      lordSign,
      lordHouse:    lordH || null,
      lordPlacement,
      occupants,
      aspects,
      isActive,
      reading,
    });
  }

  // ── Dasha reading ──
  const dashaReading = buildDashaReading(dashas?.current, enrichedPlanets, planetHouses);

  // ── Yoga readings ──
  const yogaReadings = yogas ? buildYogaReading(yogas) : [];

  // ── Summary ──
  const summary = buildSummary(lagnaReading, houseReadings, dashaReading, lagna, enrichedPlanets, planetHouses);

  return {
    lagnaReading,
    houseReadings,
    dashaReading,
    yogaReadings,
    summary,
    closingNote: CONTENT.closingNote,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function ordinal(n) {
  if (!n || isNaN(n)) return n || '?';
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
