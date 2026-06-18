import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Team, Player, Match } from "./cricket-types";

interface AppState {
  players: Record<string, Player>;
  teams: Record<string, Team>;
  matches: Match[]; // finished matches (history)
  quitMatches: Match[]; // paused/quit matches that can be resumed
  currentMatch: Match | null;

  // player CRUD
  addPlayer: (name: string, photo?: string) => Player;
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  // team CRUD
  addTeam: (name: string, playerIds?: string[]) => Team;
  updateTeam: (id: string, patch: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  addPlayerToTeam: (teamId: string, playerId: string) => void;
  // matches
  setCurrentMatch: (m: Match | null) => void;
  updateCurrentMatch: (fn: (m: Match) => Match) => void;
  finalizeMatch: (m: Match) => void;
  deleteMatch: (id: string) => void;
  quitCurrentMatch: () => void;
  resumeQuitMatch: (id: string) => void;
  deleteQuitMatch: (id: string) => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      players: {},
      teams: {},
      matches: [],
      quitMatches: [],
      currentMatch: null,

      addPlayer: (name, photo) => {
        const p: Player = { id: uid(), name: name.trim(), photo };
        set((s) => ({ players: { ...s.players, [p.id]: p } }));
        return p;
      },
      updatePlayer: (id, patch) =>
        set((s) => ({ players: { ...s.players, [id]: { ...s.players[id], ...patch } } })),
      addTeam: (name, playerIds = []) => {
        const t: Team = { id: uid(), name: name.trim(), playerIds };
        set((s) => ({ teams: { ...s.teams, [t.id]: t } }));
        return t;
      },
      updateTeam: (id, patch) =>
        set((s) => ({ teams: { ...s.teams, [id]: { ...s.teams[id], ...patch } } })),
      deleteTeam: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.teams;
          return { teams: rest };
        }),
      addPlayerToTeam: (teamId, playerId) =>
        set((s) => {
          const t = s.teams[teamId];
          if (!t || t.playerIds.includes(playerId)) return s;
          return { teams: { ...s.teams, [teamId]: { ...t, playerIds: [...t.playerIds, playerId] } } };
        }),

      setCurrentMatch: (m) => set({ currentMatch: m }),
      updateCurrentMatch: (fn) =>
        set((s) => ({ currentMatch: s.currentMatch ? fn(s.currentMatch) : null })),
      finalizeMatch: (m) =>
        set((s) => ({
          matches: [m, ...s.matches.filter((x) => x.id !== m.id)],
          quitMatches: s.quitMatches.filter((x) => x.id !== m.id),
          currentMatch: null,
        })),
      deleteMatch: (id) => set((s) => ({ matches: s.matches.filter((m) => m.id !== id) })),
      quitCurrentMatch: () =>
        set((s) => {
          if (!s.currentMatch) return s;
          const quit: Match = { ...s.currentMatch, status: "quit", quitAt: Date.now() };
          return {
            quitMatches: [quit, ...s.quitMatches.filter((x) => x.id !== quit.id)],
            currentMatch: null,
          };
        }),
      resumeQuitMatch: (id) =>
        set((s) => {
          const m = s.quitMatches.find((x) => x.id === id);
          if (!m) return s;
          const resumed: Match = { ...m, status: "live" };
          return {
            currentMatch: resumed,
            quitMatches: s.quitMatches.filter((x) => x.id !== id),
          };
        }),
      deleteQuitMatch: (id) =>
        set((s) => ({ quitMatches: s.quitMatches.filter((m) => m.id !== id) })),
    }),
    { name: "gully-cricket-v1" },
  ),
);

export { uid };
