export type ShortcutDefinition = {
  id: string;
  label: string;
  keys: string;
  ariaKeyShortcuts: string;
  scope: "shell" | "canvas";
};

export const MODELER_SHORTCUTS: readonly ShortcutDefinition[] = [
  {
    id: "toggle-left-sidebar",
    label: "Toggle left sidebar",
    keys: "Ctrl+B",
    ariaKeyShortcuts: "Control+B",
    scope: "shell",
  },
  {
    id: "toggle-right-sidebar",
    label: "Toggle right sidebar",
    keys: "Ctrl+I",
    ariaKeyShortcuts: "Control+I",
    scope: "shell",
  },
  {
    id: "toggle-shortcuts",
    label: "Open keyboard shortcuts",
    keys: "?",
    ariaKeyShortcuts: "Shift+Slash",
    scope: "shell",
  },
  {
    id: "open-analysis",
    label: "Open analysis panel",
    keys: "Ctrl+Shift+A",
    ariaKeyShortcuts: "Control+Shift+A",
    scope: "shell",
  },
  {
    id: "save-version",
    label: "Save version",
    keys: "Ctrl+S",
    ariaKeyShortcuts: "Control+S",
    scope: "shell",
  },
  {
    id: "step-tick",
    label: "Advance one simulation tick",
    keys: "Ctrl+Enter",
    ariaKeyShortcuts: "Control+Enter",
    scope: "canvas",
  },
  {
    id: "toggle-run",
    label: "Pause or run simulation",
    keys: "Space",
    ariaKeyShortcuts: "Space",
    scope: "canvas",
  },
  {
    id: "auto-layout",
    label: "Auto-layout graph",
    keys: "Ctrl+Shift+L",
    ariaKeyShortcuts: "Control+Shift+L",
    scope: "canvas",
  },
  {
    id: "clear-selection",
    label: "Clear current selection",
    keys: "Esc",
    ariaKeyShortcuts: "Escape",
    scope: "canvas",
  },
  {
    id: "delete-element",
    label: "Delete selected element",
    keys: "Delete",
    ariaKeyShortcuts: "Delete",
    scope: "canvas",
  },
];

export function shortcutById(id: ShortcutDefinition["id"]) {
  return MODELER_SHORTCUTS.find((shortcut) => shortcut.id === id);
}

export function shortcutsByScope(scope: ShortcutDefinition["scope"]) {
  return MODELER_SHORTCUTS.filter((shortcut) => shortcut.scope === scope);
}
