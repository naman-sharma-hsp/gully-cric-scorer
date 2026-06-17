import { createFileRoute } from "@tanstack/react-router";
import { useApp, uid } from "@/lib/store";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Minus, Plus, Undo2, ArrowLeftRight, UserCog, Mic, RotateCcw, Pause } from "lucide-react";
import { AddPlayerRow } from "./teams";
import type { Match, MatchSettings, MatchTeamSetup, InningState, Dismissal, DismissalKind } from "@/lib/cricket-types";
import { emptyInning, recordDelivery, undoLastDelivery } from "@/lib/cricket-engine";
import { Scorecard } from "@/components/match/Scorecard";
import { MatchSummary } from "@/components/match/MatchSummary";
import { toast } from "sonner";

export const Route = createFileRoute("/match")({
  head: () => ({ meta: [{ title: "Match · Gully Cricket Scorer" }] }),
  component: MatchPage,
});

// ============================================================
function MatchPage() {
  const { currentMatch } = useApp();
  if (!currentMatch) return <MatchSetup />;
  switch (currentMatch.status) {
    case "setup": return <MatchSetup />;
    case "rules": return <RulesStep />;
    case "rellu": return <RelluKattaStep />;
    case "captains": return <CaptainsStep />;
    case "toss": return <TossStep />;
    case "live": return <LiveScoring />;
    case "finished": return <FinishedView />;
    default: return <MatchSetup />;
  }
}

// ============================================================ SETUP
function MatchSetup() {
  const { teams, players, addTeam, addPlayer, addPlayerToTeam, setCurrentMatch, currentMatch } = useApp();
  const existing = currentMatch?.settings;
  const [overs, setOvers] = useState(existing?.overs ?? 5);
  const [playersPerTeam, setPlayersPerTeam] = useState(existing?.playersPerTeam ?? 6);
  const [series, setSeries] = useState(existing?.seriesCount ?? 1);

  const [t1, setT1] = useState<MatchTeamSetup>({ teamId: "", teamName: "", playerIds: [] });
  const [t2, setT2] = useState<MatchTeamSetup>({ teamId: "", teamName: "", playerIds: [] });

  const ready = t1.teamId && t2.teamId && t1.teamId !== t2.teamId &&
    t1.playerIds.length === playersPerTeam && t2.playerIds.length === playersPerTeam;

  function proceed() {
    if (!ready) return;
    const settings: MatchSettings = {
      overs, playersPerTeam, seriesCount: series, seriesIndex: 1,
      wideRuns: 1, noBallRuns: 1,
      freeHitAfterNoBall: true, miniCheck: false, overLimit: null,
      tipAndRun: false, oneHandOneBounce: false, lastBallFreeHit: false,
      nonStriker: true, retiredCanReturn: false, relluKattaEnabled: false,
    };
    const m: Match = {
      id: uid(), createdAt: Date.now(), settings,
      team1: t1, team2: t2,
      innings: [emptyInning(t1.teamId, t2.teamId, t1.playerIds), emptyInning(t2.teamId, t1.teamId, t2.playerIds)],
      currentInning: 0, status: "rules",
    };
    setCurrentMatch(m);
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h2 className="display text-2xl">New Match</h2>

      <Card className="gully-card space-y-4">
        <h3 className="display text-lg text-orange">Match Settings</h3>
        <Stepper label="Overs per innings" value={overs} setValue={(v) => setOvers(v as number)} min={1} max={100} />
        <Stepper label="Players per team" value={playersPerTeam} setValue={(v) => setPlayersPerTeam(v as number)} min={1} max={15} />
        <Stepper label="Series (matches in row)" value={series} setValue={(v) => setSeries(v as number)} min={1} max={10} />
      </Card>

      <TeamPicker label="Team 1" setup={t1} setSetup={setT1} playersPerTeam={playersPerTeam} excludeTeamId={t2.teamId} />
      <TeamPicker label="Team 2" setup={t2} setSetup={setT2} playersPerTeam={playersPerTeam} excludeTeamId={t1.teamId} />

      <Button className="w-full" size="lg" disabled={!ready} onClick={proceed}>Match Rules →</Button>
      {!ready && (
        <p className="text-center text-xs text-muted-foreground">
          Select two distinct teams and {playersPerTeam} players for each to continue.
        </p>
      )}
    </div>
  );
}

function Stepper({ label, value, setValue, min, max, allowUnlimited }: { label: string; value: number | null; setValue: (n: number | null) => void; min: number; max: number; allowUnlimited?: boolean }) {
  const v = value;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        {allowUnlimited && (
          <Button size="sm" variant={v === null ? "default" : "outline"} onClick={() => setValue(v === null ? min : null)}>
            ∞
          </Button>
        )}
        <Button size="icon" variant="outline" disabled={v === null || (v as number) <= min} onClick={() => setValue(Math.max(min, (v as number) - 1))}><Minus className="h-4 w-4" /></Button>
        <span className="w-10 text-center font-mono text-lg font-bold">{v === null ? "∞" : v}</span>
        <Button size="icon" variant="outline" disabled={v === null || (v as number) >= max} onClick={() => setValue(Math.min(max, (v as number) + 1))}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function TeamPicker({ label, setup, setSetup, playersPerTeam, excludeTeamId }: { label: string; setup: MatchTeamSetup; setSetup: (s: MatchTeamSetup) => void; playersPerTeam: number; excludeTeamId?: string }) {
  const { teams, players, addTeam, addPlayer, addPlayerToTeam } = useApp();
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newName, setNewName] = useState("");

  const team = setup.teamId ? teams[setup.teamId] : null;
  const availablePlayers = team ? team.playerIds.map((id) => players[id]).filter(Boolean) : [];

  return (
    <Card className="gully-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="display text-lg text-lime">{label}</h3>
        {team && <span className="text-xs text-muted-foreground">{setup.playerIds.length}/{playersPerTeam} players</span>}
      </div>

      {!creatingTeam ? (
        <div className="flex gap-2">
          <Select
            value={setup.teamId || ""}
            onValueChange={(v) => {
              if (v === "__new__") { setCreatingTeam(true); return; }
              const t = teams[v];
              if (!t) return;
              setSetup({ teamId: t.id, teamName: t.name, playerIds: [] });
            }}
          >
            <SelectTrigger><SelectValue placeholder="Select team…" /></SelectTrigger>
            <SelectContent>
              {Object.values(teams).filter((t) => t.id !== excludeTeamId).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
              <SelectItem value="__new__">+ Create new team</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input placeholder="Team name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button onClick={() => {
            if (!newName.trim()) return;
            const t = addTeam(newName);
            setSetup({ teamId: t.id, teamName: t.name, playerIds: [] });
            setNewName(""); setCreatingTeam(false);
          }}>Create</Button>
          <Button variant="ghost" onClick={() => setCreatingTeam(false)}>Cancel</Button>
        </div>
      )}

      {team && (
        <div className="space-y-2">
          {Array.from({ length: playersPerTeam }).map((_, i) => {
            const selected = setup.playerIds[i];
            const usedIds = new Set(setup.playerIds.filter((_, j) => j !== i));
            return (
              <Select
                key={i}
                value={selected ?? ""}
                onValueChange={(v) => {
                  if (v === "__new__") return;
                  const ids = [...setup.playerIds];
                  ids[i] = v;
                  setSetup({ ...setup, playerIds: ids });
                }}
              >
                <SelectTrigger><SelectValue placeholder={`Player ${i + 1}`} /></SelectTrigger>
                <SelectContent>
                  {availablePlayers.filter((p) => !usedIds.has(p.id)).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })}
          <div className="rounded-md border border-dashed border-border p-2">
            <div className="mb-1 text-xs text-muted-foreground">Add new player to {team.name}</div>
            <AddPlayerRow
              onAdd={(name, photo) => {
                const p = addPlayer(name, photo);
                addPlayerToTeam(team.id, p.id);
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

// ============================================================ RULES
function RulesStep() {
  const { currentMatch, updateCurrentMatch } = useApp();
  const m = currentMatch!;
  const s = m.settings;
  const set = (patch: Partial<MatchSettings>) => updateCurrentMatch((mm) => ({ ...mm, settings: { ...mm.settings, ...patch } }));

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h2 className="display text-2xl">Match Rules</h2>

      <Card className="gully-card space-y-3">
        <h3 className="display text-lg text-orange">Extras</h3>
        <Stepper label="Wide runs" value={s.wideRuns} setValue={(v) => set({ wideRuns: v as number })} min={0} max={5} />
        <Stepper label="No-ball runs" value={s.noBallRuns} setValue={(v) => set({ noBallRuns: v as number })} min={0} max={5} />
      </Card>

      <Card className="gully-card space-y-3">
        <h3 className="display text-lg text-orange">Bowling Rules</h3>
        <Toggle label="Free hit after no-ball" value={s.freeHitAfterNoBall} setValue={(v) => set({ freeHitAfterNoBall: v })} />
        <Toggle label="Mini-Check" value={s.miniCheck} setValue={(v) => set({ miniCheck: v })} />
        <Stepper label="Over limit per bowler" value={s.overLimit} setValue={(v) => set({ overLimit: v })} min={1} max={100} allowUnlimited />
      </Card>

      <Card className="gully-card space-y-3">
        <h3 className="display text-lg text-orange">Special Gully Rules</h3>
        <Toggle label="Tip and Run" value={s.tipAndRun} setValue={(v) => set({ tipAndRun: v })} />
        <Toggle label="One Hand One Bounce" value={s.oneHandOneBounce} setValue={(v) => set({ oneHandOneBounce: v })} />
        <Toggle label="Last Ball Free Hit" value={s.lastBallFreeHit} setValue={(v) => set({ lastBallFreeHit: v })} />
      </Card>

      <Card className="gully-card space-y-3">
        <h3 className="display text-lg text-orange">Batting Rules</h3>
        <Toggle label="Non-Striker (2 batters)" value={s.nonStriker} setValue={(v) => set({ nonStriker: v })} />
        <Toggle label="Retired Batsman Can Return" value={s.retiredCanReturn} setValue={(v) => set({ retiredCanReturn: v })} />
      </Card>

      <Card className="gully-card space-y-3">
        <h3 className="display text-lg text-orange">Rellu-Katta Player</h3>
        <Toggle label="Enable Rellu Katta" value={s.relluKattaEnabled} setValue={(v) => set({ relluKattaEnabled: v })} />
      </Card>

      <Card className="gully-card space-y-1 text-sm">
        <div className="display text-lg text-lime">Summary</div>
        <Row k="Wide" v={`+${s.wideRuns} run${s.wideRuns === 1 ? "" : "s"}`} />
        <Row k="No Ball" v={`+${s.noBallRuns} run${s.noBallRuns === 1 ? "" : "s"}${s.freeHitAfterNoBall ? " + Free Hit" : ""}`} />
        <Row k="Over limit/bowler" v={s.overLimit ?? "∞"} />
        <Row k="Mini-Check" v={s.miniCheck ? "On" : "Off"} />
        <Row k="Tip & Run" v={s.tipAndRun ? "On" : "Off"} />
        <Row k="One Hand One Bounce" v={s.oneHandOneBounce ? "On" : "Off"} />
        <Row k="Last Ball Free Hit" v={s.lastBallFreeHit ? "On" : "Off"} />
        <Row k="Non-Striker" v={s.nonStriker ? "On (2 batters)" : "Off (1 batter)"} />
        <Row k="Retired Returns" v={s.retiredCanReturn ? "Yes" : "No"} />
        <Row k="Rellu Katta" v={s.relluKattaEnabled ? "Enabled" : "Disabled"} />
      </Card>

      <Button className="w-full" size="lg" onClick={() => updateCurrentMatch((mm) => ({ ...mm, status: s.relluKattaEnabled ? "rellu" : "captains" }))}>
        {s.relluKattaEnabled ? "Name Rellu Katta →" : "Captains & Keepers →"}
      </Button>
    </div>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-semibold">{v}</span></div>;
}
function Toggle({ label, value, setValue }: { label: string; value: boolean; setValue: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={setValue} />
    </div>
  );
}

// ============================================================ RELLU
function RelluKattaStep() {
  const { currentMatch, updateCurrentMatch, addPlayer } = useApp();
  const m = currentMatch!;
  const [name, setName] = useState(m.settings.relluKattaName ?? "");
  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h2 className="display text-2xl">Rellu Katta Player</h2>
      <Card className="gully-card space-y-3">
        <p className="text-sm text-muted-foreground">A shared player who bats & bowls for both teams. Can't bowl while batting.</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rellu Katta name" />
        <Button
          className="w-full"
          disabled={!name.trim()}
          onClick={() => {
            const p = addPlayer(name);
            updateCurrentMatch((mm) => ({
              ...mm,
              relluKattaId: p.id,
              settings: { ...mm.settings, relluKattaName: name },
              status: "captains",
            }));
          }}
        >
          Continue →
        </Button>
      </Card>
    </div>
  );
}

// ============================================================ CAPTAINS
function CaptainsStep() {
  const { currentMatch, updateCurrentMatch, players } = useApp();
  const m = currentMatch!;
  const setT1 = (patch: Partial<MatchTeamSetup>) => updateCurrentMatch((mm) => ({ ...mm, team1: { ...mm.team1, ...patch } }));
  const setT2 = (patch: Partial<MatchTeamSetup>) => updateCurrentMatch((mm) => ({ ...mm, team2: { ...mm.team2, ...patch } }));

  const ready = m.team1.captainId && m.team1.wicketkeeperId && m.team2.captainId && m.team2.wicketkeeperId;
  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h2 className="display text-2xl">Captains & Keepers</h2>
      {[m.team1, m.team2].map((team, idx) => {
        const set = idx === 0 ? setT1 : setT2;
        return (
          <Card key={team.teamId} className="gully-card space-y-3">
            <h3 className="display text-lg text-orange">{team.teamName}</h3>
            <Labeled label="Captain">
              <Select value={team.captainId ?? ""} onValueChange={(v) => set({ captainId: v })}>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>{team.playerIds.map((id) => <SelectItem key={id} value={id}>{players[id]?.name}</SelectItem>)}</SelectContent>
              </Select>
            </Labeled>
            <Labeled label="Wicketkeeper">
              <Select value={team.wicketkeeperId ?? ""} onValueChange={(v) => set({ wicketkeeperId: v })}>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>{team.playerIds.map((id) => <SelectItem key={id} value={id}>{players[id]?.name}</SelectItem>)}</SelectContent>
              </Select>
            </Labeled>
          </Card>
        );
      })}
      <Button className="w-full" size="lg" disabled={!ready} onClick={() => updateCurrentMatch((mm) => ({ ...mm, status: "toss" }))}>
        Match Toss →
      </Button>
    </div>
  );
}
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="mb-1 text-xs text-muted-foreground">{label}</div>{children}</div>;
}

// ============================================================ TOSS
function TossStep() {
  const { currentMatch, updateCurrentMatch } = useApp();
  const m = currentMatch!;
  const [caller, setCaller] = useState<string | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<"HEADS" | "TAILS" | null>(null);
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"bat" | "bowl" | null>(null);

  const flip = () => {
    setFlipping(true);
    setTimeout(() => {
      const r = Math.random() < 0.5 ? "HEADS" : "TAILS";
      setResult(r);
      setFlipping(false);
      const callerWon = r === "HEADS";
      const t1 = m.team1.teamId;
      const t2 = m.team2.teamId;
      const otherCaller = caller === t1 ? t2 : t1;
      setWinnerTeamId(callerWon ? caller! : otherCaller);
    }, 1700);
  };

  function start() {
    if (!winnerTeamId || !decision) return;
    const batTeam = (decision === "bat") ? winnerTeamId : (winnerTeamId === m.team1.teamId ? m.team2.teamId : m.team1.teamId);
    const bowlTeam = batTeam === m.team1.teamId ? m.team2.teamId : m.team1.teamId;
    const order1 = batTeam === m.team1.teamId ? m.team1.playerIds : m.team2.playerIds;
    const order2 = bowlTeam === m.team1.teamId ? m.team1.playerIds : m.team2.playerIds;
    updateCurrentMatch((mm) => ({
      ...mm,
      tossWinnerTeamId: winnerTeamId!,
      tossDecision: decision!,
      innings: [emptyInning(batTeam, bowlTeam, order1), emptyInning(bowlTeam, batTeam, order2)],
      currentInning: 0,
      status: "live",
    }));
  }

  const winnerName = winnerTeamId === m.team1.teamId ? m.team1.teamName : winnerTeamId === m.team2.teamId ? m.team2.teamName : "";

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h2 className="display text-2xl">Match Toss</h2>
      <Card className="gully-card space-y-4">
        <p className="text-center text-sm text-muted-foreground">Who calls HEAD?</p>
        <div className="grid grid-cols-2 gap-2">
          {[m.team1, m.team2].map((t) => (
            <Button
              key={t.teamId}
              variant={caller === t.teamId ? "default" : "outline"}
              onClick={() => { setCaller(t.teamId); setResult(null); setWinnerTeamId(null); setDecision(null); }}
              disabled={!!result}
            >{t.teamName}</Button>
          ))}
        </div>

        <div className="flex justify-center py-6">
          <div className={`relative h-32 w-32 rounded-full bg-gradient-to-br from-orange to-amber-700 text-3xl font-bold text-primary-foreground shadow-2xl ${flipping ? "animate-coin-flip" : ""}`}>
            <div className="flex h-full w-full items-center justify-center">{result ?? "🪙"}</div>
          </div>
        </div>

        <Button className="w-full" disabled={!caller || flipping || !!result} onClick={flip}>
          Flip Coin
        </Button>

        {winnerTeamId && (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-center">
              <span className="display text-lg text-lime">{winnerName}</span> won the toss.
            </p>
            <p className="text-center text-sm">{winnerName} choose to:</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={decision === "bat" ? "default" : "outline"} onClick={() => setDecision("bat")}>Bat 🏏</Button>
              <Button variant={decision === "bowl" ? "default" : "outline"} onClick={() => setDecision("bowl")}>Bowl ⚾</Button>
            </div>
            <Button className="w-full" size="lg" disabled={!decision} onClick={start}>Start Match →</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================ LIVE SCORING
function LiveScoring() {
  const { currentMatch, updateCurrentMatch, players, finalizeMatch } = useApp();
  const m = currentMatch!;
  const inn = m.innings[m.currentInning];
  const s = m.settings;
  const battingSetup = inn.battingTeamId === m.team1.teamId ? m.team1 : m.team2;
  const bowlingSetup = inn.bowlingTeamId === m.team1.teamId ? m.team1 : m.team2;
  const pname = (id?: string) => (id ? players[id]?.name ?? "—" : "—");

  const [openCard, setOpenCard] = useState(false);
  const [strikerDialog, setStrikerDialog] = useState(false);
  const [bowlerDialog, setBowlerDialog] = useState(false);
  const [miniCheckOpen, setMiniCheckOpen] = useState(false);
  const [miniSwapPrompt, setMiniSwapPrompt] = useState(false);
  const [extraDialog, setExtraDialog] = useState<null | "wide" | "noball" | "bye" | "legbye">(null);
  const [wicketDialog, setWicketDialog] = useState(false);
  const [wkDialog, setWkDialog] = useState(false);
  const [retireDialog, setRetireDialog] = useState(false);

  // Determine batting order: append rellu-katta if applicable
  const battingPool = useMemo(() => {
    const ids = [...battingSetup.playerIds];
    if (s.relluKattaEnabled && m.relluKattaId && !ids.includes(m.relluKattaId)) ids.push(m.relluKattaId);
    return ids;
  }, [battingSetup, s, m.relluKattaId]);
  const bowlingPool = useMemo(() => {
    const ids = [...bowlingSetup.playerIds];
    if (s.relluKattaEnabled && m.relluKattaId && !ids.includes(m.relluKattaId)) ids.push(m.relluKattaId);
    return ids;
  }, [bowlingSetup, s, m.relluKattaId]);

  // Rellu Katta is currently batting? then exclude from bowling/fielding choices
  const relluBatting = !!(s.relluKattaEnabled && m.relluKattaId &&
    inn.batters.some((b) => b.playerId === m.relluKattaId && !b.out));
  const fielderPool = useMemo(
    () => bowlingPool.filter((id) => !(relluBatting && id === m.relluKattaId)),
    [bowlingPool, relluBatting, m.relluKattaId],
  );
  const effectiveBowlerPool = fielderPool;

  // Initial striker / non-striker selection — also re-prompts after wicket (slot cleared)
  useEffect(() => {
    if (strikerDialog) return;
    const moreBattersAvailable = inn.wickets < battingPool.length - (s.nonStriker ? 1 : 0);
    if (!moreBattersAvailable) return;
    if (!inn.strikerId) setStrikerDialog(true);
    else if (s.nonStriker && !inn.nonStrikerId && inn.batters.length > 0) setStrikerDialog(true);
  }, [inn.strikerId, inn.nonStrikerId, s.nonStriker]);

  useEffect(() => {
    if (inn.strikerId && !inn.currentBowlerId && !bowlerDialog && !miniCheckOpen) {
      if (s.miniCheck) setMiniCheckOpen(true); else setBowlerDialog(true);
    }
  }, [inn.strikerId, inn.currentBowlerId]);

  // Mini-check: prompt to swap bowler after 3 legal balls in the current over
  useEffect(() => {
    if (!inn.miniCheckActive || !inn.currentBowlerId) return;
    const ballsInOver = inn.legalBalls % 6;
    const swapAt = inn.miniCheckBowlerSwapAt ?? 3;
    if (ballsInOver === swapAt && !inn.miniCheckSecondBowlerId && !miniSwapPrompt) {
      setMiniSwapPrompt(true);
    }
  }, [inn.legalBalls, inn.miniCheckActive, inn.currentBowlerId]);


  // End of innings / match detection
  useEffect(() => {
    const oversDone = inn.legalBalls >= s.overs * 6;
    const allOut = inn.wickets >= battingPool.length - (s.nonStriker ? 1 : 0);
    const targetChased = m.currentInning === 1 && inn.runs > m.innings[0].runs;
    if (oversDone || allOut || targetChased) {
      if (m.currentInning === 0) {
        // transition to 2nd innings
        toast.success(`End of 1st innings: ${inn.runs}/${inn.wickets}`);
        updateCurrentMatch((mm) => ({ ...mm, currentInning: 1 }));
      } else {
        endMatch();
      }
    }
  }, [inn.legalBalls, inn.wickets, inn.runs]);

  function endMatch() {
    const t1Inn = m.innings.find((i) => i.battingTeamId === m.team1.teamId)!;
    const t2Inn = m.innings.find((i) => i.battingTeamId === m.team2.teamId)!;
    let winnerTeamId: string | undefined;
    let margin = "Tie";
    if (t1Inn.runs > t2Inn.runs) {
      winnerTeamId = m.team1.teamId;
      margin = `${m.team1.teamName} won by ${t1Inn.runs - t2Inn.runs} runs`;
    } else if (t2Inn.runs > t1Inn.runs) {
      winnerTeamId = m.team2.teamId;
      margin = `${m.team2.teamName} won by ${battingPool.length - 1 - t2Inn.wickets} wickets`;
    }
    // MoM: most (runs + 20*wickets) across both innings
    const score: Record<string, number> = {};
    for (const i of m.innings) {
      for (const b of i.batters) score[b.playerId] = (score[b.playerId] ?? 0) + b.runs;
      for (const b of i.bowlers) score[b.playerId] = (score[b.playerId] ?? 0) + b.wickets * 20;
    }
    const mom = Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0];
    const finished: Match = { ...m, status: "finished", result: { winnerTeamId, margin, manOfMatchId: mom } };
    finalizeMatch(finished);
    // Keep visible: re-set currentMatch as finished for summary view
    setTimeout(() => useApp.setState({ currentMatch: finished }), 0);
  }

  function applyToInning(updater: (i: InningState) => InningState) {
    updateCurrentMatch((mm) => {
      const innings = [...mm.innings] as Match["innings"];
      innings[mm.currentInning] = updater(innings[mm.currentInning]);
      return { ...mm, innings };
    });
  }

  function isFreeHit(): boolean {
    if (inn.freeHitNext && s.freeHitAfterNoBall) return true;
    if (s.lastBallFreeHit && inn.legalBalls > 0 && (inn.legalBalls + 1) % 6 === 0) return true;
    return false;
  }

  function score(runs: number) {
    applyToInning((i) => recordDelivery(i, {
      runs, isLegal: true, isFreeHit: isFreeHit(),
      commentary: runs === 0 ? "Dot ball." : runs === 4 ? "FOUR!" : runs === 6 ? "SIX!" : `${runs} run${runs > 1 ? "s" : ""}.`,
    }));
  }

  function scoreExtra(kind: "wide" | "noball" | "bye" | "legbye", extraRuns: number, addRuns: number, dismissal?: Dismissal) {
    const isLegal = kind === "bye" || kind === "legbye";
    const base = kind === "wide" ? s.wideRuns : kind === "noball" ? s.noBallRuns : 0;
    applyToInning((i) => recordDelivery(i, {
      runs: addRuns, extraKind: kind, extraRuns: kind === "wide" || kind === "noball" ? base : 0,
      isLegal, isFreeHit: isFreeHit(),
      dismissal,
      commentary: `${kind.toUpperCase()}${addRuns ? ` + ${addRuns}` : ""}${dismissal ? " WICKET!" : ""}`,
    }));
  }

  function penalty() {
    applyToInning((i) => recordDelivery(i, { runs: 5, extraKind: "penalty", isLegal: false, isFreeHit: false, commentary: "Penalty 5 runs." }));
  }

  function undo() {
    applyToInning((i) => undoLastDelivery(i, battingPool));
  }

  // Current over deliveries
  const currentOverDeliveries = useMemo(() => {
    const list: typeof inn.deliveries = [];
    for (let i = inn.deliveries.length - 1; i >= 0; i--) {
      const d = inn.deliveries[i];
      list.unshift(d);
      if (d.isLegal && inn.legalBalls > 0 && Math.floor((inn.legalBalls - 1) / 6) === d.overNumber) {
        // include only deliveries in current over
        if (list.filter((x) => x.isLegal).length >= ((inn.legalBalls - 1) % 6 + 1)) break;
      }
      if (i === 0) break;
    }
    return list.slice(-12);
  }, [inn.deliveries, inn.legalBalls]);

  const lastBall = inn.deliveries[inn.deliveries.length - 1];

  return (
    <div className="mx-auto max-w-xl space-y-3 p-4">
      {/* Header */}
      <Card className="gully-card space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Innings {m.currentInning + 1} · {battingSetup.teamName}
            </div>
            <div className="display text-3xl text-orange">
              {inn.runs}/{inn.wickets}
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.floor(inn.legalBalls / 6)}.{inn.legalBalls % 6} of {s.overs} ov
              {m.currentInning === 1 && <span className="ml-2 text-lime">target {m.innings[0].runs + 1}</span>}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setOpenCard(true)}>Scorecard</Button>
        </div>

        <div className="space-y-1 border-t border-border pt-2 text-sm">
          {inn.batters.filter((b) => b.playerId === inn.strikerId || b.playerId === inn.nonStrikerId).map((b) => (
            <div key={b.playerId} className="flex justify-between">
              <span>
                {b.playerId === inn.strikerId && <span className="text-orange">★ </span>}
                <span className="font-semibold">{pname(b.playerId)}</span>
              </span>
              <span className="font-mono">{b.runs}({b.balls})</span>
            </div>
          ))}
          {inn.currentBowlerId && (() => {
            const bo = inn.bowlers.find((x) => x.playerId === inn.currentBowlerId);
            if (!bo) return null;
            return (
              <div className="flex justify-between text-muted-foreground">
                <span>{pname(bo.playerId)}</span>
                <span className="font-mono">{Math.floor(bo.balls / 6)}.{bo.balls % 6} – {bo.wickets} – {bo.runs}</span>
              </div>
            );
          })()}
          {/* current over balls */}
          <div className="flex gap-1 pt-1">
            {currentOverDeliveries.map((d) => (
              <span key={d.id} className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                d.dismissal ? "bg-destructive text-destructive-foreground" :
                d.extraKind ? "bg-amber-600 text-white" :
                d.runs === 4 ? "bg-lime text-accent-foreground" :
                d.runs === 6 ? "bg-orange text-primary-foreground" :
                "bg-muted text-foreground"
              }`}>
                {d.dismissal ? "W" : d.extraKind === "wide" ? "Wd" : d.extraKind === "noball" ? "Nb" : d.extraKind === "bye" ? `B${d.runs}` : d.extraKind === "legbye" ? `Lb${d.runs}` : d.runs}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Commentary */}
      {lastBall && (
        <Card className="gully-card text-sm">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Last ball: </span>
          <span className="font-semibold">{lastBall.commentary}</span>
          {isFreeHit() && <span className="ml-2 rounded bg-lime px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">FREE HIT</span>}
        </Card>
      )}

      {/* Action row */}
      <div className="grid grid-cols-7 gap-1">
        <ActionBtn label="Undo" onClick={undo}><Undo2 className="h-3 w-3" /></ActionBtn>
        <ActionBtn label={`NS ${s.nonStriker ? "On" : "Off"}`} onClick={() => {
          const turningOn = !s.nonStriker;
          updateCurrentMatch((mm) => ({ ...mm, settings: { ...mm.settings, nonStriker: turningOn } }));
          if (turningOn && !inn.nonStrikerId) setStrikerDialog(true);
          if (!turningOn) applyToInning((i) => ({ ...i, nonStrikerId: undefined }));
        }}>NS</ActionBtn>
        <ActionBtn label="DismOver" onClick={() => {
          const keep = confirm("Dismiss over: keep runs/wickets from this over? (Cancel = discard)");
          applyToInning((i) => {
            const startBalls = Math.floor(i.legalBalls / 6) * 6;
            // Number of legal balls bowled in the (incomplete) over to roll back
            const ballsInOver = i.legalBalls - startBalls;
            if (ballsInOver === 0) return { ...i, currentBowlerId: undefined, prevOverBowlerId: i.currentBowlerId };
            if (keep) {
              // Keep runs & wickets, restart over from ball 0. Mark this over's deliveries as no-longer-legal
              // so they don't double-count when rebuilt later, and decrement bowler's legal balls.
              const cur: InningState = JSON.parse(JSON.stringify(i));
              const bowler = cur.bowlers.find((b) => b.playerId === cur.currentBowlerId);
              if (bowler) bowler.balls = Math.max(0, bowler.balls - ballsInOver);
              cur.legalBalls = startBalls;
              for (const d of cur.deliveries) {
                if (d.isLegal && d.overNumber === Math.floor(startBalls / 6)) d.isLegal = false;
              }
              cur.prevOverBowlerId = cur.currentBowlerId;
              cur.currentBowlerId = undefined;
              cur.miniCheckActive = false; cur.miniCheckSecondBowlerId = undefined;
              return cur;
            } else {
              // Discard the over entirely
              let cur = i;
              while (cur.legalBalls > startBalls && cur.deliveries.length > 0) {
                cur = undoLastDelivery(cur, battingPool);
              }
              return { ...cur, currentBowlerId: undefined, prevOverBowlerId: undefined, miniCheckActive: false, miniCheckSecondBowlerId: undefined };
            }
          });
        }}><Pause className="h-3 w-3" /></ActionBtn>
        <ActionBtn label="Retire" onClick={() => setRetireDialog(true)}><RotateCcw className="h-3 w-3" /></ActionBtn>
        <ActionBtn label="Swap" onClick={() => applyToInning((i) => ({ ...i, strikerId: i.nonStrikerId, nonStrikerId: i.strikerId }))}><ArrowLeftRight className="h-3 w-3" /></ActionBtn>
        <ActionBtn label="WK" onClick={() => setWkDialog(true)}><UserCog className="h-3 w-3" /></ActionBtn>
        <ActionBtn label="Voice" onClick={() => startVoice(score)}><Mic className="h-3 w-3" /></ActionBtn>
      </div>

      {/* Scoring grid */}
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3, 4, 6].map((n) => (
          <Button key={n} variant="outline" className="h-14 text-lg font-bold" onClick={() => score(n)}>{n}</Button>
        ))}
        <Button variant="secondary" className="h-14 font-bold" onClick={() => setExtraDialog("wide")}>Wide</Button>
        <Button variant="secondary" className="h-14 font-bold" onClick={() => setExtraDialog("noball")}>No Ball</Button>
        <Button variant="secondary" className="h-14 font-bold" onClick={penalty}>Penalty</Button>
        <Button variant="destructive" className="h-14 font-bold" onClick={() => setWicketDialog(true)}>Wicket</Button>
        <Button variant="secondary" className="h-14 font-bold" onClick={() => setExtraDialog("legbye")}>Leg Bye</Button>
        <Button variant="secondary" className="h-14 font-bold" onClick={() => setExtraDialog("bye")}>Bye</Button>
        {s.tipAndRun && (
          <Button variant="secondary" className="h-14 font-bold col-span-2" onClick={() => score(1)} title="Tip and Run: any contact = 1 run, rotate strike">Tip+Run (1)</Button>
        )}
      </div>


      {/* Dialogs */}
      <Dialog open={openCard} onOpenChange={setOpenCard}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Scorecard</DialogTitle></DialogHeader>
          <Scorecard match={m} />
        </DialogContent>
      </Dialog>

      <SelectBatterDialog
        open={strikerDialog} setOpen={setStrikerDialog}
        title={inn.batters.length === 0 ? "Opening batters" : "Next batter (incoming)"}
        pool={battingPool} inn={inn}
        relluKattaId={m.relluKattaId} settings={s}
        onPick={(strikerId, nonStrikerId) => {
          applyToInning((i) => {
            const next: InningState = { ...i };
            if (i.batters.length === 0) {
              // Opening
              next.strikerId = strikerId;
              next.nonStrikerId = nonStrikerId;
            } else if (!i.strikerId && !i.nonStrikerId) {
              next.strikerId = strikerId;
              if (s.nonStriker && nonStrikerId) next.nonStrikerId = nonStrikerId;
            } else if (!i.strikerId) {
              next.strikerId = strikerId;
            } else if (!i.nonStrikerId) {
              next.nonStrikerId = strikerId;
            }
            next.battingOrderRemaining = i.battingOrderRemaining.filter((id) => id !== strikerId && id !== nonStrikerId);
            return next;
          });
          setStrikerDialog(false);
        }}
      />

      <SelectBowlerDialog
        open={bowlerDialog} setOpen={setBowlerDialog}
        pool={effectiveBowlerPool} inn={inn} relluKattaId={m.relluKattaId}
        prevBowlerId={inn.prevOverBowlerId}
        battingStrikerId={inn.strikerId} battingNonStrikerId={inn.nonStrikerId}
        overLimit={s.overLimit}
        onPick={(id) => {
          applyToInning((i) => ({
            ...i,
            currentBowlerId: id,
            miniCheckSecondBowlerId: i.miniCheckActive && i.miniCheckBowlerSwapAt && (i.legalBalls % 6) === i.miniCheckBowlerSwapAt ? id : i.miniCheckSecondBowlerId,
          }));
          setBowlerDialog(false);
        }}
      />

      <MiniCheckDialog open={miniCheckOpen} setOpen={setMiniCheckOpen}
        onChoose={(enable) => {
          setMiniCheckOpen(false);
          if (enable) {
            applyToInning((i) => ({ ...i, miniCheckActive: true, miniCheckBowlerSwapAt: 3, miniCheckSecondBowlerId: undefined }));
            toast.info("Mini-check on: prompt to swap bowler after 3 balls");
          } else {
            applyToInning((i) => ({ ...i, miniCheckActive: false }));
          }
          setBowlerDialog(true);
        }} />

      <Dialog open={miniSwapPrompt} onOpenChange={setMiniSwapPrompt}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mini-Check: 3 balls bowled</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Swap bowler for the rest of the over, or let current bowler play "mini-full"?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              applyToInning((i) => ({ ...i, miniCheckActive: false }));
              setMiniSwapPrompt(false);
              toast.info("Mini-Full: bowler continues");
            }}>Mini-Full</Button>
            <Button onClick={() => {
              applyToInning((i) => ({ ...i, prevOverBowlerId: i.currentBowlerId, currentBowlerId: undefined }));
              setMiniSwapPrompt(false);
              setBowlerDialog(true);
            }}>Swap Bowler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={wkDialog} onOpenChange={setWkDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Wicketkeeper</DialogTitle></DialogHeader>
          <div className="space-y-1">
            {fielderPool.map((id) => (
              <Button key={id} variant={bowlingSetup.wicketkeeperId === id ? "default" : "outline"} className="w-full justify-start" onClick={() => {
                updateCurrentMatch((mm) => {
                  const isT1 = mm.team1.teamId === bowlingSetup.teamId;
                  return isT1
                    ? { ...mm, team1: { ...mm.team1, wicketkeeperId: id } }
                    : { ...mm, team2: { ...mm.team2, wicketkeeperId: id } };
                });
                toast.success(`Wicketkeeper: ${players[id]?.name}`);
                setWkDialog(false);
              }}>{players[id]?.name}{bowlingSetup.wicketkeeperId === id ? " (current)" : ""}</Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={retireDialog} onOpenChange={setRetireDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Retire which batter?</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-2">
            {[inn.strikerId, inn.nonStrikerId].filter(Boolean).map((id) => (
              <Button key={id} variant="outline" onClick={() => {
                applyToInning((i) => {
                  const next: InningState = JSON.parse(JSON.stringify(i));
                  const b = next.batters.find((x) => x.playerId === id);
                  if (b) { b.retired = true; b.out = false; b.dismissalText = "retired"; }
                  if (next.strikerId === id) next.strikerId = undefined;
                  else if (next.nonStrikerId === id) next.nonStrikerId = undefined;
                  return next;
                });
                setRetireDialog(false);
              }}>{players[id!]?.name}</Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ExtraDialog
        kind={extraDialog} open={!!extraDialog} setOpen={(o) => !o && setExtraDialog(null)}
        onSubmit={(addRuns, wicketKind) => {
          if (wicketKind && inn.strikerId) {
            const d: Dismissal = {
              kind: wicketKind, outBatsmanId: inn.strikerId, bowlerId: inn.currentBowlerId,
              creditBowler: wicketKind === "Stumped",
              fielderId: wicketKind === "Stumped" ? bowlingSetup.wicketkeeperId : undefined,
            };
            scoreExtra(extraDialog!, 0, addRuns, d);
          } else {
            scoreExtra(extraDialog!, 0, addRuns);
          }
          setExtraDialog(null);
        }}
      />

      <WicketDialog
        open={wicketDialog} setOpen={setWicketDialog}
        inn={inn} bowlingPool={fielderPool} battingStriker={inn.strikerId} battingNonStriker={inn.nonStrikerId}
        wicketkeeperId={bowlingSetup.wicketkeeperId} settings={s} freeHit={isFreeHit()}
        onSubmit={(d, runsOnBall) => {
          applyToInning((i) => recordDelivery(i, {
            runs: runsOnBall, isLegal: true, isFreeHit: isFreeHit(), dismissal: d,
            commentary: `WICKET! ${d.kind}.`,
          }));
          setWicketDialog(false);
        }}
      />
    </div>
  );
}

function ActionBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 rounded border border-border bg-muted py-2 text-[9px] uppercase tracking-wider text-muted-foreground transition hover:bg-orange/20 hover:text-orange">
      {children}<span>{label}</span>
    </button>
  );
}

function SelectBatterDialog({ open, setOpen, title, pool, inn, onPick, settings, relluKattaId }: {
  open: boolean; setOpen: (b: boolean) => void; title: string;
  pool: string[]; inn: InningState; excludeOut?: boolean; nonStrikerNeeded?: boolean;
  relluKattaId?: string; settings: MatchSettings;
  onPick: (strikerId: string, nonStrikerId?: string) => void;
}) {
  const { players } = useApp();
  const [striker, setStriker] = useState<string>("");
  const [ns, setNs] = useState<string>("");
  const opening = inn.batters.length === 0;
  const available = pool.filter((id) => {
    const b = inn.batters.find((x) => x.playerId === id);
    if (!b) return true;
    if (b.out) return false;
    if (b.retired && !settings.retiredCanReturn) return false;
    if (id === inn.strikerId || id === inn.nonStrikerId) return false;
    return true;
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={striker} onValueChange={setStriker}>
            <SelectTrigger><SelectValue placeholder={opening ? "Striker" : "Incoming batter"} /></SelectTrigger>
            <SelectContent>
              {available.map((id) => <SelectItem key={id} value={id}>{players[id]?.name}{id === relluKattaId ? " 🪨" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
          {opening && settings.nonStriker && (
            <Select value={ns} onValueChange={setNs}>
              <SelectTrigger><SelectValue placeholder="Non-striker" /></SelectTrigger>
              <SelectContent>
                {available.filter((id) => id !== striker).map((id) => <SelectItem key={id} value={id}>{players[id]?.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button disabled={!striker || (opening && settings.nonStriker && !ns)} onClick={() => onPick(striker, opening ? (settings.nonStriker ? ns : undefined) : undefined)}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SelectBowlerDialog({ open, setOpen, pool, inn, prevBowlerId, battingStrikerId, battingNonStrikerId, relluKattaId, overLimit, onPick }: {
  open: boolean; setOpen: (b: boolean) => void; pool: string[]; inn: InningState; prevBowlerId?: string;
  battingStrikerId?: string; battingNonStrikerId?: string; relluKattaId?: string;
  overLimit: number | null;
  onPick: (id: string) => void;
}) {
  const { players } = useApp();
  const [pick, setPick] = useState<string>("");
  const available = pool.filter((id) => {
    if (id === prevBowlerId) return false;
    // rellu katta: can't bowl if currently batting
    if (id === relluKattaId && (id === battingStrikerId || id === battingNonStrikerId)) return false;
    if (overLimit) {
      const bo = inn.bowlers.find((b) => b.playerId === id);
      if (bo && Math.floor(bo.balls / 6) >= overLimit) return false;
    }
    return true;
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Select bowler</DialogTitle></DialogHeader>
        <Select value={pick} onValueChange={setPick}>
          <SelectTrigger><SelectValue placeholder="Bowler" /></SelectTrigger>
          <SelectContent>
            {available.map((id) => <SelectItem key={id} value={id}>{players[id]?.name}{id === relluKattaId ? " 🪨" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        <DialogFooter><Button disabled={!pick} onClick={() => onPick(pick)}>Confirm</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MiniCheckDialog({ open, setOpen, onChoose }: { open: boolean; setOpen: (b: boolean) => void; onChoose: (enable: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Mini-Check?</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Enable mini-check for this over? Bowler will bowl 3 balls; then swap, or choose "mini-full".</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onChoose(false)}>Skip</Button>
          <Button onClick={() => onChoose(true)}>Enable</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const wideWicketKinds: DismissalKind[] = ["Run Out", "Stumped", "Hit Wicket", "Obstructing the Field", "Hit the Ball Twice"];
const noBallWicketKinds: DismissalKind[] = ["Run Out", "Hit Wicket", "Obstructing the Field", "Hit the Ball Twice"];

function ExtraDialog({ kind, open, setOpen, onSubmit }: { kind: "wide" | "noball" | "bye" | "legbye" | null; open: boolean; setOpen: (b: boolean) => void; onSubmit: (addRuns: number, wicket?: DismissalKind) => void }) {
  if (!kind) return null;
  const runs = kind === "bye" || kind === "legbye" ? [1, 2, 3, 4, 6] : kind === "wide" ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 6];
  const wicketsAllowed = kind === "wide" ? wideWicketKinds : kind === "noball" ? noBallWicketKinds : [];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>{kind.toUpperCase()} — additional runs?</DialogTitle></DialogHeader>
        <div className="grid grid-cols-4 gap-2">
          {runs.map((r) => <Button key={r} variant="outline" onClick={() => onSubmit(r)}>{r}</Button>)}
        </div>
        {wicketsAllowed.length > 0 && (
          <>
            <div className="mt-3 text-xs uppercase text-muted-foreground">Wicket on this {kind}?</div>
            <div className="grid grid-cols-2 gap-2">
              {wicketsAllowed.map((w) => <Button key={w} variant="destructive" size="sm" onClick={() => onSubmit(0, w)}>{w}</Button>)}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WicketDialog({ open, setOpen, inn, bowlingPool, battingStriker, battingNonStriker, wicketkeeperId, settings, freeHit, onSubmit }: {
  open: boolean; setOpen: (b: boolean) => void; inn: InningState; bowlingPool: string[];
  battingStriker?: string; battingNonStriker?: string; wicketkeeperId?: string;
  settings: MatchSettings; freeHit: boolean;
  onSubmit: (d: Dismissal, runsOnBall: number) => void;
}) {
  const { players } = useApp();
  const kinds: DismissalKind[] = [
    "Bowled", "Caught", "Caught And Bowled", "LBW", "Run Out", "Stumped",
    "Hit Wicket", "Obstructing the Field", "Hit the Ball Twice", "Timed Out",
    ...(settings.oneHandOneBounce ? (["One Hand One Bounce"] as DismissalKind[]) : []),
  ];
  const [kind, setKind] = useState<DismissalKind | null>(null);
  const [fielder, setFielder] = useState<string>("");
  const [outBatter, setOutBatter] = useState<string>(battingStriker ?? "");
  const [runsOnBall, setRunsOnBall] = useState(0);

  useEffect(() => { setOutBatter(battingStriker ?? ""); }, [battingStriker, open]);

  if (!open) return null;
  const isFreeHitProtected = freeHit && kind && !["Run Out", "Hit Wicket", "Obstructing the Field", "Hit the Ball Twice"].includes(kind);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Wicket — how out?</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {kinds.map((k) => <Button key={k} variant={kind === k ? "default" : "outline"} size="sm" onClick={() => setKind(k)}>{k}</Button>)}
        </div>
        {kind && isFreeHitProtected && (
          <p className="rounded bg-amber-600/20 p-2 text-xs text-amber-400">Free hit — only run-out type dismissals allowed. Pick another.</p>
        )}
        {kind && (kind === "Caught" || kind === "Stumped" || kind === "Run Out" || kind === "One Hand One Bounce") && (
          <div>
            <div className="mb-1 text-xs text-muted-foreground">{kind === "Stumped" ? "Wicketkeeper" : "Fielder"}</div>
            <Select value={fielder} onValueChange={setFielder}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__skip__">Skip</SelectItem>
                {bowlingPool.map((id) => <SelectItem key={id} value={id}>{players[id]?.name}{id === wicketkeeperId ? " (WK)" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {kind === "Run Out" && battingNonStriker && (
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Which batter is out?</div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={outBatter === battingStriker ? "default" : "outline"} onClick={() => setOutBatter(battingStriker!)}>{players[battingStriker!]?.name}</Button>
              <Button variant={outBatter === battingNonStriker ? "default" : "outline"} onClick={() => setOutBatter(battingNonStriker!)}>{players[battingNonStriker!]?.name}</Button>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Runs completed before run-out</div>
            <div className="grid grid-cols-5 gap-1">
              {[0, 1, 2, 3, 4].map((n) => <Button key={n} size="sm" variant={runsOnBall === n ? "default" : "outline"} onClick={() => setRunsOnBall(n)}>{n}</Button>)}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            disabled={!kind || (isFreeHitProtected as boolean) || !outBatter}
            onClick={() => {
              if (!kind) return;
              const noBowlerCredit: DismissalKind[] = ["Run Out", "Obstructing the Field", "Hit the Ball Twice", "Timed Out"];
              const d: Dismissal = {
                kind,
                outBatsmanId: outBatter || battingStriker!,
                bowlerId: inn.currentBowlerId,
                creditBowler: !noBowlerCredit.includes(kind),
                fielderId: kind === "Stumped" ? (fielder && fielder !== "__skip__" ? fielder : wicketkeeperId) :
                  (fielder && fielder !== "__skip__") ? fielder : undefined,
              };
              onSubmit(d, kind === "Run Out" ? runsOnBall : 0);
              setKind(null); setFielder(""); setRunsOnBall(0);
            }}
          >Confirm wicket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Voice: very small grammar
function startVoice(score: (n: number) => void) {
  type SRResult = { transcript: string };
  type SREvent = { results: ArrayLike<ArrayLike<SRResult>> };
  type SRInst = { lang: string; start: () => void; onresult: ((e: SREvent) => void) | null; onerror: (() => void) | null };
  type SRCtor = new () => SRInst;
  const w = window as unknown as { webkitSpeechRecognition?: SRCtor; SpeechRecognition?: SRCtor };
  const SR = w.webkitSpeechRecognition ?? w.SpeechRecognition;
  if (!SR) { toast.error("Voice not supported on this browser"); return; }
  const rec = new SR();
  rec.lang = "en-IN";
  rec.onresult = (e) => {
    const t = e.results[0][0].transcript.toLowerCase();
    const map: Record<string, number> = { zero: 0, dot: 0, one: 1, two: 2, three: 3, four: 4, six: 6 };
    for (const k of Object.keys(map)) if (t.includes(k)) { score(map[k]); toast.success(`Voice: ${k}`); return; }
    toast.error(`Unrecognized: "${t}"`);
  };
  rec.onerror = () => toast.error("Voice error");
  rec.start();
}

// ============================================================ FINISHED
function FinishedView() {
  const { currentMatch, setCurrentMatch } = useApp();
  if (!currentMatch) return null;
  const m = currentMatch;
  const seriesLeft = m.settings.seriesCount - m.settings.seriesIndex;
  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <MatchSummary match={m} />
      <div className="flex flex-wrap gap-2">
        {seriesLeft > 0 ? (
          <Button
            className="flex-1"
            onClick={() => {
              // Next match same teams, advance series index
              const t1 = m.team1, t2 = m.team2, s = m.settings;
              const next: Match = {
                id: uid(), createdAt: Date.now(),
                settings: { ...s, seriesIndex: s.seriesIndex + 1 },
                team1: t1, team2: t2,
                innings: [emptyInning(t1.teamId, t2.teamId, t1.playerIds), emptyInning(t2.teamId, t1.teamId, t2.playerIds)],
                currentInning: 0, status: "captains",
                relluKattaId: m.relluKattaId,
              };
              setCurrentMatch(next);
            }}
          >Next match ({seriesLeft} left)</Button>
        ) : null}
        <Button variant="outline" className="flex-1" onClick={() => setCurrentMatch(null)}>New match (change teams)</Button>
      </div>
    </div>
  );
}
