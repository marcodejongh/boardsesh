// =============================================================================
// Deterministic Social Fixtures — Parody Pro Climbers & Hilarious Threads
// =============================================================================
//
// Pure data module — no DB imports, no side effects.
// All data is 100% deterministic and static for UI test assertions.
//
// Usage:
//   import { FIXTURE_USERS, FIXTURE_CONVERSATIONS } from './deterministic-social';
//   import { findFixtureUser, getConversationsByTheme } from './deterministic-social';

// =============================================================================
// Types
// =============================================================================

export interface FixtureUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  displayName: string;
  avatarUrl: string | null;
  instagramUrl: string | null;
}

export interface FixtureTick {
  uuid: string;
  userId: string;
  boardType: 'kilter' | 'tension';
  angle: number;
  isMirror: boolean;
  status: 'flash' | 'send' | 'attempt';
  attemptCount: number;
  quality: number | null;
  comment: string;
  /** Global index (0-79) for deterministic date spacing */
  globalIndex: number;
}

export interface FixtureComment {
  uuid: string;
  userId: string;
  body: string;
  parentCommentUuid: string | null;
  /** Minutes after the parent tick was created */
  minutesAfterTick: number;
}

export interface FixtureConversation {
  tickUuid: string;
  theme: string;
  comments: FixtureComment[];
}

export interface FixtureVote {
  userId: string;
  commentUuid: string;
  value: 1 | -1;
}

// =============================================================================
// Constants
// =============================================================================

/** Anchor timestamp — all fixture dates are computed relative to this */
export const FIXTURE_BASE_TIMESTAMP = new Date('2025-06-15T12:00:00Z').getTime();

const ANGLES = [25, 30, 35, 40, 45, 50] as const;

const THEME_CONFIGS = [
  { theme: 'grade_debate', short: 'grade', status: 'send' as const },
  { theme: 'beta_spray', short: 'beta', status: 'send' as const },
  { theme: 'flash_incredulity', short: 'flash', status: 'flash' as const },
  { theme: 'angle_gatekeeping', short: 'angle', status: 'send' as const },
  { theme: 'salty_attempt', short: 'salty', status: 'attempt' as const },
  { theme: 'campus_vs_footwork', short: 'campus', status: 'send' as const },
  { theme: 'excuse_maker', short: 'excuse', status: 'attempt' as const },
  { theme: 'training_plan', short: 'train', status: 'send' as const },
] as const;

function uid(n: number): string {
  return `fx-user-${String(n).padStart(4, '0')}-0000-0000-000000000000`;
}

// =============================================================================
// Fixture Users (12 parody pro climbers)
// =============================================================================

export const FIXTURE_USERS: FixtureUser[] = [
  { id: uid(1), name: 'Adam Onsight', email: 'adam.onsight@fixture.boardsesh.com', image: null, displayName: 'GradeGuru', avatarUrl: null, instagramUrl: null },
  { id: uid(2), name: 'Janja Garnburger', email: 'janja.garnburger@fixture.boardsesh.com', image: null, displayName: 'BurgerBeta', avatarUrl: null, instagramUrl: null },
  { id: uid(3), name: 'Alex Nohold', email: 'alex.nohold@fixture.boardsesh.com', image: null, displayName: 'FreeSoloist', avatarUrl: null, instagramUrl: null },
  { id: uid(4), name: 'Magnus Midcrimp', email: 'magnus.midcrimp@fixture.boardsesh.com', image: null, displayName: 'CrimpLord', avatarUrl: null, instagramUrl: null },
  { id: uid(5), name: 'Tomato Narasalami', email: 'tomato.narasalami@fixture.boardsesh.com', image: null, displayName: 'DynoKing', avatarUrl: null, instagramUrl: null },
  { id: uid(6), name: 'Ashima Shiraflashi', email: 'ashima.shiraflashi@fixture.boardsesh.com', image: null, displayName: 'FlashQueen', avatarUrl: null, instagramUrl: null },
  { id: uid(7), name: 'Chris Charma', email: 'chris.charma@fixture.boardsesh.com', image: null, displayName: 'ZenClimber', avatarUrl: null, instagramUrl: null },
  { id: uid(8), name: 'Daniel Woodchips', email: 'daniel.woodchips@fixture.boardsesh.com', image: null, displayName: 'WoodsBeast', avatarUrl: null, instagramUrl: null },
  { id: uid(9), name: 'Brooke Raboutme', email: 'brooke.raboutme@fixture.boardsesh.com', image: null, displayName: 'MainCharacter', avatarUrl: null, instagramUrl: null },
  { id: uid(10), name: 'Shauna Foxey', email: 'shauna.foxey@fixture.boardsesh.com', image: null, displayName: 'CompQueen', avatarUrl: null, instagramUrl: null },
  { id: uid(11), name: 'Jimmy Webbed', email: 'jimmy.webbed@fixture.boardsesh.com', image: null, displayName: 'SpiderMonkey', avatarUrl: null, instagramUrl: null },
  { id: uid(12), name: 'Alex Poochie', email: 'alex.poochie@fixture.boardsesh.com', image: null, displayName: 'PowerPinch', avatarUrl: null, instagramUrl: null },
];

// =============================================================================
// Fixture Ticks (80 — one per conversation)
// =============================================================================

function buildFixtureTicks(): FixtureTick[] {
  const ticks: FixtureTick[] = [];
  for (let ti = 0; ti < THEME_CONFIGS.length; ti++) {
    const cfg = THEME_CONFIGS[ti];
    for (let i = 0; i < 10; i++) {
      const gi = ti * 10 + i;
      const userNum = ((gi + 3) % 12) + 1;
      ticks.push({
        uuid: `fx-tick-${cfg.short}-${String(i + 1).padStart(2, '0')}`,
        userId: uid(userNum),
        boardType: gi % 2 === 0 ? 'kilter' : 'tension',
        angle: ANGLES[gi % 6],
        isMirror: false,
        status: cfg.status,
        attemptCount: cfg.status === 'flash' ? 1 : cfg.status === 'send' ? 3 : 8,
        quality: cfg.status !== 'attempt' ? 4 : null,
        comment: '',
        globalIndex: gi,
      });
    }
  }
  return ticks;
}

export const FIXTURE_TICKS: FixtureTick[] = buildFixtureTicks();

// =============================================================================
// Raw Conversation Data (by theme)
// =============================================================================
// Each raw conversation has: theme, tickIndex (0-9), and comments array.
// The builder below converts tickIndex → tickUuid.

type RawConversation = {
  theme: string;
  tickIndex: number;
  comments: FixtureComment[];
};

// — Grade Debates (10) —
const GRADE_DEBATES: RawConversation[] = [
  { theme: 'grade_debate', tickIndex: 0, comments: [
    { uuid: 'fx-comment-grade-01-01', userId: uid(1), body: 'This is MAYBE a V6 if you\'re 6\'2" with a +6 ape index. For normal humans it\'s a solid V8. The setter clearly didn\'t account for the reach on move 4.', parentCommentUuid: null, minutesAfterTick: 15 },
    { uuid: 'fx-comment-grade-01-02', userId: uid(11), body: 'Wait there\'s a move 4? I just went from the start hold to the finish jug in one move lol', parentCommentUuid: 'fx-comment-grade-01-01', minutesAfterTick: 22 },
    { uuid: 'fx-comment-grade-01-03', userId: uid(1), body: 'Jimmy this is EXACTLY what I\'m talking about. Your wingspan is a cheat code. You should have to log these as V4.', parentCommentUuid: 'fx-comment-grade-01-02', minutesAfterTick: 25 },
    { uuid: 'fx-comment-grade-01-04', userId: uid(6), body: 'I\'m 5\'2" and flashed it, felt like V6 to me 🤷‍♀️ Maybe work on your beta?', parentCommentUuid: 'fx-comment-grade-01-01', minutesAfterTick: 35 },
    { uuid: 'fx-comment-grade-01-05', userId: uid(1), body: 'Ashima you flashed it THEREFORE it\'s soft. That\'s literally how grading works.', parentCommentUuid: 'fx-comment-grade-01-04', minutesAfterTick: 38 },
    { uuid: 'fx-comment-grade-01-06', userId: uid(7), body: 'The grade is but a number, a construct of the ego. The true climb is within. 🙏', parentCommentUuid: null, minutesAfterTick: 120 },
    { uuid: 'fx-comment-grade-01-07', userId: uid(1), body: 'Chris I will LITERALLY fight you', parentCommentUuid: 'fx-comment-grade-01-06', minutesAfterTick: 122 },
  ]},
  { theme: 'grade_debate', tickIndex: 1, comments: [
    { uuid: 'fx-comment-grade-02-01', userId: uid(4), body: 'Downgraded this from V9 to V7. The "crimp" on move 3 is basically a jug if you have any finger strength at all. Disappointing.', parentCommentUuid: null, minutesAfterTick: 45 },
    { uuid: 'fx-comment-grade-02-02', userId: uid(8), body: 'Bro I literally ripped a pulley on that hold what are you talking about', parentCommentUuid: 'fx-comment-grade-02-01', minutesAfterTick: 50 },
    { uuid: 'fx-comment-grade-02-03', userId: uid(4), body: 'That\'s a technique issue. I hangboard that exact edge depth for 10 seconds one-handed. Maybe try half crimp instead of full crimp?', parentCommentUuid: 'fx-comment-grade-02-02', minutesAfterTick: 52 },
    { uuid: 'fx-comment-grade-02-04', userId: uid(8), body: 'Magnus I deadlifted it off a 3mm edge because I can\'t be bothered with your "technique". Still took me 8 sessions.', parentCommentUuid: 'fx-comment-grade-02-03', minutesAfterTick: 55 },
    { uuid: 'fx-comment-grade-02-05', userId: uid(2), body: 'wait you guys are using your fingers? i just kinda grabbed it idk, felt fine. sent it while eating a burger', parentCommentUuid: 'fx-comment-grade-02-01', minutesAfterTick: 180 },
    { uuid: 'fx-comment-grade-02-06', userId: uid(4), body: 'Janja this is why grading is broken. You can\'t grade climbs while EATING.', parentCommentUuid: 'fx-comment-grade-02-05', minutesAfterTick: 182 },
  ]},
  { theme: 'grade_debate', tickIndex: 2, comments: [
    { uuid: 'fx-comment-grade-03-01', userId: uid(5), body: 'This climb is graded wrong because you can dyno the entire crux sequence. V4 max if you just send it. V8 if you climb it like a coward.', parentCommentUuid: null, minutesAfterTick: 20 },
    { uuid: 'fx-comment-grade-03-02', userId: uid(7), body: 'But Tomato, the static beta teaches patience, teaches us to move with intention rather than violence...', parentCommentUuid: 'fx-comment-grade-03-01', minutesAfterTick: 25 },
    { uuid: 'fx-comment-grade-03-03', userId: uid(5), body: 'WRONG. Dynos are the purest form of climbing. It\'s you vs gravity vs time. No overthinking. Just SEND.', parentCommentUuid: 'fx-comment-grade-03-02', minutesAfterTick: 27 },
    { uuid: 'fx-comment-grade-03-04', userId: uid(10), body: 'FYI I hold the fastest time on this problem (4.2 seconds) so I think I have authority here: it\'s V7 if you dyno, V6 if you don\'t. Check the leaderboard.', parentCommentUuid: 'fx-comment-grade-03-01', minutesAfterTick: 60 },
    { uuid: 'fx-comment-grade-03-05', userId: uid(5), body: '4.2 seconds??? I did it in 2.8. You\'re basically static climbing at that pace.', parentCommentUuid: 'fx-comment-grade-03-04', minutesAfterTick: 62 },
    { uuid: 'fx-comment-grade-03-06', userId: uid(9), body: 'This reminds me of when I sent my first V8 in 3.1 seconds at nationals in front of everyone. What a moment. Anyway it felt hard so gonna say V8.', parentCommentUuid: null, minutesAfterTick: 240 },
  ]},
  { theme: 'grade_debate', tickIndex: 3, comments: [
    { uuid: 'fx-comment-grade-04-01', userId: uid(3), body: 'Did this without using the middle holds. Definitely sandbagged at V10, more like V12 no-hands variation. Pretty chill though.', parentCommentUuid: null, minutesAfterTick: 90 },
    { uuid: 'fx-comment-grade-04-02', userId: uid(1), body: 'Alex you can\'t just eliminate holds and change the grade. That\'s not how this works. That\'s not how any of this works.', parentCommentUuid: 'fx-comment-grade-04-01', minutesAfterTick: 95 },
    { uuid: 'fx-comment-grade-04-03', userId: uid(3), body: 'If El Cap doesn\'t have grades, neither should this. It\'s all just rock, man.', parentCommentUuid: 'fx-comment-grade-04-02', minutesAfterTick: 98 },
    { uuid: 'fx-comment-grade-04-04', userId: uid(1), body: 'This is PLASTIC. IN A GYM. WITH GRADES PRINTED ON IT.', parentCommentUuid: 'fx-comment-grade-04-03', minutesAfterTick: 100 },
    { uuid: 'fx-comment-grade-04-05', userId: uid(3), body: 'Exactly. And I freed it solo. Checkmate.', parentCommentUuid: 'fx-comment-grade-04-04', minutesAfterTick: 102 },
    { uuid: 'fx-comment-grade-04-06', userId: uid(6), body: 'I used all the holds and it was still pretty casual, felt like V9 🤔', parentCommentUuid: 'fx-comment-grade-04-01', minutesAfterTick: 150 },
    { uuid: 'fx-comment-grade-04-07', userId: uid(1), body: 'ASHIMA PLEASE. Not everything you flash is downgraded. YOU\'RE JUST STRONG.', parentCommentUuid: 'fx-comment-grade-04-06', minutesAfterTick: 152 },
  ]},
  { theme: 'grade_debate', tickIndex: 4, comments: [
    { uuid: 'fx-comment-grade-05-01', userId: uid(12), body: 'V11 is ABSURD for this. The pinch on the lip is literally perfect. I could hold it for an hour. V8 tops.', parentCommentUuid: null, minutesAfterTick: 30 },
    { uuid: 'fx-comment-grade-05-02', userId: uid(9), body: 'See this is interesting because when I projected this last year (my documentary covers it), the pinch was actually the crux for me. But I have small hands so everything is harder. Still sent though lol', parentCommentUuid: 'fx-comment-grade-05-01', minutesAfterTick: 45 },
    { uuid: 'fx-comment-grade-05-03', userId: uid(12), body: 'Brooke your hands aren\'t small you just don\'t train pinch strength. I pinch 60kg on a 40mm block. It\'s a lifestyle.', parentCommentUuid: 'fx-comment-grade-05-02', minutesAfterTick: 48 },
    { uuid: 'fx-comment-grade-05-04', userId: uid(4), body: 'Real climbers train half crimp. Pinching is just open hand crimp for the weak-willed.', parentCommentUuid: 'fx-comment-grade-05-03', minutesAfterTick: 50 },
    { uuid: 'fx-comment-grade-05-05', userId: uid(12), body: 'Magnus I will pinch you', parentCommentUuid: 'fx-comment-grade-05-04', minutesAfterTick: 51 },
    { uuid: 'fx-comment-grade-05-06', userId: uid(2), body: 'guys i literally just grabbed everything with my whole hand and it worked. is this a grip type thing? anyway it was pretty fun, normal grade probably', parentCommentUuid: null, minutesAfterTick: 200 },
  ]},
  { theme: 'grade_debate', tickIndex: 5, comments: [
    { uuid: 'fx-comment-grade-06-01', userId: uid(10), body: 'Officially logging this as a V7 after comparing my splits to the top 50 ascents. The data doesn\'t lie. If you think it\'s V9 you\'re just slow.', parentCommentUuid: null, minutesAfterTick: 10 },
    { uuid: 'fx-comment-grade-06-02', userId: uid(7), body: 'Shauna, speed is the enemy of presence. Perhaps the V9 climbers are simply more present in their suffering? 🌸', parentCommentUuid: 'fx-comment-grade-06-01', minutesAfterTick: 15 },
    { uuid: 'fx-comment-grade-06-03', userId: uid(10), body: 'Chris you literally got last place at regionals', parentCommentUuid: 'fx-comment-grade-06-02', minutesAfterTick: 17 },
    { uuid: 'fx-comment-grade-06-04', userId: uid(7), body: 'Last is just first from another perspective ☮️', parentCommentUuid: 'fx-comment-grade-06-03', minutesAfterTick: 19 },
    { uuid: 'fx-comment-grade-06-05', userId: uid(1), body: 'The grade is V9 because I onsighted it at V9 and onsight grades are the only true grades. Everything else is just projection cope.', parentCommentUuid: 'fx-comment-grade-06-01', minutesAfterTick: 60 },
    { uuid: 'fx-comment-grade-06-06', userId: uid(10), body: 'You took 47 minutes on it Adam. That\'s not an onsight that\'s a hostage situation.', parentCommentUuid: 'fx-comment-grade-06-05', minutesAfterTick: 62 },
    { uuid: 'fx-comment-grade-06-07', userId: uid(1), body: 'I DIDN\'T FALL. TIME IS IRRELEVANT.', parentCommentUuid: 'fx-comment-grade-06-06', minutesAfterTick: 63 },
  ]},
  { theme: 'grade_debate', tickIndex: 6, comments: [
    { uuid: 'fx-comment-grade-07-01', userId: uid(8), body: 'Grade is fine. Just campus the bottom and muscle through the top. People who say it\'s hard have weak cores. V10.', parentCommentUuid: null, minutesAfterTick: 120 },
    { uuid: 'fx-comment-grade-07-02', userId: uid(5), body: 'FINALLY someone who gets it. I dynoed every move. No feet. Pure power. This is what climbing should be.', parentCommentUuid: 'fx-comment-grade-07-01', minutesAfterTick: 125 },
    { uuid: 'fx-comment-grade-07-03', userId: uid(4), body: 'You\'re both cavemen. The beta is a delicate sequence of precise half-crimp tension moves with calculated foot placement. It\'s V11 if you climb it properly.', parentCommentUuid: 'fx-comment-grade-07-01', minutesAfterTick: 130 },
    { uuid: 'fx-comment-grade-07-04', userId: uid(8), body: 'Magnus I don\'t even know what my feet did. I think they were just there for moral support.', parentCommentUuid: 'fx-comment-grade-07-03', minutesAfterTick: 132 },
    { uuid: 'fx-comment-grade-07-05', userId: uid(11), body: 'Wait you guys touched the middle section? I thought those were just decorative holds', parentCommentUuid: 'fx-comment-grade-07-01', minutesAfterTick: 200 },
    { uuid: 'fx-comment-grade-07-06', userId: uid(4), body: 'Jimmy I swear to god', parentCommentUuid: 'fx-comment-grade-07-05', minutesAfterTick: 201 },
  ]},
  { theme: 'grade_debate', tickIndex: 7, comments: [
    { uuid: 'fx-comment-grade-08-01', userId: uid(9), body: 'This was so much harder than the grade suggests! Took me 6 tries which never happens. Definitely V13. Anyone else struggle with the gaston?', parentCommentUuid: null, minutesAfterTick: 5 },
    { uuid: 'fx-comment-grade-08-02', userId: uid(6), body: 'Oh yeah that gaston was spicy! Flashed it but definitely felt the burn. I\'d say solid V11 🔥', parentCommentUuid: 'fx-comment-grade-08-01', minutesAfterTick: 10 },
    { uuid: 'fx-comment-grade-08-03', userId: uid(9), body: 'Right?? And this is after my 3-month training block focusing on gastons specifically. Glad it\'s not just me!', parentCommentUuid: 'fx-comment-grade-08-02', minutesAfterTick: 12 },
    { uuid: 'fx-comment-grade-08-04', userId: uid(1), body: 'Brooke it\'s graded V10 and I onsighted it at V10 so it\'s V10. If you took 6 tries you just had bad beta.', parentCommentUuid: 'fx-comment-grade-08-01', minutesAfterTick: 30 },
    { uuid: 'fx-comment-grade-08-05', userId: uid(2), body: 'lol what gaston? i just pinched it with my left hand and matched. seemed fine. maybe v10 yeah', parentCommentUuid: 'fx-comment-grade-08-01', minutesAfterTick: 180 },
    { uuid: 'fx-comment-grade-08-06', userId: uid(9), body: 'Janja you can\'t pinch a 15° sloper that\'s physically impossible', parentCommentUuid: 'fx-comment-grade-08-05', minutesAfterTick: 182 },
    { uuid: 'fx-comment-grade-08-07', userId: uid(2), body: 'oh is that what that was? yeah idk just grabbed it', parentCommentUuid: 'fx-comment-grade-08-06', minutesAfterTick: 183 },
  ]},
  { theme: 'grade_debate', tickIndex: 8, comments: [
    { uuid: 'fx-comment-grade-09-01', userId: uid(11), body: 'Whoever set this at V12 has normal human proportions. For tall people it\'s basically a ladder. V8 maybe?', parentCommentUuid: null, minutesAfterTick: 15 },
    { uuid: 'fx-comment-grade-09-02', userId: uid(6), body: 'Jimmy I\'m 5\'2" and flashed it so maybe you just need to try hard? 💪', parentCommentUuid: 'fx-comment-grade-09-01', minutesAfterTick: 20 },
    { uuid: 'fx-comment-grade-09-03', userId: uid(11), body: 'Ashima you flashed it BECAUSE you\'re short. You could actually use the intermediate holds. I had to skip like 6 holds.', parentCommentUuid: 'fx-comment-grade-09-02', minutesAfterTick: 22 },
    { uuid: 'fx-comment-grade-09-04', userId: uid(1), body: 'This is actually a valid point. We need height-adjusted grades. V12 for 5\'2", V8 for 6\'4". I\'m 5\'11" so I\'ll calculate... *pulls out spreadsheet*', parentCommentUuid: 'fx-comment-grade-09-03', minutesAfterTick: 40 },
    { uuid: 'fx-comment-grade-09-05', userId: uid(10), body: 'Actually USAC regulations state that climbs are graded for a 5\'8" climber with neutral ape index. It\'s in section 4.2.1 of the rulebook.', parentCommentUuid: 'fx-comment-grade-09-04', minutesAfterTick: 45 },
    { uuid: 'fx-comment-grade-09-06', userId: uid(7), body: 'Perhaps we are all the same height when we lie down. The climb teaches us humility. 🙏', parentCommentUuid: null, minutesAfterTick: 300 },
    { uuid: 'fx-comment-grade-09-07', userId: uid(11), body: 'Chris what the hell does that even mean', parentCommentUuid: 'fx-comment-grade-09-06', minutesAfterTick: 302 },
  ]},
  { theme: 'grade_debate', tickIndex: 9, comments: [
    { uuid: 'fx-comment-grade-10-01', userId: uid(12), body: 'The grade is ONLY correct if you pinch the finish hold. If you wrap it (coward beta) it\'s V9. Pinch beta makes it V14. I don\'t make the rules.', parentCommentUuid: null, minutesAfterTick: 60 },
    { uuid: 'fx-comment-grade-10-02', userId: uid(4), body: 'Alex why are you pinching when there\'s a perfect 10mm edge on the back? Crimp it like a normal person.', parentCommentUuid: 'fx-comment-grade-10-01', minutesAfterTick: 65 },
    { uuid: 'fx-comment-grade-10-03', userId: uid(12), body: 'Magnus there is no "back" on a sphere you absolute donut. It\'s a sloper that I\'m CHOOSING to pinch for the gains.', parentCommentUuid: 'fx-comment-grade-10-02', minutesAfterTick: 67 },
    { uuid: 'fx-comment-grade-10-04', userId: uid(8), body: 'You guys are using specific grips? I just grabbed it hard. Seemed fine. V12 sounds right.', parentCommentUuid: 'fx-comment-grade-10-01', minutesAfterTick: 120 },
    { uuid: 'fx-comment-grade-10-05', userId: uid(5), body: 'IMAGINE HOLDING THE FINISH. I dynoed to it from the start. V6. You\'re all weak.', parentCommentUuid: null, minutesAfterTick: 180 },
    { uuid: 'fx-comment-grade-10-06', userId: uid(1), body: 'Tomato that\'s literally not possible there\'s 40 feet of wall between the start and finish', parentCommentUuid: 'fx-comment-grade-10-05', minutesAfterTick: 182 },
    { uuid: 'fx-comment-grade-10-07', userId: uid(5), body: 'NOT WITH THAT ATTITUDE', parentCommentUuid: 'fx-comment-grade-10-06', minutesAfterTick: 183 },
    { uuid: 'fx-comment-grade-10-08', userId: uid(2), body: 'i just kinda slapped it and stuck it, seemed pretty normal grade wise. probably v12. also i was eating fries so one hand', parentCommentUuid: 'fx-comment-grade-10-01', minutesAfterTick: 360 },
  ]},
];

// — Beta Spray Wars (10) —
const BETA_SPRAYS: RawConversation[] = [
  { theme: 'beta_spray', tickIndex: 0, comments: [
    { uuid: 'fx-comment-beta-01-01', userId: uid(4), body: 'Nice send! But that right hand gaston is actually a half-pad crimp if you engage your DIP joints properly. Way more secure.', parentCommentUuid: null, minutesAfterTick: 15 },
    { uuid: 'fx-comment-beta-01-02', userId: uid(5), body: 'Crimp? Bro just dyno straight past it. Why are you even touching that hold? 🚀', parentCommentUuid: 'fx-comment-beta-01-01', minutesAfterTick: 23 },
    { uuid: 'fx-comment-beta-01-03', userId: uid(4), body: 'A dyno? On a V7? Some of us care about CONTROL and TECHNIQUE, Tomato. Not everything is a parkour course.', parentCommentUuid: 'fx-comment-beta-01-02', minutesAfterTick: 28 },
    { uuid: 'fx-comment-beta-01-04', userId: uid(11), body: 'Wait you guys are using the gaston? I just reach past it to the next hold. Is that not normal?', parentCommentUuid: 'fx-comment-beta-01-01', minutesAfterTick: 45 },
    { uuid: 'fx-comment-beta-01-05', userId: uid(5), body: 'Jimmy please shut up about your wingspan challenge (IMPOSSIBLE)', parentCommentUuid: 'fx-comment-beta-01-04', minutesAfterTick: 47 },
    { uuid: 'fx-comment-beta-01-06', userId: uid(3), body: 'Honestly the beta is way cleaner if you just don\'t use your hands at all. Try it with pure footwork.', parentCommentUuid: 'fx-comment-beta-01-03', minutesAfterTick: 62 },
  ]},
  { theme: 'beta_spray', tickIndex: 1, comments: [
    { uuid: 'fx-comment-beta-02-01', userId: uid(6), body: 'Omg this one is so fun!! The left heel hook makes the crux basically disappear 😊', parentCommentUuid: null, minutesAfterTick: 8 },
    { uuid: 'fx-comment-beta-02-02', userId: uid(9), body: 'WAIT there\'s a heel hook??? I just powered through it. Probably because I\'ve been training core so much lately. My coach says my tension is elite level now.', parentCommentUuid: 'fx-comment-beta-02-01', minutesAfterTick: 12 },
    { uuid: 'fx-comment-beta-02-03', userId: uid(6), body: 'Oh yeah the heel makes it way easier! Not that it was hard anyway haha', parentCommentUuid: 'fx-comment-beta-02-02', minutesAfterTick: 15 },
    { uuid: 'fx-comment-beta-02-04', userId: uid(1), body: 'If you\'re using a heel hook this is V5 max. True V8 beta is the toe cam with right hand underling. Also this is clearly a flash not an onsight if you read Ashima\'s comment first.', parentCommentUuid: 'fx-comment-beta-02-01', minutesAfterTick: 34 },
    { uuid: 'fx-comment-beta-02-05', userId: uid(9), body: 'Actually Adam I did this before reading any comments because I\'m built different. Has anyone seen my new training video btw?', parentCommentUuid: 'fx-comment-beta-02-04', minutesAfterTick: 38 },
    { uuid: 'fx-comment-beta-02-06', userId: uid(7), body: 'The real beta is to close your eyes and let the universe guide your feet to the holds. The heel hook will find you when you stop seeking it. 🙏', parentCommentUuid: 'fx-comment-beta-02-01', minutesAfterTick: 120 },
  ]},
  { theme: 'beta_spray', tickIndex: 2, comments: [
    { uuid: 'fx-comment-beta-03-01', userId: uid(8), body: 'Just lock it off bro. Why are people making this so complicated? 💪', parentCommentUuid: null, minutesAfterTick: 20 },
    { uuid: 'fx-comment-beta-03-02', userId: uid(2), body: 'lol or just bump through it with the left and match? feels pretty chill', parentCommentUuid: 'fx-comment-beta-03-01', minutesAfterTick: 25 },
    { uuid: 'fx-comment-beta-03-03', userId: uid(8), body: 'Bumping is for people who don\'t deadlift. Real climbers lock. 🔒', parentCommentUuid: 'fx-comment-beta-03-02', minutesAfterTick: 27 },
    { uuid: 'fx-comment-beta-03-04', userId: uid(12), body: 'Wait are we ignoring that the hold is literally a perfect pinch? Thumb on top, squeeze, done. This is Pinching 101.', parentCommentUuid: 'fx-comment-beta-03-01', minutesAfterTick: 35 },
    { uuid: 'fx-comment-beta-03-05', userId: uid(2), body: 'i mean... it is a jug though? 🍔', parentCommentUuid: 'fx-comment-beta-03-04', minutesAfterTick: 40 },
    { uuid: 'fx-comment-beta-03-06', userId: uid(12), body: 'Janja everything is a jug to you. Some of us have normal human hand strength.', parentCommentUuid: 'fx-comment-beta-03-05', minutesAfterTick: 42 },
    { uuid: 'fx-comment-beta-03-07', userId: uid(10), body: 'The IFSC beta for this layout is the pinch. That\'s how the podium did it at World Cups. But go off I guess.', parentCommentUuid: 'fx-comment-beta-03-04', minutesAfterTick: 58 },
    { uuid: 'fx-comment-beta-03-08', userId: uid(5), body: 'None of you are asking the important question: can you dyno the finish? (yes you can, I tested it)', parentCommentUuid: 'fx-comment-beta-03-01', minutesAfterTick: 95 },
  ]},
  { theme: 'beta_spray', tickIndex: 3, comments: [
    { uuid: 'fx-comment-beta-04-01', userId: uid(10), body: 'Solid send but you\'re losing 2-3 seconds on the opening sequence. Competition beta is way more efficient.', parentCommentUuid: null, minutesAfterTick: 10 },
    { uuid: 'fx-comment-beta-04-02', userId: uid(7), body: 'Shauna, climbing is not a race. It is a conversation between human and plastic. Some conversations are slow and beautiful. ✨', parentCommentUuid: 'fx-comment-beta-04-01', minutesAfterTick: 18 },
    { uuid: 'fx-comment-beta-04-03', userId: uid(10), body: 'No literally it IS a race in speed climbing and also this attitude is why you\'ve never qualified for nationals Chris', parentCommentUuid: 'fx-comment-beta-04-02', minutesAfterTick: 22 },
    { uuid: 'fx-comment-beta-04-04', userId: uid(1), body: 'Speed is irrelevant if the style is wrong. The true crux is the left hand crimp which requires precise thumb positioning. I have diagrams.', parentCommentUuid: 'fx-comment-beta-04-01', minutesAfterTick: 45 },
    { uuid: 'fx-comment-beta-04-05', userId: uid(9), body: 'This is literally my warmup problem. My coach says I make V9s look like V4s. Anyone want to collab on content?', parentCommentUuid: 'fx-comment-beta-04-01', minutesAfterTick: 67 },
    { uuid: 'fx-comment-beta-04-06', userId: uid(7), body: 'Brooke, my child, the only collab you need is between your breath and the present moment. 🧘', parentCommentUuid: 'fx-comment-beta-04-05', minutesAfterTick: 72 },
  ]},
  { theme: 'beta_spray', tickIndex: 4, comments: [
    { uuid: 'fx-comment-beta-05-01', userId: uid(11), body: 'Oh nice! Pro tip: you can actually skip the first 3 holds if you have decent reach', parentCommentUuid: null, minutesAfterTick: 5 },
    { uuid: 'fx-comment-beta-05-02', userId: uid(12), body: 'Jimmy I swear to god', parentCommentUuid: 'fx-comment-beta-05-01', minutesAfterTick: 7 },
    { uuid: 'fx-comment-beta-05-03', userId: uid(4), body: 'Some of us are normal sized humans Jimmy. Those holds are literally the crux crimps.', parentCommentUuid: 'fx-comment-beta-05-01', minutesAfterTick: 12 },
    { uuid: 'fx-comment-beta-05-04', userId: uid(11), body: 'Wait really? They\'re crimps? I thought they were like slopers or something. I don\'t really look at them tbh', parentCommentUuid: 'fx-comment-beta-05-03', minutesAfterTick: 15 },
    { uuid: 'fx-comment-beta-05-05', userId: uid(6), body: 'lmaooo Jimmy stop 💀 but actually the crimps are pretty good if you get your hips in close!', parentCommentUuid: 'fx-comment-beta-05-04', minutesAfterTick: 23 },
    { uuid: 'fx-comment-beta-05-06', userId: uid(12), body: 'Ashima they are RAZOR CRIMPS. "Pretty good" she says. I\'m going to lose my mind.', parentCommentUuid: 'fx-comment-beta-05-05', minutesAfterTick: 26 },
    { uuid: 'fx-comment-beta-05-07', userId: uid(5), body: 'Have you tried not crimping them and just dynoing to the finish? Works every time.', parentCommentUuid: 'fx-comment-beta-05-03', minutesAfterTick: 40 },
    { uuid: 'fx-comment-beta-05-08', userId: uid(4), body: 'Tomato I am BEGGING you to learn what the word "technique" means', parentCommentUuid: 'fx-comment-beta-05-07', minutesAfterTick: 43 },
  ]},
  { theme: 'beta_spray', tickIndex: 5, comments: [
    { uuid: 'fx-comment-beta-06-01', userId: uid(1), body: 'Congrats but this is graded incorrectly. The angle + hold set combination puts this at V6 maximum. True V8 would require smaller holds or steeper angle.', parentCommentUuid: null, minutesAfterTick: 30 },
    { uuid: 'fx-comment-beta-06-02', userId: uid(2), body: 'adam buddy maybe just let people enjoy things', parentCommentUuid: 'fx-comment-beta-06-01', minutesAfterTick: 35 },
    { uuid: 'fx-comment-beta-06-03', userId: uid(1), body: 'I\'m doing them a FAVOR Janja. Grade inflation is ruining climbing. When I onsighted 8A+ in Fontainebleau the grades actually meant something.', parentCommentUuid: 'fx-comment-beta-06-02', minutesAfterTick: 38 },
    { uuid: 'fx-comment-beta-06-04', userId: uid(9), body: 'Wait you\'ve climbed in Fontainebleau? I just got back from there! Did I tell you guys I went to Font? So inspiring. Great content too.', parentCommentUuid: 'fx-comment-beta-06-03', minutesAfterTick: 42 },
    { uuid: 'fx-comment-beta-06-05', userId: uid(8), body: 'Grades are fake. Just pull harder. This is like arguing about what color the holds are.', parentCommentUuid: 'fx-comment-beta-06-01', minutesAfterTick: 55 },
    { uuid: 'fx-comment-beta-06-06', userId: uid(1), body: 'Daniel this is exactly why you plateaued at V10. No respect for the grading systems that generations of climbers have refined.', parentCommentUuid: 'fx-comment-beta-06-05', minutesAfterTick: 58 },
    { uuid: 'fx-comment-beta-06-07', userId: uid(3), body: 'Grades don\'t matter when you\'re 3000ft off the deck with no rope. Just saying. 🧗', parentCommentUuid: 'fx-comment-beta-06-05', minutesAfterTick: 78 },
  ]},
  { theme: 'beta_spray', tickIndex: 6, comments: [
    { uuid: 'fx-comment-beta-07-01', userId: uid(7), body: 'Beautiful send my friend. Remember: the climb begins and ends in the mind. The body is just along for the journey. 🌊', parentCommentUuid: null, minutesAfterTick: 60 },
    { uuid: 'fx-comment-beta-07-02', userId: uid(10), body: 'Chris the climb begins at the first hold and ends at the last hold. That\'s literally the definition.', parentCommentUuid: 'fx-comment-beta-07-01', minutesAfterTick: 65 },
    { uuid: 'fx-comment-beta-07-03', userId: uid(7), body: 'Shauna, you climb to win. I win by climbing. We are not the same. 🙏✨', parentCommentUuid: 'fx-comment-beta-07-02', minutesAfterTick: 70 },
    { uuid: 'fx-comment-beta-07-04', userId: uid(5), body: 'The climb begins when you leave the ground and ends when you stick the dyno. This is the way.', parentCommentUuid: 'fx-comment-beta-07-01', minutesAfterTick: 85 },
    { uuid: 'fx-comment-beta-07-05', userId: uid(4), body: 'The climb begins with proper finger warm-up protocols and ends when your pulleys are still intact. Dynos are joint suicide.', parentCommentUuid: 'fx-comment-beta-07-04', minutesAfterTick: 90 },
    { uuid: 'fx-comment-beta-07-06', userId: uid(8), body: 'The climb begins in the weight room. Everything else is just cardio.', parentCommentUuid: 'fx-comment-beta-07-01', minutesAfterTick: 105 },
  ]},
  { theme: 'beta_spray', tickIndex: 7, comments: [
    { uuid: 'fx-comment-beta-08-01', userId: uid(12), body: 'YO that finish pinch is INSANE. Did you wrap your thumb or try to crank it? I\'ve been training thumb wraps specifically for this style.', parentCommentUuid: null, minutesAfterTick: 12 },
    { uuid: 'fx-comment-beta-08-02', userId: uid(2), body: 'wait which hold are you talking about? the finish jug?', parentCommentUuid: 'fx-comment-beta-08-01', minutesAfterTick: 18 },
    { uuid: 'fx-comment-beta-08-03', userId: uid(12), body: 'JUG???? JANJA THAT IS A 15MM PINCH', parentCommentUuid: 'fx-comment-beta-08-02', minutesAfterTick: 20 },
    { uuid: 'fx-comment-beta-08-04', userId: uid(2), body: 'oh lol i just grabbed it idk 🤷‍♀️', parentCommentUuid: 'fx-comment-beta-08-03', minutesAfterTick: 22 },
    { uuid: 'fx-comment-beta-08-05', userId: uid(11), body: 'Wait you guys are pinching? I just use it open hand because my fingers are long enough', parentCommentUuid: 'fx-comment-beta-08-01', minutesAfterTick: 35 },
    { uuid: 'fx-comment-beta-08-06', userId: uid(12), body: 'I AM GOING TO CLIMB WITH OVEN MITTS UNTIL YOU PEOPLE UNDERSTAND WHAT NORMAL HUMANS DEAL WITH', parentCommentUuid: 'fx-comment-beta-08-05', minutesAfterTick: 37 },
    { uuid: 'fx-comment-beta-08-07', userId: uid(3), body: 'Have you considered not using that hold at all? I find climbing gets easier when you use fewer holds in general.', parentCommentUuid: 'fx-comment-beta-08-01', minutesAfterTick: 90 },
    { uuid: 'fx-comment-beta-08-08', userId: uid(12), body: 'Alex I am going to make you climb on a 10 degree wall with only pinches for an entire session', parentCommentUuid: 'fx-comment-beta-08-07', minutesAfterTick: 92 },
  ]},
  { theme: 'beta_spray', tickIndex: 8, comments: [
    { uuid: 'fx-comment-beta-09-01', userId: uid(6), body: 'Ooh I loved this one! The toe hook rest is chef\'s kiss 👌', parentCommentUuid: null, minutesAfterTick: 5 },
    { uuid: 'fx-comment-beta-09-02', userId: uid(9), body: 'There\'s a REST? I just powered through the whole thing. Cardio has been really paying off. My resting HR is 45 now btw.', parentCommentUuid: 'fx-comment-beta-09-01', minutesAfterTick: 10 },
    { uuid: 'fx-comment-beta-09-03', userId: uid(1), body: 'If you need to rest on a V7 then it\'s not a V7, it\'s two V5s. This is basic grade theory.', parentCommentUuid: 'fx-comment-beta-09-01', minutesAfterTick: 25 },
    { uuid: 'fx-comment-beta-09-04', userId: uid(10), body: 'Actually Adam rests are standard in competition climbing. Strategic recovery is literally in the IFSC training manual.', parentCommentUuid: 'fx-comment-beta-09-03', minutesAfterTick: 30 },
    { uuid: 'fx-comment-beta-09-05', userId: uid(1), body: 'Competition climbing is a different sport Shauna. We\'re talking about REAL climbing. Onsight ethics. Purity.', parentCommentUuid: 'fx-comment-beta-09-04', minutesAfterTick: 33 },
    { uuid: 'fx-comment-beta-09-06', userId: uid(8), body: 'Why are you resting? Just lock off and go. Resting is what you do after you finish.', parentCommentUuid: 'fx-comment-beta-09-01', minutesAfterTick: 45 },
    { uuid: 'fx-comment-beta-09-07', userId: uid(7), body: 'Every moment on the wall is rest if you are truly present. The rest is not a position, it is a state of being. 🕉️', parentCommentUuid: 'fx-comment-beta-09-06', minutesAfterTick: 90 },
  ]},
  { theme: 'beta_spray', tickIndex: 9, comments: [
    { uuid: 'fx-comment-beta-10-01', userId: uid(5), body: 'Sick send! But real talk you can skip the entire middle section with one big dyno from the start crimp to the finish rail 🚀', parentCommentUuid: null, minutesAfterTick: 8 },
    { uuid: 'fx-comment-beta-10-02', userId: uid(4), body: 'Tomato that is physically impossible and also a great way to explode your A2 pulley', parentCommentUuid: 'fx-comment-beta-10-01', minutesAfterTick: 15 },
    { uuid: 'fx-comment-beta-10-03', userId: uid(5), body: 'Not with that attitude it\'s not. I sent it yesterday. Uploaded the vid to my story.', parentCommentUuid: 'fx-comment-beta-10-02', minutesAfterTick: 18 },
    { uuid: 'fx-comment-beta-10-04', userId: uid(10), body: 'Tomato that video shows you falling and hitting the mat so hard the person belaying you jumped', parentCommentUuid: 'fx-comment-beta-10-03', minutesAfterTick: 25 },
    { uuid: 'fx-comment-beta-10-05', userId: uid(5), body: 'Yeah but I touched the finish hold mid-air. Counts. Dynamic climbing is the future.', parentCommentUuid: 'fx-comment-beta-10-04', minutesAfterTick: 27 },
    { uuid: 'fx-comment-beta-10-06', userId: uid(1), body: 'That is LITERALLY not how sends work Tomato oh my god', parentCommentUuid: 'fx-comment-beta-10-05', minutesAfterTick: 30 },
    { uuid: 'fx-comment-beta-10-07', userId: uid(3), body: 'To be fair if you fall and survive, that\'s kind of like sending. That\'s my whole philosophy anyway.', parentCommentUuid: 'fx-comment-beta-10-05', minutesAfterTick: 55 },
    { uuid: 'fx-comment-beta-10-08', userId: uid(7), body: 'The real send is the friends we made along the way. And the lessons we learned about ourselves. 🌟', parentCommentUuid: 'fx-comment-beta-10-01', minutesAfterTick: 120 },
  ]},
];

// — Flash Incredulity (10) —
const FLASH_INCREDULITY: RawConversation[] = [
  { theme: 'flash_incredulity', tickIndex: 0, comments: [
    { uuid: 'fx-comment-flash-01-01', userId: uid(1), body: 'Flash? FLASH? I\'ve been projecting this for 3 weeks and you\'re telling me you walked up and sent it first try? The grading committee needs to investigate immediately.', parentCommentUuid: null, minutesAfterTick: 12 },
    { uuid: 'fx-comment-flash-01-02', userId: uid(6), body: 'oh sorry was this one hard? i didn\'t really notice, just kind of flowed through it 🌸', parentCommentUuid: 'fx-comment-flash-01-01', minutesAfterTick: 25 },
    { uuid: 'fx-comment-flash-01-03', userId: uid(1), body: 'This is a V9+ MINIMUM at 40 degrees. Show me the footage or I\'m filing a formal grade dispute.', parentCommentUuid: 'fx-comment-flash-01-02', minutesAfterTick: 31 },
    { uuid: 'fx-comment-flash-01-04', userId: uid(10), body: 'Adam has a point. Ashima you\'re #1 on the flash leaderboard by like 200 climbs now. This is getting suspicious 👀', parentCommentUuid: null, minutesAfterTick: 45 },
    { uuid: 'fx-comment-flash-01-05', userId: uid(6), body: 'i just really like training boards! they\'re fun ☺️', parentCommentUuid: 'fx-comment-flash-01-04', minutesAfterTick: 52 },
  ]},
  { theme: 'flash_incredulity', tickIndex: 1, comments: [
    { uuid: 'fx-comment-flash-02-01', userId: uid(4), body: 'Absolutely no way you flashed this. The starting crimp is 8mm deep. I measured it. I\'ve been doing no-hang protocols for 6 months specifically for this problem.', parentCommentUuid: null, minutesAfterTick: 8 },
    { uuid: 'fx-comment-flash-02-02', userId: uid(2), body: 'lol magnus i just used the volume as a sidepull and skipped that hold entirely 🍔', parentCommentUuid: 'fx-comment-flash-02-01', minutesAfterTick: 15 },
    { uuid: 'fx-comment-flash-02-03', userId: uid(4), body: 'That\'s... that\'s not the beta. That\'s not even ON THE WALL. You can\'t just make up new holds!', parentCommentUuid: 'fx-comment-flash-02-02', minutesAfterTick: 18 },
    { uuid: 'fx-comment-flash-02-04', userId: uid(5), body: 'wait you guys are using holds on this? i just dyno\'d from the start jug to the finish 😤', parentCommentUuid: 'fx-comment-flash-02-01', minutesAfterTick: 34 },
    { uuid: 'fx-comment-flash-02-05', userId: uid(4), body: 'I need a drink.', parentCommentUuid: 'fx-comment-flash-02-04', minutesAfterTick: 36 },
    { uuid: 'fx-comment-flash-02-06', userId: uid(11), body: 'Tomoa you can\'t dyno a 12 move sequence that\'s literally 4 meters tall', parentCommentUuid: 'fx-comment-flash-02-04', minutesAfterTick: 41 },
    { uuid: 'fx-comment-flash-02-07', userId: uid(5), body: 'skill issue 🦘', parentCommentUuid: 'fx-comment-flash-02-06', minutesAfterTick: 43 },
  ]},
  { theme: 'flash_incredulity', tickIndex: 2, comments: [
    { uuid: 'fx-comment-flash-03-01', userId: uid(10), body: 'PICS OR IT DIDN\'T HAPPEN. This is the hardest climb in the gym and you\'re telling me you just... flashed it? After I\'ve been working it for a month?', parentCommentUuid: null, minutesAfterTick: 5 },
    { uuid: 'fx-comment-flash-03-02', userId: uid(9), body: 'Actually Shauna if you look at MY tick from last week I also flashed a V10 which is basically the same thing so I totally understand what you\'re going through', parentCommentUuid: 'fx-comment-flash-03-01', minutesAfterTick: 22 },
    { uuid: 'fx-comment-flash-03-03', userId: uid(10), body: 'Brooke this conversation isn\'t about you oh my god', parentCommentUuid: 'fx-comment-flash-03-02', minutesAfterTick: 24 },
    { uuid: 'fx-comment-flash-03-04', userId: uid(3), body: 'i don\'t see what the big deal is. if you can\'t flash it without a rope why even bother', parentCommentUuid: null, minutesAfterTick: 67 },
    { uuid: 'fx-comment-flash-03-05', userId: uid(10), body: 'ALEX IT\'S A TRAINING BOARD. IN A GYM. THERE IS NO ROPE.', parentCommentUuid: 'fx-comment-flash-03-04', minutesAfterTick: 70 },
    { uuid: 'fx-comment-flash-03-06', userId: uid(3), body: 'exactly', parentCommentUuid: 'fx-comment-flash-03-05', minutesAfterTick: 72 },
  ]},
  { theme: 'flash_incredulity', tickIndex: 3, comments: [
    { uuid: 'fx-comment-flash-04-01', userId: uid(8), body: 'LETS GOOOO just absolutely crushed this flash. pure power. no beta needed 💪', parentCommentUuid: null, minutesAfterTick: 3 },
    { uuid: 'fx-comment-flash-04-02', userId: uid(7), body: 'Daniel, my friend, I have meditated on this problem for many hours. The route requires precise footwork and balance. How did you apply power to the delicate top section?', parentCommentUuid: 'fx-comment-flash-04-01', minutesAfterTick: 28 },
    { uuid: 'fx-comment-flash-04-03', userId: uid(8), body: 'i campused it 🤷', parentCommentUuid: 'fx-comment-flash-04-02', minutesAfterTick: 32 },
    { uuid: 'fx-comment-flash-04-04', userId: uid(1), body: 'You campused a slab? A SLAB?? This is 25 degrees. The holds are literally sloping AWAY from you.', parentCommentUuid: 'fx-comment-flash-04-03', minutesAfterTick: 35 },
    { uuid: 'fx-comment-flash-04-05', userId: uid(8), body: 'technique is a conspiracy invented by weak people', parentCommentUuid: 'fx-comment-flash-04-04', minutesAfterTick: 38 },
    { uuid: 'fx-comment-flash-04-06', userId: uid(7), body: '*deep breath* I must go meditate on this disturbance in the force', parentCommentUuid: 'fx-comment-flash-04-03', minutesAfterTick: 41 },
  ]},
  { theme: 'flash_incredulity', tickIndex: 4, comments: [
    { uuid: 'fx-comment-flash-05-01', userId: uid(12), body: 'Flashed it. The pinch at move 7 was absolutely perfect. 45mm wide, slight incut, just *chef\'s kiss*', parentCommentUuid: null, minutesAfterTick: 15 },
    { uuid: 'fx-comment-flash-05-02', userId: uid(11), body: 'bro what pinch? i just reached past all of that to the finish jug', parentCommentUuid: 'fx-comment-flash-05-01', minutesAfterTick: 23 },
    { uuid: 'fx-comment-flash-05-03', userId: uid(12), body: 'Jimmy that\'s literally impossible. The finish is 8 feet from move 6.', parentCommentUuid: 'fx-comment-flash-05-02', minutesAfterTick: 26 },
    { uuid: 'fx-comment-flash-05-04', userId: uid(11), body: '+12 ape index hits different 🕷️', parentCommentUuid: 'fx-comment-flash-05-03', minutesAfterTick: 28 },
    { uuid: 'fx-comment-flash-05-05', userId: uid(9), body: 'omg jimmy that\'s so crazy!! one time I also had really long arms for a climb and it reminded me of when I won my first comp and everyone was like "brooke you\'re so talented" and', parentCommentUuid: 'fx-comment-flash-05-04', minutesAfterTick: 45 },
    { uuid: 'fx-comment-flash-05-06', userId: uid(10), body: 'Brooke I will pay you to stop', parentCommentUuid: 'fx-comment-flash-05-05', minutesAfterTick: 47 },
    { uuid: 'fx-comment-flash-05-07', userId: uid(4), body: 'Can we get back to discussing Alex\'s "flash"? Because I have frame-by-frame analysis that shows you definitely touched that volume with your knee', parentCommentUuid: null, minutesAfterTick: 89 },
    { uuid: 'fx-comment-flash-05-08', userId: uid(12), body: 'Magnus that was a different climb. And a different person. And 3 months ago.', parentCommentUuid: 'fx-comment-flash-05-07', minutesAfterTick: 92 },
  ]},
  { theme: 'flash_incredulity', tickIndex: 5, comments: [
    { uuid: 'fx-comment-flash-06-01', userId: uid(1), body: 'Another ONSIGHT for the collection. This makes 47 V8+ onsights this year. Not that anyone\'s counting. But I am. I\'m counting.', parentCommentUuid: null, minutesAfterTick: 2 },
    { uuid: 'fx-comment-flash-06-02', userId: uid(2), body: 'wait adam didn\'t i see you working this last tuesday?', parentCommentUuid: 'fx-comment-flash-06-01', minutesAfterTick: 34 },
    { uuid: 'fx-comment-flash-06-03', userId: uid(1), body: 'That was a DIFFERENT climb on the SAME holds in a DIFFERENT configuration which is TECHNICALLY a different problem', parentCommentUuid: 'fx-comment-flash-06-02', minutesAfterTick: 37 },
    { uuid: 'fx-comment-flash-06-04', userId: uid(2), body: 'it was literally the same problem. you fell on move 4 like six times and i brought you a burger to cheer you up', parentCommentUuid: 'fx-comment-flash-06-03', minutesAfterTick: 40 },
    { uuid: 'fx-comment-flash-06-05', userId: uid(1), body: 'The beta evolved. My understanding deepened. Today was the true first ascent of my consciousness encountering this problem. Therefore: onsight.', parentCommentUuid: 'fx-comment-flash-06-04', minutesAfterTick: 43 },
    { uuid: 'fx-comment-flash-06-06', userId: uid(7), body: 'I... actually kind of respect this level of mental gymnastics', parentCommentUuid: 'fx-comment-flash-06-05', minutesAfterTick: 67 },
    { uuid: 'fx-comment-flash-06-07', userId: uid(10), body: 'This is going to mess up the leaderboard stats SO BAD', parentCommentUuid: 'fx-comment-flash-06-05', minutesAfterTick: 71 },
  ]},
  { theme: 'flash_incredulity', tickIndex: 6, comments: [
    { uuid: 'fx-comment-flash-07-01', userId: uid(5), body: 'FULL SEND DYNO FLASH BABY 🚀 who needs beta when you can just LAUNCH', parentCommentUuid: null, minutesAfterTick: 1 },
    { uuid: 'fx-comment-flash-07-02', userId: uid(6), body: 'tomoa this is so cool!! i also flashed this but i matched on every hold and did like 15 moves? how did you dyno it', parentCommentUuid: 'fx-comment-flash-07-01', minutesAfterTick: 18 },
    { uuid: 'fx-comment-flash-07-03', userId: uid(5), body: 'start. jump. finish. three moves. efficiency 📈', parentCommentUuid: 'fx-comment-flash-07-02', minutesAfterTick: 21 },
    { uuid: 'fx-comment-flash-07-04', userId: uid(4), body: 'Tomoa the start and finish are on opposite sides of the board', parentCommentUuid: 'fx-comment-flash-07-03', minutesAfterTick: 56 },
    { uuid: 'fx-comment-flash-07-05', userId: uid(5), body: 'yeah it was a really big jump', parentCommentUuid: 'fx-comment-flash-07-04', minutesAfterTick: 58 },
    { uuid: 'fx-comment-flash-07-06', userId: uid(8), body: 'RESPECT. this is the way', parentCommentUuid: 'fx-comment-flash-07-03', minutesAfterTick: 73 },
  ]},
  { theme: 'flash_incredulity', tickIndex: 7, comments: [
    { uuid: 'fx-comment-flash-08-01', userId: uid(9), body: 'WOW just flashed this iconic problem!! 💅 feeling so grateful for this journey and all my supporters. link to my training vlog in bio', parentCommentUuid: null, minutesAfterTick: 4 },
    { uuid: 'fx-comment-flash-08-02', userId: uid(10), body: 'Brooke this problem was set literally yesterday. There are no videos. You have 3 followers. What supporters.', parentCommentUuid: 'fx-comment-flash-08-01', minutesAfterTick: 29 },
    { uuid: 'fx-comment-flash-08-03', userId: uid(9), body: 'wow shauna why are you always so negative?? this reminds me of when I won regionals and everyone was jealous', parentCommentUuid: 'fx-comment-flash-08-02', minutesAfterTick: 33 },
    { uuid: 'fx-comment-flash-08-04', userId: uid(1), body: 'I watched the regional finals footage. You 100% dabbed. Your foot was on the ground for a full second.', parentCommentUuid: 'fx-comment-flash-08-03', minutesAfterTick: 45 },
    { uuid: 'fx-comment-flash-08-05', userId: uid(9), body: 'ok but did you watch MY recap video where I explain why that doesn\'t count? it got like 14 views', parentCommentUuid: 'fx-comment-flash-08-04', minutesAfterTick: 48 },
    { uuid: 'fx-comment-flash-08-06', userId: uid(7), body: '*closes app* *goes outside* *touches grass*', parentCommentUuid: null, minutesAfterTick: 103 },
  ]},
  { theme: 'flash_incredulity', tickIndex: 8, comments: [
    { uuid: 'fx-comment-flash-09-01', userId: uid(11), body: 'lol this was way easier than the grade suggests. flashed it no problem 🕸️', parentCommentUuid: null, minutesAfterTick: 7 },
    { uuid: 'fx-comment-flash-09-02', userId: uid(1), body: 'EASIER?? Jimmy this is consensus V11. CONSENSUS. Do you know what that word means? It means EVERYONE AGREES.', parentCommentUuid: 'fx-comment-flash-09-01', minutesAfterTick: 22 },
    { uuid: 'fx-comment-flash-09-03', userId: uid(11), body: 'yeah idk maybe your gym\'s board is set at a different angle? my gym\'s 40 degree board just hits different i guess', parentCommentUuid: 'fx-comment-flash-09-02', minutesAfterTick: 26 },
    { uuid: 'fx-comment-flash-09-04', userId: uid(1), body: 'THEY\'RE STANDARDIZED. THAT\'S THE ENTIRE POINT. THE HOLDS ARE IN THE EXACT SAME POSITIONS.', parentCommentUuid: 'fx-comment-flash-09-03', minutesAfterTick: 28 },
    { uuid: 'fx-comment-flash-09-05', userId: uid(11), body: 'idk what to tell you man some of us are just built different 🤷‍♂️', parentCommentUuid: 'fx-comment-flash-09-04', minutesAfterTick: 31 },
    { uuid: 'fx-comment-flash-09-06', userId: uid(12), body: 'Jimmy you literally have a +12 ape index. You\'re not "built different" you\'re built WRONG. Freakishly. Unnaturally.', parentCommentUuid: 'fx-comment-flash-09-05', minutesAfterTick: 44 },
    { uuid: 'fx-comment-flash-09-07', userId: uid(11), body: 'thank you? 🕷️❤️', parentCommentUuid: 'fx-comment-flash-09-06', minutesAfterTick: 46 },
  ]},
  { theme: 'flash_incredulity', tickIndex: 9, comments: [
    { uuid: 'fx-comment-flash-10-01', userId: uid(3), body: 'flashed this. would be more impressive outdoors though. indoor climbing doesn\'t really count', parentCommentUuid: null, minutesAfterTick: 11 },
    { uuid: 'fx-comment-flash-10-02', userId: uid(6), body: 'alex this is literally a training board for structured progression but congrats!! 🌸', parentCommentUuid: 'fx-comment-flash-10-01', minutesAfterTick: 34 },
    { uuid: 'fx-comment-flash-10-03', userId: uid(3), body: 'thanks! yeah i was thinking i should probably find this same sequence on real rock and free solo it for it to mean anything', parentCommentUuid: 'fx-comment-flash-10-02', minutesAfterTick: 38 },
    { uuid: 'fx-comment-flash-10-04', userId: uid(7), body: 'Alex, brother, I say this with love: please talk to a therapist', parentCommentUuid: 'fx-comment-flash-10-03', minutesAfterTick: 52 },
    { uuid: 'fx-comment-flash-10-05', userId: uid(3), body: 'therapists work indoors. doesn\'t count', parentCommentUuid: 'fx-comment-flash-10-04', minutesAfterTick: 54 },
    { uuid: 'fx-comment-flash-10-06', userId: uid(10), body: 'ANYWAY setting aside Alex\'s death wish, can we address how he "flashed" a V10 when his previous hardest tick is V4?', parentCommentUuid: null, minutesAfterTick: 78 },
    { uuid: 'fx-comment-flash-10-07', userId: uid(3), body: 'the grades in between seemed too easy so i skipped them', parentCommentUuid: 'fx-comment-flash-10-06', minutesAfterTick: 82 },
    { uuid: 'fx-comment-flash-10-08', userId: uid(1), body: 'I am going to have an aneurysm', parentCommentUuid: 'fx-comment-flash-10-07', minutesAfterTick: 84 },
  ]},
];

// — Angle Gatekeeping (10) —
const ANGLE_GATEKEEPING: RawConversation[] = [
  { theme: 'angle_gatekeeping', tickIndex: 0, comments: [
    { uuid: 'fx-comment-angle-01-01', userId: uid(1), body: 'Anything below 40° is literally just a ladder. If gravity isn\'t actively trying to peel you off the wall, are you even climbing?', parentCommentUuid: null, minutesAfterTick: 15 },
    { uuid: 'fx-comment-angle-01-02', userId: uid(2), body: 'idk man i just like burgers and climbing. did this one at 25° while eating a double patty. still counts right?', parentCommentUuid: 'fx-comment-angle-01-01', minutesAfterTick: 32 },
    { uuid: 'fx-comment-angle-01-03', userId: uid(1), body: 'That\'s not climbing, that\'s vertical snacking. I bet you didn\'t even onsight it. Did you preview the menu first?', parentCommentUuid: 'fx-comment-angle-01-02', minutesAfterTick: 45 },
    { uuid: 'fx-comment-angle-01-04', userId: uid(7), body: 'The angle is merely the question. Your mindfulness is the answer. Namaste.', parentCommentUuid: 'fx-comment-angle-01-01', minutesAfterTick: 67 },
    { uuid: 'fx-comment-angle-01-05', userId: uid(8), body: 'weak mindset. just pull harder. angle doesn\'t matter when you have POWER', parentCommentUuid: 'fx-comment-angle-01-04', minutesAfterTick: 89 },
  ]},
  { theme: 'angle_gatekeeping', tickIndex: 1, comments: [
    { uuid: 'fx-comment-angle-02-01', userId: uid(10), body: '50° is the ONLY angle that counts for ranking points. Everyone knows this. Why are you even logging this 35° garbage?', parentCommentUuid: null, minutesAfterTick: 8 },
    { uuid: 'fx-comment-angle-02-02', userId: uid(3), body: 'imagine caring about angles indoors lmao. call me when you\'re on real rock with actual consequences', parentCommentUuid: 'fx-comment-angle-02-01', minutesAfterTick: 22 },
    { uuid: 'fx-comment-angle-02-03', userId: uid(9), body: 'This reminds me of when I sent my first 50° benchmark. Everyone said I couldn\'t do it. But I did. Because I\'m built different.', parentCommentUuid: 'fx-comment-angle-02-01', minutesAfterTick: 41 },
    { uuid: 'fx-comment-angle-02-04', userId: uid(10), body: 'Cool story. I have 47 more 50° sends than you this month. But who\'s counting? Me. I\'m counting.', parentCommentUuid: 'fx-comment-angle-02-03', minutesAfterTick: 55 },
    { uuid: 'fx-comment-angle-02-05', userId: uid(6), body: 'oh i didn\'t realize angle mattered? just flashed this whole set at every angle today during warmup haha', parentCommentUuid: null, minutesAfterTick: 120 },
    { uuid: 'fx-comment-angle-02-06', userId: uid(10), body: 'FLASHING DOESN\'T COUNT IF YOU DON\'T LOG IT IN THE RIGHT ANGLE CATEGORY ASHIMA', parentCommentUuid: 'fx-comment-angle-02-05', minutesAfterTick: 122 },
  ]},
  { theme: 'angle_gatekeeping', tickIndex: 2, comments: [
    { uuid: 'fx-comment-angle-03-01', userId: uid(5), body: 'bro why are you statically climbing a 45° wall??? just dyno to every hold like a real athlete. steeper = more dyno potential = actually fun', parentCommentUuid: null, minutesAfterTick: 5 },
    { uuid: 'fx-comment-angle-03-02', userId: uid(4), body: 'Dyno? DYNO?! This problem is a finger strength masterpiece and you want to campus it? 45° is the perfect angle for maximum crimp recruitment. Your tendons are crying.', parentCommentUuid: 'fx-comment-angle-03-01', minutesAfterTick: 18 },
    { uuid: 'fx-comment-angle-03-03', userId: uid(5), body: 'tendons are temporary. DYNO IS ETERNAL', parentCommentUuid: 'fx-comment-angle-03-02', minutesAfterTick: 23 },
    { uuid: 'fx-comment-angle-03-04', userId: uid(11), body: 'wait you guys actually have to try at 45°? i just reached past the crux holds lol', parentCommentUuid: null, minutesAfterTick: 67 },
    { uuid: 'fx-comment-angle-03-05', userId: uid(4), body: 'Jimmy I swear your ape index is a crime against beta reading', parentCommentUuid: 'fx-comment-angle-03-04', minutesAfterTick: 72 },
  ]},
  { theme: 'angle_gatekeeping', tickIndex: 3, comments: [
    { uuid: 'fx-comment-angle-04-01', userId: uid(8), body: '25 degrees. TWENTY. FIVE. That\'s not training that\'s a warm up for my warm up. Might as well be doing pilates.', parentCommentUuid: null, minutesAfterTick: 12 },
    { uuid: 'fx-comment-angle-04-02', userId: uid(7), body: 'The vertical wall teaches balance. The overhang teaches strength. But the slight angle? It teaches humility, Daniel-san.', parentCommentUuid: 'fx-comment-angle-04-01', minutesAfterTick: 28 },
    { uuid: 'fx-comment-angle-04-03', userId: uid(8), body: 'i learned humility when i deadlifted 500lbs. don\'t need a slab to teach me anything', parentCommentUuid: 'fx-comment-angle-04-02', minutesAfterTick: 34 },
    { uuid: 'fx-comment-angle-04-04', userId: uid(12), body: 'Actually 25° is PERFECT for pinch training. The angle creates optimal thumb opposition mechanics. You power guys wouldn\'t understand biomechanics.', parentCommentUuid: 'fx-comment-angle-04-01', minutesAfterTick: 56 },
    { uuid: 'fx-comment-angle-04-05', userId: uid(9), body: 'This whole thread reminds me of when I had to explain angles to my coach. I was like "actually I\'m good at ALL angles" and then proved it by sending every angle in one session', parentCommentUuid: null, minutesAfterTick: 95 },
    { uuid: 'fx-comment-angle-04-06', userId: uid(2), body: 'ngl 25° is nice bc i can hold my burger in one hand while climbing with the other', parentCommentUuid: 'fx-comment-angle-04-01', minutesAfterTick: 110 },
  ]},
  { theme: 'angle_gatekeeping', tickIndex: 4, comments: [
    { uuid: 'fx-comment-angle-05-01', userId: uid(1), body: 'I ONLY log sends at 40°. It\'s the scientifically optimal angle for grade accuracy. Anything else introduces confounding variables. This is basic methodology.', parentCommentUuid: null, minutesAfterTick: 20 },
    { uuid: 'fx-comment-angle-05-02', userId: uid(3), body: 'the only confounding variable is the roof over your head. outdoor temps, wind, actual fear = actual grades', parentCommentUuid: 'fx-comment-angle-05-01', minutesAfterTick: 35 },
    { uuid: 'fx-comment-angle-05-03', userId: uid(1), body: 'Alex I\'ve seen you rope up. Don\'t talk to me about fear variables.', parentCommentUuid: 'fx-comment-angle-05-02', minutesAfterTick: 41 },
    { uuid: 'fx-comment-angle-05-04', userId: uid(3), body: 'ropes are for photographers to get good angles. speaking of angles, anything under 90° is basically a sit-down job', parentCommentUuid: 'fx-comment-angle-05-03', minutesAfterTick: 47 },
    { uuid: 'fx-comment-angle-05-05', userId: uid(10), body: 'FINALLY someone with sense. 40° is the standard. I\'ve been saying this for YEARS. Check my blog post from 2019.', parentCommentUuid: 'fx-comment-angle-05-01', minutesAfterTick: 88 },
  ]},
  { theme: 'angle_gatekeeping', tickIndex: 5, comments: [
    { uuid: 'fx-comment-angle-06-01', userId: uid(11), body: 'honestly don\'t understand why short people complain about angle. just reach higher?? works at every angle for me 🤷', parentCommentUuid: null, minutesAfterTick: 10 },
    { uuid: 'fx-comment-angle-06-02', userId: uid(4), body: 'Jimmy I am going to set a problem with only 3mm edges at 55° and watch you suffer', parentCommentUuid: 'fx-comment-angle-06-01', minutesAfterTick: 15 },
    { uuid: 'fx-comment-angle-06-03', userId: uid(11), body: 'bet i could still skip holds', parentCommentUuid: 'fx-comment-angle-06-02', minutesAfterTick: 18 },
    { uuid: 'fx-comment-angle-06-04', userId: uid(12), body: 'Make them all pinches. Let\'s see wingspan help with thumb strength.', parentCommentUuid: 'fx-comment-angle-06-02', minutesAfterTick: 29 },
    { uuid: 'fx-comment-angle-06-05', userId: uid(5), body: 'make them dynos and angle doesn\'t even matter. checkmate tall people', parentCommentUuid: 'fx-comment-angle-06-01', minutesAfterTick: 52 },
    { uuid: 'fx-comment-angle-06-06', userId: uid(6), body: 'wait are we gatekeeping by height or angle now? flashed both versions btw', parentCommentUuid: null, minutesAfterTick: 105 },
  ]},
  { theme: 'angle_gatekeeping', tickIndex: 6, comments: [
    { uuid: 'fx-comment-angle-07-01', userId: uid(9), body: 'Okay so I\'m seeing a lot of angle discourse and I just want to share MY journey. I started at 15° (before it was cool), worked up to 60°, then realized *I* was the angle all along', parentCommentUuid: null, minutesAfterTick: 25 },
    { uuid: 'fx-comment-angle-07-02', userId: uid(7), body: 'Beautiful. You have become one with the wall. The angle is within.', parentCommentUuid: 'fx-comment-angle-07-01', minutesAfterTick: 40 },
    { uuid: 'fx-comment-angle-07-03', userId: uid(8), body: 'this is the dumbest thing i\'ve read today and i follow flat earthers', parentCommentUuid: 'fx-comment-angle-07-01', minutesAfterTick: 43 },
    { uuid: 'fx-comment-angle-07-04', userId: uid(2), body: 'i\'m one with the burger. the burger is one with me.', parentCommentUuid: 'fx-comment-angle-07-02', minutesAfterTick: 61 },
    { uuid: 'fx-comment-angle-07-05', userId: uid(1), body: 'This entire thread is a methodological nightmare. No one has cited a single angle measurement. Are we using inclinometers? Board specs? Vibes??', parentCommentUuid: null, minutesAfterTick: 95 },
    { uuid: 'fx-comment-angle-07-06', userId: uid(9), body: 'I use a protractor and my intuition, Adam. Which you wouldn\'t understand because you\'ve never trusted your gut like I have', parentCommentUuid: 'fx-comment-angle-07-05', minutesAfterTick: 102 },
  ]},
  { theme: 'angle_gatekeeping', tickIndex: 7, comments: [
    { uuid: 'fx-comment-angle-08-01', userId: uid(10), body: 'New leaderboard rule proposal: only angles divisible by 5 count. 37°? Doesn\'t count. 42°? Fake news. Clean data = clean rankings.', parentCommentUuid: null, minutesAfterTick: 18 },
    { uuid: 'fx-comment-angle-08-02', userId: uid(3), body: 'counterproposal: only el cap counts. everything else is just expensive air conditioning', parentCommentUuid: 'fx-comment-angle-08-01', minutesAfterTick: 30 },
    { uuid: 'fx-comment-angle-08-03', userId: uid(5), body: 'counter-counterproposal: only angles that allow sick dynos count. so like 45°+ minimum', parentCommentUuid: 'fx-comment-angle-08-01', minutesAfterTick: 44 },
    { uuid: 'fx-comment-angle-08-04', userId: uid(4), body: 'Absolutely not. 20° is the superior crimp angle. This is finger strength erasure.', parentCommentUuid: 'fx-comment-angle-08-03', minutesAfterTick: 51 },
    { uuid: 'fx-comment-angle-08-05', userId: uid(12), body: '30° for pinches or you\'re not training thumbs properly. This is basic anatomy Shauna.', parentCommentUuid: 'fx-comment-angle-08-01', minutesAfterTick: 67 },
    { uuid: 'fx-comment-angle-08-06', userId: uid(10), body: 'I hate all of you. I\'m making my own ranking system. With ONLY my preferred angles.', parentCommentUuid: 'fx-comment-angle-08-04', minutesAfterTick: 78 },
    { uuid: 'fx-comment-angle-08-07', userId: uid(6), body: 'just flashed all these angles in every combination. can i be on all the leaderboards?', parentCommentUuid: null, minutesAfterTick: 125 },
  ]},
  { theme: 'angle_gatekeeping', tickIndex: 8, comments: [
    { uuid: 'fx-comment-angle-09-01', userId: uid(7), body: 'The universe is 0° and 90° simultaneously. All angles between are illusions of the ego. Climb beyond angle.', parentCommentUuid: null, minutesAfterTick: 33 },
    { uuid: 'fx-comment-angle-09-02', userId: uid(1), body: 'Chris that\'s literally impossible. You can\'t climb a 0° wall, that\'s the floor. Did you even onsight physics class?', parentCommentUuid: 'fx-comment-angle-09-01', minutesAfterTick: 45 },
    { uuid: 'fx-comment-angle-09-03', userId: uid(7), body: 'The floor is just a wall that has achieved enlightenment, Adam.', parentCommentUuid: 'fx-comment-angle-09-02', minutesAfterTick: 52 },
    { uuid: 'fx-comment-angle-09-04', userId: uid(8), body: 'bro what are you smoking. just pick heavy angle. lift. send. done.', parentCommentUuid: 'fx-comment-angle-09-01', minutesAfterTick: 58 },
    { uuid: 'fx-comment-angle-09-05', userId: uid(2), body: 'the floor is where i drop my burger wrappers. checkmate philosophers', parentCommentUuid: 'fx-comment-angle-09-03', minutesAfterTick: 89 },
  ]},
  { theme: 'angle_gatekeeping', tickIndex: 9, comments: [
    { uuid: 'fx-comment-angle-10-01', userId: uid(12), body: 'Real talk: if there aren\'t at least 4 pinches on a problem, the angle is irrelevant. Thumb recruitment > gravity.', parentCommentUuid: null, minutesAfterTick: 22 },
    { uuid: 'fx-comment-angle-10-02', userId: uid(4), body: 'WRONG. Crimps are king. Pinches are just failed crimps. Any angle, all crimps, no excuses.', parentCommentUuid: 'fx-comment-angle-10-01', minutesAfterTick: 28 },
    { uuid: 'fx-comment-angle-10-03', userId: uid(12), body: 'Magnus your fingers are 80% scar tissue. Let me introduce you to the THUMB, the opposable one that makes us human??', parentCommentUuid: 'fx-comment-angle-10-02', minutesAfterTick: 35 },
    { uuid: 'fx-comment-angle-10-04', userId: uid(5), body: 'bold of both of you to assume i\'m touching holds long enough to debate grip types. DYNO GANG', parentCommentUuid: null, minutesAfterTick: 67 },
    { uuid: 'fx-comment-angle-10-05', userId: uid(11), body: 'wait you guys grip holds? i kinda just tap them on the way to the finish', parentCommentUuid: 'fx-comment-angle-10-02', minutesAfterTick: 71 },
    { uuid: 'fx-comment-angle-10-06', userId: uid(4), body: 'JIMMY I SWEAR TO—', parentCommentUuid: 'fx-comment-angle-10-05', minutesAfterTick: 73 },
    { uuid: 'fx-comment-angle-10-07', userId: uid(9), body: 'This reminds me of when I invented a new grip type. I called it the Brooke Grip™. It\'s proprietary but basically I\'m just better at every angle than everyone else here', parentCommentUuid: null, minutesAfterTick: 115 },
    { uuid: 'fx-comment-angle-10-08', userId: uid(6), body: 'oh is that the one where you just flash everything? been doing that for years lol', parentCommentUuid: 'fx-comment-angle-10-07', minutesAfterTick: 118 },
  ]},
];

// — Salty Attempt Commiseration (10) —
const SALTY_ATTEMPTS: RawConversation[] = [
  { theme: 'salty_attempt', tickIndex: 0, comments: [
    { uuid: 'fx-comment-salty-01-01', userId: uid(4), body: 'Session 47. FORTY. SEVEN. My fingers are filing a restraining order against this climb.', parentCommentUuid: null, minutesAfterTick: 30 },
    { uuid: 'fx-comment-salty-01-02', userId: uid(8), body: 'Bro just campus it', parentCommentUuid: 'fx-comment-salty-01-01', minutesAfterTick: 45 },
    { uuid: 'fx-comment-salty-01-03', userId: uid(4), body: 'Daniel I have TRIED campusing it. I have tried EVERYTHING. This climb has taken my dignity, my skin, and my will to live.', parentCommentUuid: 'fx-comment-salty-01-02', minutesAfterTick: 48 },
    { uuid: 'fx-comment-salty-01-04', userId: uid(6), body: 'oh weird i flashed this one last week 😅', parentCommentUuid: null, minutesAfterTick: 120 },
    { uuid: 'fx-comment-salty-01-05', userId: uid(4), body: 'Ashima I am going to change all your board problems to slopers', parentCommentUuid: 'fx-comment-salty-01-04', minutesAfterTick: 122 },
    { uuid: 'fx-comment-salty-01-06', userId: uid(9), body: 'This reminds me of MY first V15 where I also struggled for weeks', parentCommentUuid: 'fx-comment-salty-01-01', minutesAfterTick: 180 },
    { uuid: 'fx-comment-salty-01-07', userId: uid(4), body: 'Brooke this is V6', parentCommentUuid: 'fx-comment-salty-01-06', minutesAfterTick: 182 },
  ]},
  { theme: 'salty_attempt', tickIndex: 1, comments: [
    { uuid: 'fx-comment-salty-02-01', userId: uid(3), body: 'If I fell off this outdoors I would simply not use a rope and accept my fate', parentCommentUuid: null, minutesAfterTick: 15 },
    { uuid: 'fx-comment-salty-02-02', userId: uid(5), body: 'THE DYNO IS RIGHT THERE WHY IS NO ONE DYNOING', parentCommentUuid: null, minutesAfterTick: 60 },
    { uuid: 'fx-comment-salty-02-03', userId: uid(3), body: 'Tomoa I tried your dyno beta. I am now embedded in the wall.', parentCommentUuid: 'fx-comment-salty-02-02', minutesAfterTick: 90 },
    { uuid: 'fx-comment-salty-02-04', userId: uid(7), body: 'The climb does not break us. We break ourselves against the climb. Reflect on this.', parentCommentUuid: null, minutesAfterTick: 120 },
    { uuid: 'fx-comment-salty-02-05', userId: uid(3), body: 'Chris I have reflected. The reflection says this climb sucks.', parentCommentUuid: 'fx-comment-salty-02-04', minutesAfterTick: 125 },
    { uuid: 'fx-comment-salty-02-06', userId: uid(8), body: 'just get stronger lol', parentCommentUuid: 'fx-comment-salty-02-04', minutesAfterTick: 150 },
  ]},
  { theme: 'salty_attempt', tickIndex: 2, comments: [
    { uuid: 'fx-comment-salty-03-01', userId: uid(1), body: 'Update: This is NOT V4. Petition to regrade to V7. Who do I contact? Where are the grade police?', parentCommentUuid: null, minutesAfterTick: 5 },
    { uuid: 'fx-comment-salty-03-02', userId: uid(12), body: 'The pinch. THE PINCH. I have been training SPECIFICALLY for this pinch. It laughs at me.', parentCommentUuid: null, minutesAfterTick: 45 },
    { uuid: 'fx-comment-salty-03-03', userId: uid(11), body: 'skill issue tbh, maybe get longer arms?', parentCommentUuid: 'fx-comment-salty-03-02', minutesAfterTick: 50 },
    { uuid: 'fx-comment-salty-03-04', userId: uid(12), body: 'Jimmy I swear to god', parentCommentUuid: 'fx-comment-salty-03-03', minutesAfterTick: 52 },
    { uuid: 'fx-comment-salty-03-05', userId: uid(2), body: 'took me 3 tries, grabbed burger after. good times 🍔', parentCommentUuid: null, minutesAfterTick: 180 },
    { uuid: 'fx-comment-salty-03-06', userId: uid(1), body: 'Janja what is WRONG with you', parentCommentUuid: 'fx-comment-salty-03-05', minutesAfterTick: 182 },
    { uuid: 'fx-comment-salty-03-07', userId: uid(12), body: 'I am on session 23', parentCommentUuid: 'fx-comment-salty-03-05', minutesAfterTick: 185 },
    { uuid: 'fx-comment-salty-03-08', userId: uid(2), body: 'have u tried being better at climbing', parentCommentUuid: 'fx-comment-salty-03-07', minutesAfterTick: 190 },
  ]},
  { theme: 'salty_attempt', tickIndex: 3, comments: [
    { uuid: 'fx-comment-salty-04-01', userId: uid(10), body: 'This climb has single-handedly destroyed my ranking. I have fallen 47 spots. FORTY SEVEN.', parentCommentUuid: null, minutesAfterTick: 20 },
    { uuid: 'fx-comment-salty-04-02', userId: uid(4), body: 'Shauna I feel you. My crimp strength has peaked. Biology has peaked. I cannot get stronger. And yet.', parentCommentUuid: 'fx-comment-salty-04-01', minutesAfterTick: 35 },
    { uuid: 'fx-comment-salty-04-03', userId: uid(9), body: 'This is just like when I was training for nationals and—', parentCommentUuid: 'fx-comment-salty-04-01', minutesAfterTick: 60 },
    { uuid: 'fx-comment-salty-04-04', userId: uid(10), body: 'Brooke not now', parentCommentUuid: 'fx-comment-salty-04-03', minutesAfterTick: 62 },
    { uuid: 'fx-comment-salty-04-05', userId: uid(7), body: 'Pain is the teacher. Failure is the lesson. Rankings are illusion.', parentCommentUuid: 'fx-comment-salty-04-01', minutesAfterTick: 90 },
    { uuid: 'fx-comment-salty-04-06', userId: uid(10), body: 'Chris my illusion just dropped to #847', parentCommentUuid: 'fx-comment-salty-04-05', minutesAfterTick: 95 },
  ]},
  { theme: 'salty_attempt', tickIndex: 4, comments: [
    { uuid: 'fx-comment-salty-05-01', userId: uid(5), body: 'NOBODY IS DYNOING. ITS A DYNO PROBLEM. WHY ARE YOU ALL DOING STATIC BETA.', parentCommentUuid: null, minutesAfterTick: 10 },
    { uuid: 'fx-comment-salty-05-02', userId: uid(1), body: 'Tomoa some of us value CONTROLLED MOVEMENT and TECHNIQUE', parentCommentUuid: 'fx-comment-salty-05-01', minutesAfterTick: 15 },
    { uuid: 'fx-comment-salty-05-03', userId: uid(5), body: 'how many sessions are you on Adam', parentCommentUuid: 'fx-comment-salty-05-02', minutesAfterTick: 18 },
    { uuid: 'fx-comment-salty-05-04', userId: uid(1), body: '...12', parentCommentUuid: 'fx-comment-salty-05-03', minutesAfterTick: 25 },
    { uuid: 'fx-comment-salty-05-05', userId: uid(5), body: 'DYNO IT', parentCommentUuid: 'fx-comment-salty-05-04', minutesAfterTick: 26 },
    { uuid: 'fx-comment-salty-05-06', userId: uid(8), body: 'I dynoed it first try. technique is a myth', parentCommentUuid: 'fx-comment-salty-05-01', minutesAfterTick: 120 },
    { uuid: 'fx-comment-salty-05-07', userId: uid(1), body: 'I despise both of you', parentCommentUuid: 'fx-comment-salty-05-06', minutesAfterTick: 122 },
  ]},
  { theme: 'salty_attempt', tickIndex: 5, comments: [
    { uuid: 'fx-comment-salty-06-01', userId: uid(11), body: 'honestly this one is kinda reachy sorry short friends 😬', parentCommentUuid: null, minutesAfterTick: 30 },
    { uuid: 'fx-comment-salty-06-02', userId: uid(12), body: 'JIMMY I AM 5\'10" THAT IS NOT SHORT', parentCommentUuid: 'fx-comment-salty-06-01', minutesAfterTick: 35 },
    { uuid: 'fx-comment-salty-06-03', userId: uid(4), body: 'I am considering surgical arm lengthening', parentCommentUuid: 'fx-comment-salty-06-01', minutesAfterTick: 60 },
    { uuid: 'fx-comment-salty-06-04', userId: uid(6), body: 'lol i just did a couple extra moves, still flashed tho 💁‍♀️', parentCommentUuid: 'fx-comment-salty-06-01', minutesAfterTick: 90 },
    { uuid: 'fx-comment-salty-06-05', userId: uid(12), body: 'Ashima you are 5\'2" how is this POSSIBLE', parentCommentUuid: 'fx-comment-salty-06-04', minutesAfterTick: 95 },
    { uuid: 'fx-comment-salty-06-06', userId: uid(6), body: 'just be better at climbing i guess 🤷‍♀️', parentCommentUuid: 'fx-comment-salty-06-05', minutesAfterTick: 100 },
    { uuid: 'fx-comment-salty-06-07', userId: uid(4), body: 'I am going to file a formal complaint', parentCommentUuid: 'fx-comment-salty-06-06', minutesAfterTick: 105 },
  ]},
  { theme: 'salty_attempt', tickIndex: 6, comments: [
    { uuid: 'fx-comment-salty-07-01', userId: uid(3), body: 'This climb has given me a new appreciation for ground-level activities. Like lying down. And crying.', parentCommentUuid: null, minutesAfterTick: 45 },
    { uuid: 'fx-comment-salty-07-02', userId: uid(7), body: 'The ground is where we all return. Embrace the fall. Become one with the mat.', parentCommentUuid: 'fx-comment-salty-07-01', minutesAfterTick: 60 },
    { uuid: 'fx-comment-salty-07-03', userId: uid(3), body: 'Chris I have become VERY one with the mat. We are best friends now.', parentCommentUuid: 'fx-comment-salty-07-02', minutesAfterTick: 65 },
    { uuid: 'fx-comment-salty-07-04', userId: uid(9), body: 'This is giving me flashbacks to MY hardest project where I also—', parentCommentUuid: null, minutesAfterTick: 90 },
    { uuid: 'fx-comment-salty-07-05', userId: uid(3), body: 'Brooke I will literally free solo this board if you finish that sentence', parentCommentUuid: 'fx-comment-salty-07-04', minutesAfterTick: 92 },
    { uuid: 'fx-comment-salty-07-06', userId: uid(2), body: 'got it second go, moves were spicy 🌶️ burger time', parentCommentUuid: null, minutesAfterTick: 180 },
    { uuid: 'fx-comment-salty-07-07', userId: uid(3), body: 'Janja please teach me your ways. Or just end my suffering. Either works.', parentCommentUuid: 'fx-comment-salty-07-06', minutesAfterTick: 185 },
  ]},
  { theme: 'salty_attempt', tickIndex: 7, comments: [
    { uuid: 'fx-comment-salty-08-01', userId: uid(1), body: 'OFFICIAL PROTEST: This is V8 MINIMUM. I am an onsight specialist. I do not FAIL. And yet here we are, session 15.', parentCommentUuid: null, minutesAfterTick: 20 },
    { uuid: 'fx-comment-salty-08-02', userId: uid(10), body: 'Adam I respect your pain. I too am suffering. We are brothers in failure.', parentCommentUuid: 'fx-comment-salty-08-01', minutesAfterTick: 40 },
    { uuid: 'fx-comment-salty-08-03', userId: uid(4), body: 'The crimps on this problem are a JOKE. I have the finger strength of a literal god. STILL cannot send.', parentCommentUuid: 'fx-comment-salty-08-01', minutesAfterTick: 55 },
    { uuid: 'fx-comment-salty-08-04', userId: uid(8), body: 'have u guys tried just being strong', parentCommentUuid: 'fx-comment-salty-08-01', minutesAfterTick: 90 },
    { uuid: 'fx-comment-salty-08-05', userId: uid(1), body: 'Daniel I am going to set a V12 that is entirely crimps and foot precision', parentCommentUuid: 'fx-comment-salty-08-04', minutesAfterTick: 93 },
    { uuid: 'fx-comment-salty-08-06', userId: uid(4), body: 'I will help', parentCommentUuid: 'fx-comment-salty-08-05', minutesAfterTick: 95 },
    { uuid: 'fx-comment-salty-08-07', userId: uid(10), body: 'Make it ranked', parentCommentUuid: 'fx-comment-salty-08-05', minutesAfterTick: 96 },
  ]},
  { theme: 'salty_attempt', tickIndex: 8, comments: [
    { uuid: 'fx-comment-salty-09-01', userId: uid(12), body: 'The pinch is impossible. I have done nothing but pinch training for 6 months. The pinch does not care.', parentCommentUuid: null, minutesAfterTick: 15 },
    { uuid: 'fx-comment-salty-09-02', userId: uid(5), body: 'SKIP THE PINCH AND DYNO', parentCommentUuid: 'fx-comment-salty-09-01', minutesAfterTick: 30 },
    { uuid: 'fx-comment-salty-09-03', userId: uid(12), body: 'Tomoa I cannot dyno. I am a pinch specialist. If I cannot pinch it I do not want it.', parentCommentUuid: 'fx-comment-salty-09-02', minutesAfterTick: 35 },
    { uuid: 'fx-comment-salty-09-04', userId: uid(11), body: 'the pinch is pretty good if you just skip it entirely and reach through lol', parentCommentUuid: 'fx-comment-salty-09-01', minutesAfterTick: 90 },
    { uuid: 'fx-comment-salty-09-05', userId: uid(12), body: 'JIMMY YOUR ARMS ARE ILLEGAL', parentCommentUuid: 'fx-comment-salty-09-04', minutesAfterTick: 92 },
    { uuid: 'fx-comment-salty-09-06', userId: uid(6), body: 'idk the pinch felt fine? like maybe train pinches more?? 😅', parentCommentUuid: 'fx-comment-salty-09-01', minutesAfterTick: 120 },
    { uuid: 'fx-comment-salty-09-07', userId: uid(12), body: 'Ashima I literally ONLY train pinches', parentCommentUuid: 'fx-comment-salty-09-06', minutesAfterTick: 122 },
    { uuid: 'fx-comment-salty-09-08', userId: uid(6), body: 'oh. well. skill issue i guess 💅', parentCommentUuid: 'fx-comment-salty-09-07', minutesAfterTick: 125 },
  ]},
  { theme: 'salty_attempt', tickIndex: 9, comments: [
    { uuid: 'fx-comment-salty-10-01', userId: uid(9), body: 'This climb is humbling. Like that time I was on MY hardest proj—actually nvm this is worse. This is WORSE than my V15 proj.', parentCommentUuid: null, minutesAfterTick: 25 },
    { uuid: 'fx-comment-salty-10-02', userId: uid(10), body: 'Brooke are you okay??? You admitted something was hard???', parentCommentUuid: 'fx-comment-salty-10-01', minutesAfterTick: 30 },
    { uuid: 'fx-comment-salty-10-03', userId: uid(7), body: 'When the ego shatters, the true climber emerges. You are becoming enlightened.', parentCommentUuid: 'fx-comment-salty-10-01', minutesAfterTick: 45 },
    { uuid: 'fx-comment-salty-10-04', userId: uid(9), body: 'Chris I am not enlightened I am BROKEN. Session 31. THIRTY ONE.', parentCommentUuid: 'fx-comment-salty-10-03', minutesAfterTick: 50 },
    { uuid: 'fx-comment-salty-10-05', userId: uid(3), body: 'Brooke welcome to the suffering. We have mats and tears.', parentCommentUuid: 'fx-comment-salty-10-01', minutesAfterTick: 90 },
    { uuid: 'fx-comment-salty-10-06', userId: uid(2), body: 'lol took me like 4 tries, fun problem tho 🍔', parentCommentUuid: null, minutesAfterTick: 180 },
    { uuid: 'fx-comment-salty-10-07', userId: uid(9), body: 'Janja I respect you but also I hate you', parentCommentUuid: 'fx-comment-salty-10-06', minutesAfterTick: 185 },
  ]},
];

// — Campus vs Footwork Philosophy Debates (10) —
const CAMPUS_FOOTWORK: RawConversation[] = [
  { theme: 'campus_vs_footwork', tickIndex: 0, comments: [
    { uuid: 'fx-comment-campus-01-01', userId: uid(8), body: 'Feet? Never heard of them. Just campus the whole thing like a REAL climber.', parentCommentUuid: null, minutesAfterTick: 15 },
    { uuid: 'fx-comment-campus-01-02', userId: uid(7), body: 'The feet are the roots of the tree. Without roots, the tree falls. Your shoulders will understand this truth in 5 years.', parentCommentUuid: 'fx-comment-campus-01-01', minutesAfterTick: 45 },
    { uuid: 'fx-comment-campus-01-03', userId: uid(8), body: 'My shoulders are FINE Chris. I can do one arm pull-ups. Can your "roots" do that?', parentCommentUuid: 'fx-comment-campus-01-02', minutesAfterTick: 50 },
    { uuid: 'fx-comment-campus-01-04', userId: uid(2), body: 'I literally just stood on the footholds and it was chill? Why are you guys yelling', parentCommentUuid: 'fx-comment-campus-01-01', minutesAfterTick: 120 },
    { uuid: 'fx-comment-campus-01-05', userId: uid(8), body: 'Because you make EVERYTHING look chill Janja that\'s not the POINT', parentCommentUuid: 'fx-comment-campus-01-04', minutesAfterTick: 125 },
  ]},
  { theme: 'campus_vs_footwork', tickIndex: 1, comments: [
    { uuid: 'fx-comment-campus-02-01', userId: uid(1), body: 'Onsighted with PERFECT footwork. Every foot placement intentional, weighted correctly, toes pointed. This is what technique looks like.', parentCommentUuid: null, minutesAfterTick: 5 },
    { uuid: 'fx-comment-campus-02-02', userId: uid(5), body: 'Bro I didn\'t even touch half the footholds. Just dyno from start to finish. Way more fun.', parentCommentUuid: 'fx-comment-campus-02-01', minutesAfterTick: 30 },
    { uuid: 'fx-comment-campus-02-03', userId: uid(1), body: 'That\'s not climbing Tomato, that\'s just... jumping. With extra steps.', parentCommentUuid: 'fx-comment-campus-02-02', minutesAfterTick: 35 },
    { uuid: 'fx-comment-campus-02-04', userId: uid(5), body: 'Jumping IS climbing. Climbing is just vertical jumping. Change my mind.', parentCommentUuid: 'fx-comment-campus-02-03', minutesAfterTick: 40 },
    { uuid: 'fx-comment-campus-02-05', userId: uid(7), body: 'A grasshopper jumps. A spider climbs. Be the spider, not the grasshopper.', parentCommentUuid: 'fx-comment-campus-02-04', minutesAfterTick: 90 },
    { uuid: 'fx-comment-campus-02-06', userId: uid(5), body: 'Spiders have 8 legs Chris they don\'t even NEED to dyno this is irrelevant', parentCommentUuid: 'fx-comment-campus-02-05', minutesAfterTick: 95 },
  ]},
  { theme: 'campus_vs_footwork', tickIndex: 2, comments: [
    { uuid: 'fx-comment-campus-03-01', userId: uid(11), body: 'Honestly didn\'t even realize there were footholds until move 7. Just reached everything.', parentCommentUuid: null, minutesAfterTick: 20 },
    { uuid: 'fx-comment-campus-03-02', userId: uid(4), body: 'This is why wingspan is CHEATING. Those of us with NORMAL human proportions have to actually use technique.', parentCommentUuid: 'fx-comment-campus-03-01', minutesAfterTick: 45 },
    { uuid: 'fx-comment-campus-03-03', userId: uid(11), body: 'Magnus you literally train finger strength 6 hours a day and lecture people about technique???', parentCommentUuid: 'fx-comment-campus-03-02', minutesAfterTick: 50 },
    { uuid: 'fx-comment-campus-03-04', userId: uid(4), body: 'Finger strength IS technique. Crimps are the purest form of climbing. This is science.', parentCommentUuid: 'fx-comment-campus-03-03', minutesAfterTick: 55 },
    { uuid: 'fx-comment-campus-03-05', userId: uid(6), body: 'I just matched feet on the start hold and it went? Why is this hard', parentCommentUuid: 'fx-comment-campus-03-01', minutesAfterTick: 180 },
  ]},
  { theme: 'campus_vs_footwork', tickIndex: 3, comments: [
    { uuid: 'fx-comment-campus-04-01', userId: uid(9), body: 'This reminded me of my PROJECT in Red Rocks where footwork was CRUCIAL. I spent 3 months perfecting every foot placement. Obviously sent.', parentCommentUuid: null, minutesAfterTick: 10 },
    { uuid: 'fx-comment-campus-04-02', userId: uid(8), body: 'Cool story. I campused the crux because I have actual upper body strength.', parentCommentUuid: 'fx-comment-campus-04-01', minutesAfterTick: 25 },
    { uuid: 'fx-comment-campus-04-03', userId: uid(9), body: 'Upper body strength is just compensating for poor technique Daniel. When I was training in Spain—', parentCommentUuid: 'fx-comment-campus-04-02', minutesAfterTick: 30 },
    { uuid: 'fx-comment-campus-04-04', userId: uid(8), body: 'Nobody asked about Spain. CAMPUS. POWER. SEND.', parentCommentUuid: 'fx-comment-campus-04-03', minutesAfterTick: 32 },
    { uuid: 'fx-comment-campus-04-05', userId: uid(3), body: 'If you guys saw the footwork I do on El Cap without ropes you\'d understand that feet are optional when you have COMMITMENT', parentCommentUuid: 'fx-comment-campus-04-01', minutesAfterTick: 120 },
    { uuid: 'fx-comment-campus-04-06', userId: uid(7), body: 'Alex this is a Kilter board. In a gym. With mats.', parentCommentUuid: 'fx-comment-campus-04-05', minutesAfterTick: 125 },
    { uuid: 'fx-comment-campus-04-07', userId: uid(3), body: 'The mind does not distinguish between gym and granite. Fear is fear. Footholds are footholds.', parentCommentUuid: 'fx-comment-campus-04-06', minutesAfterTick: 130 },
  ]},
  { theme: 'campus_vs_footwork', tickIndex: 4, comments: [
    { uuid: 'fx-comment-campus-05-01', userId: uid(10), body: 'Efficient footwork = faster times = better rankings. You power climbers are just SLOW. Check the leaderboard.', parentCommentUuid: null, minutesAfterTick: 8 },
    { uuid: 'fx-comment-campus-05-02', userId: uid(8), body: 'Leaderboards are for people who care about participation trophies. I care about CRUSHING.', parentCommentUuid: 'fx-comment-campus-05-01', minutesAfterTick: 25 },
    { uuid: 'fx-comment-campus-05-03', userId: uid(10), body: 'You\'re literally ranked 47th on this climb Daniel. I\'m 2nd. Crushing with TECHNIQUE.', parentCommentUuid: 'fx-comment-campus-05-02', minutesAfterTick: 30 },
    { uuid: 'fx-comment-campus-05-04', userId: uid(8), body: 'I could be ranked 1st if I cared. I just choose not to optimize. It\'s called PRINCIPLES.', parentCommentUuid: 'fx-comment-campus-05-03', minutesAfterTick: 35 },
    { uuid: 'fx-comment-campus-05-05', userId: uid(2), body: 'oh I\'m ranked 1st? didn\'t notice lol', parentCommentUuid: 'fx-comment-campus-05-03', minutesAfterTick: 90 },
    { uuid: 'fx-comment-campus-05-06', userId: uid(10), body: 'OF COURSE YOU ARE JANJA', parentCommentUuid: 'fx-comment-campus-05-05', minutesAfterTick: 92 },
  ]},
  { theme: 'campus_vs_footwork', tickIndex: 5, comments: [
    { uuid: 'fx-comment-campus-06-01', userId: uid(12), body: 'The pinch at move 4 is CRUCIAL. Lock it down with thumb strength and you don\'t need feet. Pure compression power.', parentCommentUuid: null, minutesAfterTick: 12 },
    { uuid: 'fx-comment-campus-06-02', userId: uid(7), body: 'The pinch is a trap for the aggressive mind. Stand on the left foot, shift your weight, and the pinch becomes a gentle guide.', parentCommentUuid: 'fx-comment-campus-06-01', minutesAfterTick: 40 },
    { uuid: 'fx-comment-campus-06-03', userId: uid(12), body: 'Chris I literally watched you fall off this climb 4 times muttering about "inner peace" before you sent. My way works.', parentCommentUuid: 'fx-comment-campus-06-02', minutesAfterTick: 45 },
    { uuid: 'fx-comment-campus-06-04', userId: uid(7), body: 'The falls were necessary for growth. You sent once. I sent with wisdom.', parentCommentUuid: 'fx-comment-campus-06-03', minutesAfterTick: 50 },
    { uuid: 'fx-comment-campus-06-05', userId: uid(4), body: 'Can we all agree that pinch strength comes from finger strength which comes from CRIMP TRAINING', parentCommentUuid: 'fx-comment-campus-06-01', minutesAfterTick: 90 },
    { uuid: 'fx-comment-campus-06-06', userId: uid(12), body: 'Magnus no. Thumb opposition is completely different. Read a biomechanics book.', parentCommentUuid: 'fx-comment-campus-06-05', minutesAfterTick: 95 },
    { uuid: 'fx-comment-campus-06-07', userId: uid(4), body: 'I have a DEGREE in finger strength. Don\'t lecture me about hands.', parentCommentUuid: 'fx-comment-campus-06-06', minutesAfterTick: 100 },
  ]},
  { theme: 'campus_vs_footwork', tickIndex: 6, comments: [
    { uuid: 'fx-comment-campus-07-01', userId: uid(1), body: 'The beta is OBVIOUS if you use proper footwork. Left toe, right heel hook, match hands, precise hip rotation. Onsighted because I understand MOVEMENT.', parentCommentUuid: null, minutesAfterTick: 5 },
    { uuid: 'fx-comment-campus-07-02', userId: uid(5), body: 'Or... hear me out... you could just dyno from the first jug to the finish and skip literally all of that', parentCommentUuid: 'fx-comment-campus-07-01', minutesAfterTick: 20 },
    { uuid: 'fx-comment-campus-07-03', userId: uid(1), body: 'That is not CLIMBING Tomato. That is aggressive flailing with a success rate.', parentCommentUuid: 'fx-comment-campus-07-02', minutesAfterTick: 25 },
    { uuid: 'fx-comment-campus-07-04', userId: uid(5), body: 'My success rate is 100% because I COMMIT to the dyno. Footwork is just fear disguised as technique.', parentCommentUuid: 'fx-comment-campus-07-03', minutesAfterTick: 30 },
    { uuid: 'fx-comment-campus-07-05', userId: uid(6), body: 'I did it both ways they\'re both pretty easy? Just send however feels good', parentCommentUuid: 'fx-comment-campus-07-01', minutesAfterTick: 120 },
    { uuid: 'fx-comment-campus-07-06', userId: uid(1), body: 'Ashima you can\'t just "both ways" a philosophical debate about climbing methodology', parentCommentUuid: 'fx-comment-campus-07-05', minutesAfterTick: 125 },
    { uuid: 'fx-comment-campus-07-07', userId: uid(6), body: 'why not', parentCommentUuid: 'fx-comment-campus-07-06', minutesAfterTick: 127 },
  ]},
  { theme: 'campus_vs_footwork', tickIndex: 7, comments: [
    { uuid: 'fx-comment-campus-08-01', userId: uid(8), body: 'Hot take: if you can\'t campus the entire climb, you\'re not strong enough to be giving beta on it.', parentCommentUuid: null, minutesAfterTick: 18 },
    { uuid: 'fx-comment-campus-08-02', userId: uid(7), body: 'The strongest climber is not the one who ignores the holds, but the one who uses all of them with purpose.', parentCommentUuid: 'fx-comment-campus-08-01', minutesAfterTick: 35 },
    { uuid: 'fx-comment-campus-08-03', userId: uid(8), body: 'Purpose is just an excuse for weakness. I have POWER. I don\'t need purpose.', parentCommentUuid: 'fx-comment-campus-08-02', minutesAfterTick: 40 },
    { uuid: 'fx-comment-campus-08-04', userId: uid(9), body: 'This debate reminds me of when I was projecting in Magic Wood and had to choose between power and technique and I chose BOTH—', parentCommentUuid: 'fx-comment-campus-08-01', minutesAfterTick: 60 },
    { uuid: 'fx-comment-campus-08-05', userId: uid(10), body: 'Brooke literally nobody asked. Also you\'re ranked 23rd on this climb so maybe focus on that.', parentCommentUuid: 'fx-comment-campus-08-04', minutesAfterTick: 65 },
    { uuid: 'fx-comment-campus-08-06', userId: uid(9), body: 'Rankings are ARBITRARY Shauna. Real climbing happens outside. On REAL ROCK.', parentCommentUuid: 'fx-comment-campus-08-05', minutesAfterTick: 70 },
    { uuid: 'fx-comment-campus-08-07', userId: uid(10), body: 'Then why are you here', parentCommentUuid: 'fx-comment-campus-08-06', minutesAfterTick: 72 },
    { uuid: 'fx-comment-campus-08-08', userId: uid(9), body: '...training. Obviously.', parentCommentUuid: 'fx-comment-campus-08-07', minutesAfterTick: 75 },
  ]},
  { theme: 'campus_vs_footwork', tickIndex: 8, comments: [
    { uuid: 'fx-comment-campus-09-01', userId: uid(4), body: 'The real technique here is CRIMP ENDURANCE. I held the crimps so precisely my feet became irrelevant. This is advanced footwork: not needing it.', parentCommentUuid: null, minutesAfterTick: 22 },
    { uuid: 'fx-comment-campus-09-02', userId: uid(11), body: 'Magnus that\'s just called having short legs and long arms. It\'s not a technique it\'s genetics.', parentCommentUuid: 'fx-comment-campus-09-01', minutesAfterTick: 45 },
    { uuid: 'fx-comment-campus-09-03', userId: uid(4), body: 'EXCUSE ME my ape index is perfectly normal I just TRAIN HARDER than people who rely on wingspan', parentCommentUuid: 'fx-comment-campus-09-02', minutesAfterTick: 50 },
    { uuid: 'fx-comment-campus-09-04', userId: uid(3), body: 'Footwork doesn\'t matter when you\'re 2000ft off the ground. Just saying. Perspective.', parentCommentUuid: 'fx-comment-campus-09-01', minutesAfterTick: 90 },
    { uuid: 'fx-comment-campus-09-05', userId: uid(1), body: 'Alex footwork matters MORE at height because errors are fatal. This is basic risk assessment.', parentCommentUuid: 'fx-comment-campus-09-04', minutesAfterTick: 95 },
    { uuid: 'fx-comment-campus-09-06', userId: uid(3), body: 'Can\'t make errors if you don\'t acknowledge the possibility of falling *taps forehead*', parentCommentUuid: 'fx-comment-campus-09-05', minutesAfterTick: 100 },
  ]},
  { theme: 'campus_vs_footwork', tickIndex: 9, comments: [
    { uuid: 'fx-comment-campus-10-01', userId: uid(2), body: 'Used feet the whole time, super chill. Why is everyone always screaming about technique vs power just like... climb?', parentCommentUuid: null, minutesAfterTick: 10 },
    { uuid: 'fx-comment-campus-10-02', userId: uid(8), body: 'Because some of us aren\'t genetic freaks Janja. We have to CHOOSE our approach. POWER or technique. I chose POWER.', parentCommentUuid: 'fx-comment-campus-10-01', minutesAfterTick: 30 },
    { uuid: 'fx-comment-campus-10-03', userId: uid(1), body: 'And I chose TECHNIQUE which is why I onsighted this and you took 6 tries Daniel.', parentCommentUuid: 'fx-comment-campus-10-02', minutesAfterTick: 35 },
    { uuid: 'fx-comment-campus-10-04', userId: uid(8), body: 'I was CAMPUSING IT Adam. You used feet like a BEGINNER.', parentCommentUuid: 'fx-comment-campus-10-03', minutesAfterTick: 40 },
    { uuid: 'fx-comment-campus-10-05', userId: uid(7), body: 'Two climbers argue about the path while a third climber reaches the summit. Be the third climber.', parentCommentUuid: 'fx-comment-campus-10-01', minutesAfterTick: 60 },
    { uuid: 'fx-comment-campus-10-06', userId: uid(2), body: 'thanks Chris yeah I already sent it like 10 minutes ago', parentCommentUuid: 'fx-comment-campus-10-05', minutesAfterTick: 65 },
    { uuid: 'fx-comment-campus-10-07', userId: uid(5), body: 'You\'re all wrong the only correct way is FULL SEND DYNO MODE but go off I guess', parentCommentUuid: 'fx-comment-campus-10-01', minutesAfterTick: 120 },
  ]},
];

// — The Climber Who Always Has An Excuse (10) —
const EXCUSE_MAKERS: RawConversation[] = [
  { theme: 'excuse_maker', tickIndex: 0, comments: [
    { uuid: 'fx-comment-excuse-01-01', userId: uid(3), body: 'Fell at the top. The crash pad was 2cm too far left which created a psychological safety barrier affecting my commitment to the final move.', parentCommentUuid: null, minutesAfterTick: 15 },
    { uuid: 'fx-comment-excuse-01-02', userId: uid(2), body: 'wait you use crash pads on the kilter board?? 🤔', parentCommentUuid: 'fx-comment-excuse-01-01', minutesAfterTick: 22 },
    { uuid: 'fx-comment-excuse-01-03', userId: uid(3), body: 'Only for psychological prep. The PERCEIVED danger has to be calibrated correctly or my nervous system won\'t engage properly.', parentCommentUuid: 'fx-comment-excuse-01-02', minutesAfterTick: 28 },
    { uuid: 'fx-comment-excuse-01-04', userId: uid(8), body: 'bro it\'s a 40 degree overhang you\'d literally land on your feet', parentCommentUuid: 'fx-comment-excuse-01-03', minutesAfterTick: 35 },
    { uuid: 'fx-comment-excuse-01-05', userId: uid(3), body: 'That\'s exactly the problem. Too safe. My amygdala wasn\'t firing. Need that edge.', parentCommentUuid: 'fx-comment-excuse-01-04', minutesAfterTick: 41 },
  ]},
  { theme: 'excuse_maker', tickIndex: 1, comments: [
    { uuid: 'fx-comment-excuse-02-01', userId: uid(9), body: 'Finally sent but this took me 47 tries. My boyfriend was watching for 3 of them which added like 15% anxiety weight to every move.', parentCommentUuid: null, minutesAfterTick: 45 },
    { uuid: 'fx-comment-excuse-02-02', userId: uid(10), body: 'tracked. anxiety weight is real, I perform 23% worse when anyone in the top 500 is in the same gym', parentCommentUuid: 'fx-comment-excuse-02-01', minutesAfterTick: 52 },
    { uuid: 'fx-comment-excuse-02-03', userId: uid(6), body: 'lol I flash harder when people watch', parentCommentUuid: 'fx-comment-excuse-02-01', minutesAfterTick: 58 },
    { uuid: 'fx-comment-excuse-02-04', userId: uid(9), body: 'Well not all of us are built different Ashima. Some of us have to deal with the crippling weight of expectations and also my left contact lens was inside out.', parentCommentUuid: 'fx-comment-excuse-02-03', minutesAfterTick: 63 },
    { uuid: 'fx-comment-excuse-02-05', userId: uid(1), body: 'inside out contact lens is easily worth -0.5 grade adjustment IMO', parentCommentUuid: 'fx-comment-excuse-02-04', minutesAfterTick: 70 },
    { uuid: 'fx-comment-excuse-02-06', userId: uid(2), body: 'you guys wear contacts while climbing??', parentCommentUuid: 'fx-comment-excuse-02-05', minutesAfterTick: 75 },
  ]},
  { theme: 'excuse_maker', tickIndex: 2, comments: [
    { uuid: 'fx-comment-excuse-03-01', userId: uid(4), body: 'My A2 pulley is WHISPERING to me. Not screaming. Whispering. Which is somehow worse? Sent it anyway but I could only half crimp at 87% power instead of my usual 94%.', parentCommentUuid: null, minutesAfterTick: 20 },
    { uuid: 'fx-comment-excuse-03-02', userId: uid(7), body: 'The whisper is your body\'s wisdom. Listen to the silence between the whispers. That is where true strength resides.', parentCommentUuid: 'fx-comment-excuse-03-01', minutesAfterTick: 28 },
    { uuid: 'fx-comment-excuse-03-03', userId: uid(4), body: 'Chris I literally just need to know if I should ice it', parentCommentUuid: 'fx-comment-excuse-03-02', minutesAfterTick: 32 },
    { uuid: 'fx-comment-excuse-03-04', userId: uid(8), body: 'ice is for cocktails. just send harder.', parentCommentUuid: 'fx-comment-excuse-03-03', minutesAfterTick: 38 },
    { uuid: 'fx-comment-excuse-03-05', userId: uid(12), body: 'this is why I only pinch. pulleys are a weakness the body invented to hold you back', parentCommentUuid: 'fx-comment-excuse-03-01', minutesAfterTick: 45 },
    { uuid: 'fx-comment-excuse-03-06', userId: uid(4), body: 'Alex have you considered that maybe pulleys are GOOD and you\'re just built like a crab', parentCommentUuid: 'fx-comment-excuse-03-05', minutesAfterTick: 51 },
  ]},
  { theme: 'excuse_maker', tickIndex: 3, comments: [
    { uuid: 'fx-comment-excuse-04-01', userId: uid(1), body: 'Onsighted but there was a SIGNIFICANT atmospheric pressure differential from yesterday (1.3 kPa drop) which affected my proprioception. Still counts but asterisk this one.', parentCommentUuid: null, minutesAfterTick: 10 },
    { uuid: 'fx-comment-excuse-04-02', userId: uid(10), body: 'do you log barometric pressure in your training journal?? asking for a friend (me, I\'m the friend)', parentCommentUuid: 'fx-comment-excuse-04-01', minutesAfterTick: 18 },
    { uuid: 'fx-comment-excuse-04-03', userId: uid(1), body: 'Obviously? How else would you normalize your performance data across sessions? I have a weather station mounted to my crash pad.', parentCommentUuid: 'fx-comment-excuse-04-02', minutesAfterTick: 24 },
    { uuid: 'fx-comment-excuse-04-04', userId: uid(5), body: 'imagine caring about air when you could just JUMP to the finish', parentCommentUuid: 'fx-comment-excuse-04-01', minutesAfterTick: 30 },
    { uuid: 'fx-comment-excuse-04-05', userId: uid(1), body: 'Tomoa if you dyno an onsight does it even count? That\'s like guessing on a test.', parentCommentUuid: 'fx-comment-excuse-04-04', minutesAfterTick: 36 },
    { uuid: 'fx-comment-excuse-04-06', userId: uid(5), body: 'GUESSING CORRECTLY IS STILL CORRECT', parentCommentUuid: 'fx-comment-excuse-04-05', minutesAfterTick: 40 },
    { uuid: 'fx-comment-excuse-04-07', userId: uid(2), body: 'you both need to relax lol', parentCommentUuid: 'fx-comment-excuse-04-06', minutesAfterTick: 45 },
  ]},
  { theme: 'excuse_maker', tickIndex: 4, comments: [
    { uuid: 'fx-comment-excuse-05-01', userId: uid(11), body: 'This beta is broken for normal humans. I basically walked up it. -3 wingspan ape index penalty applied, adjusted grade V6.', parentCommentUuid: null, minutesAfterTick: 25 },
    { uuid: 'fx-comment-excuse-05-02', userId: uid(6), body: 'I\'m 5\'2" and flashed it so idk', parentCommentUuid: 'fx-comment-excuse-05-01', minutesAfterTick: 33 },
    { uuid: 'fx-comment-excuse-05-03', userId: uid(11), body: 'Ashima you have supernatural powers, you don\'t count. I\'m talking about people with NORMAL human proportions (6\'1", +7 ape index)', parentCommentUuid: 'fx-comment-excuse-05-02', minutesAfterTick: 40 },
    { uuid: 'fx-comment-excuse-05-04', userId: uid(8), body: '+7 ape index is literally gibbon territory my guy', parentCommentUuid: 'fx-comment-excuse-05-03', minutesAfterTick: 47 },
    { uuid: 'fx-comment-excuse-05-05', userId: uid(11), body: 'It\'s a CURSE Daniel. Doorframes fear me. Shirts don\'t fit. I have to special order climbing pants.', parentCommentUuid: 'fx-comment-excuse-05-04', minutesAfterTick: 55 },
    { uuid: 'fx-comment-excuse-05-06', userId: uid(9), body: 'wow Jimmy way to make this about you (this is literally exactly how I feel about my -2 ape index but go off)', parentCommentUuid: 'fx-comment-excuse-05-05', minutesAfterTick: 62 },
  ]},
  { theme: 'excuse_maker', tickIndex: 5, comments: [
    { uuid: 'fx-comment-excuse-06-01', userId: uid(10), body: 'Someone left chalk on the start hold. SOMEONE. LEFT. CHALK. My skin bonded to it like velcro which threw off my entire pull tension calibration.', parentCommentUuid: null, minutesAfterTick: 12 },
    { uuid: 'fx-comment-excuse-06-02', userId: uid(12), body: 'you... you\'re complaining about TOO MUCH friction??', parentCommentUuid: 'fx-comment-excuse-06-01', minutesAfterTick: 19 },
    { uuid: 'fx-comment-excuse-06-03', userId: uid(10), body: 'YES ALEX. Optimal friction is a RANGE not a binary. This was 15% over ideal which completely invalidates my percentile ranking for this angle.', parentCommentUuid: 'fx-comment-excuse-06-02', minutesAfterTick: 26 },
    { uuid: 'fx-comment-excuse-06-04', userId: uid(4), body: 'This is actually valid. I brush my holds to exactly 73% chalk coverage for consistency.', parentCommentUuid: 'fx-comment-excuse-06-03', minutesAfterTick: 33 },
    { uuid: 'fx-comment-excuse-06-05', userId: uid(2), body: 'how do you measure 73% chalk coverage', parentCommentUuid: 'fx-comment-excuse-06-04', minutesAfterTick: 38 },
    { uuid: 'fx-comment-excuse-06-06', userId: uid(4), body: 'spectrophotometer', parentCommentUuid: 'fx-comment-excuse-06-05', minutesAfterTick: 42 },
    { uuid: 'fx-comment-excuse-06-07', userId: uid(7), body: 'The chalk is a metaphor. We are all chalk. Dust to dust. Friction to friction.', parentCommentUuid: 'fx-comment-excuse-06-06', minutesAfterTick: 50 },
    { uuid: 'fx-comment-excuse-06-08', userId: uid(8), body: 'or just climb harder and stop being weird', parentCommentUuid: 'fx-comment-excuse-06-07', minutesAfterTick: 54 },
  ]},
  { theme: 'excuse_maker', tickIndex: 6, comments: [
    { uuid: 'fx-comment-excuse-07-01', userId: uid(9), body: 'Fell on the last move because I could see my reflection in the mirror and I looked TOO GOOD and it distracted me. This is my burden.', parentCommentUuid: null, minutesAfterTick: 8 },
    { uuid: 'fx-comment-excuse-07-02', userId: uid(5), body: 'incredible. I respect this excuse.', parentCommentUuid: 'fx-comment-excuse-07-01', minutesAfterTick: 15 },
    { uuid: 'fx-comment-excuse-07-03', userId: uid(6), body: 'Brooke this is the most Brooke thing you\'ve ever said', parentCommentUuid: 'fx-comment-excuse-07-01', minutesAfterTick: 21 },
    { uuid: 'fx-comment-excuse-07-04', userId: uid(9), body: 'I\'m being VULNERABLE here Ashima. Self-objectification in athletic spaces is a real issue that affects me specifically.', parentCommentUuid: 'fx-comment-excuse-07-03', minutesAfterTick: 28 },
    { uuid: 'fx-comment-excuse-07-05', userId: uid(3), body: 'I only climb facing away from mirrors. Eye contact with yourself implies fear of falling which creates hesitation.', parentCommentUuid: 'fx-comment-excuse-07-01', minutesAfterTick: 35 },
    { uuid: 'fx-comment-excuse-07-06', userId: uid(9), body: 'ok but what if you look really hot tho', parentCommentUuid: 'fx-comment-excuse-07-05', minutesAfterTick: 40 },
  ]},
  { theme: 'excuse_maker', tickIndex: 7, comments: [
    { uuid: 'fx-comment-excuse-08-01', userId: uid(8), body: 'My pre-workout powder was 3 days expired. Noticed a 6% power reduction in my posterior chain. Still crushed it obviously but worth noting.', parentCommentUuid: null, minutesAfterTick: 18 },
    { uuid: 'fx-comment-excuse-08-02', userId: uid(1), body: 'expiration dates are suggestions not laws BUT I do log supplement degradation rates in my nutrition spreadsheet', parentCommentUuid: 'fx-comment-excuse-08-01', minutesAfterTick: 25 },
    { uuid: 'fx-comment-excuse-08-03', userId: uid(10), body: 'SAME. I track caffeine half-life decay and adjust my dosing schedule every 72 hours based on my REM cycle data.', parentCommentUuid: 'fx-comment-excuse-08-02', minutesAfterTick: 32 },
    { uuid: 'fx-comment-excuse-08-04', userId: uid(2), body: 'I just drink coffee and climb', parentCommentUuid: 'fx-comment-excuse-08-03', minutesAfterTick: 38 },
    { uuid: 'fx-comment-excuse-08-05', userId: uid(8), body: 'Janja that\'s because you\'re genetically optimized. Some of us have to ENGINEER our performance like SCIENTISTS.', parentCommentUuid: 'fx-comment-excuse-08-04', minutesAfterTick: 45 },
    { uuid: 'fx-comment-excuse-08-06', userId: uid(7), body: 'The best performance is no performance. Be water. Water does not take pre-workout.', parentCommentUuid: 'fx-comment-excuse-08-05', minutesAfterTick: 52 },
    { uuid: 'fx-comment-excuse-08-07', userId: uid(8), body: 'Chris I swear to god', parentCommentUuid: 'fx-comment-excuse-08-06', minutesAfterTick: 56 },
  ]},
  { theme: 'excuse_maker', tickIndex: 8, comments: [
    { uuid: 'fx-comment-excuse-09-01', userId: uid(12), body: 'The pinch on move 4 had a 0.3mm edge inside it that turned it into a disgusting crimp-pinch hybrid. My technique is TOO PURE for this kind of chaos.', parentCommentUuid: null, minutesAfterTick: 22 },
    { uuid: 'fx-comment-excuse-09-02', userId: uid(4), body: 'you sent it ONE HANDED because you refused to crimp??', parentCommentUuid: 'fx-comment-excuse-09-01', minutesAfterTick: 29 },
    { uuid: 'fx-comment-excuse-09-03', userId: uid(12), body: 'Correct. Crimping is for people with weak thumbs. I will not compromise my principles.', parentCommentUuid: 'fx-comment-excuse-09-02', minutesAfterTick: 35 },
    { uuid: 'fx-comment-excuse-09-04', userId: uid(11), body: 'this is the most absurd thing I\'ve ever read and I once read Adam\'s 47-page essay on why onsighting is the only ethical way to climb', parentCommentUuid: 'fx-comment-excuse-09-03', minutesAfterTick: 43 },
    { uuid: 'fx-comment-excuse-09-05', userId: uid(1), body: 'IT WAS 32 PAGES and it was PEER REVIEWED (I peer reviewed it myself)', parentCommentUuid: 'fx-comment-excuse-09-04', minutesAfterTick: 50 },
    { uuid: 'fx-comment-excuse-09-06', userId: uid(6), body: 'you guys are exhausting', parentCommentUuid: 'fx-comment-excuse-09-05', minutesAfterTick: 55 },
  ]},
  { theme: 'excuse_maker', tickIndex: 9, comments: [
    { uuid: 'fx-comment-excuse-10-01', userId: uid(7), body: 'The energy in the gym today was chaotic-neutral leaning dark. Had to cleanse my chakras mid-route. Still sent but my spirit was TIRED.', parentCommentUuid: null, minutesAfterTick: 5 },
    { uuid: 'fx-comment-excuse-10-02', userId: uid(3), body: 'Actually Chris I felt it too. There was a birthday party in the bouldering area and their collective anxiety was palpable.', parentCommentUuid: 'fx-comment-excuse-10-01', minutesAfterTick: 12 },
    { uuid: 'fx-comment-excuse-10-03', userId: uid(9), body: 'WAIT YES the birthday party!! They were watching ME and I could feel their judgment because one of them said "is she sponsored"', parentCommentUuid: 'fx-comment-excuse-10-02', minutesAfterTick: 20 },
    { uuid: 'fx-comment-excuse-10-04', userId: uid(5), body: 'I just dynoed past all the bad vibes', parentCommentUuid: 'fx-comment-excuse-10-03', minutesAfterTick: 26 },
    { uuid: 'fx-comment-excuse-10-05', userId: uid(10), body: 'I log "environmental chaos index" on a 1-10 scale and adjust my expected performance accordingly. Birthday parties are automatic 7/10 chaos minimum.', parentCommentUuid: 'fx-comment-excuse-10-01', minutesAfterTick: 33 },
    { uuid: 'fx-comment-excuse-10-06', userId: uid(2), body: 'there was a birthday party??? I didn\'t even notice lol', parentCommentUuid: 'fx-comment-excuse-10-05', minutesAfterTick: 38 },
    { uuid: 'fx-comment-excuse-10-07', userId: uid(8), body: 'Janja\'s superpower is literally not caring about anything except climbing and burgers', parentCommentUuid: 'fx-comment-excuse-10-06', minutesAfterTick: 44 },
    { uuid: 'fx-comment-excuse-10-08', userId: uid(2), body: 'this is true 🍔', parentCommentUuid: 'fx-comment-excuse-10-07', minutesAfterTick: 48 },
  ]},
];

// — Training Plan Arguments (10) —
const TRAINING_PLANS: RawConversation[] = [
  { theme: 'training_plan', tickIndex: 0, comments: [
    { uuid: 'fx-comment-train-01-01', userId: uid(10), body: 'Nice send! According to my periodization spreadsheet, you should be in your deload week though. This kind of max effort during recovery phase will compromise your neuromuscular adaptation window.', parentCommentUuid: null, minutesAfterTick: 10 },
    { uuid: 'fx-comment-train-01-02', userId: uid(8), body: 'Shauna I just climbed because it looked fun. Not everything needs a spreadsheet.', parentCommentUuid: 'fx-comment-train-01-01', minutesAfterTick: 15 },
    { uuid: 'fx-comment-train-01-03', userId: uid(10), body: 'Fun is not a training stimulus, Daniel. Fun is what happens when your periodization aligns with your psychoemotional readiness profile.', parentCommentUuid: 'fx-comment-train-01-02', minutesAfterTick: 18 },
    { uuid: 'fx-comment-train-01-04', userId: uid(2), body: 'i train by climbing things that look fun and eating burgers after. currently ranked #1 in the world btw', parentCommentUuid: 'fx-comment-train-01-03', minutesAfterTick: 30 },
    { uuid: 'fx-comment-train-01-05', userId: uid(10), body: 'Janja your success despite your methodology is frankly offensive to sports science', parentCommentUuid: 'fx-comment-train-01-04', minutesAfterTick: 33 },
    { uuid: 'fx-comment-train-01-06', userId: uid(7), body: 'The best training plan is the one written by the mountain itself. Listen to the rock. 🙏', parentCommentUuid: 'fx-comment-train-01-01', minutesAfterTick: 60 },
    { uuid: 'fx-comment-train-01-07', userId: uid(8), body: 'Chris the Kilter Board is literally a plywood wall in a gym', parentCommentUuid: 'fx-comment-train-01-06', minutesAfterTick: 62 },
  ]},
  { theme: 'training_plan', tickIndex: 1, comments: [
    { uuid: 'fx-comment-train-02-01', userId: uid(1), body: 'I created a 47-page training document for this exact climb. Phase 1: finger prep (3 weeks). Phase 2: movement patterning (2 weeks). Phase 3: linking (1 week). Phase 4: SEND.', parentCommentUuid: null, minutesAfterTick: 5 },
    { uuid: 'fx-comment-train-02-02', userId: uid(5), body: 'I saw this climb, dynoed to the top, sent it. Total time invested: 45 seconds. No document needed.', parentCommentUuid: 'fx-comment-train-02-01', minutesAfterTick: 8 },
    { uuid: 'fx-comment-train-02-03', userId: uid(1), body: 'Tomato your "strategy" of throwing yourself at holds like a human cannonball is not a methodology. It\'s chaos.', parentCommentUuid: 'fx-comment-train-02-02', minutesAfterTick: 12 },
    { uuid: 'fx-comment-train-02-04', userId: uid(5), body: 'CHAOS IS MY METHODOLOGY. Phase 1: jump. Phase 2: grab. Phase 3: victory. 47 pages CONDENSED.', parentCommentUuid: 'fx-comment-train-02-03', minutesAfterTick: 14 },
    { uuid: 'fx-comment-train-02-05', userId: uid(4), body: 'I just want to point out that my 12-week finger strength protocol produced a measurable 14% increase in max hang. That\'s science. Show me Tomato\'s data.', parentCommentUuid: 'fx-comment-train-02-01', minutesAfterTick: 45 },
    { uuid: 'fx-comment-train-02-06', userId: uid(5), body: 'My data is: did I send? Yes. Case closed. Court adjourned. Gavel sound.', parentCommentUuid: 'fx-comment-train-02-05', minutesAfterTick: 47 },
  ]},
  { theme: 'training_plan', tickIndex: 2, comments: [
    { uuid: 'fx-comment-train-03-01', userId: uid(10), body: 'Congrats on the send! I notice you\'re climbing 4 days a week though. The latest research from the Journal of Sports Physiology says 3 days maximizes strength gains while 4 increases injury risk by 23%.', parentCommentUuid: null, minutesAfterTick: 20 },
    { uuid: 'fx-comment-train-03-02', userId: uid(3), body: 'I climb every day. Sometimes twice. I free soloed El Cap on a rest day. Injury risk is a mindset issue.', parentCommentUuid: 'fx-comment-train-03-01', minutesAfterTick: 25 },
    { uuid: 'fx-comment-train-03-03', userId: uid(10), body: 'Alex your existence is a statistical anomaly that I refuse to incorporate into my models.', parentCommentUuid: 'fx-comment-train-03-02', minutesAfterTick: 28 },
    { uuid: 'fx-comment-train-03-04', userId: uid(9), body: 'My coach says I should climb 5 days a week but I climb 6 because I\'m more dedicated than most athletes. I actually WANT it more.', parentCommentUuid: 'fx-comment-train-03-01', minutesAfterTick: 40 },
    { uuid: 'fx-comment-train-03-05', userId: uid(6), body: 'Brooke your coach also told you to stop posting about your "elite level tension" and you ignored that too', parentCommentUuid: 'fx-comment-train-03-04', minutesAfterTick: 42 },
    { uuid: 'fx-comment-train-03-06', userId: uid(9), body: 'ASHIMA that was a PRIVATE conversation how do you know about that', parentCommentUuid: 'fx-comment-train-03-05', minutesAfterTick: 43 },
    { uuid: 'fx-comment-train-03-07', userId: uid(6), body: 'you posted it on your story with the caption "my coach just doesn\'t understand my grindset"', parentCommentUuid: 'fx-comment-train-03-06', minutesAfterTick: 44 },
  ]},
  { theme: 'training_plan', tickIndex: 3, comments: [
    { uuid: 'fx-comment-train-04-01', userId: uid(4), body: 'I\'ve been using the Lattice Training protocol modified with Anderson\'s repeater methodology and supplemented by a custom hangboard routine. My max hang went from 40kg to 46kg in 8 weeks.', parentCommentUuid: null, minutesAfterTick: 30 },
    { uuid: 'fx-comment-train-04-02', userId: uid(8), body: 'Magnus how many hours a day do you spend TALKING about training vs actually climbing?', parentCommentUuid: 'fx-comment-train-04-01', minutesAfterTick: 35 },
    { uuid: 'fx-comment-train-04-03', userId: uid(4), body: 'The research phase IS part of training, Daniel. You wouldn\'t build a house without blueprints.', parentCommentUuid: 'fx-comment-train-04-02', minutesAfterTick: 37 },
    { uuid: 'fx-comment-train-04-04', userId: uid(8), body: 'I literally built my home wall by just nailing holds to plywood in my garage. No blueprints. It\'s fine. Mostly.', parentCommentUuid: 'fx-comment-train-04-03', minutesAfterTick: 40 },
    { uuid: 'fx-comment-train-04-05', userId: uid(11), body: 'Daniel didn\'t your home wall collapse last month?', parentCommentUuid: 'fx-comment-train-04-04', minutesAfterTick: 42 },
    { uuid: 'fx-comment-train-04-06', userId: uid(8), body: '...it was a controlled deconstruction for Phase 2 of the build', parentCommentUuid: 'fx-comment-train-04-05', minutesAfterTick: 44 },
    { uuid: 'fx-comment-train-04-07', userId: uid(4), body: 'See? This is exactly why you need blueprints.', parentCommentUuid: 'fx-comment-train-04-06', minutesAfterTick: 45 },
  ]},
  { theme: 'training_plan', tickIndex: 4, comments: [
    { uuid: 'fx-comment-train-05-01', userId: uid(10), body: 'Has anyone tried the new AI-generated training plans? I fed my climbing data into ChatGPT and it created a 16-week hypertrophy-to-power periodization that looks incredibly optimized.', parentCommentUuid: null, minutesAfterTick: 10 },
    { uuid: 'fx-comment-train-05-02', userId: uid(7), body: 'I asked the AI for climbing advice and it told me to "listen to my body." Finally, technology catches up to ancient wisdom. 🙏', parentCommentUuid: 'fx-comment-train-05-01', minutesAfterTick: 15 },
    { uuid: 'fx-comment-train-05-03', userId: uid(1), body: 'I built my own machine learning model trained on 4,000 logged sessions. It says I should take a rest day. I am ignoring it because I know better.', parentCommentUuid: 'fx-comment-train-05-01', minutesAfterTick: 25 },
    { uuid: 'fx-comment-train-05-04', userId: uid(12), body: 'AI told me to "avoid crimps for 2 weeks" so I crimped harder out of spite. Sent my project. AI doesn\'t know what it\'s talking about.', parentCommentUuid: 'fx-comment-train-05-01', minutesAfterTick: 40 },
    { uuid: 'fx-comment-train-05-05', userId: uid(10), body: 'Alex you can\'t just spite-train. That\'s not a physiological adaptation pathway.', parentCommentUuid: 'fx-comment-train-05-04', minutesAfterTick: 42 },
    { uuid: 'fx-comment-train-05-06', userId: uid(12), body: 'Spite is the most powerful adaptation pathway. It\'s right there in the literature. I just haven\'t found the study yet but I WILL.', parentCommentUuid: 'fx-comment-train-05-05', minutesAfterTick: 44 },
  ]},
  { theme: 'training_plan', tickIndex: 5, comments: [
    { uuid: 'fx-comment-train-06-01', userId: uid(9), body: 'Just hired my third coach this year! Each one has given me a completely different plan. Current one says I need MORE volume. Previous one said LESS volume. The one before that said I need to "stop overthinking it."', parentCommentUuid: null, minutesAfterTick: 15 },
    { uuid: 'fx-comment-train-06-02', userId: uid(6), body: 'Have you considered that coach #3 just told you what you wanted to hear so you\'d stop firing coaches?', parentCommentUuid: 'fx-comment-train-06-01', minutesAfterTick: 20 },
    { uuid: 'fx-comment-train-06-03', userId: uid(9), body: 'Actually coach #3 said I\'m one of the most coachable athletes she\'s ever worked with and that my dedication is "unprecedented"', parentCommentUuid: 'fx-comment-train-06-02', minutesAfterTick: 22 },
    { uuid: 'fx-comment-train-06-04', userId: uid(11), body: 'Brooke your coach also told me you demanded a clause in your coaching contract that says she has to respond to your texts within 15 minutes', parentCommentUuid: 'fx-comment-train-06-03', minutesAfterTick: 30 },
    { uuid: 'fx-comment-train-06-05', userId: uid(9), body: 'COMMUNICATION IS KEY IN A COACH-ATHLETE RELATIONSHIP JIMMY', parentCommentUuid: 'fx-comment-train-06-04', minutesAfterTick: 31 },
    { uuid: 'fx-comment-train-06-06', userId: uid(2), body: 'i don\'t have a coach. i have a burger. the burger tells me when to climb. the burger is wise.', parentCommentUuid: 'fx-comment-train-06-01', minutesAfterTick: 90 },
  ]},
  { theme: 'training_plan', tickIndex: 6, comments: [
    { uuid: 'fx-comment-train-07-01', userId: uid(4), body: 'Hot take: if you\'re not tracking your sessions with at least 5 metrics (RPE, volume, density, intensity, time under tension), you\'re not training, you\'re just playing.', parentCommentUuid: null, minutesAfterTick: 10 },
    { uuid: 'fx-comment-train-07-02', userId: uid(8), body: 'I track exactly one metric: did I have fun? If yes, good session. If no, bad session. Current streak: 847 good sessions.', parentCommentUuid: 'fx-comment-train-07-01', minutesAfterTick: 14 },
    { uuid: 'fx-comment-train-07-03', userId: uid(4), body: 'Daniel, your approach would be laughed out of any serious sports science lab.', parentCommentUuid: 'fx-comment-train-07-02', minutesAfterTick: 16 },
    { uuid: 'fx-comment-train-07-04', userId: uid(8), body: 'Bold of you to assume I\'d ever be in a sports science lab. I train in the woods like our ancestors intended.', parentCommentUuid: 'fx-comment-train-07-03', minutesAfterTick: 18 },
    { uuid: 'fx-comment-train-07-05', userId: uid(10), body: 'I track 14 metrics per session actually. Magnus is underperforming on data collection. I also track ambient temperature, humidity, sleep quality, HRV, and grip fatigue curve.', parentCommentUuid: 'fx-comment-train-07-01', minutesAfterTick: 30 },
    { uuid: 'fx-comment-train-07-06', userId: uid(4), body: 'Shauna... 14 is excessive even for me. When do you actually climb?', parentCommentUuid: 'fx-comment-train-07-05', minutesAfterTick: 32 },
    { uuid: 'fx-comment-train-07-07', userId: uid(10), body: 'Climbing is just the data collection phase, Magnus. The real training happens in the spreadsheet.', parentCommentUuid: 'fx-comment-train-07-06', minutesAfterTick: 34 },
  ]},
  { theme: 'training_plan', tickIndex: 7, comments: [
    { uuid: 'fx-comment-train-08-01', userId: uid(1), body: 'I\'ve been doing the "4x4x4" protocol: 4 hard boulders, 4 sets each, 4 minutes rest. After 6 weeks my power endurance is through the roof. Highly recommend for anyone plateauing.', parentCommentUuid: null, minutesAfterTick: 20 },
    { uuid: 'fx-comment-train-08-02', userId: uid(3), body: 'My protocol is: climb until arms stop working. Rest until arms work again. Repeat. Been doing it for 15 years. Still alive.', parentCommentUuid: 'fx-comment-train-08-01', minutesAfterTick: 25 },
    { uuid: 'fx-comment-train-08-03', userId: uid(1), body: 'Alex that\'s not a protocol that\'s just... climbing.', parentCommentUuid: 'fx-comment-train-08-02', minutesAfterTick: 28 },
    { uuid: 'fx-comment-train-08-04', userId: uid(3), body: 'Exactly. And I\'m one of the best climbers alive. Coincidence? Probably not.', parentCommentUuid: 'fx-comment-train-08-03', minutesAfterTick: 30 },
    { uuid: 'fx-comment-train-08-05', userId: uid(10), body: 'Adam, your 4x4x4 needs a deload after week 4. Without programmed recovery you\'ll hit overreaching by week 7. I have a spreadsheet that models the fatigue accumulation if you want it.', parentCommentUuid: 'fx-comment-train-08-01', minutesAfterTick: 45 },
    { uuid: 'fx-comment-train-08-06', userId: uid(1), body: 'Shauna I AM the spreadsheet', parentCommentUuid: 'fx-comment-train-08-05', minutesAfterTick: 47 },
  ]},
  { theme: 'training_plan', tickIndex: 8, comments: [
    { uuid: 'fx-comment-train-09-01', userId: uid(12), body: 'Unpopular opinion: all training plans are cope. Just climb harder. If you can\'t climb V12 it\'s because you\'re not trying hard enough on V12. There\'s no secret protocol.', parentCommentUuid: null, minutesAfterTick: 5 },
    { uuid: 'fx-comment-train-09-02', userId: uid(4), body: 'This is objectively wrong. Structured training produces measurably better outcomes than random climbing. There are literally hundreds of studies.', parentCommentUuid: 'fx-comment-train-09-01', minutesAfterTick: 10 },
    { uuid: 'fx-comment-train-09-03', userId: uid(12), body: 'Studies on who? Lab climbers doing max hangs? Show me a study on someone who just tried really hard on real rock for 10 years. That\'s MY study. N=1. Results: crushing.', parentCommentUuid: 'fx-comment-train-09-02', minutesAfterTick: 13 },
    { uuid: 'fx-comment-train-09-04', userId: uid(5), body: 'Alex is right. I\'ve never followed a training plan. My plan is: see hold, grab hold, top out. Repeat until famous.', parentCommentUuid: 'fx-comment-train-09-01', minutesAfterTick: 25 },
    { uuid: 'fx-comment-train-09-05', userId: uid(10), body: 'You\'re both operating on survivorship bias. For every Alex who thrives on chaos there are thousands who plateau because they don\'t periodize.', parentCommentUuid: 'fx-comment-train-09-04', minutesAfterTick: 30 },
    { uuid: 'fx-comment-train-09-06', userId: uid(12), body: 'Bold of you to call my climbing "chaos" when I\'ve sent more V15s than your spreadsheet has rows', parentCommentUuid: 'fx-comment-train-09-05', minutesAfterTick: 32 },
    { uuid: 'fx-comment-train-09-07', userId: uid(10), body: 'My spreadsheet has 47,000 rows so that is factually incorrect', parentCommentUuid: 'fx-comment-train-09-06', minutesAfterTick: 34 },
  ]},
  { theme: 'training_plan', tickIndex: 9, comments: [
    { uuid: 'fx-comment-train-10-01', userId: uid(10), body: 'Final hot take of the day: if your training plan fits on one page, it\'s not a training plan. Mine is currently 23 pages with appendices for nutrition, sleep optimization, and skin care protocols.', parentCommentUuid: null, minutesAfterTick: 10 },
    { uuid: 'fx-comment-train-10-02', userId: uid(11), body: 'Shauna I just want to climb plastic in my underwear. Please leave me alone.', parentCommentUuid: 'fx-comment-train-10-01', minutesAfterTick: 15 },
    { uuid: 'fx-comment-train-10-03', userId: uid(7), body: 'The greatest training plan is no plan. Like water, the climber flows around obstacles. Like the wind, the climber—', parentCommentUuid: 'fx-comment-train-10-01', minutesAfterTick: 20 },
    { uuid: 'fx-comment-train-10-04', userId: uid(11), body: 'Chris please not now', parentCommentUuid: 'fx-comment-train-10-03', minutesAfterTick: 21 },
    { uuid: 'fx-comment-train-10-05', userId: uid(2), body: 'my training plan: 1. climb 2. burger 3. repeat. it is one line and i will not be taking questions', parentCommentUuid: 'fx-comment-train-10-01', minutesAfterTick: 45 },
    { uuid: 'fx-comment-train-10-06', userId: uid(10), body: 'Janja your caloric intake timing relative to your training stimulus is actually perfectly aligned with the anabolic window research. The burger IS the plan.', parentCommentUuid: 'fx-comment-train-10-05', minutesAfterTick: 48 },
    { uuid: 'fx-comment-train-10-07', userId: uid(2), body: 'i have no idea what you just said but thank you the burger appreciates the validation', parentCommentUuid: 'fx-comment-train-10-06', minutesAfterTick: 50 },
    { uuid: 'fx-comment-train-10-08', userId: uid(8), body: 'This whole thread is why I climb alone in the woods. You\'re all insane. Lovingly, but insane.', parentCommentUuid: 'fx-comment-train-10-01', minutesAfterTick: 120 },
  ]},
];

// =============================================================================
// Combined Conversations
// =============================================================================

function buildConversations(raws: RawConversation[][]): FixtureConversation[] {
  const themeShorts: Record<string, string> = {};
  for (const cfg of THEME_CONFIGS) themeShorts[cfg.theme] = cfg.short;

  return raws.flat().map(raw => ({
    tickUuid: `fx-tick-${themeShorts[raw.theme]}-${String(raw.tickIndex + 1).padStart(2, '0')}`,
    theme: raw.theme,
    comments: raw.comments,
  }));
}

export const FIXTURE_CONVERSATIONS: FixtureConversation[] = buildConversations([
  GRADE_DEBATES,
  BETA_SPRAYS,
  FLASH_INCREDULITY,
  ANGLE_GATEKEEPING,
  SALTY_ATTEMPTS,
  CAMPUS_FOOTWORK,
  EXCUSE_MAKERS,
  TRAINING_PLANS,
]);

// =============================================================================
// Fixture Votes (~30)
// =============================================================================

export const FIXTURE_VOTES: FixtureVote[] = [
  // Grade debate upvotes
  { userId: uid(2), commentUuid: 'fx-comment-grade-01-06', value: 1 },
  { userId: uid(5), commentUuid: 'fx-comment-grade-01-07', value: 1 },
  { userId: uid(8), commentUuid: 'fx-comment-grade-01-07', value: 1 },
  { userId: uid(11), commentUuid: 'fx-comment-grade-02-05', value: 1 },
  { userId: uid(6), commentUuid: 'fx-comment-grade-04-05', value: 1 },
  { userId: uid(9), commentUuid: 'fx-comment-grade-06-04', value: 1 },
  // Beta spray votes
  { userId: uid(1), commentUuid: 'fx-comment-beta-01-06', value: -1 },
  { userId: uid(8), commentUuid: 'fx-comment-beta-03-03', value: 1 },
  { userId: uid(2), commentUuid: 'fx-comment-beta-05-06', value: 1 },
  { userId: uid(7), commentUuid: 'fx-comment-beta-10-08', value: 1 },
  // Flash incredulity votes
  { userId: uid(4), commentUuid: 'fx-comment-flash-01-03', value: 1 },
  { userId: uid(10), commentUuid: 'fx-comment-flash-02-07', value: -1 },
  { userId: uid(1), commentUuid: 'fx-comment-flash-06-05', value: -1 },
  { userId: uid(7), commentUuid: 'fx-comment-flash-08-06', value: 1 },
  // Angle gatekeeping votes
  { userId: uid(5), commentUuid: 'fx-comment-angle-01-05', value: 1 },
  { userId: uid(3), commentUuid: 'fx-comment-angle-09-03', value: 1 },
  { userId: uid(8), commentUuid: 'fx-comment-angle-09-05', value: 1 },
  // Salty attempt votes
  { userId: uid(6), commentUuid: 'fx-comment-salty-01-05', value: -1 },
  { userId: uid(11), commentUuid: 'fx-comment-salty-03-08', value: 1 },
  { userId: uid(1), commentUuid: 'fx-comment-salty-05-07', value: 1 },
  // Campus vs footwork votes
  { userId: uid(5), commentUuid: 'fx-comment-campus-01-01', value: 1 },
  { userId: uid(4), commentUuid: 'fx-comment-campus-01-01', value: -1 },
  { userId: uid(2), commentUuid: 'fx-comment-campus-10-05', value: 1 },
  // Excuse maker votes
  { userId: uid(8), commentUuid: 'fx-comment-excuse-01-05', value: -1 },
  { userId: uid(2), commentUuid: 'fx-comment-excuse-07-01', value: 1 },
  { userId: uid(6), commentUuid: 'fx-comment-excuse-09-06', value: 1 },
  // Training plan votes
  { userId: uid(8), commentUuid: 'fx-comment-train-01-03', value: 1 },
  { userId: uid(2), commentUuid: 'fx-comment-train-05-08', value: 1 },
  { userId: uid(4), commentUuid: 'fx-comment-train-10-08', value: 1 },
  { userId: uid(7), commentUuid: 'fx-comment-train-03-07', value: 1 },
];

// =============================================================================
// Convenience Helpers
// =============================================================================

/** Find a fixture user by name substring (case-insensitive) */
export function findFixtureUser(nameFragment: string): FixtureUser {
  const lower = nameFragment.toLowerCase();
  const user = FIXTURE_USERS.find(u =>
    u.name.toLowerCase().includes(lower) || u.displayName.toLowerCase().includes(lower),
  );
  if (!user) throw new Error(`No fixture user matching "${nameFragment}"`);
  return user;
}

/** Get all conversations for a specific theme */
export function getConversationsByTheme(theme: string): FixtureConversation[] {
  return FIXTURE_CONVERSATIONS.filter(c => c.theme === theme);
}

/** Get the fixture tick for a conversation by theme + index (0-based) */
export function getConversationTick(theme: string, index: number): FixtureTick {
  const conv = FIXTURE_CONVERSATIONS.find(c => c.theme === theme && c.comments[0]?.uuid.includes(`-${String(index + 1).padStart(2, '0')}-`));
  if (!conv) throw new Error(`No fixture conversation for theme="${theme}" index=${index}`);
  const tick = FIXTURE_TICKS.find(t => t.uuid === conv.tickUuid);
  if (!tick) throw new Error(`No fixture tick for uuid="${conv.tickUuid}"`);
  return tick;
}

/** Compute a tick's createdAt date from its globalIndex */
export function tickCreatedAt(tick: FixtureTick): Date {
  return new Date(FIXTURE_BASE_TIMESTAMP - tick.globalIndex * 9 * 3600000);
}

/** Compute a comment's createdAt date */
export function commentCreatedAt(tick: FixtureTick, comment: FixtureComment): Date {
  return new Date(FIXTURE_BASE_TIMESTAMP - tick.globalIndex * 9 * 3600000 + comment.minutesAfterTick * 60000);
}
