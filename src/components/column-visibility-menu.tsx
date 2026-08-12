import { Columns3, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ColumnVisibilityOption<T extends string = string> = {
  id: T;
  label: string;
  locked?: boolean;
};

export function useColumnVisibility<T extends string>(
  storageKey: string,
  columns: ColumnVisibilityOption<T>[],
) {
  const defaultVisible = useMemo(() => columns.map((column) => column.id), [columns]);
  const lockedColumns = useMemo(
    () => new Set(columns.filter((column) => column.locked).map((column) => column.id)),
    [columns],
  );
  const validColumns = useMemo(() => new Set(columns.map((column) => column.id)), [columns]);
  const [visibleColumns, setVisibleColumns] = useState<T[]>(() => {
    if (typeof window === "undefined") return defaultVisible;

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return defaultVisible;

      const parsed = JSON.parse(saved) as T[];
      const next = parsed.filter((id) => validColumns.has(id));
      lockedColumns.forEach((id) => {
        if (!next.includes(id)) next.push(id);
      });
      return next.length ? next : defaultVisible;
    } catch {
      return defaultVisible;
    }
  });

  useEffect(() => {
    setVisibleColumns((current) => {
      const next = current.filter((id) => validColumns.has(id));
      lockedColumns.forEach((id) => {
        if (!next.includes(id)) next.push(id);
      });
      return next.length ? next : defaultVisible;
    });
  }, [defaultVisible, lockedColumns, validColumns]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
  }, [storageKey, visibleColumns]);

  function isColumnVisible(id: T) {
    return visibleColumns.includes(id);
  }

  function setColumnVisible(id: T, visible: boolean) {
    if (lockedColumns.has(id)) return;

    setVisibleColumns((current) => {
      if (visible) return current.includes(id) ? current : [...current, id];
      return current.filter((columnId) => columnId !== id);
    });
  }

  function resetColumns() {
    setVisibleColumns(defaultVisible);
  }

  return {
    visibleColumns,
    isColumnVisible,
    setColumnVisible,
    resetColumns,
  };
}

export function ColumnVisibilityMenu<T extends string>({
  columns,
  isColumnVisible,
  setColumnVisible,
  resetColumns,
}: {
  columns: ColumnVisibilityOption<T>[];
  isColumnVisible: (id: T) => boolean;
  setColumnVisible: (id: T, visible: boolean) => void;
  resetColumns: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-medium text-foreground transition hover:bg-accent"
        >
          <Columns3 className="size-3.5" />
          Columns
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">Visible columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={isColumnVisible(column.id)}
            disabled={column.locked}
            onCheckedChange={(checked) => setColumnVisible(column.id, Boolean(checked))}
            className="text-xs"
            onSelect={(event) => event.preventDefault()}
          >
            {column.label}
            {column.locked && <span className="ml-auto text-[10px] text-muted-foreground">Locked</span>}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs" onClick={resetColumns}>
          <RotateCcw className="size-3.5" />
          Reset columns
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
