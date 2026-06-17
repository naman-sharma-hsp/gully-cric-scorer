import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Camera, X } from "lucide-react";

export const Route = createFileRoute("/teams")({
  head: () => ({ meta: [{ title: "Teams · Gully Cricket Scorer" }] }),
  component: TeamsPage,
});

function TeamsPage() {
  const { teams, players, addTeam, addPlayer, addPlayerToTeam, updateTeam, deleteTeam } = useApp();
  const [newTeamName, setNewTeamName] = useState("");
  const [openTeam, setOpenTeam] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <div>
        <h2 className="display text-2xl text-foreground">Teams</h2>
        <p className="text-sm text-muted-foreground">Build your squads. Used in match setup.</p>
      </div>
      <Card className="gully-card flex gap-2">
        <Input
          placeholder="New team name"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
        />
        <Button
          onClick={() => {
            if (!newTeamName.trim()) return;
            addTeam(newTeamName);
            setNewTeamName("");
          }}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </Card>

      <div className="space-y-3">
        {Object.values(teams).length === 0 && (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No teams yet. Create your first squad above.
          </p>
        )}
        {Object.values(teams).map((t) => (
          <Card key={t.id} className="gully-card">
            <div className="flex items-center justify-between">
              <button
                className="display flex-1 text-left text-xl text-foreground"
                onClick={() => setOpenTeam(openTeam === t.id ? null : t.id)}
              >
                {t.name}
              </button>
              <span className="text-xs text-muted-foreground">{t.playerIds.length} players</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (confirm(`Delete team "${t.name}"?`)) deleteTeam(t.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            {openTeam === t.id && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {t.playerIds.map((pid) => {
                  const p = players[pid];
                  if (!p) return null;
                  return (
                    <div key={pid} className="flex items-center gap-2 rounded-md bg-muted p-2">
                      {p.photo ? (
                        <img src={p.photo} alt={p.name} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange/20 text-xs font-bold text-orange">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="flex-1 text-sm">{p.name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => updateTeam(t.id, { playerIds: t.playerIds.filter((x) => x !== pid) })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
                <AddPlayerRow
                  onAdd={(name, photo) => {
                    const p = addPlayer(name, photo);
                    addPlayerToTeam(t.id, p.id);
                  }}
                />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AddPlayerRow({ onAdd }: { onAdd: (name: string, photo?: string) => void }) {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      // downscale to ~96px
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const size = 96;
        c.width = size; c.height = size;
        const ctx = c.getContext("2d")!;
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        setPhoto(c.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(f);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-orange/20"
      >
        {photo ? <img src={photo} className="h-full w-full rounded-full object-cover" alt="" /> : <Camera className="h-4 w-4" />}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <Input placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} />
      <Button
        size="sm"
        onClick={() => {
          if (!name.trim()) return;
          onAdd(name, photo);
          setName(""); setPhoto(undefined);
        }}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
