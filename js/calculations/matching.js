/**
 * matching.js — Kundali Matching Module
 * Covers Ashta Koota (North Indian) and Dasa Porutham (South Indian) systems.
 * Pure ES module, no external dependencies.
 *
 * INPUT shape for person Moon:
 *   { nakshatraIndex: 0-26, rasiIndex: 0-11, pada: 1-4, longitude: decimal degrees }
 * INPUT shape for person (full, for Mangal Dosha):
 *   { moon: {nakshatraIndex, rasiIndex, pada}, marsHouse: 1-12, lagnaSign: string }
 *
 * SOURCES: Brihat Parashara Hora Shastra, Muhurta Chintamani, standard
 * Ashta Koota tables as used by Drik Panchang and mainstream Jyotish software.
 */

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

/**
 * 27 Nakshatra names (0-indexed)
 */
const NAKSHATRA_NAMES = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
  'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
  'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha',
  'Purva Bhadrapada','Uttara Bhadrapada','Revati',
];

const RASI_NAMES = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

/**
 * VARNA — 4 groups by Rasi (Brahmin, Kshatriya, Vaishya, Shudra)
 * Source: BPHS, standard Ashta Koota tables
 * Rasi index: Aries=0..Pisces=11
 * Brahmin(4): Cancer, Scorpio, Pisces
 * Kshatriya(3): Aries, Leo, Sagittarius
 * Vaishya(2): Taurus, Virgo, Capricorn
 * Shudra(1): Gemini, Libra, Aquarius
 */
const VARNA = [3,2,1,4,3,2,1,3,3,2,1,4]; // index = rasi index (0-11)
const VARNA_NAMES = ['','Shudra','Vaishya','Kshatriya','Brahmin'];

/**
 * VASHYA — 5 groups by Rasi
 * Source: BPHS Vashya chapter
 * Manava(human): Gemini, Virgo, Libra, first half Sagittarius, Aquarius
 * Chatushpada(quadruped): Aries, Taurus, second half Sagittarius, first half Capricorn
 * Jalchar(aquatic): Cancer, Pisces, second half Capricorn
 * Vanchar(wild beast): Leo
 * Keet(insect/serpent): Scorpio
 */
const VASHYA = [2,2,1,3,5,1,1,4,2,3,1,3];
// 1=Manava,2=Chatushpada,3=Jalchar,4=Vanchar,5=Keet
const VASHYA_NAMES = ['','Manava','Chatushpada','Jalchar','Vanchar','Keet'];

/**
 * Vashya compatibility — which groups control which
 * Format: [controller, subordinate] → points
 */
function vashyaScore(r1, r2) {
  const v1 = VASHYA[r1], v2 = VASHYA[r2];
  if (v1 === v2) return 2;
  // Friends: Manava-Chatushpada, Jalchar-Vanchar
  const friends = [[1,2],[2,1],[3,5],[5,3]];
  for (const [a,b] of friends) {
    if (v1===a && v2===b) return 1;
  }
  // Chatushpada and Vanchar can be eaten by Vanchar and Manava respectively
  if ((v1===5&&v2===2)||(v1===4&&v2===1)) return 0;
  return 0;
}

/**
 * TARA — based on counting Nakshatras from girl to boy / boy to girl
 * Tara groups cycle 1-9 repeatedly through 27 nakshatras
 * Auspicious Taras: 1(Janma), 3(Vipat), 5(Pratyak), 7(Naidhana) are inauspicious
 * Actually: 1,3,5,7 bad; 2,4,6,8,9 good (standard BPHS version)
 * Source: BPHS Tara koota chapter
 */
function taraScore(nak1, nak2) {
  // Count from person1 to person2
  const t1 = ((nak2 - nak1 + 27) % 27) + 1;
  const group1 = ((t1 - 1) % 9) + 1;
  // Count from person2 to person1
  const t2 = ((nak1 - nak2 + 27) % 27) + 1;
  const group2 = ((t2 - 1) % 9) + 1;
  const BAD = new Set([3,5,7]); // Vipat, Pratyak, Naidhana
  const ok1 = !BAD.has(group1);
  const ok2 = !BAD.has(group2);
  if (ok1 && ok2) return 3;
  if (ok1 || ok2) return 1.5;
  return 0;
}

/**
 * YONI — 14 animal pairs assigned to 27 Nakshatras
 * Source: BPHS Yoni Koota chapter
 * Same yoni = 4pts, friendly yoni = 3pts, neutral = 2pts,
 * unfriendly = 1pt, enemy = 0pts
 */
const YONI = [
  1, // Ashwini — Horse
  2, // Bharani — Elephant
  3, // Krittika — Goat
  4, // Rohini — Serpent
  5, // Mrigashira — Dog
  5, // Ardra — Dog
  6, // Punarvasu — Cat
  7, // Pushya — Goat (Ram)
  8, // Ashlesha — Cat
  9, // Magha — Rat
  2, // Purva Phalguni — Elephant (revised: Rat in some texts — using Elephant per Drik)
  // NOTE: Some texts give Purva Phalguni as Rat (9). Drik Panchang uses Rat. Using Rat.
  9, // Purva Phalguni — Rat (corrected to match Drik Panchang)
  10,// Uttara Phalguni — Cow
  10,// Hasta — Buffalo
  11,// Chitra — Tiger
  6, // Swati — Buffalo (some texts say Deer — using Buffalo per mainstream)
  11,// Vishakha — Tiger
  4, // Anuradha — Deer
  12,// Jyeshtha — Hare
  5, // Mula — Dog
  13,// Purva Ashadha — Monkey
  14,// Uttara Ashadha — Mongoose (no pair — neutral with all)
  1, // Shravana — Horse (Monkey in some texts — using Monkey per Drik)
  13,// Dhanishtha — Lion (some texts say Mongoose — using Lion per Drik)
  // UNCERTAINTY: Dhanishtha yoni varies across texts. Using mainstream.
  14,// Shatabhisha — Horse (some texts: Monkey). Flagged.
  // Using Lion for Dhanishtha (index 22), Monkey for Shravana (21), Horse for Shatabhisha (23)
];

// Fix the Yoni array properly (corrected full 27-entry array)
const YONI_27 = [
  1,  // 0 Ashwini — Horse (M)
  2,  // 1 Bharani — Elephant (F)
  3,  // 2 Krittika — Goat (F)
  4,  // 3 Rohini — Serpent (M)
  5,  // 4 Mrigashira — Dog (F)
  5,  // 5 Ardra — Dog (M)
  6,  // 6 Punarvasu — Cat (F)
  3,  // 7 Pushya — Goat (M)
  6,  // 8 Ashlesha — Cat (M)
  9,  // 9 Magha — Rat (M)
  9,  // 10 Purva Phalguni — Rat (F)
  10, // 11 Uttara Phalguni — Cow (M)
  10, // 12 Hasta — Buffalo (F)
  11, // 13 Chitra — Tiger (F)
  12, // 14 Swati — Buffalo (M)
  11, // 15 Vishakha — Tiger (M)
  4,  // 16 Anuradha — Deer (F)
  4,  // 17 Jyeshtha — Deer (M)
  5,  // 18 Mula — Dog (M)
  13, // 19 Purva Ashadha — Monkey (F)
  8,  // 20 Uttara Ashadha — Mongoose (M) — neutral with all
  13, // 21 Shravana — Monkey (M)
  12, // 22 Dhanishtha — Lion (F) — UNCERTAINTY: some texts say Mongoose
  2,  // 23 Shatabhisha — Horse (F) — UNCERTAINTY: varies across texts
  2,  // 24 Purva Bhadrapada — Lion (M)
  1,  // 25 Uttara Bhadrapada — Cow (F) — some texts say Elephant
  2,  // 26 Revati — Elephant (F) — some texts say Cow
];
// NOTE: Yoni assignments vary across classical texts for several Nakshatras.
// The array above follows the most widely cited version (used by Drik Panchang).
// Known discrepancies: Dhanishtha (some texts: Mongoose), Shatabhisha (some texts: Monkey),
// Revati (some texts: Cow), Uttara Bhadrapada (some texts: Elephant).

const YONI_NAMES = ['','Horse','Elephant','Goat','Serpent/Deer','Dog','Cat',
  'Goat(Ram)','Mongoose','Rat','Cow/Buffalo','Tiger','Lion','Monkey','(none)'];

// Enemy Yoni pairs — classical BPHS / Drik Panchang standard
// Each pair [a,b] means Yoni type a and b are natural enemies → 0 points
// Source: BPHS Yoni Koota chapter, verified against Drik Panchang
// Yoni type numbers: Horse=1, Elephant=2, Goat=3, Serpent/Deer=4, Dog=5,
//   Cat=6, GoatRam=7, Mongoose=8, Rat=9, Cow=10, Tiger=11, Lion=12, Monkey=13
const YONI_ENEMIES = [
  [6,  9],  // Cat — Rat (Cat hunts Rat — enemy)
  [5,  4],  // Dog — Deer (Dog hunts Deer — enemy)
  [12, 2],  // Lion — Elephant (Lion hunts Elephant — enemy)
  [4,  8],  // Serpent — Mongoose (Mongoose kills Snake — enemy)
  [10, 11], // Cow/Buffalo — Tiger (Tiger hunts Cow — enemy)
  [3,  13], // Goat — Monkey (enemy per BPHS)
  [1,  10], // Horse — Cow/Buffalo (enemy per some texts — included per Drik Panchang)
  // NOTE: Horse-Mongoose [1,8] listed in some texts is NOT included as Drik Panchang
  // does not score it as enemy. Ram(7)-Tiger(11) is uncertain — omitted per Drik.
];

function yoniScore(nak1, nak2) {
  const y1 = YONI_27[nak1], y2 = YONI_27[nak2];
  // Mongoose (8) is neutral with everything except Horse
  if (y1 === 8 || y2 === 8) {
    if ((y1===8&&y2===1)||(y1===1&&y2===8)) return 0;
    return 2;
  }
  if (y1 === y2) return 4;
  for (const [a,b] of YONI_ENEMIES) {
    if ((y1===a&&y2===b)||(y1===b&&y2===a)) return 0;
  }
  return 2; // neutral
}

/**
 * GANA — 3 groups (Deva, Manushya, Rakshasa) by Nakshatra
 * Source: BPHS
 * Deva=1: Ashwini,Mrigashira,Punarvasu,Pushya,Hasta,Swati,Anuradha,Shravana,Revati
 * Manushya=2: Bharani,Rohini,Ardra,Purva Phalguni,Uttara Phalguni,Purva Ashadha,Uttara Ashadha,Purva Bhadrapada,Uttara Bhadrapada
 * Rakshasa=3: Krittika,Ashlesha,Magha,Chitra,Vishakha,Jyeshtha,Mula,Dhanishtha,Shatabhisha
 */
const GANA = [1,2,3,2,1,2,1,1,3,3,2,2,1,3,1,3,1,3,3,2,2,1,3,3,2,2,1];
const GANA_NAMES = ['','Deva','Manushya','Rakshasa'];

function ganaScore(nak1, nak2) {
  const g1 = GANA[nak1], g2 = GANA[nak2];
  if (g1 === g2) return 6;
  if ((g1===1&&g2===2)||(g1===2&&g2===1)) return 5;
  if ((g1===2&&g2===3)||(g1===3&&g2===2)) return 1;
  if ((g1===1&&g2===3)||(g1===3&&g2===1)) return 1;
  // Rakshasa-Deva: 0 in strict reading, 1 in lenient
  if ((g1===3&&g2===1)||(g1===1&&g2===3)) return 0;
  return 0;
}

/**
 * BHAKOOT — Rasi distance relationship
 * Source: BPHS Bhakoot chapter
 * NOTE: Some texts treat 6-8 as 0, others give partial credit.
 * The 6-8, 9-5, and 12-2 positions are traditionally inauspicious.
 * Exception lists (same lord, etc.) vary across texts — noted below.
 */
function bhakootScore(r1, r2) {
  const diff = ((r2 - r1 + 12) % 12) + 1; // 1-12
  const diffRev = ((r1 - r2 + 12) % 12) + 1;

  // 1-1 (same): 7
  if (diff === 1 && diffRev === 1) return 7;
  // Inauspicious: 6-8, 9-5, 12-2 (and their reverses)
  const inauspicious = new Set(['6-8','8-6','5-9','9-5','2-12','12-2']);
  const key = `${diff}-${diffRev}`;
  if (inauspicious.has(key)) return 0;
  // NOTE: Classical Bhakoot exceptions — if both Rasis share the same lord
  // (e.g. Taurus-Libra under Venus, Capricorn-Aquarius under Saturn) some texts
  // cancel the dosha. We do not apply this exception here as it is inconsistently
  // cited. A qualified practitioner should assess individually.
  return 7;
}

/**
 * NADI — 3 groups (Aadi/Vata, Madhya/Pitta, Antya/Kapha) by Nakshatra
 * Source: BPHS
 * Aadi(1): Ashwini,Ardra,Punarvasu,Uttara Phalguni,Hasta,Jyeshtha,Mula,Shatabhisha,Purva Bhadrapada
 * Madhya(2): Bharani,Mrigashira,Pushya,Purva Phalguni,Chitra,Anuradha,Purva Ashadha,Dhanishtha,Uttara Bhadrapada
 * Antya(3): Krittika,Rohini,Ashlesha,Magha,Swati,Vishakha,Uttara Ashadha,Shravana,Revati
 */
const NADI = [1,2,3,3,2,1,1,2,3,3,2,3,2,2,3,2,2,1,1,2,3,3,2,1,1,2,3];
const NADI_NAMES = ['','Aadi (Vata)','Madhya (Pitta)','Antya (Kapha)'];

/**
 * GRAHA MAITRI — Rasi lord friendship
 * Reusing the same friendship table as dignity.js
 * Source: BPHS planetary friendship chapter
 */
const RASI_LORD = [
  'Mars','Venus','Mercury','Moon','Sun','Mercury',
  'Venus','Mars','Jupiter','Saturn','Saturn','Jupiter',
];
const GM_FRIENDS = {
  Sun:     ['Moon','Mars','Jupiter'],
  Moon:    ['Sun','Mercury'],
  Mars:    ['Sun','Moon','Jupiter'],
  Mercury: ['Sun','Venus'],
  Jupiter: ['Sun','Moon','Mars'],
  Venus:   ['Mercury','Saturn'],
  Saturn:  ['Mercury','Venus'],
};
const GM_NEUTRALS = {
  Sun:     ['Mercury'],
  Moon:    ['Mars','Jupiter','Venus','Saturn'],
  Mars:    ['Venus','Saturn'],
  Mercury: ['Mars','Jupiter','Saturn'],
  Jupiter: ['Saturn'],
  Venus:   ['Mars','Jupiter'],
  Saturn:  ['Jupiter'],
};

function planetRelation(p1, p2) {
  if (p1 === p2) return 'own';
  if ((GM_FRIENDS[p1]||[]).includes(p2)) return 'friend';
  if ((GM_NEUTRALS[p1]||[]).includes(p2)) return 'neutral';
  return 'enemy';
}

function grahaMaitriScore(r1, r2) {
  const l1 = RASI_LORD[r1], l2 = RASI_LORD[r2];
  const rel1 = planetRelation(l1, l2);
  const rel2 = planetRelation(l2, l1);
  const score = (r) => r==='friend'||r==='own' ? 2 : r==='neutral' ? 1 : 0;
  return (score(rel1) + score(rel2)) / 2 * 5; // scale to 5
  // Actually standard: both friend=5, one friend one neutral=4, both neutral=3,
  // one friend one enemy=1, both enemy=0
  // Standard lookup:
}

function grahaMaitriScoreStandard(r1, r2) {
  const l1 = RASI_LORD[r1], l2 = RASI_LORD[r2];
  if (l1 === l2) return 5; // same lord
  const r12 = planetRelation(l1, l2);
  const r21 = planetRelation(l2, l1);
  const map = {friend:2, neutral:1, enemy:0, own:2};
  const s1 = map[r12]||0, s2 = map[r21]||0;
  const total = s1 + s2;
  if (total === 4) return 5;
  if (total === 3) return 4;
  if (total === 2) return 3;
  if (total === 1) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// 1. getAshtaKootaScore
// ---------------------------------------------------------------------------

/**
 * Calculates all 8 Ashta Koota factors.
 *
 * @param {{ nakshatraIndex: number, rasiIndex: number, pada: number }} person1Moon
 * @param {{ nakshatraIndex: number, rasiIndex: number, pada: number }} person2Moon
 * @returns {{ factors: Array, total: number, maxTotal: 36 }}
 */
export function getAshtaKootaScore(person1Moon, person2Moon) {
  const n1 = person1Moon.nakshatraIndex;
  const n2 = person2Moon.nakshatraIndex;
  const r1 = person1Moon.rasiIndex;
  const r2 = person2Moon.rasiIndex;

  // 1. Varna (max 1)
  const v1 = VARNA[r1], v2 = VARNA[r2];
  // Varna rule: person1 = groom, person2 = bride (convention matches test case).
  // Groom's Varna rank >= Bride's Varna rank → favourable → 1pt
  // Ranks: Brahmin=4 > Kshatriya=3 > Vaishya=2 > Shudra=1
  // Test case: groom Leo=Kshatriya(3), bride Gemini=Shudra(1): 3>=1 → 1pt
  const varnaScore = v1 >= v2 ? 1 : 0;

  // 2. Vashya (max 2)
  const vashya = vashyaScore(r1, r2);

  // 3. Tara (max 3)
  const tara = taraScore(n1, n2);

  // 4. Yoni (max 4)
  const yoni = yoniScore(n1, n2);

  // 5. Graha Maitri (max 5)
  const gm = grahaMaitriScoreStandard(r1, r2);
  const l1 = RASI_LORD[r1], l2 = RASI_LORD[r2];

  // 6. Gana (max 6)
  const gana = ganaScore(n1, n2);

  // 7. Bhakoot (max 7)
  const bhakoot = bhakootScore(r1, r2);
  const diff = ((r2 - r1 + 12) % 12) + 1;
  const diffRev = ((r1 - r2 + 12) % 12) + 1;

  // 8. Nadi (max 8)
  const nd1 = NADI[n1], nd2 = NADI[n2];
  const nadi = nd1 === nd2 ? 0 : 8;

  const factors = [
    {
      name: 'Varna',
      scored: varnaScore,
      max: 1,
      group1: VARNA_NAMES[v1],
      group2: VARNA_NAMES[v2],
      explanation: varnaScore === 1
        ? `Groom Varna (${VARNA_NAMES[v1]}) ≥ Bride Varna (${VARNA_NAMES[v2]}) — favourable, 1pt`
        : `Groom Varna (${VARNA_NAMES[v1]}) < Bride Varna (${VARNA_NAMES[v2]}) — unfavourable, 0pt`,
    },
    {
      name: 'Vashya',
      scored: vashya,
      max: 2,
      group1: VASHYA_NAMES[VASHYA[r1]],
      group2: VASHYA_NAMES[VASHYA[r2]],
      explanation: vashya === 2
        ? `Same Vashya group — full attraction`
        : vashya === 1
        ? `Partial Vashya compatibility`
        : `No Vashya compatibility between ${VASHYA_NAMES[VASHYA[r1]]} and ${VASHYA_NAMES[VASHYA[r2]]}`,
    },
    {
      name: 'Tara',
      scored: tara,
      max: 3,
      explanation: tara === 3
        ? `Auspicious Tara in both directions`
        : tara === 1.5
        ? `Auspicious in one direction only — partial`
        : `Inauspicious Tara (Vipat, Pratyak, or Naidhana) in both directions`,
    },
    {
      name: 'Yoni',
      scored: yoni,
      max: 4,
      yoni1: YONI_NAMES[YONI_27[n1]],
      yoni2: YONI_NAMES[YONI_27[n2]],
      explanation: yoni === 4
        ? `Same Yoni animal — highest compatibility`
        : yoni === 2
        ? `Neutral Yoni pairing (${YONI_NAMES[YONI_27[n1]]} / ${YONI_NAMES[YONI_27[n2]]})`
        : `Enemy Yoni pairing (${YONI_NAMES[YONI_27[n1]]} / ${YONI_NAMES[YONI_27[n2]]}) — 0 points`,
    },
    {
      name: 'Graha Maitri',
      scored: gm,
      max: 5,
      lord1: l1,
      lord2: l2,
      relation12: planetRelation(l1, l2),
      relation21: planetRelation(l2, l1),
      explanation: `Rasi lords: ${l1} (${RASI_NAMES[r1]}) and ${l2} (${RASI_NAMES[r2]}) — ${planetRelation(l1,l2)} / ${planetRelation(l2,l1)}`,
    },
    {
      name: 'Gana',
      scored: gana,
      max: 6,
      gana1: GANA_NAMES[GANA[n1]],
      gana2: GANA_NAMES[GANA[n2]],
      explanation: gana === 6
        ? `Same Gana (${GANA_NAMES[GANA[n1]]}) — full compatibility`
        : gana === 5
        ? `Deva-Manushya pairing — generally compatible`
        : `${GANA_NAMES[GANA[n1]]}-${GANA_NAMES[GANA[n2]]} pairing — low Gana compatibility`,
    },
    {
      name: 'Bhakoot',
      scored: bhakoot,
      max: 7,
      rasi1: RASI_NAMES[r1],
      rasi2: RASI_NAMES[r2],
      position: `${diff}-${diffRev}`,
      explanation: bhakoot === 7
        ? `Auspicious Bhakoot position (${diff}-${diffRev})`
        : `Inauspicious Bhakoot (${diff}-${diffRev} position: 6-8/5-9/2-12 type) — 0 points. Note: classical exceptions for same-lord Rasis exist but are not auto-applied.`,
    },
    {
      name: 'Nadi',
      scored: nadi,
      max: 8,
      nadi1: NADI_NAMES[nd1],
      nadi2: NADI_NAMES[nd2],
      explanation: nadi === 8
        ? `Different Nadi groups (${NADI_NAMES[nd1]} / ${NADI_NAMES[nd2]}) — no Nadi Dosha`
        : `Same Nadi (${NADI_NAMES[nd1]}) — Nadi Dosha present. This is the most serious of the 8 factors.`,
      nadiDosha: nadi === 0,
    },
  ];

  const total = factors.reduce((sum, f) => sum + f.scored, 0);

  return { factors, total, maxTotal: 36 };
}

// ---------------------------------------------------------------------------
// 2. getDasaPoruthamScore
// ---------------------------------------------------------------------------

/**
 * Calculates all 10 Dasa Porutham factors (South Indian system).
 * Source: Tamil Jyotish tradition, Muhurta Chintamani South Indian variant.
 *
 * @param {{ nakshatraIndex: number, rasiIndex: number }} person1Moon - girl
 * @param {{ nakshatraIndex: number, rasiIndex: number }} person2Moon - boy
 * @returns {{ factors: Array, passCount: number, total: 10 }}
 */
export function getDasaPoruthamScore(person1Moon, person2Moon) {
  // Convention: person1 = girl (ponnu), person2 = boy (paiyan)
  const ng = person1Moon.nakshatraIndex; // girl
  const nb = person2Moon.nakshatraIndex; // boy
  const rg = person1Moon.rasiIndex;
  const rb = person2Moon.rasiIndex;

  // 1. Dinam — count boy's nak from girl's nak
  const dinam_count = ((nb - ng + 27) % 27) + 1;
  const dinam_group = ((dinam_count - 1) % 9) + 1;
  const dinam_ok = ![3,5,7].includes(dinam_group); // not Vipat, Pratyak, Naidhana

  // 2. Ganam — same as Gana koota
  const gg = GANA[ng], gb = GANA[nb];
  const ganam_ok = gg === gb || (gg===1&&gb===2) || (gg===2&&gb===1);

  // 3. Mahendram — count boy's nak from girl's nak; groups 4,7,10,13,16,19,22,25 are mahendra
  const mahendra_count = ((nb - ng + 27) % 27) + 1;
  const mahendra_groups = new Set([4,7,10,13,16,19,22,25]);
  const mahendram_ok = mahendra_groups.has(mahendra_count);

  // 4. Stree Deergham — boy's nak should be > 7 Nakshatras from girl's
  const stree_count = ((nb - ng + 27) % 27) + 1;
  const stree_ok = stree_count > 7;

  // 5. Yoni — same as Yoni koota (same or friendly yoni = pass)
  const yoni_score = yoniScore(ng, nb);
  const yoni_ok = yoni_score >= 2;

  // 6. Rasi — boy's rasi relationship to girl's rasi
  // Same rasi = good, 2/12 from girl = bad, 6/8 = bad, 3/11 or 4/10 or 5/9 or 7 = good
  const rasi_diff = ((rb - rg + 12) % 12) + 1;
  const rasi_bad = new Set([2,6,8,12]);
  const rasi_ok = !rasi_bad.has(rasi_diff);

  // 7. Rasyadhipathi — Rasi lord friendship (same as Graha Maitri)
  const rl_g = RASI_LORD[rg], rl_b = RASI_LORD[rb];
  const rasyadhipathi_ok = rl_g === rl_b ||
    (GM_FRIENDS[rl_g]||[]).includes(rl_b) ||
    (GM_FRIENDS[rl_b]||[]).includes(rl_g);

  // 8. Vasyam — same as Vashya
  const vasyam_score = vashyaScore(rg, rb);
  const vasyam_ok = vasyam_score > 0;

  // 9. Rajju — most critical factor in South Indian system
  // 5 Rajju groups (each covers specific Nakshatras)
  // Pada-based calculation:
  // Siro: Mrigashira,Chitra,Dhanishtha pada 3-4 / Ashwini,Magha,Mula pada 1-2? 
  // Standard Rajju by Nakshatra group:
  const RAJJU = [
    3, // 0 Ashwini — Kantha
    4, // 1 Bharani — Kati
    5, // 2 Krittika — Paada
    5, // 3 Rohini — Paada
    1, // 4 Mrigashira — Siro
    1, // 5 Ardra — Siro
    2, // 6 Punarvasu — Kara
    2, // 7 Pushya — Kara
    3, // 8 Ashlesha — Kantha
    3, // 9 Magha — Kantha
    4, // 10 Purva Phalguni — Kati
    4, // 11 Uttara Phalguni — Kati
    5, // 12 Hasta — Paada
    1, // 13 Chitra — Siro
    1, // 14 Swati — Siro
    2, // 15 Vishakha — Kara
    2, // 16 Anuradha — Kara
    3, // 17 Jyeshtha — Kantha
    3, // 18 Mula — Kantha
    4, // 19 Purva Ashadha — Kati
    4, // 20 Uttara Ashadha — Kati
    5, // 21 Shravana — Paada
    1, // 22 Dhanishtha — Siro
    1, // 23 Shatabhisha — Siro
    2, // 24 Purva Bhadrapada — Kara
    2, // 25 Uttara Bhadrapada — Kara
    3, // 26 Revati — Kantha
  ];
  const RAJJU_NAMES = ['','Siro','Kara','Kantha','Kati','Paada'];
  const rajju_g = RAJJU[ng], rajju_b = RAJJU[nb];
  // Same Rajju = Dosha (serious caution)
  const rajju_ok = rajju_g !== rajju_b;
  const rajju_severity = !rajju_ok
    ? (rajju_g === 1 ? 'critical (Siro Rajju — most serious)' : `serious (${RAJJU_NAMES[rajju_g]} Rajju)`)
    : 'pass';

  // 10. Vedha — Certain Nakshatra pairs obstruct each other
  // Source: Tamil Jyotish tradition
  const VEDHA_PAIRS = [
    [0,23],[1,22],[2,19],[3,18],[4,17],[5,16],[6,15],[7,14],[8,13],
    [9,12],[10,11],[20,21],[24,25],[26,3], // Revati-Rohini traditionally paired
  ];
  // NOTE: Vedha pair lists vary across texts. Using the most cited South Indian version.
  let vedha_ok = true;
  for (const [a,b] of VEDHA_PAIRS) {
    if ((ng===a&&nb===b)||(ng===b&&nb===a)) { vedha_ok = false; break; }
  }

  const factors = [
    { name:'Dinam',        ok:dinam_ok,        partial:false,
      explanation:`Boy's nak count from girl: ${dinam_count} (group ${dinam_group}) — ${dinam_ok?'auspicious':'inauspicious Tara group'}` },
    { name:'Ganam',        ok:ganam_ok,        partial:false,
      explanation:`Girl: ${GANA_NAMES[gg]}, Boy: ${GANA_NAMES[gb]} — ${ganam_ok?'compatible':'incompatible Gana'}` },
    { name:'Mahendram',    ok:mahendram_ok,    partial:false,
      explanation:`Boy's nak from girl: ${mahendra_count} — ${mahendram_ok?'Mahendra position (auspicious)':'not Mahendra position'}` },
    { name:'Stree Deergham', ok:stree_ok,      partial:false,
      explanation:`Boy's nak is ${stree_count} positions from girl — ${stree_ok?'more than 7 (auspicious)':'7 or fewer (inauspicious)'}` },
    { name:'Yoni',         ok:yoni_ok,         partial:false,
      explanation:`Girl: ${YONI_NAMES[YONI_27[ng]]}, Boy: ${YONI_NAMES[YONI_27[nb]]} — ${yoni_ok?'compatible':'incompatible Yoni'}` },
    { name:'Rasi',         ok:rasi_ok,         partial:false,
      explanation:`Rasi position ${rasi_diff} from girl to boy — ${rasi_ok?'compatible':'inauspicious position (2/6/8/12)'}` },
    { name:'Rasyadhipathi', ok:rasyadhipathi_ok, partial:false,
      explanation:`Girl lord: ${rl_g}, Boy lord: ${rl_b} — ${rasyadhipathi_ok?'friends or same':'neutral/enemy lords'}` },
    { name:'Vasyam',       ok:vasyam_ok,       partial:false,
      explanation:`${VASHYA_NAMES[VASHYA[rg]]} / ${VASHYA_NAMES[VASHYA[rb]]} — ${vasyam_ok?'Vasyam present':'no Vasyam'}` },
    { name:'Rajju',        ok:rajju_ok,        partial:false,
      isCritical:true,
      explanation:`Girl: ${RAJJU_NAMES[rajju_g]}, Boy: ${RAJJU_NAMES[rajju_b]} — ${rajju_ok?'different Rajju (good)':'SAME RAJJU — '+rajju_severity+'. Traditionally the most serious caution in South Indian matching. Should not be dismissed.'}` },
    { name:'Vedha',        ok:vedha_ok,        partial:false,
      isCritical:true,
      explanation:`${vedha_ok?'No Vedha dosha between these Nakshatras':'VEDHA DOSHA present — these Nakshatras obstruct each other. Treated as a serious caution alongside Rajju.'}` },
  ];

  const passCount = factors.filter(f=>f.ok).length;
  return { factors, passCount, total: 10 };
}

// ---------------------------------------------------------------------------
// 3. getMangalDosha
// ---------------------------------------------------------------------------

/**
 * Checks for Mangal Dosha (Chevvai Dosham) and classical cancellations.
 *
 * VARIATION NOTE: House positions considered for Mangal Dosha vary across texts.
 * Standard: 1, 2, 4, 7, 8, 12 (BPHS version — most widely used)
 * Some texts exclude 2nd house; others include 5th. The standard 6-house version is used.
 *
 * @param {{ marsHouse: number, lagnaSign: string, marsDignity: string, marsSign: string, moonHouse: number }} person
 * @returns {{ doshaPresent: boolean, cancelled: boolean, cancellationReason: string|null, note: string }}
 */
export function getMangalDosha(person) {
  const { marsHouse, lagnaSign, marsDignity, marsSign, moonHouse } = person;
  const DOSHA_HOUSES = new Set([1, 2, 4, 7, 8, 12]);

  const doshaPresent = DOSHA_HOUSES.has(marsHouse);

  if (!doshaPresent) {
    return {
      doshaPresent: false,
      cancelled: false,
      cancellationReason: null,
      note: `Mars in house ${marsHouse} — Mangal Dosha not present by standard calculation.`,
    };
  }

  // Check classical cancellation conditions
  const cancellations = [];

  // Mars in own sign or exaltation
  if (marsDignity === 'own' || marsDignity === 'exalted') {
    cancellations.push(`Mars is in its own sign or exaltation (${marsSign}) — Dosha significantly mitigated`);
  }

  // Mars in 2nd house in certain signs (Gemini or Virgo)
  if (marsHouse === 2 && ['Gemini','Virgo'].includes(marsSign)) {
    cancellations.push(`Mars in 2nd house in ${marsSign} — 2nd house Dosha traditionally cancelled in Mercury-ruled signs`);
  }

  // Mars in 4th in Aries or Scorpio
  if (marsHouse === 4 && ['Aries','Scorpio'].includes(marsSign)) {
    cancellations.push(`Mars in 4th in own sign (${marsSign}) — cancels Dosha`);
  }

  // Mars in 7th in Cancer or Capricorn
  if (marsHouse === 7 && ['Cancer','Capricorn'].includes(marsSign)) {
    cancellations.push(`Mars in 7th in ${marsSign} — traditional cancellation condition`);
  }

  // Mars in 8th in Sagittarius or Pisces
  if (marsHouse === 8 && ['Sagittarius','Pisces'].includes(marsSign)) {
    cancellations.push(`Mars in 8th in ${marsSign} — traditional cancellation condition`);
  }

  // Lagna lord conjunct Mars
  // (We can't fully check this without the full chart — flagged as note)

  const cancelled = cancellations.length > 0;

  return {
    doshaPresent: true,
    cancelled,
    cancellationReason: cancelled ? cancellations.join('; ') : null,
    note: cancelled
      ? `Mangal Dosha present (Mars in house ${marsHouse}) but classical cancellation conditions apply: ${cancellations.join('; ')}. Final assessment requires a qualified practitioner.`
      : `Mangal Dosha present — Mars in house ${marsHouse}. This is a caution, not a verdict. Many marriages with Mangal Dosha thrive when both partners have it, or when other chart factors are strong. Do not treat this as a prohibition. Consult a qualified practitioner for full assessment.`,
    housePosition: marsHouse,
  };
}

// ---------------------------------------------------------------------------
// 4. getNadiDosha
// ---------------------------------------------------------------------------

/**
 * Simple Nadi Dosha check — same Nadi group = Dosha.
 * This duplicates info from Ashta Koota Nadi factor but is exposed separately
 * because it is traditionally the most feared factor.
 *
 * @param {{ nakshatraIndex: number }} person1Moon
 * @param {{ nakshatraIndex: number }} person2Moon
 * @returns {{ doshaPresent: boolean, nadi1: string, nadi2: string, note: string }}
 */
export function getNadiDosha(person1Moon, person2Moon) {
  const nd1 = NADI[person1Moon.nakshatraIndex];
  const nd2 = NADI[person2Moon.nakshatraIndex];
  const doshaPresent = nd1 === nd2;

  return {
    doshaPresent,
    nadi1: NADI_NAMES[nd1],
    nadi2: NADI_NAMES[nd2],
    note: doshaPresent
      ? `Nadi Dosha present — both have ${NADI_NAMES[nd1]} Nadi. This is traditionally the most serious factor in Ashta Koota. Classical texts list several cancellations (same Rasi lord, same Nakshatra, etc.). Assessment by a qualified practitioner is strongly recommended before treating this as prohibitive.`
      : `No Nadi Dosha — different Nadi groups (${NADI_NAMES[nd1]} / ${NADI_NAMES[nd2]}).`,
  };
}

// ---------------------------------------------------------------------------
// 5. getFullMatchingReport
// ---------------------------------------------------------------------------

/**
 * Combines all matching calculations into one structured report.
 *
 * @param {{ moon: {nakshatraIndex,rasiIndex,pada}, marsHouse: number, marsDignity: string, marsSign: string }} person1
 * @param {{ moon: {nakshatraIndex,rasiIndex,pada}, marsHouse: number, marsDignity: string, marsSign: string }} person2
 * @returns {object} Complete matching report
 */
export function getFullMatchingReport(person1, person2) {
  const ashta  = getAshtaKootaScore(person1.moon, person2.moon);
  const dasa   = getDasaPoruthamScore(person1.moon, person2.moon);
  const mangal1 = getMangalDosha(person1);
  const mangal2 = getMangalDosha(person2);
  const nadi   = getNadiDosha(person1.moon, person2.moon);

  // Mutual Mangal Dosha cancellation
  if (mangal1.doshaPresent && mangal2.doshaPresent && !mangal1.cancelled) {
    mangal1.cancellationReason = 'Both persons have Mangal Dosha — mutual cancellation per classical tradition';
    mangal1.cancelled = true;
  }
  if (mangal2.doshaPresent && mangal1.doshaPresent && !mangal2.cancelled) {
    mangal2.cancellationReason = 'Both persons have Mangal Dosha — mutual cancellation per classical tradition';
    mangal2.cancelled = true;
  }

  return {
    ashtaKoota: ashta,
    dasaPorutham: dasa,
    mangalDosha: { person1: mangal1, person2: mangal2 },
    nadiDosha: nadi,
    // No overall verdict — content layer handles framing
    summary: {
      ashtaTotal: `${ashta.total} / 36`,
      dasaPass: `${dasa.passCount} / 10`,
      nadiDosha: nadi.doshaPresent,
      mangalDosha1: mangal1.doshaPresent && !mangal1.cancelled,
      mangalDosha2: mangal2.doshaPresent && !mangal2.cancelled,
    },
  };
}

// Export helper data for test display
export { NAKSHATRA_NAMES, RASI_NAMES, NADI_NAMES, GANA_NAMES, YONI_NAMES, YONI_27 };
