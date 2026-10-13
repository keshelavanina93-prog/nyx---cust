"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Monitor, Moon, Search, Sun } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export type CommandPaletteItem = {
  /** unique id */
  id: string;
  label: string;
  /** navigates with the Next router when selected */
  href?: string;
  /** called when selected (in addition to / instead of `href`) */
  onSelect?: () => void;
  /** group heading; items without a group are listed first */
  group?: string;
  icon?: React.ReactNode;
  /** extra search terms */
  keywords?: string[];
  /** right-aligned hint text (e.g. "G D") */
  shortcut?: string;
};

type Registry = Record<string, CommandPaletteItem[]>;

type Ctx = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** register items under an owner key; returns an unregister function */
  register: (owner: string, items: CommandPaletteItem[]) => () => void;
  hasItems: boolean;
};

const PaletteContext = React.createContext<Ctx | null>(null);

export function useCommandPalette(): Ctx {
  const ctx = React.useContext(PaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used inside <CommandPalette>");
  return ctx;
}

/**
 * Registers `items` in the palette while the calling component is mounted.
 * Pages/shells call this with their routes and actions; the palette is global (mounted in the root layout).
 */
export function useRegisterCommands(items: CommandPaletteItem[]) {
  const { register } = useCommandPalette();
  const ref = React.useRef(items);
  ref.current = items;
  const owner = React.useId();
  const signature = items.map((i) => `${i.id}\u0000${i.label}\u0000${i.href ?? ""}\u0000${i.group ?? ""}`).join("\u0001");
  React.useEffect(() => register(owner, ref.current), [register, owner, signature]);
}

/** Renders nothing; convenient for server components to register items (`<RegisterCommands items=... />`). */
export function RegisterCommands({ items }: { items: CommandPaletteItem[] }) {
  useRegisterCommands(items);
  return null;
}

const subscribeNoop = () => () => {};
function useIsMac() {
  return React.useSyncExternalStore(
    subscribeNoop,
    () => /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent),
    () => false,
  );
}

export function ShortcutKeys({ className }: { className?: string }) {
  const mac = useIsMac();
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      <Kbd>{mac ? "⌘" : "Ctrl"}</Kbd>
      <Kbd>K</Kbd>
    </span>
  );
}

/** Button that opens the palette. `compact` renders an icon-only button (mobile). */
export function CommandPaletteTrigger({ compact = false, className }: { compact?: boolean; className?: string }) {
  const t = useTranslations("shell");
  const { setOpen } = useCommandPalette();
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("search")}
        className={cn("inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35", className)}
      >
        <Search className="size-4" aria-hidden />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t("commandPalette")}
      aria-keyshortcuts="Control+K Meta+K"
      className={cn(
        "inline-flex h-9 w-64 items-center gap-2 rounded-lg border border-input bg-card/70 px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
        className,
      )}
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate text-left">{t("search")}</span>
      <ShortcutKeys />
    </button>
  );
}

export function CommandPalette({ children, items = [] }: { children?: React.ReactNode; /** static items always available */ items?: CommandPaletteItem[] }) {
  const t = useTranslations("shell");
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [registry, setRegistry] = React.useState<Registry>({});

  const register = React.useCallback((owner: string, list: CommandPaletteItem[]) => {
    setRegistry((r) => ({ ...r, [owner]: list }));
    return () =>
      setRegistry((r) => {
        const next = { ...r };
        delete next[owner];
        return next;
      });
  }, []);

  const all = React.useMemo(() => [...items, ...Object.values(registry).flat()], [items, registry]);
  const hasItems = all.length > 0;

  React.useEffect(() => {
    if (!hasItems) return;
    const onKey = (e: KeyboardEvent) => {
      // e.code keeps the shortcut working on the Georgian keyboard layout
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key.toLowerCase() === "k" || e.code === "KeyK")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hasItems]);

  const groups = React.useMemo(() => {
    const map = new Map<string, CommandPaletteItem[]>();
    for (const item of all) {
      const key = item.group ?? "";
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()].sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : 0));
  }, [all]);

  const run = React.useCallback(
    (fn: () => void) => {
      setOpen(false);
      fn();
    },
    [],
  );

  const ctx = React.useMemo<Ctx>(() => ({ open, setOpen, register, hasItems }), [open, register, hasItems]);

  return (
    <PaletteContext.Provider value={ctx}>
      {children}
      <CommandDialog open={open && hasItems} onOpenChange={setOpen} title={t("commandPalette")} description={t("searchPlaceholder")}>
        <CommandInput placeholder={t("searchPlaceholder")} />
        <CommandList>
          <CommandEmpty>{t("commandEmpty")}</CommandEmpty>
          {groups.map(([group, list]) => (
            <CommandGroup key={group || "_"} heading={group || undefined}>
              {list.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  keywords={[item.label, ...(item.keywords ?? [])]}
                  onSelect={() =>
                    run(() => {
                      item.onSelect?.();
                      if (item.href) router.push(item.href);
                    })
                  }
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                  {item.shortcut ? <CommandShortcut>{item.shortcut}</CommandShortcut> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandGroup heading={t("theme")}>
            {(
              [
                ["light", t("light"), <Sun key="l" aria-hidden />],
                ["dark", t("dark"), <Moon key="d" aria-hidden />],
                ["system", t("system"), <Monitor key="s" aria-hidden />],
              ] as const
            ).map(([value, label, icon]) => (
              <CommandItem key={value} value={`theme-${value}`} keywords={[label, t("theme")]} onSelect={() => run(() => setTheme(value))}>
                {icon}
                <span>{label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </PaletteContext.Provider>
  );
}
