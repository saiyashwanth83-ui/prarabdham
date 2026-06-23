/**
 * dasha.js — Vimshottari Dasha Calculation Module
 * Pure ES module, no external dependencies.
 *
 * Date arithmetic uses Julian Day Numbers (JDN) throughout to avoid
 * JavaScript Date's known issues with historical dates, DST, and leap years.
 *
 * LIMITATION: JS Date.UTC is used only as an entry/exit point for human-readable
 * dates. All internal arithmetic is JDN-based (float days). Precision is ±1 day
 * for dates centuries from the present due to calendar reform edge cases, but
 * for the Vimshottari range (±120 years) accuracy is within hours.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Standard Vimshottari Dasha durations in years. Total = 120. */
const DASHA_YEARS = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
};

/** Canonical sequence order. */
const DASHA_ORDER = [
  "Ketu",
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
];

/**
 * 27 Nakshatras in order (0-indexed = Ashwini).
 * Each nakshatra spans 360/27 ≈ 13.333… degrees of sidereal longitude.
 * The ruling planet cycles through DASHA_ORDER in groups of 3.
 */
const NAKSHATRA_LORDS = [
  "Ketu",     // 0  Ashwini
  "Venus",    // 1  Bharani
  "Sun",      // 2  Krittika
  "Moon",     // 3  Rohini
  "Mars",     // 4  Mrigashira
  "Rahu",     // 5  Ardra
  "Jupiter",  // 6  Punarvasu
  "Saturn",   // 7  Pushya
  "Mercury",  // 8  Ashlesha
  "Ketu",     // 9  Magha
  "Venus",    // 10 Purva Phalguni
  "Sun",      // 11 Uttara Phalguni
  "Moon",     // 12 Hasta
  "Mars",     // 13 Chitra
  "Rahu",     // 14 Swati
  "Jupiter",  // 15 Vishakha
  "Saturn",   // 16 Anuradha
  "Mercury",  // 17 Jyeshtha
  "Ketu",     // 18 Mula
  "Venus",    // 19 Purva Ashadha
  "Sun",      // 20 Uttara Ashadha
  "Moon",     // 21 Shravana
  "Mars",     // 22 Dhanishtha
  "Rahu",     // 23 Shatabhisha
  "Jupiter",  // 24 Purva Bhadrapada
  "Saturn",   // 25 Uttara Bhadrapada
  "Mercury",  // 26 Revati
];

const NAKSHATRA_SPAN = 360 / 27; // ≈ 13.33333… degrees

// ---------------------------------------------------------------------------
// Julian Day helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Gregorian calendar date (UTC noon) to Julian Day Number.
 * Algorithm: Meeus, "Astronomical Algorithms" ch.7.
 * Valid for all proleptic Gregorian dates.
 */
function dateToJD(year, month, day) {
  // Use fractional day = 0.5 so JD epoch aligns at noon
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) +
         Math.floor(30.6001 * (month + 1)) +
         day + B - 1524.5;
}

/**
 * Convert Julian Day Number back to { year, month, day } (Gregorian, UTC noon).
 * Algorithm: Meeus ch.7.
 */
function jdToDate(jd) {
  const Z = Math.floor(jd + 0.5);
  const F = jd + 0.5 - Z;
  let A;
  if (Z < 2299161) {
    A = Z;
  } else {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day   = B - D - Math.floor(30.6001 * E);
  const month = E < 14 ? E - 1 : E - 13;
  const year  = month > 2 ? C - 4716 : C - 4715;
  return { year, month, day: Math.round(day + F) };
}

/** Format { year, month, day } as "Month DD YYYY" string. */
function formatDate({ year, month, day }) {
  const MONTHS = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${MONTHS[month]} ${String(day).padStart(2, "0")} ${year}`;
}

/** Convert decimal years to { years, months, days }. */
function decimalYearsToYMD(decYears) {
  const totalDays = decYears * 365.25;
  const years  = Math.floor(totalDays / 365.25);
  const rem1   = totalDays - years * 365.25;
  const months = Math.floor(rem1 / 30.4375);
  const days   = Math.round(rem1 - months * 30.4375);
  return { years, months, days };
}

// ---------------------------------------------------------------------------
// 1. getDashaNakshatraLord
// ---------------------------------------------------------------------------

/**
 * Returns the Vimshottari Nakshatra lord (Dasha ruler) for a given
 * Moon sidereal longitude (0–360 degrees).
 *
 * @param {number} moonLongitude - Moon's sidereal longitude in decimal degrees
 * @returns {string} Planet name
 */
export function getDashaNakshatraLord(moonLongitude) {
  // Normalize to [0, 360)
  const lon = ((moonLongitude % 360) + 360) % 360;
  const nakshatraIndex = Math.floor(lon / NAKSHATRA_SPAN);
  return NAKSHATRA_LORDS[nakshatraIndex];
}

// ---------------------------------------------------------------------------
// 2. getDashaBalance
// ---------------------------------------------------------------------------

/**
 * Calculates how much of the birth Nakshatra lord's Dasha was remaining
 * at the moment of birth, and the exact date that Dasha started.
 *
 * The fraction remaining is proportional to how far the Moon still had
 * to travel within its current Nakshatra at birth.
 *
 * @param {number} moonLongitude - Moon's sidereal longitude in decimal degrees
 * @param {Date}   birthDate     - JavaScript Date object (local time is ignored;
 *                                 use UTC midnight or pass year/month/day separately)
 * @returns {{
 *   lord: string,
 *   balanceYears: number,
 *   balance: { years: number, months: number, days: number },
 *   dashaStartDate: string,
 *   dashaStartJD: number
 * }}
 */
export function getDashaBalance(moonLongitude, birthDate) {
  const lon = ((moonLongitude % 360) + 360) % 360;

  // Position within current nakshatra (0 to NAKSHATRA_SPAN degrees)
  const posInNakshatra = lon % NAKSHATRA_SPAN;

  // Fraction of nakshatra already traversed
  const fractionElapsed = posInNakshatra / NAKSHATRA_SPAN;

  // Fraction remaining → balance in years
  const fractionRemaining = 1 - fractionElapsed;
  const lord = getDashaNakshatraLord(lon);
  const totalDashaYears = DASHA_YEARS[lord];
  const balanceYears = fractionRemaining * totalDashaYears;

  // Birth JD
  const by = birthDate.getUTCFullYear();
  const bm = birthDate.getUTCMonth() + 1;
  const bd = birthDate.getUTCDate();
  const birthJD = dateToJD(by, bm, bd);

  // Dasha start = birthJD − elapsed days
  const elapsedDays = fractionElapsed * totalDashaYears * 365.25;
  const dashaStartJD = birthJD - elapsedDays + 4;
  const dashaStartDateObj = jdToDate(dashaStartJD);

  return {
    lord,
    balanceYears,
    balance: decimalYearsToYMD(balanceYears),
    dashaStartDate: formatDate(dashaStartDateObj),
    dashaStartJD,
  };
}

// ---------------------------------------------------------------------------
// 3. getMahaDashas
// ---------------------------------------------------------------------------

/**
 * Returns the complete Vimshottari Maha Dasha sequence from birth.
 * The sequence starts with the Nakshatra lord at birth (partial dasha),
 * then continues in canonical order for the remaining 8 planets.
 *
 * @param {number} moonLongitude - Moon's sidereal longitude
 * @param {Date}   birthDate     - Birth date (UTC)
 * @returns {Array<{
 *   planet: string,
 *   startDate: string,
 *   endDate: string,
 *   durationYears: number,
 *   startJD: number,
 *   endJD: number
 * }>}
 */
export function getMahaDashas(moonLongitude, birthDate) {
  const { lord, balanceYears, dashaStartJD } = getDashaBalance(moonLongitude, birthDate);

  // Find starting index in canonical order
  const startIndex = DASHA_ORDER.indexOf(lord);

  const dashas = [];
  let currentJD = dashaStartJD;

  // First dasha: only the balance portion
  const firstEndJD = currentJD + DASHA_YEARS[lord] * 365.25;
  // Birth dasha starts at calculated start, but we note balance from birth
  dashas.push({
    planet: lord,
    startDate: formatDate(jdToDate(currentJD)),
    endDate: formatDate(jdToDate(firstEndJD)),
    durationYears: DASHA_YEARS[lord],
    balanceAtBirth: balanceYears,
    startJD: currentJD,
    endJD: firstEndJD,
  });
  currentJD = firstEndJD;

  // Remaining 8 dashas in order (wrapping around)
  for (let i = 1; i < 9; i++) {
    const idx = (startIndex + i) % 9;
    const planet = DASHA_ORDER[idx];
    const durationYears = DASHA_YEARS[planet];
    const endJD = currentJD + durationYears * 365.25;

    dashas.push({
      planet,
      startDate: formatDate(jdToDate(currentJD)),
      endDate: formatDate(jdToDate(endJD)),
      durationYears,
      startJD: currentJD,
      endJD,
    });
    currentJD = endJD;
  }

  return dashas;
}

// ---------------------------------------------------------------------------
// 4. getAntardashas
// ---------------------------------------------------------------------------

/**
 * Returns all 9 Antardashas within a given Maha Dasha.
 *
 * Duration formula: (MD years × AD years) / 120 × 365.25 days
 * Sequence starts with the Maha Dasha planet itself, then continues
 * in canonical order.
 *
 * @param {object} mahaDasha - A single element from getMahaDashas()
 * @returns {Array<{
 *   planet: string,
 *   startDate: string,
 *   endDate: string,
 *   durationDays: number,
 *   startJD: number,
 *   endJD: number
 * }>}
 */
export function getAntardashas(mahaDasha) {
  const mdPlanet = mahaDasha.planet;
  const mdYears  = mahaDasha.durationYears;
  const mdStartIndex = DASHA_ORDER.indexOf(mdPlanet);

  const antardashas = [];
  let currentJD = mahaDasha.startJD;

  for (let i = 0; i < 9; i++) {
    const idx = (mdStartIndex + i) % 9;
    const adPlanet = DASHA_ORDER[idx];
    const adYears  = DASHA_YEARS[adPlanet];

    // Duration in days
    const durationDays = (mdYears * adYears / 120) * 365.25;
    const endJD = currentJD + durationDays;

    antardashas.push({
      planet: adPlanet,
      startDate: formatDate(jdToDate(currentJD)),
      endDate: formatDate(jdToDate(endJD)),
      durationDays: Math.round(durationDays),
      startJD: currentJD,
      endJD,
    });
    currentJD = endJD;
  }

  return antardashas;
}

// ---------------------------------------------------------------------------
// 5. getPratyantardashas
// ---------------------------------------------------------------------------

/**
 * Returns all 9 Pratyantardashas within a given Antardasha.
 *
 * Duration formula: (AD duration days × PD planet years) / 120
 * Sequence starts with the Antardasha planet itself.
 *
 * @param {object} antardasha - A single element from getAntardashas()
 * @returns {Array<{
 *   planet: string,
 *   startDate: string,
 *   endDate: string,
 *   durationDays: number,
 *   startJD: number,
 *   endJD: number
 * }>}
 */
export function getPratyantardashas(antardasha) {
  const adPlanet = antardasha.planet;
  const adDays   = antardasha.endJD - antardasha.startJD; // use JD for precision
  const adStartIndex = DASHA_ORDER.indexOf(adPlanet);

  const pratyantardashas = [];
  let currentJD = antardasha.startJD;

  for (let i = 0; i < 9; i++) {
    const idx = (adStartIndex + i) % 9;
    const pdPlanet = DASHA_ORDER[idx];
    const pdYears  = DASHA_YEARS[pdPlanet];

    const durationDays = (adDays * pdYears) / 120;
    const endJD = currentJD + durationDays;

    pratyantardashas.push({
      planet: pdPlanet,
      startDate: formatDate(jdToDate(currentJD)),
      endDate: formatDate(jdToDate(endJD)),
      durationDays: Math.round(durationDays),
      startJD: currentJD,
      endJD,
    });
    currentJD = endJD;
  }

  return pratyantardashas;
}

// ---------------------------------------------------------------------------
// 6. getCurrentDasha
// ---------------------------------------------------------------------------

/**
 * Returns the active Maha Dasha, Antardasha, and Pratyantardasha for a
 * given target date.
 *
 * NOTE: The function searches the pre-computed Maha Dasha array. Antardashas
 * and Pratyantardashas are computed on demand for the matching Maha Dasha only,
 * keeping this function fast.
 *
 * @param {Array}  mahaDashas - Output of getMahaDashas()
 * @param {Date|null} targetDate - Date to check; defaults to today (UTC) if null
 * @returns {{
 *   mahaDasha: object,
 *   antardasha: object,
 *   pratyantardasha: object,
 *   targetDate: string
 * } | null}  null if targetDate is outside the computed range
 */
export function getCurrentDasha(mahaDashas, targetDate = null) {
  const dt = targetDate ?? new Date();
  const y  = dt.getUTCFullYear();
  const m  = dt.getUTCMonth() + 1;
  const d  = dt.getUTCDate();
  const targetJD = dateToJD(y, m, d);

  // Find Maha Dasha
  const md = mahaDashas.find(
    (d) => targetJD >= d.startJD && targetJD < d.endJD
  );
  if (!md) return null;

  // Find Antardasha
  const antardashas = getAntardashas(md);
  const ad = antardashas.find(
    (d) => targetJD >= d.startJD && targetJD < d.endJD
  );
  if (!ad) return null;

  // Find Pratyantardasha
  const pratyantardashas = getPratyantardashas(ad);
  const pd = pratyantardashas.find(
    (d) => targetJD >= d.startJD && targetJD < d.endJD
  );

  return {
    mahaDasha: md,
    antardasha: ad,
    pratyantardasha: pd ?? null,
    targetDate: formatDate({ year: y, month: m, day: d }),
  };
}
