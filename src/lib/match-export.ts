import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import type { Match } from "./cricket-types";

export function buildSummaryText(match: Match, pname: (id: string) => string): string {
  const t1 = match.innings.find((i) => i.battingTeamId === match.team1.teamId)!;
  const t2 = match.innings.find((i) => i.battingTeamId === match.team2.teamId)!;
  const ov = (b: number) => `${Math.floor(b / 6)}.${b % 6}`;
  const lines = [
    `🏏 ${match.team1.teamName} vs ${match.team2.teamName}`,
    `${match.team1.teamName}: ${t1.runs}/${t1.wickets} (${ov(t1.legalBalls)})`,
    `${match.team2.teamName}: ${t2.runs}/${t2.wickets} (${ov(t2.legalBalls)})`,
  ];
  if (match.result?.margin) lines.push(`Result: ${match.result.margin}`);
  if (match.result?.manOfMatchId) lines.push(`Player of the Match: ${pname(match.result.manOfMatchId)}`);
  lines.push("", "Scored with Gully Cricket Scorer");
  return lines.join("\n");
}

async function snapshot(el: HTMLElement): Promise<HTMLCanvasElement> {
  return await html2canvas(el, {
    backgroundColor: getComputedStyle(document.body).backgroundColor || "#0b0b0b",
    scale: 2,
    useCORS: true,
  });
}

export async function exportAsPng(el: HTMLElement, filename: string) {
  const canvas = await snapshot(el);
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.png`;
  a.click();
}

export async function exportAsPdf(el: HTMLElement, filename: string) {
  const canvas = await snapshot(el);
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "p", unit: "px", format: [canvas.width, canvas.height] });
  pdf.addImage(img, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(`${filename}.pdf`);
}

export async function shareScorecard(el: HTMLElement, text: string, filename: string): Promise<"shared" | "downloaded" | "copied"> {
  const canvas = await snapshot(el);
  const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
  if (blob && typeof navigator !== "undefined" && "share" in navigator) {
    const file = new File([blob], `${filename}.png`, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    try {
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text, title: "Scorecard" });
        return "shared";
      }
      await nav.share({ text, title: "Scorecard" });
      return "shared";
    } catch {
      // fall through
    }
  }
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  try {
    await navigator.clipboard?.writeText(text);
    return "copied";
  } catch {
    return "downloaded";
  }
}

export function shareToWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}
export function shareToTelegram(text: string) {
  window.open(`https://t.me/share/url?url=${encodeURIComponent("https://gully-cric-scorer.lovable.app")}&text=${encodeURIComponent(text)}`, "_blank");
}
export function shareToTwitter(text: string) {
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
}
