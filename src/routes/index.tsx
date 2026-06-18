import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import transparentLogo from "@/assets/logo-transparent.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gully Cricket Scorer" },
      { name: "description", content: "Score street cricket matches with custom gully rules — Rellu Katta, mini-check, tip & run, and more." },
      { property: "og:title", content: "Gully Cricket Scorer" },
      { property: "og:description", content: "Score street cricket matches with custom gully rules." },
    ],
  }),
  component: Splash,
});

function Splash() {
  const nav = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => nav({ to: "/match" }), 2300);
    return () => clearTimeout(t);
  }, [nav]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background brush-bg animate-splash-fade">
      <div className="relative h-44 w-44">
        <img src={transparentLogo} alt="Gully Cricket Scorer" className="absolute inset-0 h-44 w-44 animate-spin-slow rounded-full drop-shadow-2xl" />
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-transparent to-black/50 shadow-[inset_-10px_-10px_24px_rgba(0,0,0,0.55),inset_10px_10px_24px_rgba(255,255,255,0.18)]" />
      </div>
      <h1 className="display text-3xl tracking-wider text-foreground">GULLY CRICKET SCORER</h1>
      <p className="text-xs uppercase tracking-[0.4em] text-orange">loading the pitch…</p>
    </div>
  );
}
