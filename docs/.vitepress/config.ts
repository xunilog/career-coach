import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Career Coach",
  description:
    "Multi-agent AI career coaching system — find jobs, score matches, research companies, and generate tailored resumes",
  lang: "en-US",
  base: "/find-my-job/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "GitHub", link: "https://github.com/yanncbl/find-my-job" },
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
        text: "Features",
        items: [
          { text: "Job Search", link: "/guide/search" },
          { text: "AI Scoring", link: "/guide/scoring" },
          { text: "Company Research", link: "/guide/research" },
          { text: "Resume & Cover Letter", link: "/guide/generation" },
          { text: "Application Tracking", link: "/guide/tracking" },
          { text: "Career Coach Chat", link: "/guide/chat" },
          { text: "Export & Apply", link: "/guide/export" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/yanncbl/find-my-job" }],
  },
});
