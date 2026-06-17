import type { InningState, Match, Delivery, Dismissal, BatterEntry, BowlerEntry } from "./cricket-types";
import { uid } from "./store";

export function emptyInning(battingTeamId: string, bowlingTeamId: string, battingOrder: string[]): InningState {
  return {
    battingTeamId,
    bowlingTeamId,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    extras: { wide: 0, noball: 0, bye: 0, legbye: 0, penalty: 0 },
    batters: [],
    bowlers: [],
    fielders: {},
    fallOfWickets: [],
    deliveries: [],
    battingOrderRemaining: [...battingOrder],
    freeHitNext: false,
  };
}

export function ensureBatter(inn: InningState, playerId: string): BatterEntry {
  let b = inn.batters.find((x) => x.playerId === playerId);
  if (!b) {
    b = { playerId, runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
    inn.batters.push(b);
  }
  return b;
}
export function ensureBowler(inn: InningState, playerId: string): BowlerEntry {
  let b = inn.bowlers.find((x) => x.playerId === playerId);
  if (!b) {
    b = { playerId, balls: 0, runs: 0, wickets: 0, dots: 0, fours: 0, sixes: 0 };
    inn.bowlers.push(b);
  }
  return b;
}
export function ensureFielder(inn: InningState, playerId: string) {
  if (!inn.fielders[playerId]) inn.fielders[playerId] = { playerId, catches: 0, runOuts: 0, stumpings: 0 };
  return inn.fielders[playerId];
}

export interface RecordDeliveryInput {
  runs: number; // bat runs (or runs scored on extra)
  extraKind?: Delivery["extraKind"];
  isLegal: boolean;
  extraRuns?: number; // base wide/noball penalty
  isFreeHit: boolean;
  dismissal?: Dismissal;
  commentary: string;
}

export function oversString(legalBalls: number) {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

export function recordDelivery(inn: InningState, input: RecordDeliveryInput): InningState {
  if (!inn.strikerId || !inn.currentBowlerId) return inn;
  const next: InningState = JSON.parse(JSON.stringify(inn));
  const striker = ensureBatter(next, next.strikerId!);
  const bowler = ensureBowler(next, next.currentBowlerId!);

  const totalRunsThisBall =
    (input.extraRuns ?? 0) + (input.extraKind === "wide" || input.extraKind === "bye" || input.extraKind === "legbye" ? input.runs : 0) +
    (input.extraKind === "noball" ? input.runs : 0) +
    (input.extraKind === "penalty" ? input.runs : 0) +
    (!input.extraKind ? input.runs : 0);

  next.runs += totalRunsThisBall;

  // Extras tracking
  if (input.extraKind === "wide") next.extras.wide += (input.extraRuns ?? 0) + input.runs;
  if (input.extraKind === "noball") next.extras.noball += (input.extraRuns ?? 0);
  if (input.extraKind === "bye") next.extras.bye += input.runs;
  if (input.extraKind === "legbye") next.extras.legbye += input.runs;
  if (input.extraKind === "penalty") next.extras.penalty += input.runs;

  // Bowler runs: all runs except byes/legbyes/penalty
  if (input.extraKind !== "bye" && input.extraKind !== "legbye" && input.extraKind !== "penalty") {
    bowler.runs += totalRunsThisBall;
  }

  // Bat stats: only for off-the-bat runs (no extra kind, or noball with runs scored off bat)
  if (!input.extraKind || input.extraKind === "noball") {
    striker.runs += input.runs;
    striker.balls += 1;
    if (input.runs === 4) { striker.fours += 1; bowler.fours += 1; }
    if (input.runs === 6) { striker.sixes += 1; bowler.sixes += 1; }
    if (input.runs === 0 && !input.extraKind) { bowler.dots += 1; }
  } else if (input.extraKind === "bye" || input.extraKind === "legbye") {
    striker.balls += 1;
  }

  // legal ball / bowler ball
  if (input.isLegal) {
    next.legalBalls += 1;
    bowler.balls += 1;
  }

  // Dismissal
  if (input.dismissal) {
    const d = input.dismissal;
    const outBat = ensureBatter(next, d.outBatsmanId);
    outBat.out = true;
    outBat.dismissalText = formatDismissal(d, next);
    next.wickets += 1;
    if (d.creditBowler) bowler.wickets += 1;
    if (d.fielderId) {
      const f = ensureFielder(next, d.fielderId);
      if (d.kind === "Caught" || d.kind === "Caught And Bowled" || d.kind === "One Hand One Bounce") f.catches += 1;
      else if (d.kind === "Run Out") f.runOuts += 1;
      else if (d.kind === "Stumped") f.stumpings += 1;
    }
    next.fallOfWickets.push({
      wicket: next.wickets,
      runs: next.runs,
      over: oversString(next.legalBalls),
      playerId: d.outBatsmanId,
    });
    // Clear the slot of the dismissed batter so UI prompts a new one
    if (d.outBatsmanId === next.strikerId) next.strikerId = undefined;
    else if (d.outBatsmanId === next.nonStrikerId) next.nonStrikerId = undefined;
  }

  // Strike rotation on odd runs (off bat or byes/legbyes)
  if ((!input.extraKind || input.extraKind === "bye" || input.extraKind === "legbye" || input.extraKind === "noball") && input.runs % 2 === 1) {
    [next.strikerId, next.nonStrikerId] = [next.nonStrikerId!, next.strikerId!];
  }

  // Free hit logic
  next.freeHitNext = input.extraKind === "noball" ? true : false;

  // Append delivery record
  next.deliveries.push({
    id: uid(),
    inning: 0, // caller can override
    overNumber: Math.floor((next.legalBalls - (input.isLegal ? 1 : 0)) / 6),
    ballInOver: input.isLegal ? ((next.legalBalls - 1) % 6) : ((next.legalBalls) % 6),
    batsmanId: inn.strikerId!,
    nonStrikerId: inn.nonStrikerId,
    bowlerId: inn.currentBowlerId!,
    runs: input.runs,
    extraKind: input.extraKind,
    extraRuns: input.extraRuns,
    isLegal: input.isLegal,
    isFreeHit: input.isFreeHit,
    dismissal: input.dismissal,
    commentary: input.commentary,
  });

  // End of over: swap strike
  if (input.isLegal && next.legalBalls % 6 === 0) {
    [next.strikerId, next.nonStrikerId] = [next.nonStrikerId!, next.strikerId!];
    next.prevOverBowlerId = next.currentBowlerId;
    next.currentBowlerId = undefined;
  }

  return next;
}

function formatDismissal(d: Dismissal, inn: InningState): string {
  switch (d.kind) {
    case "Bowled": return `b ${nameOf(d.bowlerId)}`;
    case "LBW": return `lbw b ${nameOf(d.bowlerId)}`;
    case "Caught": return `c ${nameOf(d.fielderId)} b ${nameOf(d.bowlerId)}`;
    case "Caught And Bowled": return `c & b ${nameOf(d.bowlerId)}`;
    case "Stumped": return `st ${nameOf(d.fielderId)} b ${nameOf(d.bowlerId)}`;
    case "Run Out": return `run out (${nameOf(d.fielderId)})`;
    case "Hit Wicket": return `hit wicket b ${nameOf(d.bowlerId)}`;
    case "Obstructing the Field": return `obstructing the field`;
    case "Hit the Ball Twice": return `hit the ball twice`;
    case "Timed Out": return `timed out`;
    case "One Hand One Bounce": return `1h1b (${nameOf(d.fielderId)}) b ${nameOf(d.bowlerId)}`;
  }
}

// Names resolved at render time; placeholder here for the dismissal text
function nameOf(id?: string) { return id ? `#${id.slice(0, 4)}` : ""; }

// Undo last delivery: just pop and replay from scratch — easier than reverse.
export function undoLastDelivery(inn: InningState, battingOrder: string[]): InningState {
  if (inn.deliveries.length === 0) return inn;
  const deliveries = inn.deliveries.slice(0, -1);
  // Replay
  let next = emptyInning(inn.battingTeamId, inn.bowlingTeamId, battingOrder);
  next.strikerId = battingOrder[0];
  next.nonStrikerId = inn.nonStrikerId ? battingOrder[1] : undefined;
  // Walk through deliveries; this is approximate — for full fidelity we'd need a snapshot.
  // Instead, keep raw deliveries but reset and rebuild aggregates from them.
  // To preserve bowler/striker selections, we keep them from the surviving last delivery if present.
  // For simplicity store snapshot at each delivery (handled at caller layer below).
  next.deliveries = deliveries;
  // Rebuild aggregates from deliveries
  rebuildFromDeliveries(next);
  if (deliveries.length > 0) {
    const last = deliveries[deliveries.length - 1];
    next.strikerId = last.batsmanId;
    next.nonStrikerId = last.nonStrikerId;
    next.currentBowlerId = last.bowlerId;
    // Apply rotation that the last delivery would have caused
    if ((!last.extraKind || last.extraKind === "bye" || last.extraKind === "legbye" || last.extraKind === "noball") && last.runs % 2 === 1) {
      [next.strikerId, next.nonStrikerId] = [next.nonStrikerId!, next.strikerId!];
    }
    // End of over swap
    if (last.isLegal && next.legalBalls % 6 === 0) {
      [next.strikerId, next.nonStrikerId] = [next.nonStrikerId!, next.strikerId!];
      next.prevOverBowlerId = last.bowlerId;
      next.currentBowlerId = undefined;
    }
    next.freeHitNext = last.extraKind === "noball";
  } else {
    next.strikerId = inn.batters[0]?.playerId ?? battingOrder[0];
    next.nonStrikerId = inn.nonStrikerId ? battingOrder[1] : undefined;
  }
  // recompute who's still to come
  const playedIds = new Set(deliveries.flatMap((d) => [d.batsmanId, d.nonStrikerId].filter(Boolean) as string[]));
  next.battingOrderRemaining = battingOrder.filter((id) => !playedIds.has(id) && id !== next.strikerId && id !== next.nonStrikerId);
  return next;
}

export function rebuildFromDeliveries(inn: InningState) {
  inn.runs = 0; inn.wickets = 0; inn.legalBalls = 0;
  inn.extras = { wide: 0, noball: 0, bye: 0, legbye: 0, penalty: 0 };
  inn.batters = []; inn.bowlers = []; inn.fielders = {}; inn.fallOfWickets = [];
  for (const d of inn.deliveries) {
    const striker = ensureBatter(inn, d.batsmanId);
    const bowler = ensureBowler(inn, d.bowlerId);
    const total = (d.extraRuns ?? 0) + d.runs;
    inn.runs += total;
    if (d.extraKind === "wide") inn.extras.wide += total;
    else if (d.extraKind === "noball") inn.extras.noball += (d.extraRuns ?? 0);
    else if (d.extraKind === "bye") inn.extras.bye += d.runs;
    else if (d.extraKind === "legbye") inn.extras.legbye += d.runs;
    else if (d.extraKind === "penalty") inn.extras.penalty += d.runs;
    if (d.extraKind !== "bye" && d.extraKind !== "legbye" && d.extraKind !== "penalty") bowler.runs += total;
    if (!d.extraKind || d.extraKind === "noball") {
      striker.runs += d.runs; striker.balls += 1;
      if (d.runs === 4) { striker.fours++; bowler.fours++; }
      if (d.runs === 6) { striker.sixes++; bowler.sixes++; }
      if (d.runs === 0 && !d.extraKind) bowler.dots++;
    } else if (d.extraKind === "bye" || d.extraKind === "legbye") {
      striker.balls += 1;
    }
    if (d.isLegal) { inn.legalBalls += 1; bowler.balls += 1; }
    if (d.dismissal) {
      const outBat = ensureBatter(inn, d.dismissal.outBatsmanId);
      outBat.out = true;
      outBat.dismissalText = `out`;
      inn.wickets += 1;
      if (d.dismissal.creditBowler) bowler.wickets += 1;
      if (d.dismissal.fielderId) {
        const f = ensureFielder(inn, d.dismissal.fielderId);
        if (d.dismissal.kind === "Caught" || d.dismissal.kind === "Caught And Bowled" || d.dismissal.kind === "One Hand One Bounce") f.catches++;
        else if (d.dismissal.kind === "Run Out") f.runOuts++;
        else if (d.dismissal.kind === "Stumped") f.stumpings++;
      }
      inn.fallOfWickets.push({
        wicket: inn.wickets, runs: inn.runs, over: oversString(inn.legalBalls), playerId: d.dismissal.outBatsmanId,
      });
    }
  }
}

// ---- Stats aggregation across all matches ----
export interface BatStat {
  playerId: string; name: string;
  runs: number; balls: number; innings: number; outs: number; fours: number; sixes: number; matches: number;
}
export interface BowlStat {
  playerId: string; name: string;
  balls: number; runs: number; wickets: number; dots: number; matches: number;
}
export interface TeamStat {
  teamId: string; name: string;
  matches: number; wins: number; losses: number;
}

export function computeStats(matches: Match[], playerName: (id: string) => string, teamName: (id: string) => string) {
  const bat: Record<string, BatStat> = {};
  const bowl: Record<string, BowlStat> = {};
  const team: Record<string, TeamStat> = {};

  for (const m of matches) {
    const teamIds = [m.team1.teamId, m.team2.teamId];
    for (const tid of teamIds) {
      if (!team[tid]) team[tid] = { teamId: tid, name: teamName(tid), matches: 0, wins: 0, losses: 0 };
      team[tid].matches += 1;
    }
    if (m.result?.winnerTeamId) {
      team[m.result.winnerTeamId].wins += 1;
      const loser = teamIds.find((t) => t !== m.result!.winnerTeamId)!;
      team[loser].losses += 1;
    }

    for (const inn of m.innings) {
      for (const b of inn.batters) {
        if (!bat[b.playerId]) bat[b.playerId] = { playerId: b.playerId, name: playerName(b.playerId), runs: 0, balls: 0, innings: 0, outs: 0, fours: 0, sixes: 0, matches: 0 };
        bat[b.playerId].runs += b.runs;
        bat[b.playerId].balls += b.balls;
        bat[b.playerId].innings += 1;
        if (b.out) bat[b.playerId].outs += 1;
        bat[b.playerId].fours += b.fours;
        bat[b.playerId].sixes += b.sixes;
      }
      for (const bo of inn.bowlers) {
        if (!bowl[bo.playerId]) bowl[bo.playerId] = { playerId: bo.playerId, name: playerName(bo.playerId), balls: 0, runs: 0, wickets: 0, dots: 0, matches: 0 };
        bowl[bo.playerId].balls += bo.balls;
        bowl[bo.playerId].runs += bo.runs;
        bowl[bo.playerId].wickets += bo.wickets;
        bowl[bo.playerId].dots += bo.dots;
      }
    }
  }
  return { bat: Object.values(bat), bowl: Object.values(bowl), team: Object.values(team) };
}
