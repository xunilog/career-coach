// src/services/career-data-service.ts
// ---------------------------------------------------------------------------
// Career Data Service — async persistence for career profile, work
// experiences, and resume draft via @tauri-apps/plugin-sql.
//
// Adapted from src/main/career-data-service.ts (was better-sqlite3 sync).
// ---------------------------------------------------------------------------

import type Database from "@tauri-apps/plugin-sql";
import type { ColorProfile, Experience, Skill, SkillCategory } from "../shared/state";
import { careerProfile, workExperiences, resumeDraft } from "../shared/db-migrations";
import type { z } from "zod/v4";

const careerProfileSchema = careerProfile.schema;
const workExperiencesSchema = workExperiences.schema;
const resumeDraftSchema = resumeDraft.schema;

// ── Profile ─────────────────────────────────────────────────────────────────

export interface ProfileRow extends Partial<ColorProfile> {
  markdown: string;
}

type CareerProfileRow = z.infer<typeof careerProfileSchema>;

export async function getProfile(db: Database): Promise<ProfileRow | null> {
  const rows = await db.select<unknown[]>("SELECT * FROM career_profile WHERE id = 1");
  if (rows.length === 0) return null;
  const row: CareerProfileRow = careerProfileSchema.parse(rows[0]);

  return {
    dominantColor: row.dominant_color as ColorProfile["dominantColor"],
    secondaryColor: row.secondary_color as ColorProfile["secondaryColor"] | undefined,
    discProfile: row.disc_profile ?? undefined,
    careerDrivers: JSON.parse(row.career_drivers) as string[],
    workStylePreferences: JSON.parse(row.work_style_preferences) as string[],
    values: JSON.parse(row.core_values) as string[],
    riskAppetite: row.risk_appetite as ColorProfile["riskAppetite"],
    riskProfileDetails: row.risk_profile_details,
    changeToleranceNotes: row.change_tolerance_notes,
    rawInsights: row.raw_insights,
    markdown: row.markdown,
  };
}

export async function saveProfile(
  db: Database,
  profile: Partial<ColorProfile>,
  markdown: string,
): Promise<void> {
  await db.execute(
    `INSERT INTO career_profile (id, dominant_color, secondary_color, disc_profile, career_drivers, work_style_preferences, core_values, risk_appetite, risk_profile_details, change_tolerance_notes, raw_insights, markdown)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT(id) DO UPDATE SET
       dominant_color = excluded.dominant_color,
       secondary_color = excluded.secondary_color,
       disc_profile = excluded.disc_profile,
       career_drivers = excluded.career_drivers,
       work_style_preferences = excluded.work_style_preferences,
       core_values = excluded.core_values,
       risk_appetite = excluded.risk_appetite,
       risk_profile_details = excluded.risk_profile_details,
       change_tolerance_notes = excluded.change_tolerance_notes,
       raw_insights = excluded.raw_insights,
       markdown = excluded.markdown`,
    [
      profile.dominantColor ?? "unknown",
      profile.secondaryColor ?? null,
      profile.discProfile ?? null,
      JSON.stringify(profile.careerDrivers ?? []),
      JSON.stringify(profile.workStylePreferences ?? []),
      JSON.stringify(profile.values ?? []),
      profile.riskAppetite ?? "unknown",
      profile.riskProfileDetails ?? "",
      profile.changeToleranceNotes ?? "",
      profile.rawInsights ?? "",
      markdown,
    ],
  );
}

// ── Work Experiences ────────────────────────────────────────────────────────

function parseSkillsJson(raw: string): Skill[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) return [];
  if (typeof parsed[0] === "string") {
    return parsed.map((name: string) => ({ name, category: "technical" as SkillCategory }));
  }
  return parsed as Skill[];
}

type WorkExperienceRow = z.infer<typeof workExperiencesSchema>;

export async function getExperiences(db: Database): Promise<Experience[]> {
  const rawRows = await db.select<unknown[]>(
    "SELECT * FROM work_experiences ORDER BY start_date DESC",
  );
  return rawRows.map((raw) => {
    const row: WorkExperienceRow = workExperiencesSchema.parse(raw);
    return {
      id: row.id,
      company: row.company,
      title: row.title,
      startDate: row.start_date,
      endDate: row.end_date,
      sector: row.sector,
      teamSize: row.team_size ?? undefined,
      budgetManaged: row.budget_managed ?? undefined,
      directReports: row.direct_reports ?? undefined,
      raciRoles: JSON.parse(row.raci_roles) as string[],
      keyProjects: JSON.parse(row.key_projects) as string[],
      quantifiedAchievements: JSON.parse(row.quantified_achievements) as string[],
      skillsDemonstrated: parseSkillsJson(row.skills_demonstrated),
      challenges: row.challenges,
      reasonForLeaving: row.reason_for_leaving ?? undefined,
      rawNotes: row.raw_notes,
    } as Experience;
  });
}

import { acquireWriteLock } from "./write-lock";

export async function saveExperiences(db: Database, experiences: Experience[]): Promise<void> {
  const release = await acquireWriteLock();
  try {
    await db.execute("DELETE FROM work_experiences");
    for (const exp of experiences) {
      await db.execute(
        `INSERT INTO work_experiences (id, company, title, start_date, end_date, sector, team_size, budget_managed, direct_reports, raci_roles, key_projects, quantified_achievements, skills_demonstrated, challenges, reason_for_leaving, raw_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          exp.id,
          exp.company,
          exp.title,
          exp.startDate,
          exp.endDate,
          exp.sector,
          exp.teamSize ?? null,
          exp.budgetManaged ?? null,
          exp.directReports ?? null,
          JSON.stringify(exp.raciRoles),
          JSON.stringify(exp.keyProjects),
          JSON.stringify(exp.quantifiedAchievements),
          JSON.stringify(exp.skillsDemonstrated),
          exp.challenges,
          exp.reasonForLeaving ?? null,
          exp.rawNotes,
        ],
      );
    }
  } finally {
    release();
  }
}

// ── Resume Draft ────────────────────────────────────────────────────────────

import { ResumeDataSchema } from "../shared/state";
import type { ResumeData } from "../shared/state";

export type { ResumeData } from "../shared/state";

/** @deprecated — use ResumeData instead */
export interface ResumeDraftRow {
  targetJob: string;
  draft: string;
}

type ResumeDraftSchemaRow = z.infer<typeof resumeDraftSchema>;

export async function getResumeDraft(db: Database): Promise<ResumeData | null> {
  const rows = await db.select<unknown[]>("SELECT * FROM resume_draft WHERE id = 1");
  if (rows.length === 0) return null;
  const row: ResumeDraftSchemaRow = resumeDraftSchema.parse(rows[0]);

  // Resume data is stored as JSON in the draft column
  try {
    const parsed = JSON.parse(row.draft);
    // Lazy migration: convert old-format keySkills (string[]) to new format (Skill[])
    if (
      Array.isArray(parsed.keySkills) &&
      parsed.keySkills.length > 0 &&
      typeof parsed.keySkills[0] === "string"
    ) {
      parsed.keySkills = parsed.keySkills.map((name: string) => ({
        name,
        category: "technical" as SkillCategory,
      }));
    }
    return ResumeDataSchema.parse(parsed);
  } catch {
    // Legacy: if draft is plain markdown (not JSON), return minimal data
    return {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      linkedin: "",
      otherNetworks: "",
      nationality: "",
      country: "",
      title: "",
      bannerHighlights: "",
      keySkills: [],
      education: [],
      languages: [],
    };
  }
}

export async function saveResumeDraft(db: Database, data: ResumeData): Promise<void> {
  const json = JSON.stringify(data);
  await db.execute(
    `INSERT INTO resume_draft (id, target_job, draft)
     VALUES (1, $1, $2)
     ON CONFLICT(id) DO UPDATE SET
       target_job = excluded.target_job,
       draft = excluded.draft`,
    [data.title, json],
  );
}
