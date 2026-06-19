import { useRef, useState } from "react";
import type { Match } from "@/lib/cricket-types";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scorecard } from "./Scorecard";
import { Share2, FileImage, FileText, MessageCircle, Send, Twitter } from "lucide-react";
import { toast } from "sonner";
import {
  buildSummaryText,
  exportAsPdf,
  exportAsPng,
  shareScorecard,
  shareToTelegram,
  shareToTwitter,
  shareToWhatsApp,
} from "@/lib/match-export";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MatchSummary({ match }: { match: Match }) {
  const { players } = useApp();
  const [showCard, setShowCard] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const pname = (id?: string) => (id ? players[id]?.name ?? "—" : "—");

  const team1Inn = match.innings.find((i) => i.battingTeamId === match.team1.teamId)!;
  const team2Inn = match.innings.find((i) => i.battingTeamId === match.team2.teamId)!;
  const winId = match.result?.winnerTeamId;

  const fileBase = `${match.team1.teamName}-vs-${match.team2.teamName}`.replace(/[^a-z0-9-]/gi, "_");
  const summaryText = buildSummaryText(match, (id) => pname(id));

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    if (!exportRef.current) return;
    setBusy(true);
    try {
      // Ensure full scorecard is rendered for export
      const wasOpen = showCard;
      if (!wasOpen) setShowCard(true);
      await new Promise((r) => setTimeout(r, wasOpen ? 0 : 250));
      await fn();
      toast.success(ok);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't complete that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="display text-2xl text-foreground">Match Summary</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShareOpen(true)} disabled={busy}>
            <Share2 className="mr-1 h-3 w-3" /> Share
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCard((s) => !s)}>
            {showCard ? "Hide" : "Full"} scorecard
          </Button>
        </div>
      </div>

      <div ref={exportRef} className="space-y-4 bg-background p-2">
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

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Scorecard</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => run(async () => {
                const res = await shareScorecard(exportRef.current!, summaryText, fileBase);
                if (res === "copied") toast.message("Image downloaded · text copied");
              }, "Ready to share")}
            >
              <Share2 className="mr-1 h-4 w-4" /> Device share
            </Button>
            <Button variant="outline" onClick={() => shareToWhatsApp(summaryText)}>
              <MessageCircle className="mr-1 h-4 w-4 text-[#25D366]" /> WhatsApp
            </Button>
            <Button variant="outline" onClick={() => shareToTelegram(summaryText)}>
              <Send className="mr-1 h-4 w-4 text-[#229ED9]" /> Telegram
            </Button>
            <Button variant="outline" onClick={() => shareToTwitter(summaryText)}>
              <Twitter className="mr-1 h-4 w-4" /> Twitter / X
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => run(() => exportAsPng(exportRef.current!, fileBase), "PNG downloaded")}
            >
              <FileImage className="mr-1 h-4 w-4" /> Export PNG
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => run(() => exportAsPdf(exportRef.current!, fileBase), "PDF downloaded")}
            >
              <FileText className="mr-1 h-4 w-4" /> Export PDF
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Instagram doesn't accept direct web shares — use Device share to send the scorecard image to the Instagram app.
          </p>
        </DialogContent>
      </Dialog>
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
