// src/services/conversation-service.test.ts
// ---------------------------------------------------------------------------
// Tests for conversation-service.ts
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  updateConversationTitle,
  touchConversation,
  listConversations,
  createConversation,
} from "./conversation-service";

type MockDatabase = {
  execute: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
};

function makeMockDb(): MockDatabase {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockResolvedValue([]),
  };
}

describe("updateConversationTitle", () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = makeMockDb();
  });

  it("updates the title and bumps updated_at for the given thread", async () => {
    await updateConversationTitle(
      db as unknown as Parameters<typeof updateConversationTitle>[0],
      "thread-1",
      "Help me with my resume",
    );

    expect(db.execute).toHaveBeenCalledOnce();
    const [sql, params] = db.execute.mock.calls[0];
    expect(sql).toContain("UPDATE conversations");
    expect(sql).toContain("SET title =");
    expect(sql).toContain("updated_at = datetime('now')");
    expect(params[0]).toBe("Help me with my resume");
    expect(params[1]).toBe("thread-1");
  });
});

describe("touchConversation", () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = makeMockDb();
  });

  it("bumps updated_at without changing the title", async () => {
    await touchConversation(db as unknown as Parameters<typeof touchConversation>[0], "thread-1");

    expect(db.execute).toHaveBeenCalledOnce();
    const [sql, params] = db.execute.mock.calls[0];
    expect(sql).toContain("UPDATE conversations");
    expect(sql).toContain("updated_at = datetime('now')");
    expect(sql).not.toContain("SET title");
    expect(params[0]).toBe("thread-1");
  });
});

describe("listConversations type segregation", () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = makeMockDb();
  });

  it("filters by type when type is provided", async () => {
    db.select.mockResolvedValue([]);

    await listConversations(db as unknown as Parameters<typeof listConversations>[0], "profile");

    const [sql, params] = db.select.mock.calls[0];
    expect(sql).toContain("WHERE type =");
    expect(params[0]).toBe("profile");
  });

  it("returns all conversations when no type filter", async () => {
    db.select.mockResolvedValue([]);

    await listConversations(db as unknown as Parameters<typeof listConversations>[0]);

    const [sql] = db.select.mock.calls[0];
    expect(sql).not.toContain("WHERE type =");
  });

  it("returns conversations for the requested type only", async () => {
    db.select.mockResolvedValue([
      {
        thread_id: "t1",
        title: "Profile Chat",
        type: "profile",
        created_at: "2026-01-01",
        updated_at: "2026-01-02",
      },
    ]);

    const result = await listConversations(
      db as unknown as Parameters<typeof listConversations>[0],
      "profile",
    );

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("profile");
  });
});

describe("createConversation type segregation", () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = makeMockDb();
    let lastInsertType = "general";
    let lastInsertThreadId = "unknown";

    db.execute.mockImplementation(async (_sql: string, params?: unknown[]) => {
      if (params && params.length >= 3) {
        lastInsertThreadId = params[0] as string;
        lastInsertType = params[2] as string;
      }
    });

    db.select.mockImplementation(async () => {
      return [
        {
          thread_id: lastInsertThreadId,
          title: "New Chat",
          type: lastInsertType,
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
      ];
    });
  });

  it("creates a conversation with the specified type", async () => {
    const conversation = await createConversation(
      db as unknown as Parameters<typeof createConversation>[0],
      "experience",
    );

    expect(conversation.type).toBe("experience");

    // INSERT INTO conversations (thread_id, title, type) VALUES ($1, $2, $3)
    const [insertSql, insertParams] = db.execute.mock.calls[0];
    expect(insertSql).toContain("INSERT INTO conversations");
    expect(insertParams[2]).toBe("experience");
  });

  it("defaults to type 'general' when not specified", async () => {
    const conversation = await createConversation(
      db as unknown as Parameters<typeof createConversation>[0],
    );

    expect(conversation.type).toBe("general");

    const [, insertParams] = db.execute.mock.calls[0];
    expect(insertParams[2]).toBe("general");
  });
});
