/**
 * Expected parsing results for all test fixtures.
 * Used by both Sharp and Canvas test suites.
 */

import type { GridCoordinate } from '../../types';

export interface ExpectedClimbResult {
  /** Fixture filename */
  fixture: string;
  /** Expected climb name (null = skip OCR validation for this field) */
  name: string | null;
  /** Expected setter name (null = skip) */
  setter: string | null;
  /** Expected angle */
  angle: number;
  /** Expected user grade (null = skip) */
  userGrade: string | null;
  /** Expected setter grade (null = skip) */
  setterGrade: string | null;
  /** Whether this is a benchmark climb */
  isBenchmark: boolean;
  /** Expected start holds */
  startHolds: GridCoordinate[];
  /** Expected hand holds */
  handHolds: GridCoordinate[];
  /** Expected finish holds */
  finishHolds: GridCoordinate[];
}

export const EXPECTED_RESULTS: ExpectedClimbResult[] = [
  {
    fixture: 'BIRTHDAY_CAKE_TRAIL_MIX.PNG',
    name: 'BIRTHDAY CAKE TRAIL MIX',
    setter: 'Dana Rader',
    angle: 40,
    userGrade: null,
    setterGrade: null,
    isBenchmark: false,
    startHolds: ['D5', 'H5'],
    handHolds: ['A16', 'C12', 'D14', 'E9', 'G12'],
    finishHolds: ['C18'],
  },
  {
    fixture: 'BLUE_MOON.PNG',
    name: 'BLUE MOON',
    setter: 'KoalaClimbing',
    angle: 40,
    userGrade: '6C/V5',
    setterGrade: '6B+/V4',
    isBenchmark: false,
    startHolds: ['E4', 'H5'],
    handHolds: ['E9', 'F15', 'G12', 'I10'],
    finishHolds: ['C18'],
  },
  {
    fixture: 'BORKED.PNG',
    name: 'BORKED',
    setter: 'kianc',
    angle: 40,
    userGrade: '7A/V6',
    setterGrade: '7A+/V7',
    isBenchmark: false,
    startHolds: ['G4', 'H5'],
    handHolds: ['A12', 'D10', 'D16', 'E14', 'E9'],
    finishHolds: ['F18'],
  },
  {
    fixture: 'ENCHANTED.PNG',
    name: 'ENCHANTED',
    setter: 'flo wientjes',
    angle: 40,
    userGrade: '8A/V11',
    setterGrade: '8A/V11',
    isBenchmark: false,
    startHolds: ['D6', 'I2'],
    handHolds: ['A7', 'D11', 'G16', 'J7'],
    finishHolds: ['A18'],
  },
  {
    fixture: 'EVERYTHING_IS_6B+.PNG',
    name: 'EVERYTHING IS 6B+',
    setter: 'dani',
    angle: 40,
    userGrade: '6B+/V4',
    setterGrade: null,
    isBenchmark: false,
    startHolds: ['H4', 'K3'],
    handHolds: ['D16', 'F13', 'G8', 'I14', 'J11', 'K7'],
    finishHolds: ['F18'],
  },
  {
    fixture: 'FUNNY_THING.PNG',
    name: 'FUNNY THING',
    setter: 'Nick Wedge',
    angle: 40,
    userGrade: null,
    setterGrade: null,
    isBenchmark: false,
    startHolds: ['B4', 'B6'],
    handHolds: ['E9', 'F6', 'G12', 'G15', 'I14', 'K11'],
    finishHolds: ['I18'],
  },
  {
    fixture: 'HOLY_WATER.PNG',
    name: 'HOLY WATER',
    setter: 'Adrian Landreth',
    angle: 40,
    userGrade: '6B+/V4',
    setterGrade: null,
    isBenchmark: false,
    startHolds: ['D5'],
    handHolds: ['E9', 'F15', 'G12', 'G7', 'I9', 'J15'],
    finishHolds: ['I18'],
  },
  {
    fixture: 'ICE_CREAM_DAYDREAM.PNG',
    name: 'ICE CREAM DAYDREAM',
    setter: 'RichieRich7',
    angle: 40,
    userGrade: '7B/V8',
    setterGrade: '7B+/V8',
    isBenchmark: false,
    startHolds: ['J5'],
    handHolds: ['G11', 'I15', 'J14', 'J8'],
    finishHolds: ['G18'],
  },
  {
    fixture: 'MOON_GIRL.PNG',
    name: 'MOON GIRL',
    setter: 'Dana Rader',
    angle: 40,
    userGrade: null,
    setterGrade: null,
    isBenchmark: false,
    startHolds: ['D5', 'E2'],
    handHolds: ['E9', 'G12', 'G15', 'G7', 'I10', 'I14', 'K5'],
    finishHolds: ['I18'],
  },
  {
    fixture: 'PEEK_A_BLUE.PNG',
    name: 'PEEK A BLUE',
    setter: 'RTAGG',
    angle: 40,
    userGrade: '6B+/V4',
    setterGrade: null,
    isBenchmark: false,
    startHolds: ['H4', 'K6'],
    handHolds: ['D16', 'G12', 'G14', 'I9', 'J11'],
    finishHolds: ['F18'],
  },
  {
    fixture: 'TEMPEST_IN_A_TEAPOT.PNG',
    name: 'TEMPEST IN A TEAPOT',
    setter: 'RTAGG',
    angle: 40,
    userGrade: '6C/V5',
    setterGrade: null,
    isBenchmark: false,
    startHolds: ['A4', 'F6'],
    handHolds: ['D7', 'G11', 'G15', 'H9', 'J13', 'K16', 'K5'],
    finishHolds: ['K18'],
  },
  {
    fixture: 'LIVIN_WAY_OUT_WEST.PNG',
    name: "LIVIN' WAY OUT WEST",
    setter: 'Sam Prior',
    angle: 40,
    userGrade: '6C/V5',
    setterGrade: null,
    isBenchmark: false,
    startHolds: ['A4', 'C4'],
    handHolds: ['A11', 'A8', 'B2', 'B6', 'C12', 'F12', 'F15', 'F6'],
    finishHolds: ['C18'],
  },
  {
    fixture: 'FOUR_LETTER_WORDS.PNG',
    name: 'FOUR LETTER WORDS',
    setter: 'Brandon Hyatt',
    angle: 40,
    userGrade: '6C/V5',
    setterGrade: null,
    isBenchmark: false,
    startHolds: ['G5'],
    handHolds: ['I16', 'I9', 'K11', 'K13', 'K15', 'K3'],
    finishHolds: ['F18', 'I18'],
  },
  {
    fixture: 'PREDICON.PNG',
    name: 'PREDICON',
    setter: 'Mike C',
    angle: 40,
    userGrade: '6C/V5',
    setterGrade: null,
    isBenchmark: false, // Note: OCR cannot reliably detect benchmark status
    startHolds: ['E6', 'F5'],
    handHolds: ['E9', 'H16', 'I10', 'J15', 'K5'],
    finishHolds: ['F18'],
  },
  {
    fixture: 'CALLIOPE.PNG',
    name: 'CALLIOPE',
    setter: 'JPace',
    angle: 40,
    userGrade: '6C/V5',
    setterGrade: null,
    isBenchmark: false,
    startHolds: ['F6', 'I6'],
    handHolds: ['B10', 'D16', 'E9', 'F13', 'G15', 'I10', 'K5'],
    finishHolds: ['C18'],
  },
  {
    fixture: 'SOFT_AND_EASY.PNG',
    name: 'SOFT & EASY',
    setter: 'joemaln',
    angle: 40,
    userGrade: '5+/V1',
    setterGrade: null,
    isBenchmark: false,
    startHolds: ['D5', 'F6'],
    handHolds: ['A16', 'B14', 'B4', 'C12', 'D1', 'D14', 'E9', 'G12'],
    finishHolds: ['A18', 'C18'],
  },
  {
    fixture: 'WARMUP5B_FELSMEISTER.PNG',
    name: 'WARMUP 5B FELSMEISTER',
    setter: 'ClimbingZaubi',
    angle: 40,
    userGrade: '6A/V2',
    setterGrade: null,
    isBenchmark: false,
    startHolds: ['F6', 'I6'],
    handHolds: ['E1', 'E9', 'F15', 'G12', 'H3', 'I10', 'J13', 'J15', 'K9'],
    finishHolds: ['I18'],
  },
  {
    fixture: 'ALIEN.png',
    name: 'ALIEN',
    setter: 'Enea B',
    angle: 40,
    userGrade: '6B+/V4',
    setterGrade: '6B+/V4',
    isBenchmark: false, // Note: OCR cannot reliably detect benchmark status
    startHolds: ['K5'],
    handHolds: ['E16', 'G12', 'H15', 'I9', 'J11', 'K3'],
    finishHolds: ['I18'],
  },
  {
    fixture: 'FOR_THE_BIRDS.png',
    name: 'FOR THE BIRDS',
    setter: 'CalumMaclintosh',
    angle: 40,
    userGrade: '6B+/V4',
    setterGrade: '6B+/V4',
    isBenchmark: false, // Note: OCR cannot reliably detect benchmark status
    startHolds: ['B4', 'C6'],
    handHolds: ['A8', 'C12', 'D10', 'D16', 'G14', 'H9'],
    finishHolds: ['F18'],
  },
];
