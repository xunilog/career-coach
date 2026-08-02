# Career Coach Chat

Build your career profile through a conversational AI experience.

## What It Does

The Career Coach is a conversational AI that helps you define:

- **Career drivers** — What motivates you professionally (autonomy, mastery, purpose, etc.)
- **Core values** — What you care about in a workplace
- **Work style preferences** — How you work best (remote, collaborative, structured, etc.)
- **Risk appetite** — Your tolerance for career risk (startup vs. established company)
- **DISC/Colors profile** — Your dominant professional color (Red/Yellow/Green/Blue)

This profile becomes the foundation for job scoring, document generation, and career coaching.

## Starting a Conversation

![Career Coach chat](/screenshots/career-chat.png)

1. Click the **Chat** icon in the sidebar.
2. The first time you open it, a new conversation is created automatically.
3. Start chatting — the Career Coach will guide you through profile building.

## Managing Conversations

- **New conversation**: Click **+ New Chat** to start fresh. Your profile data persists across conversations.
- **Switch conversations**: Click any conversation in the sidebar history.
- **Delete**: Use the delete button on any conversation.
- **Titles**: Conversations are auto-titled from your first message.

## Conversation vs. Document Chat

There are two types of chat:

| Type                  | Purpose                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| **Career Coach Chat** | Build your profile, discuss career goals, get coaching                 |
| **Document Chat**     | Tied to a specific job — iterate on a generated resume or cover letter |

The Career Coach chat is for your overall career profile. Document chat is per-job, per-document.

## Streaming

All AI responses stream in real time — you'll see the text appear as it's generated. This gives you a responsive, conversational feel rather than waiting for a full response.

## Persistence

Conversations persist across app restarts. Your chat history is stored in the local SQLite database.
