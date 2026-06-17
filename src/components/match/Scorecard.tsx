import type { Match, InningState } from "@/lib/cricket-types";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/card";

export function Scorecard({ match }: { match: Match }) {
  const { players } = useApp();
  const pname = (id?: string) => (id ? players[id]?.name ?? "—" : "—");
  return (
    <div className="space-y-4">
      {match.innings.map((inn, i) => (
        <InningCard key={i} inn={inn} title={`${i === 0 ? "1st" : "2nd"} Innings · ${i === 0 ? match.team1.teamName : match.team2.teamName}`} pname={pname} />
      ))}
    </div>
  );
}

function InningCard({ inn, title, pname }: { inn: InningState; title: string; pname: (id?: string) => string }) {
  if (inn.deliveries.length === 0) return null;
  const overs = `${Math.floor(inn.legalBalls / 6)}.${inn.legalBalls % 6}`;
  const totalExtras = inn.extras.wide + inn.extras.noball + inn.extras.bye + inn.extras.legbye + inn.extras.penalty;
  return (
    <Card className="gully-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="display text-lg">{title}</div>
        <div className="font-mono text-xl text-orange">{inn.runs}/{inn.wickets} <span className="text-sm text-muted-foreground">({overs})</span></div>
      </div>

      <div>
        <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Batting</div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr><th className="text-left">Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr>
          </thead>
          <tbody>
            {inn.batters.map((b) => (
              <tr key={b.playerId} className="border-t border-border">
                <td className="py-1 text-left">
                  <div className="font-semibold">{pname(b.playerId)}</div>
                  <div className="text-[10px] text-muted-foreground">{b.out ? b.dismissalText ?? "out" : b.retired ? "retired" : "not out"}</div>
                </td>
                <td className="text-center font-bold">{b.runs}</td>
                <td className="text-center">{b.balls}</td>
                <td className="text-center">{b.fours}</td>
                <td className="text-center">{b.sixes}</td>
                <td className="text-center">{b.balls ? ((b.runs / b.balls) * 100).toFixed(1) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm">
        <span className="text-muted-foreground">Extras: </span>
        <span className="font-bold">{totalExtras}</span>
        <span className="text-muted-foreground"> (wd {inn.extras.wide}, nb {inn.extras.noball}, b {inn.extras.bye}, lb {inn.extras.legbye}, p {inn.extras.penalty})</span>
      </div>

      {inn.fallOfWickets.length > 0 && (
        <div className="text-sm">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Fall of wickets</div>
          <div>{inn.fallOfWickets.map((f) => `${f.runs}-${f.wicket} (${pname(f.playerId)}, ${f.over})`).join(", ")}</div>
        </div>
      )}

      <div>
        <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Bowling</div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr><th className="text-left">Bowler</th><th>O</th><th>R</th><th>W</th><th>Econ</th></tr>
          </thead>
          <tbody>
            {inn.bowlers.map((b) => (
              <tr key={b.playerId} className="border-t border-border">
                <td className="py-1 text-left font-semibold">{pname(b.playerId)}</td>
                <td className="text-center">{Math.floor(b.balls / 6)}.{b.balls % 6}</td>
                <td className="text-center">{b.runs}</td>
                <td className="text-center font-bold">{b.wickets}</td>
                <td className="text-center">{b.balls ? ((b.runs / b.balls) * 6).toFixed(2) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
