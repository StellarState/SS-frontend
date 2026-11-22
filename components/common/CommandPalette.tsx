"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { commandRegistry, PRESET_COMMANDS, type Command } from "@/lib/commands";

const RECENT_KEY = "command-palette-recent";
const MAX_RECENT = 5;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecent(id: string): void {
  const prev = loadRecent().filter((x) => x !== id);
  localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, MAX_RECENT)));
}

function groupByCategory(commands: Command[]): Record<string, Command[]> {
  const groups: Record<string, Command[]> = {};
  for (const cmd of commands) {
    if (!groups[cmd.category]) groups[cmd.category] = [];
    groups[cmd.category].push(cmd);
  }
  return groups;
}

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const all = commandRegistry.getAll();
  const withShortcuts = all.filter((c) => c.shortcut);
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col rounded-lg bg-background p-6"
      data-testid="shortcuts-overlay"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Keyboard shortcuts</h2>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close shortcuts">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1 overflow-y-auto text-sm">
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Open palette</span>
          <kbd className="rounded border px-1.5 py-0.5 text-xs font-mono">⌘K</kbd>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Navigate</span>
          <kbd className="rounded border px-1.5 py-0.5 text-xs font-mono">↑ ↓</kbd>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Run command</span>
          <kbd className="rounded border px-1.5 py-0.5 text-xs font-mono">↵</kbd>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Close</span>
          <kbd className="rounded border px-1.5 py-0.5 text-xs font-mono">Esc</kbd>
        </div>
        {withShortcuts.length > 0 && <Separator className="my-2" />}
        {withShortcuts.map((cmd) => (
          <div key={cmd.id} className="flex justify-between py-1">
            <span className="text-muted-foreground">{cmd.label}</span>
            <kbd className="rounded border px-1.5 py-0.5 text-xs font-mono">
              {cmd.shortcut}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Register preset commands with router-based actions on mount.
  useEffect(() => {
    const routes: Record<string, string> = {
      "nav-marketplace": "/marketplace",
      "nav-portfolio": "/investor/portfolio",
      "nav-create-invoice": "/issuer/new",
      "nav-statements": "/investor/settlements",
      "nav-settings": "/settings",
    };
    for (const preset of PRESET_COMMANDS) {
      commandRegistry.register({
        ...preset,
        action: () => router.push(routes[preset.id] ?? "/"),
      });
    }
  }, [router]);

  const all = commandRegistry.getAll();
  const recentIds = loadRecent();

  const filtered = query.trim()
    ? all.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : all;

  const recentCommands = recentIds
    .map((id) => all.find((c) => c.id === id))
    .filter(Boolean) as Command[];

  const displayed = query.trim() ? filtered : [...recentCommands, ...filtered.filter((c) => !recentIds.includes(c.id))];

  const run = useCallback(
    (cmd: Command) => {
      saveRecent(cmd.id);
      setOpen(false);
      setQuery("");
      setActiveIndex(0);
      cmd.action();
    },
    []
  );

  // Global keyboard listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else {
          setOpen(false);
          setQuery("");
        }
        return;
      }
      if (!inField && e.key === "?") {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, displayed.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const cmd = displayed[activeIndex];
        if (cmd) run(cmd);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, displayed, activeIndex, showShortcuts, run]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setActiveIndex(0);
    }
  }, [open]);

  if (!open) return null;

  const groups = groupByCategory(displayed);
  const hasRecent = !query.trim() && recentCommands.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setOpen(false);
          setQuery("");
        }
      }}
      data-testid="command-palette-backdrop"
    >
      <div
        className="relative w-full max-w-lg rounded-lg border bg-background shadow-2xl overflow-hidden"
        data-testid="command-palette"
      >
        {showShortcuts && (
          <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
        )}

        {/* Search input */}
        <div className="flex items-center border-b px-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Type a command or search…"
            className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            data-testid="command-palette-input"
          />
          <button
            type="button"
            onClick={() => setShowShortcuts(true)}
            className="ml-2 text-muted-foreground hover:text-foreground"
            aria-label="Show keyboard shortcuts"
            title="Press ? to see shortcuts"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2" role="listbox" data-testid="command-results">
          {displayed.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No commands found.
            </p>
          )}

          {hasRecent && (
            <div>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent
              </p>
              {recentCommands.map((cmd) => {
                const idx = displayed.indexOf(cmd);
                return (
                  <CommandItem
                    key={cmd.id}
                    command={cmd}
                    isActive={activeIndex === idx}
                    onSelect={() => run(cmd)}
                    onHover={() => setActiveIndex(idx)}
                  />
                );
              })}
              {Object.keys(groups).length > 0 && <Separator className="my-1" />}
            </div>
          )}

          {Object.entries(groups)
            .filter(([, cmds]) =>
              hasRecent ? cmds.some((c) => !recentIds.includes(c.id)) : true
            )
            .map(([category, cmds]) => {
              const toShow = hasRecent
                ? cmds.filter((c) => !recentIds.includes(c.id))
                : cmds;
              if (toShow.length === 0) return null;
              return (
                <div key={category}>
                  <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </p>
                  {toShow.map((cmd) => {
                    const idx = displayed.indexOf(cmd);
                    return (
                      <CommandItem
                        key={cmd.id}
                        command={cmd}
                        isActive={activeIndex === idx}
                        onSelect={() => run(cmd)}
                        onHover={() => setActiveIndex(idx)}
                      />
                    );
                  })}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function CommandItem({
  command,
  isActive,
  onSelect,
  onHover,
}: {
  command: Command;
  isActive: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isActive}
      onClick={onSelect}
      onMouseEnter={onHover}
      data-testid={`command-item-${command.id}`}
      className={`flex w-full items-center justify-between px-3 py-2 text-sm ${
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
      }`}
    >
      <span>{command.label}</span>
      {command.shortcut && (
        <Badge variant="outline" className="font-mono text-xs">
          {command.shortcut}
        </Badge>
      )}
    </button>
  );
}
