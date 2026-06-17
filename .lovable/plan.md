## Gully Cricket Scorer — Build Plan

A street-cricket scoring app with custom rules, teams roster, full match flow, stats leaderboards, and match history. Mobile-first design with bottom-tab navigation.

### Design direction
- Visual language inspired by the logo: gritty street/gully aesthetic — black charcoal background, bold orange (#FF6B1A) and lime green (#A3E635) accents, slight grunge/brush texture on headings.
- Display font: condensed/heavy (Anton or Bebas Neue) for headings; body in Inter.
- Bottom nav with 4 icons (Match / Stats / History / Teams), persistent across tabs.
- Loading splash: logo rotating 360° on charcoal background for ~1.5s.

### Tech & data
- All data stored in **localStorage** (no backend required) — teams, players, matches, stats are derived from saved match history.
- Zustand for global state (current match, teams roster, history).
- Routes: `/` (splash → redirects to /match), `/match`, `/stats`, `/history`, `/teams`.
- Single in-route flow for match (setup → toss → live scoring → summary) using a state machine rather than separate URLs.

### Sections to build

**1. Splash screen** — rotating logo, app title "GULLY CRICKET SCORER", auto-advance to Match tab.

**2. Teams tab** — CRUD teams; each team has name + list of players; each player has name + optional photo (file input → base64 in localStorage).

**3. Match tab** — multi-step wizard:
   - **Match Settings** box: Overs (1–100), Players (1–15), Series (1–10) with +/− steppers.
   - **Team 1 / Team 2** boxes: dropdown to pick existing team or "Create new"; player dropdowns (count must equal players-per-team) with "Create new player" option; new teams/players persist to roster.
   - **Match Rules** screen with 5 boxes:
     - Extras (Wide runs 0–5, No-ball runs 0–5)
     - Bowling Rules (Free hit after no-ball toggle, Mini-check toggle, Over limit ∞ or 1–100)
     - Special Gully Rules (Tip & Run, One-Hand One-Bounce, Last-ball Free Hit)
     - Batting Rules (Non-striker toggle, Retired can return toggle)
     - Rellu-Katta (enable toggle)
     - Summary box at bottom
   - If Rellu-Katta enabled → name input screen.
   - **Captain & Wicketkeeper** selection for both teams.
   - **Toss**: "Who calls HEAD?" → two team buttons → flip coin animation → winner picks Bat/Bowl → Start Match.
   - **Live Scoring**:
     - Header: innings, batting team, score/wickets, overs.
     - Striker (\*) and non-striker (if on) with runs(balls); current bowler O–W–R; per-ball icons for current over.
     - Commentary line for last delivery (SIX, FOUR, DOT, WICKET, etc.).
     - Action row: Undo, NS on/off, DM (dismiss over), Ret (retire), CS (swap), WC (change keeper), Voice (Web Speech API).
     - Scoring grid: 0,1,2,3,4,6, Wide, No-Ball, Penalty, Wicket, Leg Bye, Bye.
     - Wicket dialog: 10 dismissal types + catcher/runout-fielder/batsman prompts as specified (correct credit to bowler/fielder/keeper).
     - No-Ball / Wide / Bye / LegBye sub-dialogs with allowed runs and wicket types per spec.
     - Free-hit handling (after no-ball, and last ball of over if rule on).
     - Mini-check prompt at start of each over when toggle on (3 balls → switch bowler or "mini-full").
     - Rellu-Katta logic: cannot bowl when batting; when only Rellu-Katta left to bat and they were bowling → non-striker on prompt (turn off vs. bring on + new bowler) / non-striker off (bring on + new bowler), continuing the over from last ball.
     - Top-right Scorecard button: per-innings batting card, extras breakdown, fall of wickets, bowling card.
   - **Match Summary**: both team scores, winner highlighted green (by runs/wickets), Man of the Match (highest impact: runs + 20×wickets), match summary text, scorecard link. Saves to history & updates stats. If series remaining → "Next Match" or "Change Teams"; else "Done".

**4. Stats tab** — derived from match history:
   - Batting: Orange Cap (most runs), Super Striker (best SR), Average God (best avg), Four Boss (most 4s), Six King (most 6s).
   - Bowling: Purple Cap (most wickets), Economical Blazer (best econ), Wicket Hunter (best SR), Average King (best avg), Dot Ball Dominator (most dots).
   - Team: Most Wins, Most Matches, Best W/L ratio.

**5. History tab** — list cards (teams, scores, winner) → click opens that match's summary/scorecard. Filter by 1 team or head-to-head (2 teams). Delete match removes its contribution from stats (recompute on the fly since stats are derived).

### Technical notes
- Stats computed on-the-fly from `matches[]` in localStorage — deleting a match automatically updates all standings; no separate stat counters to reconcile.
- Per-ball events stored in match record → enables reliable Undo and scorecard reconstruction.
- Voice command: Web Speech API recognizing "zero/one/two/.../six/four/wide/no ball/dot/wicket".
- Coin flip: CSS 3D rotateY animation with random end state.
- Photos: stored as base64 data URLs in localStorage (small thumbs only).

### Scope caveat
This is a very large spec (~30+ screens & many rule interactions). I'll build all of it in one pass, but expect to iterate on edge cases (especially Rellu-Katta + mini-check + free-hit combos) after you try real matches.
