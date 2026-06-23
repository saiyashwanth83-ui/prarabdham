/**
 * dignity.js — Vedic Astrology Planetary Dignity & Strength Module
 * Pure ES module, no external dependencies.
 * Formulas follow classical BPHS / Parashara tradition.
 */

// ---------------------------------------------------------------------------
// Dignity tables
// ---------------------------------------------------------------------------

const EXALTATION = {
  Sun:     'Aries',
  Moon:    'Taurus',
  Mars:    'Capricorn',
  Mercury: 'Virgo',
  Jupiter: 'Cancer',
  Venus:   'Pisces',
  Saturn:  'Libra',
  // UNCERTAINTY: Rahu/Ketu exaltation differs across traditions.
  // Tradition A (Parashara): Rahu exalted Taurus, Ketu exalted Scorpio
  // Tradition B (Varahamihira): Rahu exalted Gemini, Ketu exalted Sagittarius
  // Both are returned in getPlanetDignity — flagged clearly.
  Rahu:    ['Taurus', 'Gemini'],
  Ketu:    ['Scorpio', 'Sagittarius'],
};

const DEBILITATION = {
  Sun:     'Libra',
  Moon:    'Scorpio',
  Mars:    'Cancer',
  Mercury: 'Pisces',
  Jupiter: 'Capricorn',
  Venus:   'Virgo',
  Saturn:  'Aries',
  // Opposite of exaltation for Rahu/Ketu (both traditions)
  Rahu:    ['Scorpio', 'Sagittarius'],
  Ketu:    ['Taurus', 'Gemini'],
};

const OWN_SIGNS = {
  Sun:     ['Leo'],
  Moon:    ['Cancer'],
  Mars:    ['Aries', 'Scorpio'],
  Mercury: ['Gemini', 'Virgo'],
  Jupiter: ['Sagittarius', 'Pisces'],
  Venus:   ['Taurus', 'Libra'],
  Saturn:  ['Capricorn', 'Aquarius'],
  Rahu:    [],  // No classical own sign consensus
  Ketu:    [],
};

/**
 * Natural friendship table (Naisargika Maitri).
 * Source: BPHS Ch. 3 — Parashara's planetary friendships.
 */
const NATURAL_FRIENDS = {
  Sun:     ['Moon', 'Mars', 'Jupiter'],
  Moon:    ['Sun', 'Mercury'],
  Mars:    ['Sun', 'Moon', 'Jupiter'],
  Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'],
  Venus:   ['Mercury', 'Saturn'],
  Saturn:  ['Mercury', 'Venus'],
  Rahu:    ['Venus', 'Saturn'],   // Commonly cited; some texts vary
  Ketu:    ['Mars', 'Venus'],     // Commonly cited; some texts vary
};

const NATURAL_NEUTRALS = {
  Sun:     ['Mercury'],
  Moon:    ['Mars', 'Jupiter', 'Venus', 'Saturn'],
  Mars:    ['Venus', 'Saturn'],
  Mercury: ['Mars', 'Jupiter', 'Saturn'],
  Jupiter: ['Saturn'],
  Venus:   ['Mars', 'Jupiter'],
  Saturn:  ['Jupiter'],
  Rahu:    ['Jupiter', 'Mercury'],
  Ketu:    ['Jupiter', 'Mercury', 'Saturn'],
};

/** Sign rulers — used to determine the friend/enemy of the sign's lord. */
const SIGN_LORD = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

// ---------------------------------------------------------------------------
// 1. getPlanetDignity
// ---------------------------------------------------------------------------

/**
 * Returns the dignity of a planet in a given sign.
 *
 * For Rahu and Ketu, exaltation/debilitation is uncertain across traditions.
 * The function returns the primary result using Tradition A (Parashara),
 * and flags the uncertainty in the returned object.
 *
 * @param {string} planetName - Planet name (Sun, Moon, Mars, etc.)
 * @param {string} signName   - Sign name (Aries, Taurus, etc.)
 * @returns {{
 *   dignity: 'exalted'|'own'|'friendly'|'neutral'|'enemy'|'debilitated',
 *   score: number,
 *   uncertainty: string|null
 * }}
 */
export function getPlanetDignity(planetName, signName) {
  let uncertainty = null;

  // Rahu / Ketu — special handling
  if (planetName === 'Rahu' || planetName === 'Ketu') {
    const exAlt  = EXALTATION[planetName];   // Array of two signs
    const debAlt = DEBILITATION[planetName];

    // Tradition A: index 0 (Parashara)
    const exA  = exAlt[0];
    const debA = debAlt[0];
    // Tradition B: index 1 (Varahamihira)
    const exB  = exAlt[1];
    const debB = debAlt[1];

    if (signName === exA || signName === exB) {
      uncertainty = `${planetName} exaltation: Parashara says ${exA}, Varahamihira says ${exB}. Both traditions agree this sign is exaltation.`;
      return { dignity: 'exalted', score: 4, uncertainty };
    }
    if (signName === exA) {
      uncertainty = `${planetName} exaltation sign per Parashara. Varahamihira uses ${exB}.`;
      return { dignity: 'exalted', score: 4, uncertainty };
    }
    if (signName === exB) {
      uncertainty = `${planetName} exaltation sign per Varahamihira. Parashara uses ${exA}.`;
      return { dignity: 'exalted', score: 4, uncertainty };
    }
    if (signName === debA || signName === debB) {
      uncertainty = `${planetName} debilitation: Parashara says ${debA}, Varahamihira says ${debB}.`;
      return { dignity: 'debilitated', score: -1, uncertainty };
    }
    // No own sign — fall to friendship
    uncertainty = `${planetName} has no universally agreed own sign. Friendship assessed via sign lord.`;
  }

  // Standard planets
  const exSign  = EXALTATION[planetName];
  const debSign = DEBILITATION[planetName];
  const ownSigns = OWN_SIGNS[planetName] || [];

  if (signName === exSign)              return { dignity: 'exalted',     score: 4, uncertainty };
  if (signName === debSign)             return { dignity: 'debilitated', score: -1, uncertainty };
  if (ownSigns.includes(signName))      return { dignity: 'own',         score: 3, uncertainty };

  // Friendly / Neutral / Enemy based on the sign's lord
  const signLord = SIGN_LORD[signName];
  if (!signLord || signLord === planetName) return { dignity: 'own', score: 3, uncertainty };

  const friends  = NATURAL_FRIENDS[planetName]  || [];
  const neutrals = NATURAL_NEUTRALS[planetName] || [];

  if (friends.includes(signLord))  return { dignity: 'friendly', score: 2, uncertainty };
  if (neutrals.includes(signLord)) return { dignity: 'neutral',  score: 1, uncertainty };
  return { dignity: 'enemy', score: 0, uncertainty };
}

// ---------------------------------------------------------------------------
// 2. getPlanetStrength
// ---------------------------------------------------------------------------

/**
 * Returns a simple strength assessment for a planet.
 *
 * NOTE: This is a simplified Shadbala-inspired score, NOT a full Shadbala
 * calculation. Full Shadbala requires arc-minute precision for temporal
 * and positional factors not available here. Use this as a quick indicator.
 *
 * @param {string}   planetName      - Planet name
 * @param {string}   signName        - Current sign
 * @param {number}   houseNumber     - House 1–12
 * @param {string[]} aspectsReceived - Array of planet names aspecting this planet
 * @returns {{ dignityScore, houseScore, aspectScore, total, rating, dignity }}
 */
export function getPlanetStrength(planetName, signName, houseNumber, aspectsReceived = []) {
  const { dignity, score: dignityScore } = getPlanetDignity(planetName, signName);

  // House score
  const KENDRA  = new Set([1, 4, 7, 10]);
  const KONA    = new Set([1, 5, 9]);
  const UPACHAYA = new Set([3, 6, 10, 11]);
  const DUSTHANA = new Set([6, 8, 12]);

  let houseScore = 0;
  if (KENDRA.has(houseNumber))   houseScore += 2;
  if (KONA.has(houseNumber))     houseScore += 2;  // 1st house gets both
  if (UPACHAYA.has(houseNumber)) houseScore += 1;
  if (DUSTHANA.has(houseNumber)) houseScore -= 1;

  // Aspect score (natural benefics/malefics of aspecting planets)
  const BENEFICS = new Set(['Jupiter', 'Venus', 'Moon', 'Mercury']);
  const MALEFICS = new Set(['Saturn', 'Mars', 'Sun', 'Rahu', 'Ketu']);
  let aspectScore = 0;
  for (const asp of aspectsReceived) {
    if (asp === 'Jupiter') aspectScore += 1;
    else if (asp === 'Saturn' || asp === 'Mars') aspectScore -= 1;
    else if (BENEFICS.has(asp)) aspectScore += 0.5;
  }

  const total = dignityScore + houseScore + aspectScore;
  const rating = total >= 5 ? 'strong' : total >= 2 ? 'moderate' : 'challenged';

  return { dignity, dignityScore, houseScore, aspectScore, total, rating };
}

// ---------------------------------------------------------------------------
// 3. getCombustStatus
// ---------------------------------------------------------------------------

/**
 * Returns whether a planet is combust (too close to the Sun).
 * Combustion degrees follow classical BPHS values.
 * Rahu and Ketu are never combust.
 *
 * @param {string} planetName      - Planet name
 * @param {number} sunLongitude    - Sun's sidereal longitude (0–360)
 * @param {number} planetLongitude - Planet's sidereal longitude (0–360)
 * @param {boolean} isRetrograde   - Whether the planet is retrograde
 * @returns {{ combust: boolean, degrees: number, threshold: number }}
 */
export function getCombustStatus(planetName, sunLongitude, planetLongitude, isRetrograde = false) {
  if (planetName === 'Sun' || planetName === 'Rahu' || planetName === 'Ketu') {
    return { combust: false, degrees: 0, threshold: 0 };
  }

  const THRESHOLDS = {
    Moon:    12,
    Mars:    17,
    Mercury: isRetrograde ? 12 : 14,
    Jupiter: 11,
    Venus:   isRetrograde ? 8  : 10,
    Saturn:  15,
  };

  const threshold = THRESHOLDS[planetName];
  if (threshold === undefined) return { combust: false, degrees: 0, threshold: 0 };

  // Angular separation (shortest arc)
  let diff = Math.abs(sunLongitude - planetLongitude);
  if (diff > 180) diff = 360 - diff;

  return { combust: diff <= threshold, degrees: parseFloat(diff.toFixed(2)), threshold };
}

// ---------------------------------------------------------------------------
// 4. getDigbala
// ---------------------------------------------------------------------------

/**
 * Returns whether a planet has Digbala (directional strength).
 * Source: BPHS — Digbala chapter.
 *
 * @param {string} planetName  - Planet name
 * @param {number} houseNumber - House 1–12
 * @returns {{ digbala: boolean, preferredHouse: number }}
 */
export function getDigbala(planetName, houseNumber) {
  const DIGBALA_HOUSE = {
    Sun:     10,
    Mars:    10,
    Moon:    4,
    Venus:   4,
    Mercury: 1,
    Jupiter: 1,
    Saturn:  7,
  };
  const preferred = DIGBALA_HOUSE[planetName];
  if (!preferred) return { digbala: false, preferredHouse: null };
  return { digbala: houseNumber === preferred, preferredHouse: preferred };
}

// ---------------------------------------------------------------------------
// 5. getFullDignityReport
// ---------------------------------------------------------------------------

/**
 * Runs all dignity functions for all 9 planets.
 *
 * @param {object} planets - From core.js getPlanets() — each has { sign, longitude, isRetrograde }
 * @param {object} lagna   - From core.js getLagna() — has { sign }
 * @param {object} houses  - Array of house objects with { house, sign } or map of planet→houseNumber
 * @param {object} planetHouses - Map of planetName → houseNumber (from getPlanetHouses)
 * @param {number} sunLongitude - Sun's longitude for combustion checks
 * @returns {object} Full report keyed by planet name
 */
export function getFullDignityReport(planets, lagna, planetHouses = {}, sunLongitude = null) {
  const report = {};
  const sunLon = sunLongitude ?? planets?.Sun?.longitude ?? null;

  for (const [name, planet] of Object.entries(planets)) {
    const sign        = planet.sign;
    const houseNum    = planetHouses[name] || null;
    const dignity     = getPlanetDignity(name, sign);
    const strength    = houseNum ? getPlanetStrength(name, sign, houseNum) : null;
    const combust     = sunLon !== null
      ? getCombustStatus(name, sunLon, planet.longitude, planet.isRetrograde)
      : null;
    const digbala     = houseNum ? getDigbala(name, houseNum) : null;

    report[name] = {
      sign,
      houseNumber: houseNum,
      isRetrograde: planet.isRetrograde,
      dignity:   dignity.dignity,
      score:     dignity.score,
      uncertainty: dignity.uncertainty,
      strength,
      combust,
      digbala,
    };
  }

  return report;
}
