/**
 * core.js — Vedic Astrology Core Calculation Module
 *
 * LICENSE NOTICE (IMPORTANT):
 * This module uses Swiss Ephemeris via swisseph-wasm (prolaxu/swisseph-wasm).
 * Swiss Ephemeris is dual-licensed:
 *   - GNU GPL v3 for open-source / non-commercial use (free)
 *   - Commercial license from Astrodienst AG (astro.com) for proprietary use
 * See: https://www.astro.com/swisseph/swephinfo_e.htm#licen
 *
 * LIBRARY API NOTE:
 * swisseph-wasm (prolaxu) is an ES module exporting a SwissEph CLASS.
 * Usage: const swe = new SwissEph(); await swe.initSwissEph();
 * All calculation methods are on the instance: swe.calc_ut(), swe.houses(), etc.
 *
 * BROWSER COMPATIBILITY:
 *   - Requires ES Modules (all modern browsers since 2018)
 *   - Requires WebAssembly (all modern browsers since 2017)
 *   - Does NOT work in Internet Explorer
 *   - Must be served over HTTP/HTTPS — not file:// protocol
 */

// ─── Import SwissEph class from local copy ────────────────────────────────────
// swisseph.js must exist at /js/lib/swisseph.js (downloaded from prolaxu repo)
// CURRENT (wrong path):
import SwissEph from 'https://cdn.jsdelivr.net/gh/prolaxu/swisseph-wasm@main/src/swisseph.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const SE_SUN        = 0;
const SE_MOON       = 1;
const SE_MERCURY    = 2;
const SE_VENUS      = 3;
const SE_MARS       = 4;
const SE_JUPITER    = 5;
const SE_SATURN     = 6;
const SE_TRUE_NODE  = 11; // True Node (more astronomically precise)
const SE_MEAN_NODE  = 10; // Mean Node — used by Drik Panchang and most Vedic software

// Flags
const SEFLG_SIDEREAL = 64;  // Sidereal positions
const SEFLG_MOSEPH  = 4;   // Moshier ephemeris — no data files needed
const SEFLG_SPEED   = 256; // Include speed for retrograde detection

// Ayanamsa IDs
const AYANAMSA_IDS = {
  lahiri:            1,
  raman:             3,
  krishnamurti:      5,
  yukteshwar:        7,
  true_chitrapaksha: 27,
};

const ZODIAC_SIGNS = [
  'Aries','Taurus','Gemini','Cancer',
  'Leo','Virgo','Libra','Scorpio',
  'Sagittarius','Capricorn','Aquarius','Pisces',
];

const NAKSHATRAS = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
  'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
  'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha',
  'Purva Bhadrapada','Uttara Bhadrapada','Revati',
];

// ─── SwissEph Singleton ───────────────────────────────────────────────────────

let _sweInstance = null;
let _swePromise  = null;

/**
 * Returns an initialised SwissEph instance, creating it once on first call.
 */
async function getSwe() {
  if (_sweInstance) return _sweInstance;
  if (_swePromise)  return _swePromise;

  _swePromise = (async () => {
    const swe = new SwissEph();
    await swe.initSwissEph();
    _sweInstance = swe;
    return swe;
  })();

  return _swePromise;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeDeg(deg) {
  return ((deg % 360) + 360) % 360;
}

function longitudeToComponents(longitude) {
  const lon        = normalizeDeg(longitude);
  const signIndex  = Math.floor(lon / 30);
  const degInSign  = lon - signIndex * 30;
  const degrees    = Math.floor(degInSign);
  const minFull    = (degInSign - degrees) * 60;
  const minutes    = Math.floor(minFull);
  const seconds    = Math.floor((minFull - minutes) * 60);
  const nakIdx     = Math.floor(lon / (360 / 27));
  const pada       = Math.floor((lon % (360 / 27)) / (360 / 108)) + 1;

  return {
    longitude: lon,
    sign:      ZODIAC_SIGNS[signIndex],
    signIndex,
    degrees,
    minutes,
    seconds,
    degInSign,
    nakshatra: NAKSHATRAS[nakIdx],
    pada,
    formatted: `${ZODIAC_SIGNS[signIndex]} ${degrees}° ${String(minutes).padStart(2,'0')}'`,
  };
}

/** Converts local date/time in a named IANA timezone to UTC milliseconds. */
function localToUtcMs(year, month, day, hour, minute, timezone) {
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  for (let i = 0; i < 3; i++) {
    const parts = fmt.formatToParts(new Date(guess));
    const p = {};
    parts.forEach(({ type, value }) => { p[type] = parseInt(value, 10); });
    const h = p.hour === 24 ? 0 : p.hour;
    const diff =
      Date.UTC(year, month-1, day, hour, minute, 0) -
      Date.UTC(p.year, p.month-1, p.day, h, p.minute, p.second);
    guess += diff;
  }
  return guess;
}

// ─── 1. getCoordinates ────────────────────────────────────────────────────────

/**
 * Geocodes a place name via OpenStreetMap Nominatim.
 * Free, no API key. Returns first match — show displayName to user for confirmation.
 * Rate limit: max 1 req/sec per OSM policy.
 *
 * LIMITATION: Ambiguous names (e.g. "Springfield") may resolve unexpectedly.
 */
export async function getCoordinates(placeName) {
  if (!placeName || !placeName.trim()) throw new Error('Place name is required.');

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', placeName.trim());
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  let response;
  try {
    response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Prarabdham-Vedic-Astrology/1.0' },
    });
  } catch (e) {
    throw new Error(`Network error reaching Nominatim: ${e.message}`);
  }

  if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);

  const results = await response.json();
  if (!results || results.length === 0) {
    throw new Error(`No location found for "${placeName}". Try adding country, e.g. "Chennai, India".`);
  }

  return {
    latitude:    parseFloat(results[0].lat),
    longitude:   parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
}

// ─── 2. getTimezone ───────────────────────────────────────────────────────────

/**
 * Returns IANA timezone string for a coordinate via timeapi.io (free, no key).
 * Falls back to GeoNames demo API if timeapi.io fails.
 *
 * HONEST LIMITATION: Both are third-party services with no SLA.
 * For production, bundle tz-lookup-oss locally (~700KB, zero network).
 * Pre-1970 dates: timezone data may not reflect exact historical offsets.
 * Pre-1947 India: IST wasn't standardised; LMT correction may be needed.
 */
export async function getTimezone(latitude, longitude) {
  // Primary: timeapi.io
  try {
    const r = await fetch(
      `https://timeapi.io/api/timezone/coordinate?latitude=${latitude}&longitude=${longitude}`
    );
    if (r.ok) {
      const d = await r.json();
      if (d && d.timeZone) return { timezone: d.timeZone, source: 'timeapi.io' };
    }
  } catch (_) { /* fall through */ }

  // Fallback: GeoNames demo (low quota — register free account for more)
  try {
    const r = await fetch(
      `http://api.geonames.org/timezoneJSON?lat=${latitude}&lng=${longitude}&username=demo`
    );
    if (r.ok) {
      const d = await r.json();
      if (d && d.timezoneId) {
        return { timezone: d.timezoneId, source: 'geonames.org (demo quota)' };
      }
    }
  } catch (_) { /* fall through */ }

  throw new Error(
    'Could not determine timezone from timeapi.io or geonames.org. ' +
    'For offline reliability, bundle tz-lookup-oss locally.'
  );
}

// ─── 3. getJulianDay ─────────────────────────────────────────────────────────

/**
 * Converts local birth time to Julian Day Number via UTC.
 * Uses JS Intl API for timezone offset (handles DST), then swe.julday().
 *
 * LIMITATION: Accurate for dates post-1970. For pre-1945 India, verify
 * IST was in effect (it was, from 1906). Pre-1906 needs LMT: lon/15 hours.
 */
export async function getJulianDay(year, month, day, hour, minute, timezone) {
  const swe = await getSwe();

  const utcMs      = localToUtcMs(year, month, day, hour, minute, timezone);
  const utcDate    = new Date(utcMs);
  const utcHourDec = utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60 + utcDate.getUTCSeconds() / 3600;

  const jd = swe.julday(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
    utcHourDec,
    1 // 1 = Gregorian calendar
  );

  return {
    julianDay:     jd,
    utcDatetime:   utcDate.toISOString(),
    localDatetime: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,
    timezone,
  };
}

// ─── 4. getLagna ─────────────────────────────────────────────────────────────

/**
 * Calculates sidereal Ascendant (Lagna) using swe.houses() with equal house system.
 * Tropical ASC returned by Swiss Ephemeris; ayanamsa subtracted for sidereal.
 *
 * LIMITATION: At extreme latitudes (>66°N/S) some house systems fail;
 * equal house used here works everywhere.
 */
export async function getLagna(julianDay, latitude, longitude, ayanamsa = 'lahiri') {
  const swe = await getSwe();

  const ayanamsaId = AYANAMSA_IDS[ayanamsa];
  if (ayanamsaId === undefined) {
    throw new Error(`Unknown ayanamsa "${ayanamsa}". Valid: ${Object.keys(AYANAMSA_IDS).join(', ')}`);
  }

  // Get tropical ASC via houses() then subtract ayanamsa manually.
  // houses() expects a STRING for houseSystem — wrapper calls .charCodeAt(0) internally.
  // 'P' = Placidus. ascmc[0] = Ascendant; house system doesn't affect it.
  // We do NOT pass SEFLG_SIDEREAL to houses_ex — that corrupts the ASC value.
  // Instead: get tropical ASC → subtract ayanamsa → sidereal Lagna.

  swe.set_sid_mode(ayanamsaId, 0, 0);
  const ayanamsaValue = swe.get_ayanamsa_ut(julianDay);

  const housesResult = swe.houses(julianDay, latitude, longitude, 'P');

  if (!housesResult || !housesResult.ascmc || typeof housesResult.ascmc[0] !== 'number') {
    throw new Error('swe.houses() failed — check Julian Day and coordinates.');
  }

  const tropicalAsc = housesResult.ascmc[0];
  const siderealAsc = normalizeDeg(tropicalAsc - ayanamsaValue);

  return {
    ...longitudeToComponents(siderealAsc),
    ayanamsa,
    ayanamsaValue,
    tropicalAscendant: tropicalAsc,
  };
}

// ─── 5. getPlanets ────────────────────────────────────────────────────────────

/**
 * Calculates sidereal positions for all 9 Vedic grahas.
 * Rahu = True Lunar Node. Ketu = Rahu + 180° (exact, standard in all Vedic software).
 * Retrograde = negative daily speed from swe.calc_ut().
 *
 * LIMITATION: Moshier ephemeris used (no data files). Accurate to ~1" for 1800–2100.
 * Mean Node alternative available if needed (swap SE_TRUE_NODE for SE_MEAN_NODE = 10).
 */
export async function getPlanets(julianDay, ayanamsa = 'lahiri') {
  const swe = await getSwe();

  const ayanamsaId = AYANAMSA_IDS[ayanamsa];
  if (ayanamsaId === undefined) {
    throw new Error(`Unknown ayanamsa "${ayanamsa}". Valid: ${Object.keys(AYANAMSA_IDS).join(', ')}`);
  }

  swe.set_sid_mode(ayanamsaId, 0, 0);
  const ayanamsaValue = swe.get_ayanamsa_ut(julianDay);
  const flags = SEFLG_MOSEPH | SEFLG_SPEED;

  const planetDefs = [
    { id: SE_SUN,       name: 'Sun'      },
    { id: SE_MOON,      name: 'Moon'     },
    { id: SE_MERCURY,   name: 'Mercury'  },
    { id: SE_VENUS,     name: 'Venus'    },
    { id: SE_MARS,      name: 'Mars'     },
    { id: SE_JUPITER,   name: 'Jupiter'  },
    { id: SE_SATURN,    name: 'Saturn'   },
    { id: SE_MEAN_NODE, name: 'Rahu'     }, // Mean Node matches Drik Panchang; swap to SE_TRUE_NODE for astronomical precision
  ];

  const planets = {};

  for (const { id, name } of planetDefs) {
    const result = swe.calc_ut(julianDay, id, flags);

    // prolaxu returns array: [longitude, latitude, distance, speedLon, speedLat, speedDist]
    // or an object depending on version — handle both
    let lon, speed;
    if (Array.isArray(result)) {
      lon   = result[0];
      speed = result[3] ?? 0;
    } else if (result && typeof result === 'object') {
      lon   = result.longitude ?? result[0];
      speed = result.longitudeSpeed ?? result.speedLon ?? result[3] ?? 0;
    } else {
      throw new Error(`swe.calc_ut() returned unexpected value for ${name}`);
    }

    if (typeof lon !== 'number' || isNaN(lon)) {
      throw new Error(`Invalid longitude from swe.calc_ut() for ${name}: ${JSON.stringify(result)}`);
    }

    const sidLon     = normalizeDeg(lon - ayanamsaValue);
    const isRetro    = speed < 0;

    planets[name] = {
      ...longitudeToComponents(sidLon),
      speed,
      isRetrograde: isRetro,
    };

    if (name === 'Rahu') {
      // Nodes move retrograde on average but Vedic convention (and Drik Panchang)
      // does not display the ℞ symbol for Rahu/Ketu — they are always in motion.
      planets['Rahu'].isRetrograde = false;
      const ketuLon = normalizeDeg(sidLon + 180);
      planets['Ketu'] = {
        ...longitudeToComponents(ketuLon),
        speed:        -speed,
        isRetrograde: false, // Ketu same convention — no ℞ displayed
      };
    }
  }

  return planets;
}

// ─── 6. getHouses ─────────────────────────────────────────────────────────────

/**
 * Returns 12 equal house cusps starting from Lagna (each exactly 30°).
 * Standard for South Indian Vedic charts.
 *
 * LIMITATION: Equal house only. For Whole Sign (common North Indian),
 * set each cusp to 0° of successive signs from Lagna sign.
 */
export async function getHouses(julianDay, latitude, longitude, ayanamsa = 'lahiri') {
  const lagnaData  = await getLagna(julianDay, latitude, longitude, ayanamsa);
  const lagnaLon   = lagnaData.longitude;

  return Array.from({ length: 12 }, (_, i) => ({
    house: i + 1,
    ...longitudeToComponents(normalizeDeg(lagnaLon + i * 30)),
  }));
}

// ─── 7. getPlanetHouses ───────────────────────────────────────────────────────

/**
 * Maps each planet to its house number (1–12) given equal house cusps.
 * Handles the 0° Aries wraparound correctly.
 */
export async function getPlanetHouses(planets, houseCusps) {
  const result = {};

  for (const [name, planet] of Object.entries(planets)) {
    const pLon = planet.longitude;
    let house  = 12;

    for (let i = 0; i < 12; i++) {
      const start = houseCusps[i].longitude;
      const end   = houseCusps[(i + 1) % 12].longitude;
      const inHouse = end > start
        ? pLon >= start && pLon < end
        : pLon >= start || pLon < end;

      if (inHouse) { house = i + 1; break; }
    }

    result[name] = house;
  }

  return result;
}

// ─── Convenience: Full Chart ──────────────────────────────────────────────────

export async function getFullChart(year, month, day, hour, minute, placeName, ayanamsa = 'lahiri') {
  const coords   = await getCoordinates(placeName);
  const tzResult = await getTimezone(coords.latitude, coords.longitude);
  const jdResult = await getJulianDay(year, month, day, hour, minute, tzResult.timezone);
  const jd       = jdResult.julianDay;

  const [lagna, planets, houses] = await Promise.all([
    getLagna(jd, coords.latitude, coords.longitude, ayanamsa),
    getPlanets(jd, ayanamsa),
    getHouses(jd, coords.latitude, coords.longitude, ayanamsa),
  ]);

  const planetHouses = await getPlanetHouses(planets, houses);

  return { input: { year, month, day, hour, minute, placeName, ayanamsa }, coords, tzResult, jdResult, lagna, planets, houses, planetHouses };
}
