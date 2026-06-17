import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import logoAsset from "@/assets/logo.png.asset.json";

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
    const t = setTimeout(() => nav({ to: "/match" }), 1800);
    return () => clearTimeout(t);
  }, [nav]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background brush-bg">
      <img src={logoAsset.url} alt="Gully Cricket Scorer" className="h-44 w-44 animate-spin-slow drop-shadow-2xl" />
      <h1 className="display text-3xl tracking-wider text-foreground">GULLY CRICKET SCORER</h1>
      <p className="text-xs uppercase tracking-[0.4em] text-orange">loading the pitch…</p>
    </div>
  );
}
