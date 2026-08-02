// src/renderer/components/shared/VirtualTable.tsx
// ---------------------------------------------------------------------------
// Shared virtual-scrolling table using @tanstack/react-virtual.
// Renders a sticky header row plus a scrollable body with only visible rows.
// Matches Mantine Table styling via CSS custom properties.
// ---------------------------------------------------------------------------

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Box, Text } from "@mantine/core";
import { MdArrowUpward, MdArrowDownward } from "react-icons/md";

export interface VirtualTableColumn<T> {
  key: string;
  label: string;
  width?: string;
  grow?: number;
  render: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface VirtualTableProps<T> {
  data: T[];
  columns: VirtualTableColumn<T>[];
  getRowKey: (item: T) => string;
  onRowClick?: (item: T) => void;
  rowStyle?: (item: T, index: number) => React.CSSProperties | undefined;
  estimateSize?: number;
  striped?: boolean;
  highlightOnHover?: boolean;
  sortField?: string | null;
  sortDir?: "asc" | "desc";
  onSort?: (field: string) => void;
  /** Fixed height for the scroll container (pixels or CSS calc string). When omitted, uses flex: 1. */
  height?: number | string;
}

const DEFAULT_ROW_HEIGHT = 48;

export function VirtualTable<T>({
  data,
  columns,
  getRowKey,
  onRowClick,
  rowStyle,
  estimateSize = DEFAULT_ROW_HEIGHT,
  striped = false,
  highlightOnHover = false,
  sortField,
  sortDir,
  onSort,
  height,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* ── Sticky header ──────────────────────────────────────────── */}
      <Box
        component="div"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          display: "flex",
          backgroundColor: "var(--mantine-color-body)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
      >
        {columns.map((col) => (
          <Box
            key={col.key}
            style={{
              width: col.width,
              flex: col.grow ?? (col.width ? "0 0 auto" : "1 1 0%"),
              padding: "var(--table-vertical-spacing, 7px) var(--table-horizontal-spacing, 16px)",
              fontWeight: 700,
              fontSize: "var(--mantine-font-size-sm)",
              color: "var(--mantine-color-dimmed)",
              cursor: col.sortable && onSort ? "pointer" : undefined,
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
            }}
            onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
          >
            {col.label}
            {sortField === col.key && sortDir === "asc" && <MdArrowUpward size={12} />}
            {sortField === col.key && sortDir === "desc" && <MdArrowDownward size={12} />}
          </Box>
        ))}
      </Box>

      {/* ── Scrollable virtual body ────────────────────────────────── */}
      <Box
        ref={parentRef}
        style={{
          flex: height ? "0 0 auto" : 1,
          minHeight: 0,
          height: height ?? undefined,
          overflow: "auto",
        }}
      >
        <div
          style={{
            position: "relative",
            height: `${virtualizer.getTotalSize()}px`,
          }}
        >
          {virtualItems.map((virtualRow) => {
            const item = data[virtualRow.index] as T;
            const isOdd = virtualRow.index % 2 === 1;
            const customStyle = rowStyle?.(item, virtualRow.index);

            return (
              <div
                key={getRowKey(item)}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "flex",
                  alignItems: "center",
                  cursor: onRowClick ? "pointer" : undefined,
                  borderBottom: "1px solid var(--mantine-color-default-border)",
                  backgroundColor: striped
                    ? isOdd
                      ? "var(--table-striped-row-bg, color-mix(in srgb, var(--mantine-color-dimmed) 3%, transparent))"
                      : undefined
                    : undefined,
                  ...customStyle,
                }}
                onMouseEnter={
                  highlightOnHover
                    ? (e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--table-hover-row-bg, color-mix(in srgb, var(--mantine-color-dimmed) 5%, transparent))";
                      }
                    : undefined
                }
                onMouseLeave={
                  highlightOnHover
                    ? (e) => {
                        e.currentTarget.style.backgroundColor =
                          striped && isOdd
                            ? "var(--table-striped-row-bg, color-mix(in srgb, var(--mantine-color-dimmed) 3%, transparent))"
                            : "";
                      }
                    : undefined
                }
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <Box
                    key={col.key}
                    style={{
                      width: col.width,
                      flex: col.grow ?? (col.width ? "0 0 auto" : "1 1 0%"),
                      padding:
                        "var(--table-vertical-spacing, 7px) var(--table-horizontal-spacing, 16px)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "var(--mantine-font-size-sm)",
                    }}
                  >
                    {col.render(item, virtualRow.index)}
                  </Box>
                ))}
              </div>
            );
          })}
        </div>
        {data.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No data
          </Text>
        )}
      </Box>
    </Box>
  );
}
