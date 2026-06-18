export interface Player {
  id: string;
  name: string;
  photo?: string; // data URL
}

export interface Team {
  id: string;
  name: string;
  playerIds: string[];
}

export type DismissalKind =
  | "Bowled"
  | "Caught"
  | "Caught And Bowled"
  | "LBW"
  | "Run Out"
  | "Stumped"
  | "Hit Wicket"
  | "Obstructing the Field"
  | "Hit the Ball Twice"
  | "Timed Out"
  | "One Hand One Bounce";

export interface Dismissal {
  kind: DismissalKind;
  outBatsmanId: string; // who got out
  bowlerId?: string; // null if no bowler credit
  fielderId?: string; // catcher / runout / stumper
  creditBowler: boolean; // does bowler get wicket stat?
}

export type ExtraKind = "wide" | "noball" | "bye" | "legbye" | "penalty";

export interface Delivery {
  id: string;
  inning: 0 | 1;
  overNumber: number; // 0-indexed
  ballInOver: number; // 0-indexed legal ball count when added
  batsmanId: string; // striker at time of ball
  nonStrikerId?: string;
  bowlerId: string;
  runs: number; // runs off the bat / extras runs
  extraKind?: ExtraKind;
  extraRuns?: number; // for wide/no-ball: base penalty
  isLegal: boolean; // counts toward over
  isFreeHit: boolean;
  dismissal?: Dismissal;
  commentary: string;
}

export interface BatterEntry {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  dismissalText?: string;
  retired?: boolean;
}

export interface BowlerEntry {
  playerId: string;
  balls: number; // legal
  runs: number;
  wickets: number;
  dots: number;
  fours: number;
  sixes: number;
}

export interface FielderStat {
  playerId: string;
  catches: number;
  runOuts: number;
  stumpings: number;
}

export interface InningState {
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  extras: { wide: number; noball: number; bye: number; legbye: number; penalty: number };
  batters: BatterEntry[]; // order of appearance
  bowlers: BowlerEntry[];
  fielders: Record<string, FielderStat>;
  fallOfWickets: { wicket: number; runs: number; over: string; playerId: string }[];
  deliveries: Delivery[];
  battingOrderRemaining: string[]; // not yet in
  strikerId?: string;
  nonStrikerId?: string;
  currentBowlerId?: string;
  prevOverBowlerId?: string;
  freeHitNext: boolean;
  // mini-check support
  miniCheckActive?: boolean;
  miniCheckBowlerSwapAt?: number; // ball count when to swap (3)
  miniCheckSecondBowlerId?: string;
}

export interface MatchSettings {
  overs: number;
  playersPerTeam: number;
  seriesCount: number;
  seriesIndex: number; // current match index within series
  wideRuns: number;
  noBallRuns: number;
  freeHitAfterNoBall: boolean;
  miniCheck: boolean;
  overLimit: number | null; // null = unlimited
  tipAndRun: boolean;
  oneHandOneBounce: boolean;
  lastBallFreeHit: boolean;
  nonStriker: boolean;
  singleBatter: boolean;
  retiredCanReturn: boolean;
  relluKattaEnabled: boolean;
  relluKattaName?: string;
}

export interface MatchTeamSetup {
  teamId: string;
  teamName: string;
  playerIds: string[];
  captainId?: string;
  wicketkeeperId?: string;
}

export interface Match {
  id: string;
  createdAt: number;
  settings: MatchSettings;
  team1: MatchTeamSetup;
  team2: MatchTeamSetup;
  relluKattaId?: string;
  tossWinnerTeamId?: string;
  tossDecision?: "bat" | "bowl";
  innings: [InningState, InningState];
  currentInning: 0 | 1;
  status: "setup" | "rules" | "rellu" | "captains" | "toss" | "live" | "finished" | "quit";
  quitAt?: number;
  result?: {
    winnerTeamId?: string; // undefined = tie
    margin: string; // e.g. "5 wickets" or "23 runs" or "Tie"
    manOfMatchId?: string;
  };
}
