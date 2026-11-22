export interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

class CommandRegistry {
  private commands: Command[] = [];

  register(command: Command): void {
    if (this.commands.some((c) => c.id === command.id)) return;
    this.commands.push(command);
  }

  getAll(): Command[] {
    return this.commands;
  }
}

export const commandRegistry = new CommandRegistry();

// Pre-registered navigation commands (registered lazily — actions reference
// the router, so they are injected at mount time by the CommandPalette).
export const PRESET_COMMANDS: Omit<Command, "action">[] = [
  {
    id: "nav-marketplace",
    label: "Marketplace",
    category: "Navigation",
    shortcut: undefined,
  },
  {
    id: "nav-portfolio",
    label: "Portfolio",
    category: "Navigation",
    shortcut: undefined,
  },
  {
    id: "nav-create-invoice",
    label: "Create Invoice",
    category: "Actions",
    shortcut: undefined,
  },
  {
    id: "nav-statements",
    label: "Statements",
    category: "Navigation",
    shortcut: undefined,
  },
  {
    id: "nav-settings",
    label: "Settings",
    category: "Navigation",
    shortcut: undefined,
  },
];
