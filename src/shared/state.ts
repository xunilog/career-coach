// src/state.ts
// ---------------------------------------------------------------------------
// Shared state flowing through the entire LangGraph multi-agent graph.
// Each agent reads from and writes to this state.
//
// Uses LangGraph v1.x Annotation API with typed channels and reducers.
// Zod schemas serve as the single source of truth — TypeScript types are
// inferred via z.infer<>, and JSON Schema for API calls via .toJSONSchema().
// ---------------------------------------------------------------------------

import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";

// ── Profile (Colors / DISC output) ─────────────────────────────────────────

export const ColorProfileSchema = z.object({
  dominantColor: z.enum(["Red", "Yellow", "Green", "Blue", "unknown"]),
  secondaryColor: z.enum(["Red", "Yellow", "Green", "Blue"]).optional(),
  discProfile: z.string().optional(),
  careerDrivers: z.array(z.string()),
  workStylePreferences: z.array(z.string()),
  values: z.array(z.string()),
  riskAppetite: z.enum(["low", "medium", "high", "unknown"]),
  riskProfileDetails: z.string(),
  changeToleranceNotes: z.string(),
  rawInsights: z.string(),
});

export type ColorProfile = z.infer<typeof ColorProfileSchema>;

/** The JSON envelope the profile-agent LLM returns on every turn.
 *  No .nullable() or discriminatedUnion — structured output requires
 *  a flat type: "object" JSON Schema without anyOf/oneOf.
 *  Completion is derived from profile.dominantColor !== "unknown". */
export const ProfileResponseSchema = z.object({
  reply: z
    .string()
    .describe(
      "The conversational markdown response the seeker sees. Warm coaching tone with emoji.",
    ),
  profileComplete: z
    .boolean()
    .describe(
      "Set to true ONLY when the seeker has validated the final summary or after 12+ exchanges. MUST be true if the message says 'saved' or 'finalised'.",
    ),
  profile: ColorProfileSchema.describe(
    "The structured profile. Set dominantColor to 'unknown' when the profile is not yet complete. Fill all fields with real values when complete.",
  ),
});

export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;

// ── Markdown serialisation ──────────────────────────────────────────────────

const COLOR_EMOJI: Record<string, string> = {
  Red: "🔴",
  Yellow: "🟡",
  Green: "🟢",
  Blue: "🔵",
  unknown: "❓",
};

/** Convert a structured ColorProfile back into the profile.md markdown format. */
export function profileToMarkdown(profile: Partial<ColorProfile>): string {
  const dom = profile.dominantColor ?? "(to be discovered)";
  const sec = profile.secondaryColor ?? "(to be discovered)";
  const disc = profile.discProfile ?? "(to be discovered)";
  const drivers =
    profile.careerDrivers && profile.careerDrivers.length > 0
      ? profile.careerDrivers.map((d) => `- ${d}`).join("\n")
      : "*(What energises you — autonomy, impact, recognition, security, growth, variety...)*";
  const workStyle =
    profile.workStylePreferences && profile.workStylePreferences.length > 0
      ? profile.workStylePreferences.map((w) => `- ${w}`).join("\n")
      : "*(Collaborative vs solo, structured vs fluid, big-picture vs detail-oriented...)*";
  const vals =
    profile.values && profile.values.length > 0
      ? profile.values.map((v) => `- ${v}`).join("\n")
      : "*(Your non-negotiables — what matters most at work)*";
  const risk = profile.riskAppetite ?? "(to be discovered)";
  const riskDetails =
    profile.riskProfileDetails ||
    "*(Why this risk level? What situations, industries, or contexts shape it?)*";
  const change = profile.changeToleranceNotes || "*(How do you respond to change and ambiguity?)*";
  const notes = profile.rawInsights || "*(Raw insights from your profile coaching session)*";

  return `# Career Profile

## Colors Profile
- **Dominant Color:** ${COLOR_EMOJI[dom] ?? ""} ${dom}
- **Secondary Color:** ${COLOR_EMOJI[sec] ?? ""} ${sec}
- **DISC Profile:** ${disc}

## Career Drivers
${drivers}

## Work Style Preferences
${workStyle}

## Core Values
${vals}

## Risk Appetite
${risk}

${riskDetails}

## Change Tolerance
${change}

## Coach Notes
${notes}
`;
}

/** Parse profile.md back into a structured ColorProfile.
 *  Robust to extra whitespace, emoji prefixes, and missing sections. */
export function markdownToProfile(md: string): Partial<ColorProfile> {
  const profile: Partial<ColorProfile> = {};

  // Helper: extract the value after a bold label on a line like "- **Label:** value"
  const lineValue = (labelRegex: string): string | undefined => {
    const re = new RegExp(`-\\s*\\*\\*${labelRegex}:\\*\\*\\s*(.+)`, "im");
    const match = md.match(re);
    return match ? match[1].trim() : undefined;
  };

  // Helper: extract a bullet list under a heading
  const bulletList = (headingRegex: string): string[] => {
    const sectionRe = new RegExp(`## ${headingRegex}\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
    const sectionMatch = md.match(sectionRe);
    if (!sectionMatch) return [];
    const body = sectionMatch[1];
    const items: string[] = [];
    for (const line of body.split("\n")) {
      const m = line.match(/^\s*-\s+(.+)/);
      if (m) {
        const val = m[1].trim();
        // Skip Mantine placeholder hints (parenthesized italic)
        if (!val.startsWith("*(") && val.length > 0) {
          items.push(val);
        }
      }
    }
    return items;
  };

  // Dominant color (strip emoji prefix)
  const domRaw = lineValue("Dominant Color");
  if (domRaw) {
    const cleaned = domRaw.replace(/^[^\w]+/, "").trim();
    if (
      cleaned === "Red" ||
      cleaned === "Yellow" ||
      cleaned === "Green" ||
      cleaned === "Blue" ||
      cleaned === "unknown"
    ) {
      profile.dominantColor = cleaned as ColorProfile["dominantColor"];
    }
  }

  // Secondary color
  const secRaw = lineValue("Secondary Color");
  if (secRaw) {
    const cleaned = secRaw.replace(/^[^\w]+/, "").trim();
    if (cleaned === "Red" || cleaned === "Yellow" || cleaned === "Green" || cleaned === "Blue") {
      profile.secondaryColor = cleaned;
    }
  }

  // DISC profile
  const disc = lineValue("DISC Profile");
  if (disc && disc !== "(to be discovered)") {
    profile.discProfile = disc;
  }

  // Career drivers
  const drivers = bulletList("Career Drivers");
  if (drivers.length > 0) profile.careerDrivers = drivers;

  // Work style preferences
  const styles = bulletList("Work Style Preferences");
  if (styles.length > 0) profile.workStylePreferences = styles;

  // Core values
  const vals = bulletList("Core Values");
  if (vals.length > 0) profile.values = vals;

  // Risk appetite — first line is the level, remaining lines are details
  const riskSection = md.match(/## Risk Appetite\n([\s\S]*?)(?=\n## |$)/i);
  if (riskSection) {
    const body = riskSection[1].trim();
    if (body) {
      const lines = body.split("\n");
      const riskVal = lines[0].trim();
      if (
        riskVal === "low" ||
        riskVal === "medium" ||
        riskVal === "high" ||
        riskVal === "unknown"
      ) {
        profile.riskAppetite = riskVal;
      }
      // Everything after the first line is the risk profile details
      const details = lines.slice(1).join("\n").trim();
      if (details && !details.startsWith("*(")) {
        profile.riskProfileDetails = details;
      }
    }
  }

  // Change tolerance
  const changeSection = md.match(/## Change Tolerance\n([\s\S]*?)(?=\n## |$)/i);
  if (changeSection) {
    const changeVal = changeSection[1].trim();
    if (changeVal && !changeVal.startsWith("*(")) {
      profile.changeToleranceNotes = changeVal;
    }
  }

  // Coach notes
  const notesSection = md.match(/## Coach Notes\n([\s\S]*?)(?=\n## |$)/i);
  if (notesSection) {
    const notesVal = notesSection[1].trim();
    if (notesVal && !notesVal.startsWith("*(")) {
      profile.rawInsights = notesVal;
    }
  }

  return profile;
}

// ── Skill Categories ─────────────────────────────────────────────────────────

export const SKILL_CATEGORIES = [
  "technical",
  "tool",
  "methodology",
  "soft",
  "certification",
  "domain",
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const SkillCategorySchema = z.enum(SKILL_CATEGORIES);

export const SkillSchema = z.object({
  name: z.string(),
  category: SkillCategorySchema,
});

export type Skill = z.infer<typeof SkillSchema>;

export function skillToMarkdown(skill: Skill): string {
  return `${skill.name} (${skill.category})`;
}

export function markdownToSkill(text: string): Skill {
  const trimmed = text.trim();
  const match = trimmed.match(/^(.+?)\s*\((\w+)\)\s*$/);
  if (match) {
    const name = match[1].trim();
    const category = match[2];
    if (SKILL_CATEGORIES.includes(category as SkillCategory)) {
      return { name, category: category as SkillCategory };
    }
  }
  return { name: trimmed, category: "technical" };
}

export function groupSkillsByCategory(skills: Skill[]): Map<SkillCategory, Skill[]> {
  const map = new Map<SkillCategory, Skill[]>();
  for (const category of SKILL_CATEGORIES) {
    map.set(category, []);
  }
  for (const skill of skills) {
    const group = map.get(skill.category);
    if (group) group.push(skill);
  }
  return map;
}

// ── Experience ──────────────────────────────────────────────────────────────

export type RACIRole = "Responsible" | "Accountable" | "Consulted" | "Informed";

export interface Experience {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string | "present";
  sector: string;
  teamSize?: number;
  budgetManaged?: string; // e.g. "€2M opex"
  directReports?: number;
  raciRoles: RACIRole[];
  keyProjects: string[];
  quantifiedAchievements: string[];
  skillsDemonstrated: Skill[];
  challenges: string;
  reasonForLeaving?: string;
  rawNotes: string;
}

// ── Resume Data (reference resume) ──────────────────────────────────────────

export const EducationEntrySchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  field: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

export type EducationEntry = z.infer<typeof EducationEntrySchema>;

export const LanguageEntrySchema = z.object({
  id: z.string(),
  language: z.string(),
  proficiency: z.enum(["native", "fluent", "advanced", "intermediate", "basic"]),
});

export type LanguageEntry = z.infer<typeof LanguageEntrySchema>;

export const ResumeDataSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  email: z.string(),
  linkedin: z.string(),
  otherNetworks: z.string(),
  nationality: z.string(),
  country: z.string(),
  title: z.string(),
  bannerHighlights: z.string(),
  keySkills: z.array(SkillSchema),
  education: z.array(EducationEntrySchema),
  languages: z.array(LanguageEntrySchema),
});

export type ResumeData = z.infer<typeof ResumeDataSchema>;

export function resumeDataToMarkdown(data: ResumeData): string {
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || "(to be completed)";
  const contact =
    [data.email, data.phone, data.linkedin, data.otherNetworks].filter(Boolean).join(" | ") ||
    "(to be completed)";
  const nationality = data.nationality || "(to be completed)";
  const country = data.country || "(to be completed)";

  const skills =
    data.keySkills.length > 0
      ? data.keySkills.map((s) => `- ${skillToMarkdown(s)}`).join("\n")
      : "*(Key skills not yet captured)*";

  const education =
    data.education.length > 0
      ? data.education
          .map(
            (e) =>
              `- **${e.degree}** in ${e.field} — ${e.institution} (${e.startDate}–${e.endDate})`,
          )
          .join("\n")
      : "*(Education not yet captured)*";

  const languages =
    data.languages.length > 0
      ? data.languages.map((l) => `- ${l.language} (${l.proficiency})`).join("\n")
      : "*(Languages not yet captured)*";

  return `# Resume

## Personal Information
- **Name:** ${name}
- **Nationality:** ${nationality}
- **Country:** ${country}
- **Contact:** ${contact}

## Highlights
- **Title:** ${data.title || "(to be completed)"}
- **Key Highlights:** ${data.bannerHighlights || "(to be completed)"}

## Key Skills
${skills}

## Education
${education}

## Languages
${languages}
`;
}

export function markdownToResumeData(md: string): ResumeData {
  const lineValue = (labelRegex: string): string => {
    const re = new RegExp(`\\*\\*${labelRegex}:\\*\\*\\s*(.+)`, "im");
    const match = md.match(re);
    return match ? match[1].trim() : "";
  };

  const bulletItems = (heading: string): string[] => {
    const sectionRe = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
    const sectionMatch = md.match(sectionRe);
    if (!sectionMatch) return [];
    const body = sectionMatch[1];
    const items: string[] = [];
    for (const line of body.split("\n")) {
      const m = line.match(/^\s*-\s+(.+)/);
      if (m) {
        const val = m[1].trim();
        if (!val.startsWith("*(") && val.length > 0) {
          items.push(val);
        }
      }
    }
    return items;
  };

  const nameRaw = lineValue("Name");
  const nameParts = nameRaw.split(" ").filter(Boolean);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") ?? "";

  const contactRaw = lineValue("Contact");
  const contactParts = contactRaw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  const email = contactParts.find((p) => p.includes("@")) ?? "";
  const phone = contactParts.find((p) => /^\+?[\d\s]+$/.test(p)) ?? "";
  const linkedin = contactParts.find((p) => p.includes("linkedin")) ?? "";
  const otherNetworks =
    contactParts.find((p) => p && p !== email && p !== phone && p !== linkedin) ?? "";

  const nationality = lineValue("Nationality");
  const country = lineValue("Country");

  const title = lineValue("Title");
  const bannerHighlights = lineValue("Key Highlights");

  const keySkills = bulletItems("Key Skills").map(markdownToSkill);

  // Parse education section
  const education: EducationEntry[] = [];
  const eduSection = md.match(/## Education\n([\s\S]*?)(?=\n## |$)/i);
  if (eduSection) {
    const eduRegex = /-\s*\*\*(.+?)\*\*\s+in\s+(.+?)\s+—\s+(.+?)\s+\((.+?)–(.+?)\)/g;
    let match;
    while ((match = eduRegex.exec(eduSection[1])) !== null) {
      education.push({
        id: `edu-${education.length + 1}`,
        degree: match[1].trim(),
        field: match[2].trim(),
        institution: match[3].trim(),
        startDate: match[4].trim(),
        endDate: match[5].trim(),
      });
    }
  }

  // Parse languages section
  const languages: LanguageEntry[] = [];
  const langSection = md.match(/## Languages\n([\s\S]*?)(?=\n## |$)/i);
  if (langSection) {
    const langRegex = /-\s*(.+?)\s+\((\w+)\)/g;
    let match;
    while ((match = langRegex.exec(langSection[1])) !== null) {
      const prof = match[2].trim();
      if (
        prof === "native" ||
        prof === "fluent" ||
        prof === "advanced" ||
        prof === "intermediate" ||
        prof === "basic"
      ) {
        languages.push({
          id: `lang-${languages.length + 1}`,
          language: match[1].trim(),
          proficiency: prof as LanguageEntry["proficiency"],
        });
      }
    }
  }

  return {
    firstName,
    lastName,
    phone,
    email,
    linkedin,
    otherNetworks,
    nationality,
    country,
    title,
    bannerHighlights,
    keySkills,
    education,
    languages,
  };
}

// ── Agent routing — display-only in v1 (Command.goto handles actual routing) ─

export type AgentName = "router" | "profile" | "experience" | "resume" | "job" | "__end__";

// ── Graph node identifiers — used by Command.goto ───────────────────────────

export const Nodes = {
  Router: "router_agent",
  Profile: "profile_agent",
  Experience: "experience_agent",
  Resume: "resume_agent",
} as const;

export type NodeName = (typeof Nodes)[keyof typeof Nodes];

// ── Full graph state ────────────────────────────────────────────────────────

export const CareerStateAnnotation = Annotation.Root({
  // Conversation messages for the active agent (LangGraph built-in reducer)
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // Display-only: which agent is currently active (set by each node for CLI UI)
  activeAgent: Annotation<AgentName>({
    reducer: (_prev: AgentName, next: AgentName): AgentName => next,
    default: (): AgentName => "router",
  }),

  // Accumulated seeker data
  profile: Annotation<Partial<ColorProfile>>({
    reducer: (prev: Partial<ColorProfile>, next: Partial<ColorProfile>): Partial<ColorProfile> => ({
      ...prev,
      ...next,
    }),
    default: (): Partial<ColorProfile> => ({}),
  }),

  experiences: Annotation<Experience[]>({
    reducer: (prev: Experience[], next: Experience[]): Experience[] => {
      // Merge by id; append if new
      const map = new Map(prev.map((e: Experience) => [e.id, e]));
      for (const exp of next) {
        map.set(exp.id, { ...map.get(exp.id), ...exp } as Experience);
      }
      return Array.from(map.values());
    },
    default: (): Experience[] => [],
  }),

  targetJob: Annotation<string>({
    reducer: (_prev: string, next: string): string => next,
    default: (): string => "",
  }),

  resumeDraft: Annotation<string>({
    reducer: (_prev: string, next: string): string => next,
    default: (): string => "",
  }),

  // How many conversational turns the current agent has taken
  agentTurnCount: Annotation<number>({
    reducer: (_prev: number, next: number): number => next,
    default: (): number => 0,
  }),
});

// ── Type exports — strongly typed state and partial updates ─────────────────

export type CareerState = typeof CareerStateAnnotation.State;

/** The shape of state updates returned by agent node functions. */
export type CareerStateUpdate = typeof CareerStateAnnotation.Update;
