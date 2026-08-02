import { describe, it, expect } from "vitest";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { parseArgs } from "../scripts/jobspy-sidecar.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SIDECAR = path.resolve(__dirname, "jobspy-sidecar.mjs");

describe("parseArgs", () => {
  it("parses --search-term and --location", () => {
    const result = parseArgs(["--search-term", "engineer", "--location", "Paris"]);
    expect(result.searchTerm).toBe("engineer");
    expect(result.location).toBe("Paris");
  });

  it("parses --site multiple values", () => {
    const result = parseArgs(["--site", "linkedin", "--site", "indeed"]);
    expect(result.site).toEqual(["linkedin", "indeed"]);
  });

  it("defaults site to linkedin+indeed when omitted", () => {
    const result = parseArgs(["--search-term", "dev"]);
    expect(result.site).toEqual(["linkedin", "indeed"]);
  });

  it("sets isRemote when --remote flag present", () => {
    const result = parseArgs(["--remote", "--search-term", "dev"]);
    expect(result.isRemote).toBe(true);
  });

  it("returns default sites for empty argv", () => {
    const result = parseArgs([]);
    expect(result).toEqual({ site: ["linkedin", "indeed"] });
  });

  it("parses --dry-run flag", () => {
    const result = parseArgs(["--dry-run"]);
    expect(result.dryRun).toBe(true);
  });

  it("parses numeric flags", () => {
    const result = parseArgs(["--results-wanted", "50", "--hours-old", "168", "--distance", "25"]);
    expect(result.resultsWanted).toBe(50);
    expect(result.hoursOld).toBe(168);
    expect(result.distance).toBe(25);
  });

  it("parses --job-type", () => {
    const result = parseArgs(["--job-type", "fulltime"]);
    expect(result.jobType).toBe("fulltime");
  });

  it("parses --country", () => {
    const result = parseArgs(["--country", "belgium"]);
    expect(result.country).toBe("belgium");
  });

  it("parses --country alongside other flags", () => {
    const result = parseArgs([
      "--search-term",
      "engineer",
      "--location",
      "Brussels",
      "--country",
      "belgium",
    ]);
    expect(result.searchTerm).toBe("engineer");
    expect(result.location).toBe("Brussels");
    expect(result.country).toBe("belgium");
  });
});

describe("jobspy-sidecar process", () => {
  const REQUIRED_KEYS = [
    "id",
    "site",
    "title",
    "company",
    "jobUrl",
    "location",
    "description",
    "datePosted",
    "minAmount",
    "maxAmount",
    "currency",
    "interval",
    "skills",
  ];

  function execSidecar(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve) => {
      execFile(process.execPath, [SIDECAR, ...args], { timeout: 10000 }, (err, stdout, stderr) => {
        resolve({ stdout, stderr, code: (err?.code as number | undefined) ?? 0 });
      });
    });
  }

  it("produces valid JSON on stdout with --dry-run", async () => {
    const { stdout } = await execSidecar(["--dry-run", "--search-term", "engineer"]);
    const jobs = JSON.parse(stdout);
    expect(Array.isArray(jobs)).toBe(true);
    expect(jobs.length).toBeGreaterThan(0);

    for (const key of REQUIRED_KEYS) {
      expect(jobs[0]).toHaveProperty(key);
    }
  });

  it("exits with code 0 on successful dry-run", async () => {
    const { stdout, code } = await execSidecar(["--dry-run"]);
    expect(code).toBe(0);
    expect(() => JSON.parse(stdout)).not.toThrow();
  });

  it("exits with code 1 and error message when --search-term is missing", async () => {
    const { stderr, code } = await execSidecar([]);
    expect(code).toBe(1);
    expect(stderr).toContain("search-term");
  });
});
