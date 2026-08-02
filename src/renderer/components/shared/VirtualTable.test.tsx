// src/renderer/components/shared/VirtualTable.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for VirtualTable — shared virtual-scrolling table component.
// Mocks useVirtualizer so tests don't depend on DOM measurements in jsdom.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { VirtualTableColumn } from "./VirtualTable";

// ── Mock useVirtualizer ──────────────────────────────────────────────────────

function makeVirtualItem(index: number, size = 48) {
  return { index, start: index * size, size, key: String(index) };
}

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn(
    ({ count, estimateSize }: { count: number; estimateSize: () => number }) => {
      const rowSize = estimateSize();
      const items = Array.from({ length: count }, (_, i) => makeVirtualItem(i, rowSize));
      return {
        getVirtualItems: () => items,
        getTotalSize: () => count * rowSize,
        measureElement: vi.fn(),
        scrollToOffset: vi.fn(),
      };
    },
  ),
}));

// ── Polyfills ────────────────────────────────────────────────────────────────

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  global.ResizeObserver = vi.fn(function ResizeObserver(_callback: ResizeObserverCallback) {
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  }) as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Dynamic import after mocks
const { VirtualTable } = await import("./VirtualTable");

// ── Test data ────────────────────────────────────────────────────────────────

interface TestRow {
  id: string;
  name: string;
  value: number;
}

const sampleColumns: VirtualTableColumn<TestRow>[] = [
  { key: "name", label: "Name", grow: 1, render: (r) => r.name },
  { key: "value", label: "Value", width: "80px", sortable: true, render: (r) => String(r.value) },
];

function renderTable<T>(overrides?: Partial<Parameters<typeof VirtualTable<T>>[0]>) {
  const props = {
    data: [
      { id: "1", name: "Alice", value: 100 },
      { id: "2", name: "Bob", value: 200 },
    ] as unknown as T[],
    columns: sampleColumns as VirtualTableColumn<T>[],
    getRowKey: (r: T) => (r as unknown as TestRow).id,
    ...overrides,
  };

  return render(
    <MantineProvider>
      <VirtualTable {...props} />
    </MantineProvider>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("VirtualTable", () => {
  describe("Rendering", () => {
    it("renders all column headers", () => {
      renderTable();

      expect(screen.getByText("Name")).toBeDefined();
      expect(screen.getByText("Value")).toBeDefined();
    });

    it("renders data rows", () => {
      renderTable();

      expect(screen.getByText("Alice")).toBeDefined();
      expect(screen.getByText("Bob")).toBeDefined();
    });

    it("renders no data rows when data is empty", () => {
      renderTable<TestRow>({ data: [] });

      expect(screen.getByText("Name")).toBeDefined();
      expect(screen.getByText("Value")).toBeDefined();
      expect(screen.getByText("No data")).toBeDefined();
    });
  });

  describe("Interactions", () => {
    it("fires onRowClick with the clicked item", () => {
      const handleClick = vi.fn();
      const data = [{ id: "1", name: "Alice", value: 100 }];
      renderTable({ data, onRowClick: handleClick });

      fireEvent.click(screen.getByText("Alice"));

      expect(handleClick).toHaveBeenCalledWith(data[0]);
    });

    it("fires onSort when a sortable column header is clicked", () => {
      const handleSort = vi.fn();
      renderTable({ onSort: handleSort });

      fireEvent.click(screen.getByText("Value"));

      expect(handleSort).toHaveBeenCalledWith("value");
    });

    it("does not fire onSort for non-sortable columns", () => {
      const handleSort = vi.fn();
      renderTable({ onSort: handleSort });

      fireEvent.click(screen.getByText("Name"));

      expect(handleSort).not.toHaveBeenCalled();
    });

    it("shows ascending sort indicator when sortField matches and sortDir is asc", () => {
      renderTable({ sortField: "value", sortDir: "asc" });

      const header = screen.getByText("Value").closest("div");
      expect(header?.querySelector("svg")).toBeTruthy();
    });

    it("shows descending sort indicator when sortField matches and sortDir is desc", () => {
      renderTable({ sortField: "value", sortDir: "desc" });

      const header = screen.getByText("Value").closest("div");
      expect(header?.querySelector("svg")).toBeTruthy();
    });
  });

  describe("Styling", () => {
    it("applies rowStyle to rows", () => {
      const rowStyle = vi.fn((_item: TestRow, idx: number) => ({
        opacity: idx === 0 ? 0.5 : 1,
      }));

      const { container } = render(
        <MantineProvider>
          <VirtualTable
            data={[
              { id: "1", name: "Alice", value: 100 },
              { id: "2", name: "Bob", value: 200 },
            ]}
            columns={sampleColumns}
            getRowKey={(r) => r.id}
            rowStyle={rowStyle}
          />
        </MantineProvider>,
      );

      expect(rowStyle).toHaveBeenCalled();
      const rows = container.querySelectorAll("[data-index]");
      const firstRow = rows[0] as HTMLElement;
      expect(firstRow.style.opacity).toBe("0.5");
    });

    it("renders striped rows with alternating backgrounds", () => {
      const { container } = render(
        <MantineProvider>
          <VirtualTable
            data={[
              { id: "1", name: "Alice", value: 100 },
              { id: "2", name: "Bob", value: 200 },
              { id: "3", name: "Charlie", value: 300 },
            ]}
            columns={sampleColumns}
            getRowKey={(r) => r.id}
            striped
          />
        </MantineProvider>,
      );

      const rows = container.querySelectorAll("[data-index]");
      const oddRow = rows[1] as HTMLElement;
      expect(oddRow.style.backgroundColor).toBeTruthy();
    });
  });

  describe("Virtualization", () => {
    it("renders a scroll container that fills remaining space", () => {
      const { container } = renderTable<TestRow>({ data: [] });

      const scrollContainer = container.querySelector('[style*="overflow: auto"]');
      expect(scrollContainer).toBeTruthy();
    });

    it("renders a spacer div with total size", () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        name: `Item ${i}`,
        value: i,
      }));

      const { container } = render(
        <MantineProvider>
          <VirtualTable data={largeData} columns={sampleColumns} getRowKey={(r) => r.id} />
        </MantineProvider>,
      );

      const spacer = container.querySelector('[style*="position: relative"]');
      expect(spacer).toBeTruthy();
      const spacerStyle = spacer?.getAttribute("style") ?? "";
      expect(spacerStyle).toContain("height:");
      expect(spacerStyle).not.toContain("height: 0px");
    });
  });
});
