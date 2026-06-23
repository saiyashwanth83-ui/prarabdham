/**
 * yoga.js — Vedic Astrology Yoga Detection Module
 * Pure ES module, no external dependencies.
 *
 * Implements exactly 6 Yogas:
 *   1. Raja Yoga
 *   2. Dhana Yoga
 *   3. Vipareeta Raja Yoga
 *   4. Pancha Mahapurusha Yoga
 *   5. Guru Mangala Yoga
 *   6. Neecha Bhanga Raja Yoga
 *
 * HONEST LIMITATIONS:
 * - House placement comes from getPlanetHouses() in core.js (Whole Sign houses).
 * - "Aspect" in these detections = Graha Drishti (planetary glance), not Rashi Drishti.
 * - Conjunction = same house number.
 * - Mutual 7th aspect = planets in houses 7 apart (e.g. house 1 and 7, 4 and 10).
 * - Raja Yoga and Dhana Yoga detection is reliable for clear cases.
 *   Edge cases (multiple lords, retrograde lords) have genuine interpretive complexity.
 */

// ---------------------------------------------------------------------------
// Sign → natural lord mapping
// ---------------------------------------------------------------------------

const SIGN_LORD = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

const SIGNS_IN_ORDER = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

/**
 * Returns house lords 1–12 for a given Lagna sign.
 * House N = the sign that is N signs from Lagna (Whole Sign system).
 *
 * @param {string} lagnaSign - The Lagna (Ascendant) sign name
 * @returns {string[]} Array of 12 planet names [lord of H1, H2, ..., H12]
 */
export function getHouseLords(lagnaSign) {
  const startIdx = SIGNS_IN_ORDER.indexOf(lagnaSign);
  if (startIdx === -1) throw new Error(`Invalid lagna sign: ${lagnaSign}`);
  return Array.from({ length: 12 }, (_, i) => {
    const sign = SIGNS_IN_ORDER[(startIdx + i) % 12];
    return SIGN_LORD[sign];
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Get house number for a planet by name. */
function getHouse(planet, planetHouses) {
  return planetHouses[planet] || null;
}

/** Check if two planets are conjunct (same house). */
function areConjunct(p1, p2, planetHouses) {
  const h1 = getHouse(p1, planetHouses);
  const h2 = getHouse(p2, planetHouses);
  return h1 !== null && h2 !== null && h1 === h2;
}

/** Check if two planets are in mutual 7th aspect (houses 7 apart). */
function haveMutual7thAspect(p1, p2, planetHouses) {
  const h1 = getHouse(p1, planetHouses);
  const h2 = getHouse(p2, planetHouses);
  if (h1 === null || h2 === null) return false;
  const diff = Math.abs(h1 - h2);
  return diff === 6 || diff === 6; // 7th house = 6 apart (1-indexed: |h1-h2|=6)
}

/** Check if a planet is in a Kendra house (1,4,7,10). */
function isInKendra(planet, planetHouses) {
  const h = getHouse(planet, planetHouses);
  return h !== null && [1, 4, 7, 10].includes(h);
}

/** Check if a planet is in a Kona house (1,5,9). */
function isInKona(planet, planetHouses) {
  const h = getHouse(planet, planetHouses);
  return h !== null && [1, 5, 9].includes(h);
}

/** Check planetary own sign or exaltation. */
const OWN_SIGNS = {
  Mars: ['Aries', 'Scorpio'], Mercury: ['Gemini', 'Virgo'],
  Jupiter: ['Sagittarius', 'Pisces'], Venus: ['Taurus', 'Libra'],
  Saturn: ['Capricorn', 'Aquarius'],
};
const EXALTATION = {
  Mars: 'Capricorn', Mercury: 'Virgo', Jupiter: 'Cancer',
  Venus: 'Pisces', Saturn: 'Libra',
};

function isOwnOrExalted(planetName, signName) {
  const own = OWN_SIGNS[planetName] || [];
  const ex  = EXALTATION[planetName];
  return own.includes(signName) || signName === ex;
}

// ---------------------------------------------------------------------------
// 1. detectRajaYoga
// ---------------------------------------------------------------------------

/**
 * Raja Yoga — conjunction or mutual 7th aspect between a Kendra lord and
 * a Kona lord. The 1st house lord counts as both Kendra and Kona.
 *
 * LIMITATION: This detects only the most common form. Some classical texts
 * also include exchange (Parivartana) of Kendra/Kona lords, which is not
 * checked here.
 *
 * @param {object} planets      - { Sun: { sign, ... }, ... }
 * @param {object} planetHouses - { Sun: 10, Moon: 6, ... }
 * @param {string} lagnaSign    - Lagna sign name
 */
export function detectRajaYoga(planets, planetHouses, lagnaSign) {
  const lords    = getHouseLords(lagnaSign);
  const KENDRAS  = [1, 4, 7, 10];
  const KONAS    = [1, 5, 9];

  const kendraLords = [...new Set(KENDRAS.map(h => lords[h - 1]))];
  const konaLords   = [...new Set(KONAS.map(h => lords[h - 1]))];

  const yogas = [];

  for (const kl of kendraLords) {
    for (const kol of konaLords) {
      if (kl === kol) continue; // same planet is both — still valid, noted separately
      if (!(kl in planets) || !(kol in planets)) continue;

      const conj   = areConjunct(kl, kol, planetHouses);
      const aspect = haveMutual7thAspect(kl, kol, planetHouses);
      if (conj || aspect) {
        yogas.push({
          planets: [kl, kol],
          relation: conj ? 'conjunction' : 'mutual 7th aspect',
          house: getHouse(kl, planetHouses),
        });
      }
    }
  }

  // Also check: same planet is both kendra and kona lord (1st lord) in kendra/kona
  const lagnaLord = lords[0];
  if (planets[lagnaLord] && (isInKendra(lagnaLord, planetHouses) || isInKona(lagnaLord, planetHouses))) {
    yogas.push({
      planets: [lagnaLord],
      relation: 'Lagna lord in Kendra/Kona (self-Raja Yoga)',
      house: getHouse(lagnaLord, planetHouses),
    });
  }

  const present = yogas.length > 0;
  return {
    present,
    yogas,
    description: present
      ? `Raja Yoga formed by ${yogas.map(y => y.planets.join(' & ')).join('; ')}`
      : 'No Raja Yoga detected',
    strength: yogas.length >= 2 ? 'strong' : yogas.length === 1 ? 'moderate' : 'absent',
  };
}

// ---------------------------------------------------------------------------
// 2. detectDhanaYoga
// ---------------------------------------------------------------------------

/**
 * Dhana Yoga — wealth-producing combinations.
 * Primary form: lords of 2nd and 11th conjunct or in mutual aspect.
 * Secondary form: lords of 1st, 2nd, 5th, 9th, 11th combine (2+ together).
 *
 * @param {object} planets
 * @param {object} planetHouses
 * @param {string} lagnaSign
 */
export function detectDhanaYoga(planets, planetHouses, lagnaSign) {
  const lords = getHouseLords(lagnaSign);
  const lord2  = lords[1];
  const lord11 = lords[10];
  const wealthLords = [...new Set([lords[0], lords[1], lords[4], lords[8], lords[10]])];

  const yogas = [];

  // Primary: 2nd + 11th
  if (planets[lord2] && planets[lord11]) {
    const conj   = areConjunct(lord2, lord11, planetHouses);
    const aspect = haveMutual7thAspect(lord2, lord11, planetHouses);
    if (conj || aspect) {
      yogas.push({
        type: 'Primary Dhana Yoga',
        planets: [lord2, lord11],
        relation: conj ? 'conjunction' : 'mutual aspect',
      });
    }
  }

  // Secondary: 2+ wealth lords together
  for (let i = 0; i < wealthLords.length; i++) {
    for (let j = i + 1; j < wealthLords.length; j++) {
      const a = wealthLords[i], b = wealthLords[j];
      if (a === b || !planets[a] || !planets[b]) continue;
      if (areConjunct(a, b, planetHouses)) {
        yogas.push({ type: 'Dhana Yoga (1/2/5/9/11 lord combination)', planets: [a, b], relation: 'conjunction' });
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  const unique = yogas.filter(y => {
    const k = y.planets.sort().join('+');
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  return {
    present: unique.length > 0,
    yogas: unique,
    description: unique.length > 0
      ? `Dhana Yoga: ${unique.map(y => y.planets.join(' & ')).join('; ')}`
      : 'No Dhana Yoga detected',
  };
}

// ---------------------------------------------------------------------------
// 3. detectViparitaRajaYoga
// ---------------------------------------------------------------------------

/**
 * Vipareeta Raja Yoga — lords of dusthana houses (6, 8, 12) placed in
 * each other's houses, or conjunct each other.
 *
 * HONEST COMPLEXITY: This is one of the most debated yogas in Jyotish.
 * Classical texts require that the dusthana lords not be strongly influenced
 * by kendra/kona lords. This implementation detects the structural condition
 * (dusthana lord in dusthana, or dusthana lords conjunct) but cannot fully
 * assess the "absence of benefic influence" condition without a complete
 * aspect analysis. Treat results as indicative, not definitive.
 *
 * @param {object} planets
 * @param {object} planetHouses
 * @param {string} lagnaSign
 */
export function detectViparitaRajaYoga(planets, planetHouses, lagnaSign) {
  const lords = getHouseLords(lagnaSign);
  const lord6  = lords[5];
  const lord8  = lords[7];
  const lord12 = lords[11];
  const dusthanaLords = [...new Set([lord6, lord8, lord12])];
  const DUSTHANA_HOUSES = new Set([6, 8, 12]);

  const yogas = [];

  // Check each dusthana lord: is it in a dusthana house?
  for (const dl of dusthanaLords) {
    if (!planets[dl]) continue;
    const h = getHouse(dl, planetHouses);
    if (h && DUSTHANA_HOUSES.has(h)) {
      // Which type?
      const type = dl === lord6 ? 'Harsha' : dl === lord8 ? 'Sarala' : 'Vimala';
      yogas.push({ planet: dl, house: h, type,
        description: `${type} Yoga: ${dl} (lord of dusthana) placed in house ${h} (dusthana)` });
    }
  }

  // Check dusthana lords conjunct each other
  for (let i = 0; i < dusthanaLords.length; i++) {
    for (let j = i + 1; j < dusthanaLords.length; j++) {
      const a = dusthanaLords[i], b = dusthanaLords[j];
      if (a === b || !planets[a] || !planets[b]) continue;
      if (areConjunct(a, b, planetHouses)) {
        yogas.push({ planet: `${a}+${b}`, house: getHouse(a, planetHouses),
          type: 'Vipareeta conjunction',
          description: `Dusthana lords ${a} and ${b} conjunct in house ${getHouse(a, planetHouses)}` });
      }
    }
  }

  return {
    present: yogas.length > 0,
    yogas,
    description: yogas.length > 0
      ? yogas.map(y => y.description).join('; ')
      : 'No Vipareeta Raja Yoga detected',
    uncertainty: 'Detection is structural only. Full assessment requires verifying absence of kendra/kona lord influence on these planets.',
  };
}

// ---------------------------------------------------------------------------
// 4. detectPanchaMahapurushaYoga
// ---------------------------------------------------------------------------

/**
 * Pancha Mahapurusha Yoga — one of the 5 qualified planets (Mars, Mercury,
 * Jupiter, Venus, Saturn) in own sign or exaltation AND in a Kendra house.
 *
 * NOTE: The planet must be in its own sign or exaltation BY SIGN, not just
 * by dignity in the divisional chart. We check the D1 sign here.
 *
 * @param {object} planets      - Each has { sign }
 * @param {object} planetHouses - planet → house number
 */
export function detectPanchaMahapurushaYoga(planets, planetHouses) {
  const PMPY_PLANETS = {
    Mars:    'Ruchaka',
    Mercury: 'Bhadra',
    Jupiter: 'Hamsa',
    Venus:   'Malavya',
    Saturn:  'Shasha',
  };

  const yogas = [];

  for (const [planet, yogaName] of Object.entries(PMPY_PLANETS)) {
    if (!planets[planet]) continue;
    const sign  = planets[planet].sign;
    const house = getHouse(planet, planetHouses);
    if (!house) continue;

    const ownOrEx = isOwnOrExalted(planet, sign);
    const kendra  = [1, 4, 7, 10].includes(house);

    if (ownOrEx && kendra) {
      yogas.push({
        name:        yogaName,
        planet,
        sign,
        house,
        description: `${yogaName} Yoga: ${planet} in ${sign} (own/exalted) in house ${house} (Kendra)`,
      });
    }
  }

  return {
    present: yogas.length > 0,
    yogas,
    description: yogas.length > 0
      ? yogas.map(y => y.description).join('; ')
      : 'No Pancha Mahapurusha Yoga detected',
  };
}

// ---------------------------------------------------------------------------
// 5. detectGuruMangalaYoga
// ---------------------------------------------------------------------------

/**
 * Guru Mangala Yoga — Jupiter and Mars conjunct (same house) or in mutual
 * 7th aspect.
 *
 * For the verified chart: Jupiter is in house 4 (Gemini), Mars is in house 9
 * (Scorpio). Houses 4 and 9 are NOT 7 apart (difference = 5), so this is
 * NOT a mutual 7th aspect. No Guru Mangala Yoga in this chart.
 *
 * Mutual 7th aspect requires |h1 - h2| = 6 (e.g. houses 1&7, 2&8, 3&9, 4&10).
 *
 * @param {object} planets
 * @param {object} planetHouses
 */
export function detectGuruMangalaYoga(planets, planetHouses) {
  if (!planets.Jupiter || !planets.Mars) {
    return { present: false, description: 'Jupiter or Mars not in chart', housePosition: null };
  }

  const jH = getHouse('Jupiter', planetHouses);
  const mH = getHouse('Mars',    planetHouses);

  if (!jH || !mH) return { present: false, description: 'House placement unknown', housePosition: null };

  const conj   = jH === mH;
  const diff   = Math.abs(jH - mH);
  const aspect = diff === 6; // mutual 7th aspect

  const present = conj || aspect;
  return {
    present,
    description: present
      ? `Guru Mangala Yoga: Jupiter (H${jH}) and Mars (H${mH}) in ${conj ? 'conjunction' : 'mutual 7th aspect'}`
      : `No Guru Mangala Yoga: Jupiter in H${jH}, Mars in H${mH} (difference=${diff}, need 0 or 6)`,
    housePosition: `Jupiter H${jH}, Mars H${mH}`,
  };
}

// ---------------------------------------------------------------------------
// 6. detectNeechaBhangaRajaYoga
// ---------------------------------------------------------------------------

/**
 * Neecha Bhanga Raja Yoga — cancellation of debilitation, converting weakness
 * into strength.
 *
 * Classical conditions (any ONE is sufficient for cancellation):
 * A) The lord of the sign where the planet is debilitated is in a Kendra
 *    from the Lagna OR from the Moon.
 * B) The planet that is exalted in the debilitation sign is in a Kendra
 *    from the Lagna OR from the Moon.
 * C) The debilitated planet is aspected by its debilitation sign lord.
 * D) The debilitated planet and the lord of its debilitation sign are in
 *    mutual Kendra (less commonly cited — flagged as uncertain).
 *
 * HONEST COMPLEXITY: "Kendra from Moon" requires knowing Moon's house, which
 * is computed here. The "aspected by" condition (C) is approximate — we use
 * same-house conjunction as a proxy, which is conservative but not complete.
 *
 * @param {object} planets
 * @param {object} planetHouses
 * @param {string} lagnaSign
 */
export function detectNeechaBhangaRajaYoga(planets, planetHouses, lagnaSign) {
  const DEBILITATION_SIGN = {
    Sun: 'Libra', Moon: 'Scorpio', Mars: 'Cancer', Mercury: 'Pisces',
    Jupiter: 'Capricorn', Venus: 'Virgo', Saturn: 'Aries',
  };

  // Planet exalted in each sign (reverse of exaltation table)
  const EXALTED_IN_SIGN = {
    Libra: 'Saturn', Scorpio: 'Moon', Cancer: 'Jupiter', Pisces: 'Venus',
    Capricorn: 'Mars', Virgo: 'Mercury', Aries: 'Sun',
  };

  const moonHouse = getHouse('Moon', planetHouses);
  const KENDRAS   = new Set([1, 4, 7, 10]);

  function isKendraFromLagna(planet) {
    return KENDRAS.has(getHouse(planet, planetHouses));
  }

  function isKendraFromMoon(planet) {
    if (!moonHouse) return false;
    const h = getHouse(planet, planetHouses);
    if (!h) return false;
    const diff = ((h - moonHouse + 12) % 12);
    return diff === 0 || diff === 3 || diff === 6 || diff === 9;
  }

  const yogas = [];

  for (const [planetName, debSign] of Object.entries(DEBILITATION_SIGN)) {
    const planet = planets[planetName];
    if (!planet || planet.sign !== debSign) continue; // not debilitated

    const debSignLord     = SIGN_LORD[debSign];
    const exaltedInDebSign = EXALTED_IN_SIGN[debSign];

    const conditions = [];

    // Condition A: lord of debilitation sign in Kendra from Lagna or Moon
    if (planets[debSignLord]) {
      if (isKendraFromLagna(debSignLord)) {
        conditions.push(`(A) ${debSignLord} (lord of ${debSign}) in Kendra H${getHouse(debSignLord, planetHouses)} from Lagna`);
      }
      if (isKendraFromMoon(debSignLord)) {
        conditions.push(`(A) ${debSignLord} (lord of ${debSign}) in Kendra from Moon`);
      }
    }

    // Condition B: planet exalted in debilitation sign is in Kendra
    if (exaltedInDebSign && planets[exaltedInDebSign]) {
      if (isKendraFromLagna(exaltedInDebSign)) {
        conditions.push(`(B) ${exaltedInDebSign} (exalted in ${debSign}) in Kendra H${getHouse(exaltedInDebSign, planetHouses)} from Lagna`);
      }
      if (isKendraFromMoon(exaltedInDebSign)) {
        conditions.push(`(B) ${exaltedInDebSign} in Kendra from Moon`);
      }
    }

    // Condition C: debilitation sign lord conjunct debilitated planet (proxy for aspect)
    if (planets[debSignLord] && areConjunct(planetName, debSignLord, planetHouses)) {
      conditions.push(`(C) ${debSignLord} conjunct debilitated ${planetName} (aspect condition — approximate)`);
    }

    if (conditions.length > 0) {
      yogas.push({
        planet: planetName,
        debilitationSign: debSign,
        conditions,
        description: `Neecha Bhanga for ${planetName} in ${debSign}: ${conditions.join('; ')}`,
      });
    }
  }

  return {
    present: yogas.length > 0,
    yogas,
    description: yogas.length > 0
      ? yogas.map(y => y.description).join(' | ')
      : 'No Neecha Bhanga Raja Yoga detected',
    uncertainty: 'Condition C uses conjunction as proxy for aspect. Full aspect analysis (including special aspects) not implemented. Results should be verified.',
  };
}

// ---------------------------------------------------------------------------
// Convenience: run all 6 yogas
// ---------------------------------------------------------------------------

/**
 * Run all 6 Yoga detections and return a single report.
 *
 * @param {object} planets
 * @param {object} planetHouses - planet name → house number
 * @param {string} lagnaSign
 * @returns {object}
 */
export function getAllYogas(planets, planetHouses, lagnaSign) {
  return {
    rajaYoga:            detectRajaYoga(planets, planetHouses, lagnaSign),
    dhanaYoga:           detectDhanaYoga(planets, planetHouses, lagnaSign),
    viparitaRajaYoga:    detectViparitaRajaYoga(planets, planetHouses, lagnaSign),
    panchaMahapurusha:   detectPanchaMahapurushaYoga(planets, planetHouses),
    guruMangalaYoga:     detectGuruMangalaYoga(planets, planetHouses),
    neechaBhangaYoga:    detectNeechaBhangaRajaYoga(planets, planetHouses, lagnaSign),
  };
}

// Re-export helper
export { getHouseLords as getHouseLordsExport, SIGN_LORD };
const SIGN_LORD_EXPORT = SIGN_LORD;
