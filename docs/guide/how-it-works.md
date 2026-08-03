# How It Works

Career Coach automates the job hunting workflow end-to-end, from discovering listings to submitting tailored applications.

## Architecture at a Glance

The application runs as a **desktop app** (Tauri + Vite + React). Job data is scraped from Indeed and LinkedIn, stored locally in SQLite, and analyzed by multiple AI agents working together.

## The Two-Phase Workflow

Career Coach is split into two sections, designed to be worked through in order:

### Phase 1: About You

Build your career foundation before searching for jobs. Everything in Phase 2 depends on this.

```
Profile → Experiences → Reference Resume
```

- **Career Profile** — The Profile Coach maps your Colors/DISC type, career drivers, values, and work style through conversation.
- **Work Experiences** — The Experience Coach helps you articulate each past role using STAR (achievements) and RACI (scope of responsibility) frameworks.
- **Reference Resume** — The Resume Coach helps you build a comprehensive "kitchen-sink" resume covering all your experience and skills.

### Phase 2: Job Searches

With your foundation built, find jobs and generate tailored applications.

```
Search → Score → Research → Generate → Track → Export
```

- **Search** — Create saved searches with a title, location, and optional advanced filters. Searches can run on a schedule (daily/weekly/monthly) or manually via ts-jobspy scraping Indeed and LinkedIn.
- **Score** — New jobs are automatically scored in batches of 10 against your career profile. Fit levels: **High** (🟢), **Medium** (🟡), **Low** (🔴), or **Skip** (⚪).
- **Research** — One-click AI company research: overview, culture, recent news, key people, and market position. Prerequisite for document generation.
- **Generate** — A Writer→Scorer→Reviewer pipeline iterates up to 5 times, producing ATS-optimized resumes and cover letters. Targets: ATS ≥ 85%, human authenticity ≥ 80%.
- **Track** — Move each job through application statuses: New → Applied → Phone Screen → Interview → Offer → Accepted (or Archived). Full status history with timestamps.
- **Export** — Export tailored documents to PDF, copy to clipboard, or open the application URL in your browser.

## AI Agents

| Agent                  | Role                                            |
| ---------------------- | ----------------------------------------------- |
| **Profile Coach**      | Builds your career profile through conversation |
| **Experience Coach**   | Helps articulate your work experience           |
| **Resume Coach**       | Guides base resume creation                     |
| **Job Scorer**         | Evaluates job fit against your profile          |
| **Company Researcher** | Generates 5-section research reports            |
| **Writer**             | Produces initial resume/cover letter draft      |
| **Scorer**             | Evaluates ATS match percentage                  |
| **Reviewer**           | Evaluates human authenticity, detects AI tells  |

## Data Ownership

All your data — job listings, scores, documents, and career profile — is stored **locally** on your machine in a SQLite database. Nothing leaves your computer except API calls to your configured LLM provider.
