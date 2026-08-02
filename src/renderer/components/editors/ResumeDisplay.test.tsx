// src/renderer/components/editors/ResumeDisplay.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for ResumeDisplay — section cards for reference resume data.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { ResumeDisplay } from "./ResumeDisplay";

// ── Mock career store ────────────────────────────────────────────────────

vi.mock("../../stores/careerStore", () => ({
  useCareerStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      resumeData: {
        firstName: "Marie",
        lastName: "Dupont",
        phone: "+33 6 12 34 56 78",
        email: "marie@example.com",
        linkedin: "linkedin.com/in/mariedupont",
        otherNetworks: "github.com/mariedupont",
        nationality: "French",
        country: "France",
        title: "Senior Product Manager",
        bannerHighlights: "10 years in B2B SaaS",
        keySkills: [
          { name: "Product Strategy", category: "technical" },
          { name: "Go-to-Market", category: "methodology" },
          { name: "SQL", category: "technical" },
        ],
        education: [
          {
            id: "edu-1",
            institution: "HEC Paris",
            degree: "Master",
            field: "Management",
            startDate: "2012",
            endDate: "2015",
          },
        ],
        languages: [
          { id: "lang-1", language: "French", proficiency: "native" },
          { id: "lang-2", language: "English", proficiency: "fluent" },
        ],
      },
    };
    return selector ? selector(state) : state;
  }),
}));

// ── jsdom polyfills ──────────────────────────────────────────────────────

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
});

afterEach(() => {
  cleanup();
});

function renderComponent(onEditSection = vi.fn(), onEditExperience = vi.fn()) {
  return render(
    <MantineProvider>
      <ResumeDisplay onEditSection={onEditSection} onEditExperience={onEditExperience} />
    </MantineProvider>,
  );
}

describe("ResumeDisplay", () => {
  it("renders all 6 section titles", () => {
    renderComponent();

    expect(screen.getByText("Personal Information")).toBeDefined();
    expect(screen.getByText("Highlights")).toBeDefined();
    expect(screen.getByText("Experience")).toBeDefined();
    expect(screen.getByText("Key Skills")).toBeDefined();
    expect(screen.getByText("Education")).toBeDefined();
    expect(screen.getByText("Languages")).toBeDefined();
  });

  it("renders personal info content from store", () => {
    renderComponent();

    expect(screen.getByText(/Marie Dupont/)).toBeDefined();
    expect(screen.getByText(/marie@example.com/)).toBeDefined();
    expect(screen.getByText(/linkedin.com\/in\/mariedupont/)).toBeDefined();
    expect(screen.getAllByText(/French/).length).toBeGreaterThan(0);
  });

  it("renders highlights content", () => {
    renderComponent();

    expect(screen.getByText(/Senior Product Manager/)).toBeDefined();
    expect(screen.getByText(/10 years in B2B SaaS/)).toBeDefined();
  });

  it("renders key skills grouped by category", () => {
    renderComponent();

    expect(screen.getByText(/Product Strategy/)).toBeDefined();
    expect(screen.getByText(/Go-to-Market/)).toBeDefined();
    expect(screen.getByText(/SQL/)).toBeDefined();
    expect(screen.getByText("technical:")).toBeDefined();
    expect(screen.getByText("methodology:")).toBeDefined();
  });

  it("renders education entries", () => {
    renderComponent();

    expect(screen.getByText(/HEC Paris/)).toBeDefined();
    expect(screen.getByText(/Master/)).toBeDefined();
    expect(screen.getByText(/Management/)).toBeDefined();
  });

  it("renders languages", () => {
    renderComponent();

    expect(screen.getByText(/French.*native/)).toBeDefined();
    expect(screen.getByText(/English.*fluent/)).toBeDefined();
  });

  it("fires onEditSection when a section card is clicked", async () => {
    const onEditSection = vi.fn();
    renderComponent(onEditSection);

    const personalInfoCard = screen.getByText("Personal Information");
    fireEvent.click(personalInfoCard);

    expect(onEditSection).toHaveBeenCalledWith("personalInfo");
  });

  it("fires onEditExperience when Experience card is clicked", async () => {
    const onEditExperience = vi.fn();
    renderComponent(vi.fn(), onEditExperience);

    const experienceCard = screen.getByText("Experience");
    await fireEvent.click(experienceCard);

    expect(onEditExperience).toHaveBeenCalled();
  });
});
