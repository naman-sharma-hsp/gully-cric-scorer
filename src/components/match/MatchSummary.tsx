import { useState } from "react";
import type { Match } from "@/lib/cricket-types";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scorecard } from "./Scorecard";

export function MatchSummary({ match }: { match: Match }) {
  const { players, teams } = useApp();
  const [showCard, setShowCard] = useState(false);
  const pname = (id?: string) => (id ? players[id]?.name ?? "—" : "—");
  const tname = (id: string) => teams[id]?.name ?? match.team1.teamId === id ? match.team1.teamName : match.team2.teamName;

  const team1Inn = match.innings.find((i) => i.battingTeamId === match.team1.teamId)!;
  const team2Inn = match.innings.find((i) => i.battingTeamId === match.team2.teamId)!;

  const winId = match.result?.winnerTeamId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="display text-2xl text-foreground">Match Summary</h2>
        <Button size="sm" variant="outline" onClick={() => setShowCard((s) => !s)}>
          {showCard ? "Hide" : "Full"} scorecard
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TeamScoreCard name={match.team1.teamName} inn={team1Inn} winner={winId === match.team1.teamId} />
        <TeamScoreCard name={match.team2.teamName} inn={team2Inn} winner={winId === match.team2.teamId} />
      </div>

      <Card className="gully-card text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Result</div>
        <div className="display text-xl text-orange">{match.result?.margin ?? "—"}</div>
      </Card>

      {match.result?.manOfMatchId && (
        <Card className="gully-card text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Player of the Match</div>
          <div className="display text-xl text-lime">{pname(match.result.manOfMatchId)}</div>
        </Card>
      )}

      <Card className="gully-card text-sm">
        <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Match Summary</div>
        <p>
          {match.team1.teamName} <b>{team1Inn.runs}/{team1Inn.wickets}</b> ({Math.floor(team1Inn.legalBalls/6)}.{team1Inn.legalBalls%6}) ·{" "}
          {match.team2.teamName} <b>{team2Inn.runs}/{team2Inn.wickets}</b> ({Math.floor(team2Inn.legalBalls/6)}.{team2Inn.legalBalls%6}).
          {" "}{match.result?.margin}.
        </p>
      </Card>

      {showCard && <Scorecard match={match} />}
    </div>
  );
}

function TeamScoreCard({ name, inn, winner }: { name: string; inn: { runs: number; wickets: number; legalBalls: number }; winner: boolean }) {
  return (
    <Card className={`gully-card text-center ${winner ? "border-lime bg-lime/10" : ""}`}>
      <div className="display text-lg">{name}</div>
      <div className="display text-3xl text-orange">{inn.runs}/{inn.wickets}</div>
      <div className="text-xs text-muted-foreground">{Math.floor(inn.legalBalls/6)}.{inn.legalBalls%6} overs</div>
      {winner && <div className="mt-1 text-xs font-bold uppercase tracking-widest text-lime">Winner</div>}
    </Card>
  );
}
