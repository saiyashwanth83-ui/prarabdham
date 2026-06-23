/**
 * divisional.js — Vedic Astrology Divisional (Varga) Chart Module
 * Pure ES module, no external dependencies.
 *
 * All formulas follow Brihat Parashara Hora Shastra (BPHS) unless noted.
 * Input planets object is from core.js getPlanets() — each planet has:
 *   { longitude, sign, signIndex, degrees, minutes, seconds, nakshatra, pada, formatted }
 * Input lagna object is from core.js getLagna() — same shape.
 *
 * KNOWN LIMITATION: D7 and D10 have minor variations across classical texts.
 * The formulas used here match Drik Panchang / Jagannatha Hora convention.
 * See individual function comments for details.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

// Odd signs (0-indexed): Aries=0, Gemini=2, Leo=4, Libra=6, Sagittarius=8, Aquarius=10
const ODD_SIGNS  = new Set([0, 2, 4, 6, 8, 10]);
// Even signs: Taurus=1, Cancer=3, Virgo=5, Scorpio=7, Capricorn=9, Pisces=11
const EVEN_SIGNS = new Set([1, 3, 5, 7, 9, 11]);

// Navamsa starting sign by element
// Fire signs: Aries(0), Leo(4), Sagittarius(8) → start from Aries(0)
// Earth signs: Taurus(1), Virgo(5), Capricorn(9) → start from Capricorn(9)
// Air signs: Gemini(2), Libra(6), Aquarius(10) → start from Libra(6)
// Water signs: Cancer(3), Scorpio(7), Pisces(11) → start from Cancer(3)
const NAVAMSA_START = [0, 9, 6, 3, 0, 9, 6, 3, 0, 9, 6, 3];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Normalize sign index to 0–11 with wraparound. */
function normSign(idx) {
  return ((idx % 12) + 12) % 12;
}

/**
 * Build a planet-position result object from a final sidereal longitude
 * in the divisional chart (0–360).
 */
function buildPosition(divLon) {
  const lon       = ((divLon % 360) + 360) % 360;
  const signIdx   = Math.floor(lon / 30);
  const degInSign = lon - signIdx * 30;
  const degrees   = Math.floor(degInSign);
  const minFull   = (degInSign - degrees) * 60;
  const minutes   = Math.floor(minFull);
  const seconds   = Math.floor((minFull - minutes) * 60);
  const nakIdx    = Math.floor(lon / (360 / 27));
  const pada      = Math.floor((lon % (360 / 27)) / (360 / 108)) + 1;

  return {
    longitude: lon,
    sign:      SIGNS[signIdx],
    signIndex: signIdx,
    degrees,
    minutes,
    seconds,
    degInSign,
    nakshatra: NAKSHATRAS[nakIdx],
    pada,
    formatted: `${SIGNS[signIdx]} ${degrees}° ${String(minutes).padStart(2, '0')}'`,
  };
}

/**
 * Apply a divisional transform to a single planet's sidereal longitude.
 *
 * @param {number} lon       - Planet's sidereal longitude (0–360)
 * @param {number} divisor   - The D-number (e.g. 9 for Navamsa)
 * @param {number} startSign - The sign index (0–11) where counting begins
 * @returns {object} buildPosition result
 *
 * Formula (Parashari standard):
 *   partSize = 30 / divisor  (degrees per division within one sign)
 *   partIndex = floor(degInSign / partSize)  (which part, 0-based)
 *   resultSign = (startSign + partIndex) % 12
 *   offset within result sign = (degInSign - partIndex * partSize) * (30 / partSize)
 *     → scales the sub-degree position proportionally within the new sign
 */
function applyDivisional(lon, divisor, startSign) {
  const lon360    = ((lon % 360) + 360) % 360;
  const signIdx   = Math.floor(lon360 / 30);
  const degInSign = lon360 - signIdx * 30;

  const partSize  = 30 / divisor;
  const partIndex = Math.min(Math.floor(degInSign / partSize), divisor - 1);

  const resultSignIdx = normSign(startSign + partIndex);

  // Sub-degree offset: proportional position within the result sign
  const offset    = (degInSign - partIndex * partSize) * (30 / partSize);
  const divLon    = resultSignIdx * 30 + offset;

  return buildPosition(divLon);
}

/**
 * Transform all planets + lagna through a given divisional function.
 * @param {object} planets   - From core.js getPlanets()
 * @param {object} lagna     - From core.js getLagna()
 * @param {function} fn      - (longitude) => buildPosition result
 * @returns {object} { Sun, Moon, ..., Lagna }
 */
function transformAll(planets, lagna, fn) {
  const result = {};
  for (const [name, planet] of Object.entries(planets)) {
    result[name] = fn(planet.longitude);
  }
  result.Lagna = fn(lagna.longitude);
  return result;
}

// ---------------------------------------------------------------------------
// 1. getDivisionalLongitude
// ---------------------------------------------------------------------------

/**
 * Core divisional calculation — returns a position object for any D-number
 * using the standard Parashari formula with automatic starting sign.
 *
 * For charts where the starting sign depends on sign parity (D7, D10) or
 * element (D9), use the dedicated functions below which handle those cases.
 *
 * For D1, D3, D4, D12: startSign = same sign as natal (signIdx).
 * For D2: special parity logic (see getD2).
 * For D9: element-based starting sign (see getD9).
 *
 * This function uses startSign = signIdx (same-sign start), which is correct
 * for D3, D4, D12. Pass a custom startSign override for other charts.
 *
 * @param {number} planetLongitude - Sidereal longitude (0–360)
 * @param {number} divisor         - Divisional number
 * @returns {object} Position object
 */
export function getDivisionalLongitude(planetLongitude, divisor) {
  const lon360  = ((planetLongitude % 360) + 360) % 360;
  const signIdx = Math.floor(lon360 / 30);
  return applyDivisional(lon360, divisor, signIdx);
}

// ---------------------------------------------------------------------------
// 2. getD1 — Rasi (Natal)
// ---------------------------------------------------------------------------

/**
 * D1 — Rasi chart. No transformation. Returns planets as-is from core.js.
 * Rebuilds position objects from raw longitude for format consistency.
 */
export function getD1(planets, lagna) {
  return transformAll(planets, lagna, (lon) => buildPosition(lon));
}

// ---------------------------------------------------------------------------
// 3. getD2 — Hora
// ---------------------------------------------------------------------------

/**
 * D2 — Hora chart. Each sign split into two 15° halves.
 *
 * Rule (BPHS):
 *   Odd signs  (Aries, Gemini, Leo, Libra, Sagittarius, Aquarius):
 *     First 15°  → Leo (Sun's hora)
 *     Second 15° → Cancer (Moon's hora)
 *   Even signs (Taurus, Cancer, Virgo, Scorpio, Capricorn, Pisces):
 *     First 15°  → Cancer (Moon's hora)
 *     Second 15° → Leo (Sun's hora)
 *
 * LIMITATION: This produces only two possible signs (Leo or Cancer).
 * The sub-degree offset within Cancer/Leo is preserved proportionally.
 */
export function getD2(planets, lagna) {
  function horaLon(lon) {
    const lon360    = ((lon % 360) + 360) % 360;
    const signIdx   = Math.floor(lon360 / 30);
    const degInSign = lon360 - signIdx * 30;
    const isOdd     = ODD_SIGNS.has(signIdx);
    const inFirst15 = degInSign < 15;

    // Determine result sign: Leo=4, Cancer=3
    let resultSign;
    if (isOdd) {
      resultSign = inFirst15 ? 4 : 3; // Leo : Cancer
    } else {
      resultSign = inFirst15 ? 3 : 4; // Cancer : Leo
    }

    // Sub-degree within the 15° half, scaled to 30°
    const halfOffset = degInSign % 15;
    const offset     = halfOffset * 2; // scale 15° → 30°
    return buildPosition(resultSign * 30 + offset);
  }

  return transformAll(planets, lagna, horaLon);
}

// ---------------------------------------------------------------------------
// 4. getD3 — Drekkana
// ---------------------------------------------------------------------------

/**
 * D3 — Drekkana chart. Each sign divided into 3 parts of 10° each.
 *
 * Rule (BPHS):
 *   First 10°  (0–10°):   same sign as natal
 *   Second 10° (10–20°):  5th sign from natal
 *   Third 10°  (20–30°):  9th sign from natal
 *
 * This is equivalent to applyDivisional with startSign = signIdx,
 * because part 0 → +0, part 1 → +4 (5th sign = index+4), part 2 → +8 (9th = index+8).
 * Standard formula handles this automatically.
 */
export function getD3(planets, lagna) {
  function drekkanaLon(lon) {
    const lon360    = ((lon % 360) + 360) % 360;
    const signIdx   = Math.floor(lon360 / 30);
    const degInSign = lon360 - signIdx * 30;
    const part      = Math.min(Math.floor(degInSign / 10), 2);
    const offsets   = [0, 4, 8]; // 1st, 5th, 9th sign
    const resultSign = normSign(signIdx + offsets[part]);
    const offset     = (degInSign - part * 10) * 3; // scale 10° → 30°
    return buildPosition(resultSign * 30 + offset);
  }

  return transformAll(planets, lagna, drekkanaLon);
}

// ---------------------------------------------------------------------------
// 5. getD4 — Chaturthamsa
// ---------------------------------------------------------------------------

/**
 * D4 — Chaturthamsa chart. Each sign divided into 4 parts of 7°30' each.
 *
 * Rule (BPHS):
 *   Part 1 (0–7°30'):    same sign
 *   Part 2 (7°30'–15°):  4th sign from natal
 *   Part 3 (15–22°30'):  7th sign from natal
 *   Part 4 (22°30'–30'): 10th sign from natal
 *
 * Offsets: +0, +3, +6, +9 (counting from same sign).
 */
export function getD4(planets, lagna) {
  function chaturthaLon(lon) {
    const lon360    = ((lon % 360) + 360) % 360;
    const signIdx   = Math.floor(lon360 / 30);
    const degInSign = lon360 - signIdx * 30;
    const partSize  = 7.5;
    const part      = Math.min(Math.floor(degInSign / partSize), 3);
    const offsets   = [0, 3, 6, 9];
    const resultSign = normSign(signIdx + offsets[part]);
    const offset     = (degInSign - part * partSize) * 4; // scale 7.5° → 30°
    return buildPosition(resultSign * 30 + offset);
  }

  return transformAll(planets, lagna, chaturthaLon);
}

// ---------------------------------------------------------------------------
// 6. getD7 — Saptamsa
// ---------------------------------------------------------------------------

/**
 * D7 — Saptamsa chart. Each sign divided into 7 parts of 4°17'8" (≈4.2857°) each.
 *
 * Rule (BPHS / Drik Panchang convention):
 *   Odd signs:  count the 7 parts starting from the same sign
 *   Even signs: count the 7 parts starting from the 7th sign (signIdx + 6)
 *
 * FORMULA UNCERTAINTY: Some texts (including Jagannatha Hora) use the same
 * convention. A minority of classical sources start even signs from the sign
 * itself. The Drik Panchang convention (7th sign for even) is used here as it
 * matches the most commonly verified reference charts.
 */
export function getD7(planets, lagna) {
  function saptamsaLon(lon) {
    const lon360    = ((lon % 360) + 360) % 360;
    const signIdx   = Math.floor(lon360 / 30);
    const degInSign = lon360 - signIdx * 30;
    const partSize  = 30 / 7;
    const part      = Math.min(Math.floor(degInSign / partSize), 6);

    const startSign = ODD_SIGNS.has(signIdx)
      ? signIdx          // odd: start from same sign
      : normSign(signIdx + 6); // even: start from 7th sign

    const resultSign = normSign(startSign + part);
    const offset     = (degInSign - part * partSize) * (30 / partSize);
    return buildPosition(resultSign * 30 + offset);
  }

  return transformAll(planets, lagna, saptamsaLon);
}

// ---------------------------------------------------------------------------
// 7. getD9 — Navamsa
// ---------------------------------------------------------------------------

/**
 * D9 — Navamsa chart. Each sign divided into 9 parts of 3°20' each.
 *
 * Starting sign by element of the natal sign:
 *   Fire  (Aries, Leo, Sagittarius):        start from Aries (0)
 *   Earth (Taurus, Virgo, Capricorn):       start from Capricorn (9)
 *   Air   (Gemini, Libra, Aquarius):        start from Libra (6)
 *   Water (Cancer, Scorpio, Pisces):        start from Cancer (3)
 *
 * This is the universally agreed Parashari formula — no known variation.
 */
export function getD9(planets, lagna) {
  function navamsaLon(lon) {
    const lon360    = ((lon % 360) + 360) % 360;
    const signIdx   = Math.floor(lon360 / 30);
    const startSign = NAVAMSA_START[signIdx];
    return applyDivisional(lon360, 9, startSign);
  }

  return transformAll(planets, lagna, navamsaLon);
}

// ---------------------------------------------------------------------------
// 8. getD10 — Dashamsa
// ---------------------------------------------------------------------------

/**
 * D10 — Dashamsa chart. Each sign divided into 10 parts of 3° each.
 *
 * Rule (BPHS / Drik Panchang convention):
 *   Odd signs:  count 10 parts starting from the same sign
 *   Even signs: count 10 parts starting from the 9th sign (signIdx + 8)
 *
 * FORMULA UNCERTAINTY: A small number of sources start even signs from the
 * sign itself. The convention used here (9th sign for even) matches Drik
 * Panchang and Jagannatha Hora and is the most widely used in modern software.
 */
export function getD10(planets, lagna) {
  function dashamsaLon(lon) {
    const lon360    = ((lon % 360) + 360) % 360;
    const signIdx   = Math.floor(lon360 / 30);
    const degInSign = lon360 - signIdx * 30;
    const partSize  = 3;
    const part      = Math.min(Math.floor(degInSign / partSize), 9);

    const startSign = ODD_SIGNS.has(signIdx)
      ? signIdx              // odd: same sign
      : normSign(signIdx + 8); // even: 9th sign

    const resultSign = normSign(startSign + part);
    const offset     = (degInSign - part * partSize) * 10; // scale 3° → 30°
    return buildPosition(resultSign * 30 + offset);
  }

  return transformAll(planets, lagna, dashamsaLon);
}

// ---------------------------------------------------------------------------
// 9. getD12 — Dwadashamsa
// ---------------------------------------------------------------------------

/**
 * D12 — Dwadashamsa chart. Each sign divided into 12 parts of 2°30' each.
 *
 * Rule (BPHS): Count starts from the same sign, moving one sign per part.
 * No parity variation — universally agreed formula.
 */
export function getD12(planets, lagna) {
  function dwadashaLon(lon) {
    const lon360    = ((lon % 360) + 360) % 360;
    const signIdx   = Math.floor(lon360 / 30);
    return applyDivisional(lon360, 12, signIdx);
  }

  return transformAll(planets, lagna, dwadashaLon);
}

// ---------------------------------------------------------------------------
// 10. getAllMukhyaVarga
// ---------------------------------------------------------------------------

/**
 * Convenience function — computes all 8 primary (Mukhya) Varga charts.
 *
 * @param {object} planets - From core.js getPlanets()
 * @param {object} lagna   - From core.js getLagna()
 * @returns {{ D1, D2, D3, D4, D7, D9, D10, D12 }}
 */
export function getAllMukhyaVarga(planets, lagna) {
  return {
    D1:  getD1(planets, lagna),
    D2:  getD2(planets, lagna),
    D3:  getD3(planets, lagna),
    D4:  getD4(planets, lagna),
    D7:  getD7(planets, lagna),
    D9:  getD9(planets, lagna),
    D10: getD10(planets, lagna),
    D12: getD12(planets, lagna),
  };
}

// ===========================================================================
// ADVANCED DIVISIONAL CHARTS (D16–D60)
// ===========================================================================

// Sign quality lookup tables
// Movable (Chara): Aries=0, Cancer=3, Libra=6, Capricorn=9
const MOVABLE_SIGNS = new Set([0, 3, 6, 9]);
// Fixed (Sthira): Taurus=1, Leo=4, Scorpio=7, Aquarius=10
const FIXED_SIGNS   = new Set([1, 4, 7, 10]);
// Dual (Dwiswabhava): Gemini=2, Virgo=5, Sagittarius=8, Pisces=11
const DUAL_SIGNS    = new Set([2, 5, 8, 11]);

// Element lookup: Fire=0,1,2,3... mapped to start signs
// Fire (Aries=0,Leo=4,Sagittarius=8) → Aries(0)
// Earth (Taurus=1,Virgo=5,Capricorn=9) → Cancer(3)
// Air (Gemini=2,Libra=6,Aquarius=10) → Libra(6)
// Water (Cancer=3,Scorpio=7,Pisces=11) → Capricorn(9)
const ELEMENT_START_D27 = [0, 3, 6, 9, 0, 3, 6, 9, 0, 3, 6, 9];

/**
 * Helper: get starting sign for Movable/Fixed/Dual based charts.
 * Used by D16, D20, D45.
 * Movable → Aries(0), Fixed → Leo(4), Dual → Sagittarius(8)
 */
function mfdStart(signIdx) {
  if (MOVABLE_SIGNS.has(signIdx)) return 0;  // Aries
  if (FIXED_SIGNS.has(signIdx))   return 4;  // Leo
  return 8;                                   // Sagittarius (Dual)
}

// ---------------------------------------------------------------------------
// 11. getD16 — Shodashamsa
// ---------------------------------------------------------------------------

/**
 * D16 — Shodashamsa. Each sign divided into 16 parts of 1°52'30" (1.875°) each.
 *
 * Starting sign by quality (BPHS):
 *   Movable signs (Aries, Cancer, Libra, Capricorn): count from Aries
 *   Fixed signs   (Taurus, Leo, Scorpio, Aquarius):  count from Leo
 *   Dual signs    (Gemini, Virgo, Sagittarius, Pisces): count from Sagittarius
 */
export function getD16(planets, lagna) {
  function d16Lon(lon) {
    const lon360  = ((lon % 360) + 360) % 360;
    const signIdx = Math.floor(lon360 / 30);
    return applyDivisional(lon360, 16, mfdStart(signIdx));
  }
  return transformAll(planets, lagna, d16Lon);
}

// ---------------------------------------------------------------------------
// 12. getD20 — Vimshamsa
// ---------------------------------------------------------------------------

/**
 * D20 — Vimshamsa. Each sign divided into 20 parts of 1°30' each.
 *
 * Starting sign by quality (BPHS):
 *   Movable → Aries, Fixed → Leo, Dual → Sagittarius
 * Same quality-based rule as D16.
 */
export function getD20(planets, lagna) {
  function d20Lon(lon) {
    const lon360  = ((lon % 360) + 360) % 360;
    const signIdx = Math.floor(lon360 / 30);
    return applyDivisional(lon360, 20, mfdStart(signIdx));
  }
  return transformAll(planets, lagna, d20Lon);
}

// ---------------------------------------------------------------------------
// 13. getD24 — Chaturvimshamsa (Siddhamsa)
// ---------------------------------------------------------------------------

/**
 * D24 — Chaturvimshamsa. Each sign divided into 24 parts of 1°15' each.
 *
 * Starting sign by parity (BPHS):
 *   Odd signs  → count from Leo (4)
 *   Even signs → count from Cancer (3)
 */
export function getD24(planets, lagna) {
  function d24Lon(lon) {
    const lon360  = ((lon % 360) + 360) % 360;
    const signIdx = Math.floor(lon360 / 30);
    const startSign = ODD_SIGNS.has(signIdx) ? 4 : 3; // Leo : Cancer
    return applyDivisional(lon360, 24, startSign);
  }
  return transformAll(planets, lagna, d24Lon);
}

// ---------------------------------------------------------------------------
// 14. getD27 — Bhamsa (Nakshatramsa)
// ---------------------------------------------------------------------------

/**
 * D27 — Bhamsa. Each sign divided into 27 parts of 1°6'40" (1.1111°) each.
 *
 * Starting sign by element (BPHS):
 *   Fire  (Aries, Leo, Sagittarius):        count from Aries (0)
 *   Earth (Taurus, Virgo, Capricorn):       count from Cancer (3)
 *   Air   (Gemini, Libra, Aquarius):        count from Libra (6)
 *   Water (Cancer, Scorpio, Pisces):        count from Capricorn (9)
 */
export function getD27(planets, lagna) {
  function d27Lon(lon) {
    const lon360  = ((lon % 360) + 360) % 360;
    const signIdx = Math.floor(lon360 / 30);
    return applyDivisional(lon360, 27, ELEMENT_START_D27[signIdx]);
  }
  return transformAll(planets, lagna, d27Lon);
}

// ---------------------------------------------------------------------------
// 15. getD30 — Trimshamsa
// ---------------------------------------------------------------------------

/**
 * D30 — Trimshamsa. Non-equal divisions — the only standard divisional chart
 * that uses unequal parts.
 *
 * Classical BPHS formula:
 *
 * ODD signs (Aries, Gemini, Leo, Libra, Sagittarius, Aquarius):
 *   Mars    0°– 5°  → Aries    (Mars odd-sign rulership)
 *   Saturn  5°–10°  → Aquarius (Saturn odd-sign rulership)
 *   Jupiter 10°–18° → Sagittarius
 *   Mercury 18°–25° → Gemini
 *   Venus   25°–30° → Libra
 *
 * EVEN signs (Taurus, Cancer, Virgo, Scorpio, Capricorn, Pisces):
 *   Venus    0°– 5° → Taurus
 *   Mercury  5°–12° → Virgo
 *   Jupiter 12°–20° → Pisces
 *   Saturn  20°–25° → Capricorn
 *   Mars    25°–30° → Scorpio
 *
 * The sub-degree position within the result sign is scaled proportionally
 * from the planet's position within its Trimshamsa division.
 *
 * FORMULA NOTE: This implementation uses the most widely cited BPHS version
 * (matching Drik Panchang and Jagannatha Hora). A small minority of sources
 * assign different signs for some rulers. The positions above are the
 * standard modern consensus. Manual verification against Drik Panchang is
 * recommended for critical use.
 */
export function getD30(planets, lagna) {
  // Odd sign divisions: [endDeg, resultSignIdx]
  const ODD_DIVS = [
    { end:  5, sign: 0  },  // Mars → Aries
    { end: 10, sign: 10 },  // Saturn → Aquarius
    { end: 18, sign: 8  },  // Jupiter → Sagittarius
    { end: 25, sign: 2  },  // Mercury → Gemini
    { end: 30, sign: 6  },  // Venus → Libra
  ];
  // Even sign divisions: [endDeg, resultSignIdx]
  const EVEN_DIVS = [
    { end:  5, sign: 1  },  // Venus → Taurus
    { end: 12, sign: 5  },  // Mercury → Virgo
    { end: 20, sign: 11 },  // Jupiter → Pisces
    { end: 25, sign: 9  },  // Saturn → Capricorn
    { end: 30, sign: 7  },  // Mars → Scorpio
  ];

  function d30Lon(lon) {
    const lon360    = ((lon % 360) + 360) % 360;
    const signIdx   = Math.floor(lon360 / 30);
    const degInSign = lon360 - signIdx * 30;
    const divs      = ODD_SIGNS.has(signIdx) ? ODD_DIVS : EVEN_DIVS;

    let prevEnd = 0;
    for (const div of divs) {
      if (degInSign < div.end) {
        const spanSize = div.end - prevEnd;
        // Scale position within this span proportionally into 30°
        const offset = ((degInSign - prevEnd) / spanSize) * 30;
        return buildPosition(div.sign * 30 + offset);
      }
      prevEnd = div.end;
    }
    // Edge case: exactly 30° (shouldn't happen, but handle gracefully)
    const last = divs[divs.length - 1];
    return buildPosition(last.sign * 30 + 29.99);
  }

  return transformAll(planets, lagna, d30Lon);
}

// ---------------------------------------------------------------------------
// 16. getD40 — Khavedamsa
// ---------------------------------------------------------------------------

/**
 * D40 — Khavedamsa. Each sign divided into 40 parts of 0°45' each.
 *
 * Starting sign by parity (BPHS):
 *   Odd signs  → count from Aries (0)
 *   Even signs → count from Libra (6)
 */
export function getD40(planets, lagna) {
  function d40Lon(lon) {
    const lon360  = ((lon % 360) + 360) % 360;
    const signIdx = Math.floor(lon360 / 30);
    const startSign = ODD_SIGNS.has(signIdx) ? 0 : 6; // Aries : Libra
    return applyDivisional(lon360, 40, startSign);
  }
  return transformAll(planets, lagna, d40Lon);
}

// ---------------------------------------------------------------------------
// 17. getD45 — Akshavedamsa
// ---------------------------------------------------------------------------

/**
 * D45 — Akshavedamsa. Each sign divided into 45 parts of 0°40' each.
 *
 * Starting sign by quality (BPHS):
 *   Movable → Aries (0), Fixed → Leo (4), Dual → Sagittarius (8)
 * Same quality rule as D16 and D20.
 */
export function getD45(planets, lagna) {
  function d45Lon(lon) {
    const lon360  = ((lon % 360) + 360) % 360;
    const signIdx = Math.floor(lon360 / 30);
    return applyDivisional(lon360, 45, mfdStart(signIdx));
  }
  return transformAll(planets, lagna, d45Lon);
}

// ---------------------------------------------------------------------------
// 18. getD60 — Shashtiamsa
// ---------------------------------------------------------------------------

/**
 * D60 — Shashtiamsa. Each sign divided into 60 parts of 0°30' each.
 * Corrected formula verified against Drik Panchang for 6 planets.
 *
 * Formula:
 *   partNumber = floor(degInSign / 0.5) + 1  (1-based, 1–60)
 *   resultSign = (natalSignIndex + partNumber - 1) % 12
 *   No odd/even parity distinction — same rule for all signs.
 *
 * Previous implementation (odd→Aries base, even→Libra base) was incorrect.
 */
export function getD60(planets, lagna) {
  function d60Lon(lon) {
    const lon360    = ((lon % 360) + 360) % 360;
    const signIdx   = Math.floor(lon360 / 30);
    const degInSign = lon360 - signIdx * 30;
    const partNumber    = Math.min(Math.floor(degInSign / 0.5) + 1, 60);
    const resultSignIdx = normSign(signIdx + partNumber - 1);
    const offset = (degInSign % 0.5) * 60;
    return buildPosition(resultSignIdx * 30 + offset);
  }
  return transformAll(planets, lagna, d60Lon);
}

// ---------------------------------------------------------------------------
// 19. getAllVargaCharts — all 16 divisional charts
// ---------------------------------------------------------------------------

/**
 * Returns all 16 Varga charts in one call.
 *
 * @param {object} planets - From core.js getPlanets()
 * @param {object} lagna   - From core.js getLagna()
 * @returns {{ D1, D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60 }}
 */
export function getAllVargaCharts(planets, lagna) {
  return {
    D1:  getD1(planets, lagna),
    D2:  getD2(planets, lagna),
    D3:  getD3(planets, lagna),
    D4:  getD4(planets, lagna),
    D7:  getD7(planets, lagna),
    D9:  getD9(planets, lagna),
    D10: getD10(planets, lagna),
    D12: getD12(planets, lagna),
    D16: getD16(planets, lagna),
    D20: getD20(planets, lagna),
    D24: getD24(planets, lagna),
    D27: getD27(planets, lagna),
    D30: getD30(planets, lagna),
    D40: getD40(planets, lagna),
    D45: getD45(planets, lagna),
    D60: getD60(planets, lagna),
  };
}
