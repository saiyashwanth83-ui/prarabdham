/**
 * interpretations.js — Content Database for Chart Interpretation Engine
 *
 * All entries marked PLACEHOLDER must be replaced with carefully written,
 * verified content before use in production. Search for "PLACEHOLDER" to
 * find every entry that needs real content.
 *
 * Content philosophy:
 * - Educational, not predictive
 * - Honest about what Jyotish can and cannot say
 * - Framed as terrain for self-reflection, not fixed fate
 */

export const CONTENT = {

  // ── Lagna (Ascendant) readings ──────────────────────────────────────────────
  // One entry per sign. These describe the general lens of the Lagna —
  // the quality of attention, the body's orientation to life.

  lagna: {
    Aries:       "PLACEHOLDER: Aries Lagna — Mars-ruled, cardinal fire. The attention moves outward with initiative and directness. Energy tends to be concentrated at the point of action rather than reflection.",
    Taurus:      "PLACEHOLDER: Taurus Lagna — Venus-ruled, fixed earth. The attention orients toward stability, embodied experience, and the building of lasting form. Patience is native; change requires reason.",
    Gemini:      "PLACEHOLDER: Gemini Lagna — Mercury-ruled, dual air. The attention is quick, curious, and relational. This Lagna processes the world through language, pattern, and connection.",
    Cancer:      "PLACEHOLDER: Cancer Lagna — Moon-ruled, cardinal water. The attention is sensitive, receptive, and oriented toward belonging and protection. The environment shapes mood more than most Lagnas.",
    Leo:         "PLACEHOLDER: Leo Lagna — Sun-ruled, fixed fire. The attention carries inherent dignity and seeks to express itself authentically. There is a native warmth and a need to be seen clearly.",
    Virgo:       "PLACEHOLDER: Virgo Lagna — Mercury-ruled, dual earth. The attention is discriminating, precise, and oriented toward refinement. The world is encountered as something that can always be improved.",
    Libra:       "PLACEHOLDER: Libra Lagna — Venus-ruled, cardinal air. The attention seeks balance, harmony, and fair relationship. Decisions are often held until all sides have been considered.",
    Scorpio:     "PLACEHOLDER: Scorpio Lagna — Mars-ruled, fixed water. The attention moves toward depth, transformation, and what is hidden. This Lagna does not remain on surfaces.",
    Sagittarius: "PLACEHOLDER: Sagittarius Lagna — Jupiter-ruled, dual fire. The attention orients toward meaning, principle, and the wider horizon. Learning and philosophy are natural orientations.",
    Capricorn:   "PLACEHOLDER: Capricorn Lagna — Saturn-ruled, cardinal earth. The attention is structured, patient, and oriented toward sustained effort. Authority and responsibility arise as recurring themes.",
    Aquarius:    "PLACEHOLDER: Aquarius Lagna — Saturn-ruled, fixed air. The attention orients toward the collective, principle, and the longer arc. There is a quality of detachment that can appear as impartiality or distance.",
    Pisces:      "PLACEHOLDER: Pisces Lagna — Jupiter-ruled, dual water. The attention is expansive, empathetic, and permeable to the subtle. The boundary between self and world is more fluid here than in most Lagnas. The 12th house of dissolution rules the body, and Jupiter placement in the chart significantly shapes how this energy is focused or dispersed.",
  },

  // ── Planet in House readings ─────────────────────────────────────────────────
  // 9 planets × 12 houses = 108 entries.
  // These describe what a planet generally activates when placed in a house.
  // They are educational baselines — dignity, aspects, and lordship modify them.

  planetInHouse: {
    Sun: {
      1:  "PLACEHOLDER: Sun in 1st — the self-principle is prominently placed. Identity tends to be strong or strongly tested. There is often a need for authenticity over accommodation.",
      2:  "PLACEHOLDER: Sun in 2nd — the light falls on speech, family lineage, and accumulated resources. The father or paternal lineage may significantly shape the relationship with wealth and values.",
      3:  "PLACEHOLDER: Sun in 3rd — initiative in communication, siblings, and short efforts. Courage in expressing one's views tends to be present.",
      4:  "PLACEHOLDER: Sun in 4th — the Sun is in a Kendra but in an angular position away from its natural strength. Home environment and mother may carry themes of authority or absence.",
      5:  "PLACEHOLDER: Sun in 5th — creativity, intelligence, and children are illuminated. Purva Punya (merit from past actions) may connect to the father's lineage.",
      6:  "PLACEHOLDER: Sun in 6th — placement in an Upachaya house. The Sun here often indicates competitive drive, service capacity, or recurrent challenges from enemies and health.",
      7:  "PLACEHOLDER: Sun in 7th — the partner or the public reflects the solar principle back. Relationships may involve themes of dominance, recognition, or strong personalities.",
      8:  "PLACEHOLDER: Sun in 8th — the solar principle encounters discontinuity and transformation. Interest in what is hidden is common. The father's life may carry themes of disruption.",
      9:  "PLACEHOLDER: Sun in 9th — the Sun is in a Kona (trine). Dharma, father, teacher, and higher wisdom are illuminated. This is generally a strong placement for the solar principle.",
      10: "PLACEHOLDER: Sun in 10th — Digbala placement. The Sun reaches its directional strength in the 10th. Career and public role carry strong solar themes — authority, leadership, visibility.",
      11: "PLACEHOLDER: Sun in 11th — gains, elder siblings, and long-term aspirations are lit up. The social network may centre around authority figures or institutions.",
      12: "PLACEHOLDER: Sun in 12th — the solar principle encounters the house of dissolution. There may be themes of spiritual seeking, hidden work, foreign connections, or a father who is distant or spiritually inclined.",
    },
    Moon: {
      1:  "PLACEHOLDER: Moon in 1st — the mind and the body are closely linked. Emotional states express readily through the physical. Public persona shifts with inner mood.",
      2:  "PLACEHOLDER: Moon in 2nd — memory, family stories, and nourishment themes connect to speech and accumulated wealth. The mother's influence on values may be significant.",
      3:  "PLACEHOLDER: Moon in 3rd — the mind moves through communication, siblings, and nearby journeys. Mental restlessness may express as constant activity or writing.",
      4:  "PLACEHOLDER: Moon in 4th — Digbala placement for the Moon. Home, mother, and inner security are themes where the Moon reaches full strength. Emotional roots run deep.",
      5:  "PLACEHOLDER: Moon in 5th — the mind flows into creativity, children, and intelligence. Intuition is often heightened; the relationship with one's own children carries emotional weight.",
      6:  "PLACEHOLDER: Moon in 6th — the mind encounters obstacles, service, and health. There may be fluctuation in health or a strong capacity for healing work.",
      7:  "PLACEHOLDER: Moon in 7th — the partner reflects the native's emotional world. Relationships are a primary arena for the Moon's needs and fluctuations.",
      8:  "PLACEHOLDER: Moon in 8th — the mind encounters deep emotional material, transformation, and the hidden. Intuition may be strong; emotional stability requires conscious work.",
      9:  "PLACEHOLDER: Moon in 9th — the mind inclines toward philosophy, dharma, and the teachings of one's tradition. The mother may be spiritually inclined or foreign.",
      10: "PLACEHOLDER: Moon in 10th — public life and career carry the emotional tone. The Moon in the 10th often indicates popularity or a career involving public service, care, or fluctuation.",
      11: "PLACEHOLDER: Moon in 11th — aspirations and friendships carry emotional significance. The mind may move toward community and collective purpose.",
      12: "PLACEHOLDER: Moon in 12th — the mind moves toward the interior, the subtle, and the dissolving. Sleep and retreat may be important; intuition and spiritual sensitivity can be significant.",
    },
    Mars: {
      1:  "PLACEHOLDER: Mars in 1st — energy, drive, and directness are primary orientations of the personality. Physical vitality is typically strong; so is the capacity for conflict.",
      2:  "PLACEHOLDER: Mars in 2nd — speech tends to be direct or cutting. Energy goes into accumulating resources or defending what has been built.",
      3:  "PLACEHOLDER: Mars in 3rd — courage in effort, communication, and movement. Siblings may carry Martian themes. Short journeys are often purposeful.",
      4:  "PLACEHOLDER: Mars in 4th — the home carries Martian themes — activity, tension, or renovation. Land and property may be significant arenas of effort.",
      5:  "PLACEHOLDER: Mars in 5th — creative energy is strong and directed. Children may carry Martian qualities. Intelligence tends to be sharp and competitive.",
      6:  "PLACEHOLDER: Mars in 6th — Mars gains strength in the 6th as an Upachaya house. Competitive drive, capacity to defeat enemies, and physical resilience are indicated.",
      7:  "PLACEHOLDER: Mars in 7th — the partner or partnership arena carries Martian energy — drive, assertion, or tension. Business partnerships may involve competition.",
      8:  "PLACEHOLDER: Mars in 8th — Mars encounters the house of transformation. There can be intensity around the hidden, inheritance, or sudden events. Longevity themes arise.",
      9:  "PLACEHOLDER: Mars in 9th — drive and energy go into dharma, philosophy, and the father principle. This can be a strong placement when Mars is dignified.",
      10: "PLACEHOLDER: Mars in 10th — Digbala placement for Mars. Career and public action carry Martian themes — engineering, medicine, military, administration, competition.",
      11: "PLACEHOLDER: Mars in 11th — strong gains through effort and enterprise. Elder siblings may carry Martian themes. Ambition is present.",
      12: "PLACEHOLDER: Mars in 12th — energy moves toward what is hidden, foreign, or spiritual. There may be expenditure of energy in unseen directions.",
    },
    Mercury: {
      1:  "PLACEHOLDER: Mercury in 1st — intellect and communication are primary orientations. The personality tends to be curious, articulate, and analytical.",
      2:  "PLACEHOLDER: Mercury in 2nd — speech is a key resource. Intelligence connects to financial acumen or skill with language and data.",
      3:  "PLACEHOLDER: Mercury in 3rd — Mercury is in a natural house for communication and siblings. Writing, speaking, and short-form communication tend to be areas of strength.",
      4:  "PLACEHOLDER: Mercury in 4th — the home carries intellectual themes. Education in early life, a studious mother, or real estate connected to communication fields.",
      5:  "PLACEHOLDER: Mercury in 5th — intelligence and creativity are linked. Interest in education, children's learning, or speculative analysis may be present.",
      6:  "PLACEHOLDER: Mercury in 6th — analytical capacity is directed toward problem-solving, health, or service. Work involving detail, criticism, or healthcare is common.",
      7:  "PLACEHOLDER: Mercury in 7th — the partner tends to carry Mercurial qualities. Business communication and negotiation are significant arenas.",
      8:  "PLACEHOLDER: Mercury in 8th — the intellect is drawn toward research, the hidden, and transformation. Interest in psychology, occult subjects, or investigative work.",
      9:  "PLACEHOLDER: Mercury in 9th — the intellect orients toward teaching, publishing, philosophy, or law. Communication of wisdom traditions may be a theme.",
      10: "PLACEHOLDER: Mercury in 10th — career involves communication, analysis, or intelligence. Mercury in the 10th often connects to media, writing, education, or business.",
      11: "PLACEHOLDER: Mercury in 11th — gains through intellectual work, communication networks, or information. Friends may be from intellectual or technical fields.",
      12: "PLACEHOLDER: Mercury in 12th — the mind moves toward the contemplative, the foreign, or the hidden. Writing in private, research in obscure areas, or foreign communication.",
    },
    Jupiter: {
      1:  "PLACEHOLDER: Jupiter in 1st — Digbala placement for Jupiter. Wisdom, generosity, and a philosophical orientation are primary. The body tends to be well-proportioned or inclined toward weight.",
      2:  "PLACEHOLDER: Jupiter in 2nd — speech carries wisdom. Wealth accumulates through Jupiterian fields — teaching, counselling, finance, or spiritual work. Family values are expansive.",
      3:  "PLACEHOLDER: Jupiter in 3rd — Jupiter in a Dusthana from itself (12th from its 4th house). Effort and communication carry philosophical weight but may lack edge.",
      4:  "PLACEHOLDER: Jupiter in 4th — home and mother carry Jupiterian themes — learning, generosity, space. Real estate or educational institutions may feature. Inner peace tends to be a resource.",
      5:  "PLACEHOLDER: Jupiter in 5th — one of Jupiter's own houses (5th is Kona). Intelligence, children, and creativity carry Jupiterian grace. This is a classic placement for teaching capacity.",
      6:  "PLACEHOLDER: Jupiter in 6th — Jupiter in a Dusthana. The expansive principle meets challenge, service, or health themes. Generosity can be overextended.",
      7:  "PLACEHOLDER: Jupiter in 7th — the partner carries Jupiterian qualities — wisdom, expansiveness, philosophy. Partnerships are generally significant arenas for growth.",
      8:  "PLACEHOLDER: Jupiter in 8th — Jupiter in a Dusthana can bring grace into transformation. Occult knowledge, inheritance, or deep research may feature.",
      9:  "PLACEHOLDER: Jupiter in 9th — Jupiter in its natural house (9th = Dharmabhava). Teaching, philosophy, father, and dharma are all illuminated. This is Jupiter's most natural placement.",
      10: "PLACEHOLDER: Jupiter in 10th — career and public role carry Jupiterian themes — counselling, law, teaching, finance, or spiritual leadership.",
      11: "PLACEHOLDER: Jupiter in 11th — gains and aspirations carry expansive themes. Large networks, elder siblings with wisdom, and philanthropic goals.",
      12: "PLACEHOLDER: Jupiter in 12th — Jupiter in the house of liberation. Spiritual seeking, charitable expenditure, and foreign connections may feature. The 12th is the house of Moksha — Jupiter here can indicate a natural orientation toward liberation.",
    },
    Venus: {
      1:  "PLACEHOLDER: Venus in 1st — beauty, refinement, and relational sensitivity are primary orientations. The body tends toward aesthetics.",
      2:  "PLACEHOLDER: Venus in 2nd — Venus in a natural house of wealth and speech. Resources may accumulate through beauty, art, or pleasure. Speech tends to be pleasing.",
      3:  "PLACEHOLDER: Venus in 3rd — creativity in communication. Siblings or short journeys may carry Venusian themes. Artistic or musical effort is possible.",
      4:  "PLACEHOLDER: Venus in 4th — Digbala placement for Venus. Home carries beauty, comfort, and emotional fulfilment. The mother may be artistic or refined.",
      5:  "PLACEHOLDER: Venus in 5th — creativity, romance, and children carry Venusian themes. Artistic expression and pleasure in learning may be significant.",
      6:  "PLACEHOLDER: Venus in 6th — Venus in a Dusthana. Relationships or finances may involve service, difficulty, or obstacles. There can also be strong capacity to work in aesthetics or healing.",
      7:  "PLACEHOLDER: Venus in 7th — Venus in its natural house of relationship. Partnership is a central arena. The partner tends to carry Venusian qualities.",
      8:  "PLACEHOLDER: Venus in 8th — Venus encounters depth and transformation. Sensuality and the occult may interweave. Inheritance through a partner is possible.",
      9:  "PLACEHOLDER: Venus in 9th — the spiritual dimension of beauty and relationship is emphasised. The teacher or father may carry Venusian qualities. Art as dharma.",
      10: "PLACEHOLDER: Venus in 10th — career carries Venusian themes — art, beauty, design, diplomacy, or entertainment. Public role has an aesthetic quality.",
      11: "PLACEHOLDER: Venus in 11th — gains through Venusian fields. Social networks carry pleasure and beauty. Aspirations may involve art or affluence.",
      12: "PLACEHOLDER: Venus in 12th — Venus in the house of dissolution. Pleasure and relationship may have a hidden or private quality. Spiritual beauty or foreign connections in love.",
    },
    Saturn: {
      1:  "PLACEHOLDER: Saturn in 1st — the body and personality carry themes of discipline, delay, or austerity. There is often a quality of seriousness or patience that deepens with age.",
      2:  "PLACEHOLDER: Saturn in 2nd — speech may be slow, careful, or austere. Wealth accumulates through sustained effort rather than fortune. Family may carry themes of discipline or hardship.",
      3:  "PLACEHOLDER: Saturn in 3rd — Saturn gains strength in Upachaya. Sustained effort in communication, writing, or skill development. Siblings may carry Saturnine themes.",
      4:  "PLACEHOLDER: Saturn in 4th — home and mother carry themes of restriction, structure, or absence. Real estate may be acquired through effort. Inner stability is built through sustained work.",
      5:  "PLACEHOLDER: Saturn in 5th — intelligence is methodical. Children may be delayed or carry serious qualities. Creative expression requires discipline.",
      6:  "PLACEHOLDER: Saturn in 6th — Saturn gains strength here. Capacity for sustained service, health discipline, and methodical defeat of obstacles. Work in healthcare, law, or administration.",
      7:  "PLACEHOLDER: Saturn in 7th — Digbala placement for Saturn. Partnerships carry themes of responsibility, delay, or karmic depth. The partner may be older, serious, or Saturn-ruled.",
      8:  "PLACEHOLDER: Saturn in 8th — Saturn in the house of longevity can indicate a long life but with themes of austerity or restriction around what is hidden. Research capacity may be significant.",
      9:  "PLACEHOLDER: Saturn in 9th — the father or teacher carries Saturnine themes. Dharma is approached methodically, perhaps through a structured tradition.",
      10: "PLACEHOLDER: Saturn in 10th — Saturn in an Upachaya house connected to career. Authority, administration, and sustained public effort are themes. Leadership through endurance.",
      11: "PLACEHOLDER: Saturn in 11th — Saturn gains strength in Upachaya. Gains through sustained effort in large organisations or long-term goals. Elder siblings may carry serious themes.",
      12: "PLACEHOLDER: Saturn in 12th — Saturn in its natural Moksha house. Renunciation, solitude, spiritual discipline, or work in institutions (hospital, prison, ashram). Expenditure is disciplined.",
    },
    Rahu: {
      1:  "PLACEHOLDER: Rahu in 1st — strong amplification of the personality. There may be an unusual or intense quality to the self-presentation. The desire body is prominent.",
      2:  "PLACEHOLDER: Rahu in 2nd — amplification of desires around wealth, speech, and family lineage. There may be unusual patterns in eating or a foreign element in the family.",
      3:  "PLACEHOLDER: Rahu in 3rd — Rahu in Upachaya. Strong ambition in communication, media, or siblings. Unusual forms of expression may emerge.",
      4:  "PLACEHOLDER: Rahu in 4th — the home or mother carries unusual, foreign, or amplified themes. Real estate or higher education abroad may feature.",
      5:  "PLACEHOLDER: Rahu in 5th — amplification of desire in creativity, children, and speculation. Intelligence may be unconventional. Past life connections may surface through children.",
      6:  "PLACEHOLDER: Rahu in 6th — Rahu in Upachaya gains strength. Unusual capacity to overcome obstacles. Work in foreign environments, healthcare, or law may feature.",
      7:  "PLACEHOLDER: Rahu in 7th — the partner or public role carries unusual or foreign qualities. Business may involve foreign elements. Relationship desires are amplified.",
      8:  "PLACEHOLDER: Rahu in 8th — deep amplification of desire around transformation, the occult, or inheritance. Research into hidden subjects may be compelling.",
      9:  "PLACEHOLDER: Rahu in 9th — unusual or foreign elements in the relationship with dharma, father, or teacher. Unconventional spiritual paths may attract.",
      10: "PLACEHOLDER: Rahu in 10th — strong ambition in career and public life. Unusual or rapid rise is possible. Foreign elements may enter the professional sphere.",
      11: "PLACEHOLDER: Rahu in 11th — strong desire for gains and fulfillment of ambitions. Unusual social networks. Rahu in the 11th is often cited as favourable for worldly gains.",
      12: "PLACEHOLDER: Rahu in 12th — Rahu in the house of dissolution. Foreign travel, hidden desires, or unusual connections to institutions or spiritual paths.",
    },
    Ketu: {
      1:  "PLACEHOLDER: Ketu in 1st — the personality carries a quality of detachment or unusual selfhood. There may be a sense of not quite belonging to one's own body or identity.",
      2:  "PLACEHOLDER: Ketu in 2nd — the relationship with speech, family lineage, and accumulated wealth may carry themes of past-life completion or detachment.",
      3:  "PLACEHOLDER: Ketu in 3rd — communication or sibling relationships may carry a quality of completion or past-life connection.",
      4:  "PLACEHOLDER: Ketu in 4th — home or mother may carry themes of separation, past-life karma, or spiritual practice. Inner life may be more real than outer.",
      5:  "PLACEHOLDER: Ketu in 5th — children, creativity, or past merits carry themes of completion. Intuitive intelligence and spiritual practices from past lives may surface.",
      6:  "PLACEHOLDER: Ketu in 6th — obstacles or health themes may carry a karmic quality. There can be unusual immunity or patterns of dissolution around challenges.",
      7:  "PLACEHOLDER: Ketu in 7th — the partner or relationship arena carries Ketu's quality of detachment or completion. Marriage may have unusual or karmic dimensions.",
      8:  "PLACEHOLDER: Ketu in 8th — research into the hidden, spiritual transformation, and past-life themes surface in the arena of transformation. Intuition around death and renewal.",
      9:  "PLACEHOLDER: Ketu in 9th — dharma or the father carries a quality of past-life completion. The spiritual path may bypass formal religion in favour of direct experience.",
      10: "PLACEHOLDER: Ketu in 10th — career may involve unusual separation from convention. Service, spiritual work, or detachment from public recognition may feature.",
      11: "PLACEHOLDER: Ketu in 11th — gains and aspirations carry a quality of detachment. Social networks may feel incomplete. Elder siblings may carry Ketu themes.",
      12: "PLACEHOLDER: Ketu in 12th — Ketu in its natural house. Dissolution, liberation, and spiritual practice are strongly indicated. Moksha themes are prominent.",
    },
  },

  // ── Dasha readings ───────────────────────────────────────────────────────────
  // What the Maha Dasha period generally asks of the native.
  // These are educational orientations — not predictions.

  dashaReadings: {
    Sun:     "PLACEHOLDER: Sun Dasha (6 years) — the period of the Sun asks the native to clarify their core identity and dharmic direction. Career, father, authority figures, and questions of authentic self-expression tend to become central. The condition of the natal Sun — its dignity, house placement, and aspects received — significantly shapes how this period unfolds.",
    Moon:    "PLACEHOLDER: Moon Dasha (10 years) — the period of the Moon asks the native to work with their emotional and relational world. Home, mother, mind, and inner security tend to become central. Fluctuation is inherent to the Moon's nature — this period often involves emotional depth and a deepening of one's relationship with one's own inner life.",
    Mars:    "PLACEHOLDER: Mars Dasha (7 years) — the period of Mars asks the native to engage with effort, courage, and directed action. Property, siblings, physical health, and competitive arenas tend to become active. The dignity and placement of Mars in the natal chart shape how this energy is most constructively directed.",
    Rahu:    "PLACEHOLDER: Rahu Dasha (18 years) — Rahu's period is often described as one of amplified desire and worldly engagement. Unusual experiences, foreign elements, and rapid change may characterise this time. The sign and house of natal Rahu, and its dispositor's condition, provide orientation for this period.",
    Jupiter: "PLACEHOLDER: Jupiter Dasha (16 years) — the period of Jupiter tends to bring expansion, wisdom, and Jupiterian themes to the foreground. Teaching, philosophy, children, and Dharmik endeavours may become prominent. The dignity and house placement of Jupiter indicate where this expansiveness is most naturally directed.",
    Saturn:  "PLACEHOLDER: Saturn Dasha (19 years) — Saturn's period asks for sustained effort, discipline, and honest reckoning with karma. Work, responsibility, and themes of constraint or structure tend to become central. Saturn's period often deepens with time as the native meets its demands with greater clarity.",
    Mercury: "PLACEHOLDER: Mercury Dasha (17 years) — the period of Mercury emphasises communication, analysis, and learning. Business, writing, teaching, and intellectual pursuits may come to the foreground. The condition of natal Mercury shapes whether this energy flows toward precision and skill or toward restlessness.",
    Ketu:    "PLACEHOLDER: Ketu Dasha (7 years) — Ketu's period tends toward completion, detachment, and spiritual orientation. Worldly ambitions may feel less compelling; past-life themes and spiritual practice may become prominent. This period often involves a shedding that, in retrospect, was necessary.",
    Venus:   "PLACEHOLDER: Venus Dasha (20 years) — the longest Dasha, Venus's period brings relationship, creativity, and aesthetic experience to the foreground. Pleasure, beauty, and the refinement of desire are themes. The condition of natal Venus shapes how these qualities manifest — whether toward fulfilment or toward complication.",
  },

  // ── Yoga readings ────────────────────────────────────────────────────────────

  yogaReadings: {
    rajaYoga:            "PLACEHOLDER: Raja Yoga — the joining of a Kendra lord and a Kona lord in the natal chart creates a confluence of worldly capacity (Kendra) and Dharmik direction (Kona). This generally indicates the capacity for achievement and public significance, though its expression depends heavily on the dignity and house placement of the planets involved.",
    dhanaYoga:           "PLACEHOLDER: Dhana Yoga — when lords of the wealth houses (2nd and 11th, or combinations of 1st, 2nd, 5th, 9th, 11th) connect, the chart indicates conditions favourable to the accumulation of resources. As with all Yogas, the strength and dignity of the participating planets determines the depth of expression.",
    viparitaRajaYoga:    "PLACEHOLDER: Vipareeta Raja Yoga — this unusual yoga forms when lords of the Dusthana houses (6, 8, 12) are placed in each other's houses or conjunct. Paradoxically, the confinement of challenging energy within its own domain can release the rest of the chart. This yoga often manifests as gains through others' difficulties or strength emerging from apparent constraint. Its expression is complex and often misread — consult a qualified practitioner for full interpretation.",
    panchaMahapurusha:   "Pancha Mahapurusha Yoga — one of five classical yogas, each formed when a specific planet is in its own sign or exaltation and placed in a Kendra house (1st, 4th, 7th, or 10th). The five types are Ruchaka (Mars), Bhadra (Mercury), Hamsa (Jupiter), Malavya (Venus), and Shasha (Saturn). Each indicates a developed, structured expression of that planet's highest qualities in the life. Ruchaka indicates courage, physical and moral vitality, and the capacity for decisive right action — strength that serves rather than dominates. Bhadra indicates intellectual clarity and discriminating communication — the ability to perceive accurately and express that perception with precision and care. Hamsa indicates wisdom and dharmic conduct — a natural orientation toward what is genuinely true and genuinely right, expressed through teaching, counsel, or simply through the quality of how one lives. Malavya indicates refined values and the capacity for genuine relationship — beauty understood not merely as aesthetics but as the ability to recognise and participate in what is genuinely worth valuing. Shasha indicates disciplined, durable strength built through sustained effort — authority that is earned through endurance and integrity rather than claimed through assertion. As with all Yogas, the presence of this configuration indicates potential and natural orientation — not guaranteed outcome. The dasha activation of the yoga planet, the aspects it receives, and the overall strength of the chart all determine how fully this potential finds expression in a life.",
    guruMangalaYoga:     "PLACEHOLDER: Guru Mangala Yoga — the conjunction or mutual 7th aspect of Jupiter and Mars combines wisdom with energy, dharma with action. This yoga is associated with courage in pursuit of meaningful goals, capacity for teaching combined with executive drive, and a capacity to bring spiritual sincerity into active endeavour.",
    neechaBhangaRajaYoga:"PLACEHOLDER: Neecha Bhanga Raja Yoga — the cancellation of debilitation is a classical concept in Jyotish where the weakness of a debilitated planet is structurally cancelled by specific conditions in the chart. When genuine cancellation occurs, the debilitated planet's energy may transform into unusual strength. This is one of the most complex yogas to assess correctly — the conditions of cancellation must all be carefully verified.",
  },

  // ── Dignity display labels ───────────────────────────────────────────────────

  dignityLabels: {
    exalted:     'Exalted — the planet operates at heightened capacity in this sign.',
    own:         'Own Sign — the planet is in its home territory; it operates with natural ease.',
    friendly:    'Friendly Sign — the planet operates in a supportive environment.',
    neutral:     'Neutral Sign — the planet operates without particular support or friction from the sign.',
    enemy:       'Enemy Sign — the planet operates with some friction in this sign; it must work harder.',
    debilitated: 'Debilitated — the planet is in its weakest sign; its qualities face structural challenge.',
  },

  // ── Closing note ─────────────────────────────────────────────────────────────
  // This note must appear at the bottom of every report without exception.

  closingNote: "This reading is a framework for honest reflection — not a verdict about your life or a fixed description of who you are. The chart shows the terrain your consciousness is navigating in this life. How you navigate it is always your own. For personalised interpretation, consult a qualified Jyotish practitioner. For specific remedies, consult an experienced Pandit. For sadhana, begin with the basic practices in the Sadhana Path section of this site.",

};
