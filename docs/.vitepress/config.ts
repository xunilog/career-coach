import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Career Coach",
  description:
    "Multi-agent AI career coaching system — find jobs, score matches, research companies, and generate tailored resumes",
  lang: "en-US",
  base: "/career-coach/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "GitHub", link: "https://github.com/xunilog/career-coach" },
    ],
    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Configuration", link: "/guide/configuration" },
          { text: "How It Works", link: "/guide/how-it-works" },
        ],
      },
      {
        text: "About You",
        items: [
          { text: "Career Profile", link: "/guide/profile" },
          { text: "Work Experience", link: "/guide/experiences" },
          { text: "Reference Resume", link: "/guide/reference-resume" },
        ],
      },
      {
        text: "Job Searches",
        items: [
          { text: "Job Search", link: "/guide/search" },
          { text: "AI Scoring", link: "/guide/scoring" },
          { text: "Company Research", link: "/guide/research" },
          { text: "Resume & Cover Letter", link: "/guide/generation" },
          { text: "Application Tracking", link: "/guide/tracking" },
          { text: "Export & Apply", link: "/guide/export" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/xunilog/career-coach" }],
  },
});
