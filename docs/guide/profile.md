# Career Profile

Your career profile is the foundation of Career Coach. The **Profile Coach** agent maps your personality, motivations, and work preferences through a conversational AI experience.

## What It Covers

The Profile Coach helps you define:

- **DISC/Colors profile** — Your dominant professional color: Red (action-oriented), Yellow (people-focused), Green (steady, supportive), or Blue (analytical, precise)
- **Career drivers** — What motivates you professionally (autonomy, mastery, purpose, recognition, etc.)
- **Core values** — What you care about in a workplace and team
- **Work style preferences** — How you work best (remote, collaborative, structured, autonomous)
- **Risk appetite** — Your tolerance for career risk (startup vs. established company)

This profile becomes the foundation for everything else — job scoring evaluates fit against it, and document generation tailors your materials to roles that align with it.

## Starting the Conversation

![Career Coach chat](/screenshots/career-chat.png)

1. Click the **Chat** icon in the sidebar.
2. The first time you open it, a new conversation is created automatically.
3. The Profile Coach will guide you through a structured discovery — answering questions about your work history, preferences, and goals.

## Streaming & Persistence

All responses stream in real time, so you see the text appear as it's generated. Conversations persist across app restarts in the local SQLite database.

## Managing Conversations

- **New conversation**: Click **+ New Chat** to start fresh. Your profile data persists across conversations.
- **Switch conversations**: Click any conversation in the sidebar history.
- **Delete**: Use the delete button on any conversation.
- **Titles**: Conversations are auto-titled from your first message.

## Why It Matters

| Feature               | How it uses your profile                           |
| --------------------- | -------------------------------------------------- |
| **Job Scoring**       | Evaluates fit between your drivers/values and a job |
| **Resume Generation** | Tailors your experience to roles that match your style |
| **Company Research**  | Highlights culture elements relevant to your values |

Without a profile, jobs remain unscored and generation has no personalisation anchor. Build it first.
