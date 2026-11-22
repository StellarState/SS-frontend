"use client";
import { useState } from "react";
import { Bookmark, Check, ChevronDown, Circle, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useSavedViews,
  useSaveView,
  useRenameView,
  useDeleteView,
  encodeFilters,
  decodeFilters,
  MAX_VIEWS,
  type SavedView,
} from "@/hooks/useSavedViews";

interface SavedViewsMenuProps {
  /** Current active filters as a flat key/value map */
  currentFilters: Record<string, string>;
  /** Called when user applies a saved view */
  onApply: (filters: Record<string, string>) => void;
}

function filtersEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a).filter((k) => a[k]);
  const bKeys = Object.keys(b).filter((k) => b[k]);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => a[k] === b[k]);
}

export function SavedViewsMenu({ currentFilters, onApply }: SavedViewsMenuProps) {
  const { data: views = [] } = useSavedViews();
  const saveView = useSaveView();
  const renameView = useRenameView();
  const deleteView = useDeleteView();

  const [newName, setNewName] = useState("");
  const [savingOpen, setSavingOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [appliedViewId, setAppliedViewId] = useState<string | null>(null);

  const atMax = views.length >= MAX_VIEWS;

  // Detect if current filters differ from the applied view
  const appliedView = views.find((v) => v.id === appliedViewId);
  const isModified =
    appliedView != null &&
    !filtersEqual(currentFilters, decodeFilters(appliedView.params));

  function handleApply(view: SavedView) {
    setAppliedViewId(view.id);
    onApply(decodeFilters(view.params));
  }

  function handleSave() {
    const trimmed = newName.trim();
    if (!trimmed || trimmed.length > 40) return;
    if (views.some((v) => v.name.toLowerCase() === trimmed.toLowerCase())) {
      return; // duplicate name — form shows inline error
    }
    saveView.mutate(
      { name: trimmed, params: encodeFilters(currentFilters) },
      {
        onSuccess: () => {
          setNewName("");
          setSavingOpen(false);
        },
      },
    );
  }

  function handleRenameSubmit(id: string) {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed.length > 40) return;
    renameView.mutate({ id, name: trimmed });
    setRenamingId(null);
    setRenameValue("");
  }

  const isDuplicate =
    newName.trim().length > 0 &&
    views.some((v) => v.name.toLowerCase() === newName.trim().toLowerCase());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-9">
          <Bookmark className="size-4" />
          Saved views
          {isModified && (
            <Circle className="size-2 fill-orange-400 text-orange-400" aria-label="Modified" />
          )}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {views.length === 0 ? (
          <DropdownMenuLabel className="text-muted-foreground font-normal text-xs">
            No saved views yet
          </DropdownMenuLabel>
        ) : (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Saved views
            </DropdownMenuLabel>
            {views.map((view) =>
              renamingId === view.id ? (
                <div key={view.id} className="px-2 py-1.5 flex gap-1">
                  <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameSubmit(view.id);
                      if (e.key === "Escape") {
                        setRenamingId(null);
                        setRenameValue("");
                      }
                    }}
                    className="h-7 text-sm"
                    maxLength={40}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => handleRenameSubmit(view.id)}
                  >
                    <Check className="size-4" />
                  </Button>
                </div>
              ) : (
                <DropdownMenuItem
                  key={view.id}
                  className="group flex items-center justify-between gap-2 cursor-pointer"
                  onSelect={(e) => {
                    // Prevent close when clicking action buttons
                    if ((e.target as HTMLElement).closest("[data-action]")) {
                      e.preventDefault();
                    } else {
                      handleApply(view);
                    }
                  }}
                >
                  <span className="truncate text-sm flex-1">
                    {view.name}
                    {view.id === appliedViewId && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {isModified ? "(modified)" : "(active)"}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      data-action="rename"
                      className="p-1 rounded hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(view.id);
                        setRenameValue(view.name);
                      }}
                      title="Rename"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      type="button"
                      data-action="delete"
                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteView.mutate(view.id);
                        if (appliedViewId === view.id) setAppliedViewId(null);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </span>
                </DropdownMenuItem>
              ),
            )}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Save current view form */}
        {savingOpen ? (
          <div className="px-2 py-2 space-y-1.5">
            <Input
              autoFocus
              placeholder="View name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setSavingOpen(false);
                  setNewName("");
                }
              }}
              className="h-7 text-sm"
              maxLength={40}
              aria-label="New saved view name"
            />
            {isDuplicate && (
              <p className="text-xs text-destructive">Name already in use.</p>
            )}
            {newName.trim().length > 40 && (
              <p className="text-xs text-destructive">Max 40 characters.</p>
            )}
            <div className="flex gap-1">
              <Button
                size="sm"
                className="h-7 flex-1 text-xs"
                onClick={handleSave}
                disabled={
                  !newName.trim() ||
                  newName.trim().length > 40 ||
                  isDuplicate ||
                  saveView.isPending
                }
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  setSavingOpen(false);
                  setNewName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : atMax ? (
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1.5">
            Maximum of {MAX_VIEWS} views reached. Delete one to save a new view.
          </DropdownMenuLabel>
        ) : (
          <DropdownMenuItem
            className="gap-2 cursor-pointer text-sm"
            onSelect={(e) => {
              e.preventDefault();
              setSavingOpen(true);
            }}
          >
            <Plus className="size-4" />
            Save current view
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
