import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/store";
import { computeStats } from "@/lib/cricket-engine";
import { Card } from "@/components/ui/card";
import { useMemo } from "react";

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "Stats · Gully Cricket Scorer" }] }),
  component: StatsPage,
});

function StatsPage() {
  const { matches, players, teams } = useApp();
  const stats = useMemo(
    () => computeStats(matches, (id) => players[id]?.name ?? "Unknown", (id) => teams[id]?.name ?? "Unknown"),
    [matches, players, teams],
  );

  const top = <T,>(arr: T[], pick: (x: T) => number, n = 5) =>
    [...arr].sort((a, b) => pick(b) - pick(a)).slice(0, n);
  const topAsc = <T,>(arr: T[], pick: (x: T) => number, n = 5) =>
    [...arr].sort((a, b) => pick(a) - pick(b)).slice(0, n);

  const sr = (b: { runs: number; balls: number }) => (b.balls ? (b.runs / b.balls) * 100 : 0);
  const avg = (b: { runs: number; outs: number; innings: number }) =>
    b.outs ? b.runs / b.outs : b.runs;
  const econ = (b: { runs: number; balls: number }) => (b.balls ? (b.runs / b.balls) * 6 : 99);
  const bowlAvg = (b: { runs: number; wickets: number }) => (b.wickets ? b.runs / b.wickets : 999);
  const bowlSR = (b: { balls: number; wickets: number }) => (b.wickets ? b.balls / b.wickets : 999);

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4">
      <h2 className="display text-2xl text-foreground">Standings</h2>

      <Section title="Batting" color="orange">
        <Award title="🧢 Orange Cap" subtitle="Most runs" rows={top(stats.bat, (b) => b.runs).map((b) => [b.name, `${b.runs} runs`])} />
        <Award title="⚡ Super Striker" subtitle="Best strike rate (min 20 balls)" rows={top(stats.bat.filter((b) => b.balls >= 20), sr).map((b) => [b.name, sr(b).toFixed(1)])} />
        <Award title="🎯 Average God" subtitle="Best batting average" rows={top(stats.bat.filter((b) => b.innings >= 2), avg).map((b) => [b.name, avg(b).toFixed(1)])} />
        <Award title="🏏 Four Boss" subtitle="Most 4s" rows={top(stats.bat, (b) => b.fours).map((b) => [b.name, `${b.fours} fours`])} />
        <Award title="💥 Six King" subtitle="Most 6s" rows={top(stats.bat, (b) => b.sixes).map((b) => [b.name, `${b.sixes} sixes`])} />
      </Section>

      <Section title="Bowling" color="lime">
        <Award title="🟣 Purple Cap" subtitle="Most wickets" rows={top(stats.bowl, (b) => b.wickets).map((b) => [b.name, `${b.wickets} wkts`])} />
        <Award title="🔥 Economical Blazer" subtitle="Best economy (min 12 balls)" rows={topAsc(stats.bowl.filter((b) => b.balls >= 12), econ).map((b) => [b.name, econ(b).toFixed(2)])} />
        <Award title="🎯 Wicket Hunter" subtitle="Best strike rate" rows={topAsc(stats.bowl.filter((b) => b.wickets > 0), bowlSR).map((b) => [b.name, bowlSR(b).toFixed(1)])} />
        <Award title="📉 Average King" subtitle="Best bowling avg" rows={topAsc(stats.bowl.filter((b) => b.wickets > 0), bowlAvg).map((b) => [b.name, bowlAvg(b).toFixed(1)])} />
        <Award title="⚫ Dot Ball Dominator" subtitle="Most dot balls" rows={top(stats.bowl, (b) => b.dots).map((b) => [b.name, `${b.dots} dots`])} />
      </Section>

      <Section title="Fielding" color="lime">
        <Award title="🧤 Catch Expert" subtitle="Most catches" rows={top(stats.field, (f) => f.catches).map((f) => [f.name, `${f.catches} ct`])} />
        <Award title="🎯 GunShot Throw" subtitle="Most run outs" rows={top(stats.field, (f) => f.runOuts).map((f) => [f.name, `${f.runOuts} ro`])} />
        <Award title="🔥 Fiery Hands" subtitle="Most stumpings" rows={top(stats.field, (f) => f.stumpings).map((f) => [f.name, `${f.stumpings} st`])} />
      </Section>

      <Section title="Teams" color="orange">
        <Award title="🏆 Most Wins" rows={top(stats.team, (t) => t.wins).map((t) => [t.name, `${t.wins} W`])} />
        <Award title="🎮 Most Matches" rows={top(stats.team, (t) => t.matches).map((t) => [t.name, `${t.matches} M`])} />
        <Award title="📊 Best W/L Ratio" rows={top(stats.team.filter((t) => t.matches >= 2), (t) => (t.losses ? t.wins / t.losses : t.wins)).map((t) => [t.name, (t.losses ? t.wins / t.losses : t.wins).toFixed(2)])} />
      </Section>

      {matches.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No matches played yet. Stats appear here after your first game.
        </p>
      )}
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: "orange" | "lime"; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className={`display text-lg ${color === "orange" ? "text-orange" : "text-lime"}`}>{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Award({ title, subtitle, rows }: { title: string; subtitle?: string; rows: [string, string][] }) {
  return (
    <Card className="gully-card">
      <div className="mb-2">
        <div className="font-bold">{title}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
      <ol className="space-y-1 text-sm">
        {rows.length === 0 && <li className="text-muted-foreground">—</li>}
        {rows.map(([n, v], i) => (
          <li key={i} className="flex justify-between">
            <span><span className="text-muted-foreground">{i + 1}.</span> {n}</span>
            <span className="font-bold text-orange">{v}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
