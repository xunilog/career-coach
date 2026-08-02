# How It Works

Career Coach automates the job hunting workflow end-to-end, from discovering listings to submitting tailored applications.

## Architecture at a Glance

The application runs as a **desktop app** (Tauri + Vite + React). Job data is scraped from Indeed and LinkedIn, stored locally in SQLite, and analyzed by multiple AI agents working together.

## The Pipeline

```
Search → Score → Research → Generate → Track → Export
```

### 1. Search

You create saved searches with a title, location, and optional advanced filters. Searches can run on a schedule (daily/weekly/monthly) or manually. When a search executes, the app scrapes Indeed and LinkedIn for matching jobs via ts-jobspy.

### 2. Score

New jobs are automatically scored in batches of 10. The AI evaluates each job against your career profile (drivers, values, work style) and assigns a fit level: **High**, **Medium**, **Low**, or **Skip**. Scores are color-coded in the results view.

### 3. Research

For jobs you're interested in, generate a company research report with one click. The AI produces five sections: overview, culture, recent news, key people, and market position. Research is a prerequisite for document generation.

### 4. Generate

Generate an ATS-optimized resume and cover letter tailored to the specific job. A Writer→Scorer→Reviewer agent pipeline iterates up to 5 times, scoring and refining each draft until it passes quality thresholds (ATS score ≥ 85%, human authenticity ≥ 80%).

### 5. Track

Update each job's application status as you progress: New → Applied → Phone Screen → Interview → Offer → Accepted (or Archived). Status history is recorded automatically.

### 6. Export

Export your tailored resume or cover letter to PDF, copy it to clipboard, or open the job's application URL directly in your browser.

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
