# Reference Resume

![Reference resume draft editor](/screenshots/reference-resume.png)

Your reference resume is a comprehensive "kitchen-sink" document covering all your experience, skills, and achievements. The **Resume Coach** agent helps you build it — then the generation pipeline uses it as raw material for per-job tailoring.

## Why a Kitchen-Sink Resume?

Most people have one resume they tweak manually for each application. Career Coach inverts this:

- **Reference resume** — everything you've ever done, in one document. Built once.
- **Per-job resumes** — the Writer agent extracts and tailors relevant parts for each job application.

This means you only maintain one master document, and the AI does the tailoring work.

## Building It

1. Open the **Resume Draft** editor from the sidebar.
2. The Resume Coach starts a conversation — it draws from your profile and experiences to suggest structure and content.
3. Refine iteratively through chat. The coach asks about gaps, suggests reordering, and helps with phrasing.
4. The result is an ATS-friendly reference document: clean formatting, keyword-rich, and comprehensive.

## What It Contains

| Section        | Content                                                 |
| -------------- | ------------------------------------------------------- |
| Summary        | A high-level professional summary                       |
| Skills         | Technical and soft skills, tools, and technologies      |
| Experience     | Roles with STAR-derived bullets (from your work history) |
| Education      | Degrees, certifications, and training                   |
| Additional     | Languages, volunteer work, publications, etc.           |

## How It Feeds Generation

When you generate a per-job resume or cover letter, the Writer agent:

1. Reads the job description
2. Reads your reference resume
3. Reads your career profile and work experiences
4. Reads the company research
5. Extracts and rewrites the most relevant parts, tailored to the role

The reference resume stays unchanged — each generated document is a derivative, stored separately per job.

---

**Previous:** [Work Experience →](/guide/experiences)
**Next:** [Job Search →](/guide/search)
