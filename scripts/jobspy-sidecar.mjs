// scripts/jobspy-sidecar.mjs
// Node.js sidecar that wraps ts-jobspy's scrapeJobs for the Tauri app.
// Called via @tauri-apps/plugin-shell Command.create("node", [this file, ...args]).

export function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--search-term":
        args.searchTerm = argv[++i];
        break;
      case "--location":
        args.location = argv[++i];
        break;
      case "--site":
        (args.site ??= []).push(argv[++i]);
        break;
      case "--distance":
        args.distance = Number(argv[++i]);
        break;
      case "--remote":
        args.isRemote = true;
        break;
      case "--job-type":
        args.jobType = argv[++i];
        break;
      case "--results-wanted":
        args.resultsWanted = Number(argv[++i]);
        break;
      case "--hours-old":
        args.hoursOld = Number(argv[++i]);
        break;
      case "--country":
        args.country = argv[++i];
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
    }
  }

  if (!args.site) {
    args.site = ["linkedin", "indeed"];
  }

  return args;
}

// ── Dry-run mock data ────────────────────────────────────────────────────────

const DRY_RUN_JOBS = [
  {
    id: "dry-1",
    site: "linkedin",
    jobUrl: "https://linkedin.com/jobs/view/1",
    jobUrlDirect: null,
    title: "Senior Software Engineer",
    company: "Acme Corp",
    location: "San Francisco, CA",
    datePosted: new Date().toISOString(),
    jobType: "fulltime",
    salarySource: null,
    interval: "yearly",
    minAmount: 150000,
    maxAmount: 200000,
    currency: "USD",
    isRemote: true,
    jobLevel: "senior",
    jobFunction: "engineering",
    listingType: null,
    emails: null,
    description: "Building great products with TypeScript and React.",
    companyIndustry: "Technology",
    companyUrl: "https://acme.com",
    companyLogo: null,
    companyUrlDirect: null,
    companyAddresses: null,
    companyNumEmployees: null,
    companyRevenue: null,
    companyDescription: null,
    experienceRange: null,
    companyRating: null,
    companyReviewsCount: null,
    vacancyCount: null,
    workFromHomeType: null,
    skills: "TypeScript, React, Node.js",
  },
  {
    id: "dry-2",
    site: "indeed",
    jobUrl: "https://indeed.com/viewjob/2",
    jobUrlDirect: null,
    title: "Frontend Developer",
    company: "Startup Inc",
    location: "Remote",
    datePosted: new Date().toISOString(),
    jobType: "fulltime",
    salarySource: null,
    interval: "yearly",
    minAmount: 120000,
    maxAmount: 160000,
    currency: "USD",
    isRemote: true,
    jobLevel: "mid",
    jobFunction: "engineering",
    listingType: null,
    emails: null,
    description: "Join a fast-growing startup building the future of work.",
    companyIndustry: "SaaS",
    companyUrl: "https://startup.example.com",
    companyLogo: null,
    companyUrlDirect: null,
    companyAddresses: null,
    companyNumEmployees: null,
    companyRevenue: null,
    companyDescription: null,
    experienceRange: null,
    companyRating: null,
    companyReviewsCount: null,
    vacancyCount: null,
    workFromHomeType: null,
    skills: "React, CSS, TypeScript",
  },
  {
    id: "dry-3",
    site: "linkedin",
    jobUrl: "https://linkedin.com/jobs/view/3",
    jobUrlDirect: null,
    title: "Backend Engineer",
    company: "BigCo",
    location: "New York, NY",
    datePosted: new Date().toISOString(),
    jobType: "fulltime",
    salarySource: null,
    interval: "yearly",
    minAmount: null,
    maxAmount: null,
    currency: null,
    isRemote: false,
    jobLevel: "mid",
    jobFunction: "engineering",
    listingType: null,
    emails: null,
    description: "Work on distributed systems at scale.",
    companyIndustry: "Finance",
    companyUrl: "https://bigco.example.com",
    companyLogo: null,
    companyUrlDirect: null,
    companyAddresses: null,
    companyNumEmployees: null,
    companyRevenue: null,
    companyDescription: null,
    experienceRange: null,
    companyRating: null,
    companyReviewsCount: null,
    vacancyCount: null,
    workFromHomeType: null,
    skills: "Go, Kubernetes, PostgreSQL",
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.dryRun) {
    console.log(JSON.stringify(DRY_RUN_JOBS));
    return;
  }

  if (!args.searchTerm) {
    console.error("Error: --search-term is required");
    process.exit(1);
  }

  const { scrapeJobs } = await import("ts-jobspy");

  const jobs = await scrapeJobs({
    siteName: args.site,
    searchTerm: args.searchTerm,
    location: args.location,
    countryIndeed: args.country,
    distance: args.distance,
    isRemote: args.isRemote,
    jobType: args.jobType,
    resultsWanted: args.resultsWanted,
    hoursOld: args.hoursOld,
    linkedinFetchDescription: true,
  });
  console.log(JSON.stringify(jobs));
}

const isMain =
  process.argv[1] &&
  (process.argv[1] === import.meta.url || process.argv[1].endsWith("jobspy-sidecar.mjs"));

if (isMain) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
