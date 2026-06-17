import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { MatchSummary } from "@/components/match/MatchSummary";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "History · Gully Cricket Scorer" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { matches, teams, deleteMatch } = useApp();
  const [team1, setTeam1] = useState<string>("any");
  const [team2, setTeam2] = useState<string>("any");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      const ids = [m.team1.teamId, m.team2.teamId];
      if (team1 !== "any" && !ids.includes(team1)) return false;
      if (team2 !== "any" && !ids.includes(team2)) return false;
      if (team1 !== "any" && team2 !== "any" && team1 !== team2) {
        if (!(ids.includes(team1) && ids.includes(team2))) return false;
      }
      return true;
    });
  }, [matches, team1, team2]);

  const opened = matches.find((m) => m.id === openId) ?? null;

  if (opened) {
    return (
      <div className="mx-auto max-w-xl space-y-3 p-4">
        <Button variant="ghost" onClick={() => setOpenId(null)}>← Back to history</Button>
        <MatchSummary match={opened} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h2 className="display text-2xl text-foreground">History</h2>

      <Card className="gully-card grid gap-2 sm:grid-cols-2">
        <FilterSelect value={team1} onChange={setTeam1} label="Team A" teams={teams} />
        <FilterSelect value={team2} onChange={setTeam2} label="Team B" teams={teams} />
      </Card>

      {filtered.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No matches found.
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((m) => {
          const winId = m.result?.winnerTeamId;
          const t1Win = winId === m.team1.teamId;
          const t2Win = winId === m.team2.teamId;
          return (
            <Card key={m.id} className="gully-card cursor-pointer" onClick={() => setOpenId(m.id)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</div>
                  <TeamLine name={m.team1.teamName} score={m.innings[0].battingTeamId === m.team1.teamId ? m.innings[0] : m.innings[1]} highlight={t1Win} />
                  <TeamLine name={m.team2.teamName} score={m.innings[0].battingTeamId === m.team2.teamId ? m.innings[0] : m.innings[1]} highlight={t2Win} />
                  <div className="pt-1 text-sm font-bold text-orange">{m.result?.margin ?? "In progress"}</div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this match? Stats will be recomputed.")) deleteMatch(m.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, label, teams }: { value: string; onChange: (v: string) => void; label: string; teams: Record<string, { id: string; name: string }> }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any team</SelectItem>
          {Object.values(teams).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function TeamLine({ name, score, highlight }: { name: string; score: { runs: number; wickets: number; legalBalls: number }; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md px-2 py-1 ${highlight ? "bg-lime/20" : ""}`}>
      <span className="font-semibold">{name}</span>
      <span className="font-mono">{score.runs}/{score.wickets} <span className="text-muted-foreground">({Math.floor(score.legalBalls / 6)}.{score.legalBalls % 6})</span></span>
    </div>
  );
}
