import type { Match, InningState, Delivery } from "@/lib/cricket-types";
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

function ballLabel(d: Delivery): string {
  if (d.dismissal) return "W";
  if (d.extraKind === "wide") return `Wd${d.runs ? `+${d.runs}` : ""}`;
  if (d.extraKind === "noball") return `Nb${d.runs ? `+${d.runs}` : ""}`;
  if (d.extraKind === "bye") return `B${d.runs}`;
  if (d.extraKind === "legbye") return `Lb${d.runs}`;
  if (d.extraKind === "penalty") return `P${d.runs}`;
  return String(d.runs);
}

function ballColor(d: Delivery): string {
  if (d.dismissal) return "bg-red-600 text-white";
  if (d.runs === 6) return "bg-orange text-black";
  if (d.runs === 4) return "bg-lime text-black";
  if (d.extraKind) return "bg-muted text-foreground";
  if (d.runs === 0) return "bg-background border border-border text-muted-foreground";
  return "bg-secondary text-foreground";
}

function OverByOver({ inn, pname }: { inn: InningState; pname: (id?: string) => string }) {
  const overs: Delivery[][] = [];
  let cur: Delivery[] = [];
  let legalInOver = 0;
  for (const d of inn.deliveries) {
    cur.push(d);
    if (d.isLegal) legalInOver += 1;
    if (legalInOver === 6) { overs.push(cur); cur = []; legalInOver = 0; }
  }
  if (cur.length) overs.push(cur);
  if (overs.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Over by Over</div>
      <div className="space-y-2">
        {overs.map((balls, i) => {
          const runs = balls.reduce((s, b) => s + (b.extraRuns ?? 0) + b.runs, 0);
          const wkts = balls.filter((b) => b.dismissal).length;
          const bowlerId = balls[0]?.bowlerId;
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-10 shrink-0 font-mono text-muted-foreground">Ov {i + 1}</div>
              <div className="flex flex-wrap gap-1">
                {balls.map((b) => (
                  <span key={b.id} className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded px-1 font-mono text-[11px] font-bold ${ballColor(b)}`}>{ballLabel(b)}</span>
                ))}
              </div>
              <div className="ml-auto shrink-0 text-right">
                <div className="font-mono font-bold">{runs}{wkts ? `-${wkts}` : ""}</div>
                <div className="max-w-[80px] truncate text-[10px] text-muted-foreground">{pname(bowlerId)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function dismissalText(d: NonNullable<InningState["deliveries"][number]["dismissal"]>, pname: (id?: string) => string): string {
  switch (d.kind) {
    case "Bowled": return `b ${pname(d.bowlerId)}`;
    case "LBW": return `lbw b ${pname(d.bowlerId)}`;
    case "Caught": return `c ${pname(d.fielderId)} b ${pname(d.bowlerId)}`;
    case "Caught And Bowled": return `c & b ${pname(d.bowlerId)}`;
    case "Stumped": return `st ${pname(d.fielderId)} b ${pname(d.bowlerId)}`;
    case "Run Out": return `run out (${pname(d.fielderId)})`;
    case "Hit Wicket": return `hit wicket b ${pname(d.bowlerId)}`;
    case "Obstructing the Field": return `obstructing the field`;
    case "Hit the Ball Twice": return `hit the ball twice`;
    case "Timed Out": return `timed out`;
    case "One Hand One Bounce": return `1h1b (${pname(d.fielderId)}) b ${pname(d.bowlerId)}`;
    default: return "out";
  }
}

function InningCard({ inn, title, pname }: { inn: InningState; title: string; pname: (id?: string) => string }) {
  if (inn.deliveries.length === 0) return null;
  const overs = `${Math.floor(inn.legalBalls / 6)}.${inn.legalBalls % 6}`;
  const totalExtras = inn.extras.wide + inn.extras.noball + inn.extras.bye + inn.extras.legbye + inn.extras.penalty;
  const dismissalFor = (playerId: string) => {
    const d = inn.deliveries.find((x) => x.dismissal?.outBatsmanId === playerId)?.dismissal;
    return d ? dismissalText(d, pname) : "out";
  };
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
                  <div className="text-[10px] text-muted-foreground">{b.out ? dismissalFor(b.playerId) : b.retired ? "retired" : "not out"}</div>
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
