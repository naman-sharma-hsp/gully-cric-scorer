import { Link, useRouterState } from "@tanstack/react-router";
import { Trophy, ListOrdered, History as HistoryIcon, Users } from "lucide-react";
import logoAsset from "@/assets/logo.png.asset.json";

const tabs = [
  { to: "/match", label: "Match", Icon: Trophy },
  { to: "/stats", label: "Stats", Icon: ListOrdered },
  { to: "/history", label: "History", Icon: HistoryIcon },
  { to: "/teams", label: "Teams", Icon: Users },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isSplash = path === "/";
  if (isSplash) return <>{children}</>;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <img src={logoAsset.url} alt="Gully Cricket Scorer" className="h-9 w-9 rounded-full object-cover" />
        <div className="flex flex-col leading-tight">
          <span className="display text-lg tracking-wide text-foreground">GULLY CRICKET SCORER</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-orange">street rules · real game</span>
        </div>
      </header>
      <main className="flex-1 pb-24">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card">
        <ul className="mx-auto flex max-w-xl">
          {tabs.map(({ to, label, Icon }) => {
            const active = path.startsWith(to);
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  className={`flex flex-col items-center gap-1 py-3 text-xs ${active ? "text-orange" : "text-muted-foreground"}`}
                >
                  <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                  <span className="font-semibold tracking-wide">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
