import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────

const mockSendEmail = vi.hoisted(() => vi.fn());
const mockPublishBackgroundJob = vi.hoisted(() => vi.fn());
const mockValidateApiKey = vi.hoisted(() => vi.fn());
const mockDb = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/lib/ses", () => ({
  sendEmail: mockSendEmail,
}));

vi.mock("@namuh/core", () => ({
  createBackgroundJob: (job: Record<string, unknown>) => ({
    ...job,
    requestedAt: "2026-04-28T00:00:00.000Z",
  }),
  publishBackgroundJob: mockPublishBackgroundJob,
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

vi.mock("@/lib/api-auth", () => ({
  validateApiKey: mockValidateApiKey,
  unauthorizedResponse: () =>
    Response.json({ error: "Missing or invalid API key" }, { status: 401 }),
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual("drizzle-orm");
  return {
    ...actual,
    eq: vi.fn((...args: unknown[]) => ({ op: "eq", args })),
    desc: vi.fn((col: unknown) => ({ op: "desc", col })),
    lt: vi.fn((...args: unknown[]) => ({ op: "lt", args })),
    gt: vi.fn((...args: unknown[]) => ({ op: "gt", args })),
    and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
  };
});

// ── Helpers ───────────────────────────────────────────────────────

const AUTH_RESULT = {
  apiKeyId: "key-uuid",
  permission: "full_access",
  domainId: null,
};

function makeRequest(
  method: string,
  body?: Record<string, unknown> | unknown[],
  headers?: Record<string, string>,
): Request {
  const url = "http://localhost:3015/api/emails";
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

// ── Auth Middleware Tests ──────────────────────────────────────────

describe("API Key Authentication", () => {
  it("returns 401 when no auth header", async () => {
    mockValidateApiKey.mockResolvedValue(null);
    const { POST } = await import("@/app/api/emails/route");
    const req = makeRequest("POST", {
      from: "a@b.com",
      to: ["c@d.com"],
      subject: "X",
      html: "<p>Y</p>",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 for invalid key", async () => {
    mockValidateApiKey.mockResolvedValue(null);
    const { GET } = await import("@/app/api/emails/route");
    const req = new Request("http://localhost:3015/api/emails", {
      headers: { Authorization: "Bearer bad_key" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

// ── POST /api/emails Tests ────────────────────────────────────────

describe("POST /api/emails", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSendEmail.mockReset();
    mockPublishBackgroundJob.mockReset();
    mockPublishBackgroundJob.mockResolvedValue({
      status: "skipped",
      reason: "queue_url_missing",
    });
    mockValidateApiKey.mockResolvedValue(AUTH_RESULT);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 422 when required fields are missing", async () => {
    const { POST } = await import("@/app/api/emails/route");
    const req = makeRequest(
      "POST",
      { from: "test@domain.com" },
      { Authorization: "Bearer re_test123" },
    );
    const res = await POST(req);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  it("returns 422 when from is missing", async () => {
    const { POST } = await import("@/app/api/emails/route");
    const req = makeRequest(
      "POST",
      { to: ["user@test.com"], subject: "Test", html: "<p>Hi</p>" },
      { Authorization: "Bearer re_test123" },
    );
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("persists and queues email delivery on valid request", async () => {
    const emailId = "test-email-uuid";
    mockSendEmail.mockResolvedValue({ id: "ses-msg-id" });

    let callCount = 0;
    mockDb.insert = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: emailId }]),
          }),
        };
      }
      return { values: vi.fn().mockResolvedValue(undefined) };
    });

    const { POST } = await import("@/app/api/emails/route");
    const req = makeRequest(
      "POST",
      {
        from: "sender@domain.com",
        to: ["user@test.com"],
        subject: "Test Email",
        html: "<p>Hello</p>",
      },
      { Authorization: "Bearer re_test123" },
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("id", emailId);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockPublishBackgroundJob).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `email.send:${emailId}`,
        type: "email.send",
        source: "api",
        emailId,
      }),
      expect.objectContaining({
        deduplicationId: `email.send:${emailId}`,
        groupId: "email.send",
      }),
    );
  });

  it("accepts string to field and normalizes to array", async () => {
    mockSendEmail.mockResolvedValue({ id: "ses-msg-id" });
    let callCount = 0;
    mockDb.insert = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "email-uuid" }]),
          }),
        };
      }
      return { values: vi.fn().mockResolvedValue(undefined) };
    });

    const { POST } = await import("@/app/api/emails/route");
    const req = makeRequest(
      "POST",
      {
        from: "sender@domain.com",
        to: "single@test.com",
        subject: "Test",
        html: "<p>Hi</p>",
      },
      { Authorization: "Bearer re_test123" },
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockPublishBackgroundJob).toHaveBeenCalledOnce();
  });

  it("stores attachment ids and queues delivery without direct SES", async () => {
    mockSendEmail.mockResolvedValue({ id: "ses-msg-id" });
    const valuesMock = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "email-uuid" }]),
    });
    mockDb.insert = vi.fn().mockReturnValue({ values: valuesMock });

    const { POST } = await import("@/app/api/emails/route");
    const req = makeRequest(
      "POST",
      {
        from: "sender@domain.com",
        to: ["single@test.com"],
        subject: "Test",
        html: "<p>Hi</p>",
        attachments: [
          { filename: "inline.txt", content: "aGVsbG8=" },
          { filename: "remote.txt", path: "https://example.com/file.txt" },
        ],
      },
      { Authorization: "Bearer re_test123" },
    );

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockPublishBackgroundJob).toHaveBeenCalledOnce();
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            id: expect.any(String),
            filename: "inline.txt",
            content: "aGVsbG8=",
          }),
          expect.objectContaining({
            id: expect.any(String),
            filename: "remote.txt",
            path: "https://example.com/file.txt",
          }),
        ],
      }),
    );
  });
});

// ── POST /api/emails/batch Tests ──────────────────────────────────

describe("POST /api/emails/batch", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSendEmail.mockReset();
    mockPublishBackgroundJob.mockReset();
    mockPublishBackgroundJob.mockResolvedValue({
      status: "skipped",
      reason: "queue_url_missing",
    });
    mockValidateApiKey.mockResolvedValue(AUTH_RESULT);
  });

  it("rejects batch exceeding 100 emails", async () => {
    const { POST } = await import("@/app/api/emails/batch/route");
    const emailsArr = Array.from({ length: 101 }, (_, i) => ({
      from: `sender${i}@domain.com`,
      to: [`user${i}@test.com`],
      subject: `Test ${i}`,
      html: `<p>${i}</p>`,
    }));
    const req = makeRequest("POST", emailsArr, {
      Authorization: "Bearer re_test123",
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
    expect(json.details.formErrors[0]).toContain("100");
  });

  it("sends batch and returns array of ids", async () => {
    mockSendEmail.mockResolvedValue({ id: "ses-msg-id" });
    let callCount = 0;
    mockDb.insert = vi.fn().mockImplementation(() => {
      callCount++;
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: `email-${callCount}` }]),
        }),
      };
    });

    const { POST } = await import("@/app/api/emails/batch/route");
    const emailsArr = [
      {
        from: "sender@domain.com",
        to: ["user1@test.com"],
        subject: "Test 1",
        html: "<p>1</p>",
      },
      {
        from: "sender@domain.com",
        to: ["user2@test.com"],
        subject: "Test 2",
        html: "<p>2</p>",
      },
    ];
    const req = makeRequest("POST", emailsArr, {
      Authorization: "Bearer re_test123",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("data");
    expect(json.data).toHaveLength(2);
    expect(json.data[0]).toHaveProperty("id");
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockPublishBackgroundJob).toHaveBeenCalledTimes(2);
  });
});

// ── GET /api/emails Tests ─────────────────────────────────────────

describe("GET /api/emails", () => {
  beforeEach(() => {
    vi.resetModules();
    mockValidateApiKey.mockResolvedValue(AUTH_RESULT);
  });

  it("returns paginated list of emails", async () => {
    const mockEmails = [
      {
        id: "email-1",
        from: "sender@domain.com",
        to: ["user@test.com"],
        subject: "Test",
        createdAt: new Date("2024-01-01"),
        status: "delivered",
        cc: null,
        bcc: null,
        replyTo: null,
        scheduledAt: null,
      },
    ];

    const mockLimit = vi.fn().mockResolvedValue(mockEmails);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({
      orderBy: mockOrderBy,
      where: mockWhere,
    });
    mockDb.select = vi.fn().mockReturnValue({ from: mockFrom });

    const { GET } = await import("@/app/api/emails/route");
    const req = new Request("http://localhost:3015/api/emails?limit=20", {
      headers: { Authorization: "Bearer re_test123" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("object", "list");
    expect(json).toHaveProperty("data");
    expect(Array.isArray(json.data)).toBe(true);
  });
});

// ── GET /api/emails/:id Tests ─────────────────────────────────────

describe("GET /api/emails/:id", () => {
  beforeEach(() => {
    vi.resetModules();
    mockValidateApiKey.mockResolvedValue(AUTH_RESULT);
  });

  it("returns email with events", async () => {
    const mockEmail = {
      id: "email-uuid",
      from: "sender@domain.com",
      to: ["user@test.com"],
      subject: "Test",
      html: "<p>Hello</p>",
      text: null,
      cc: null,
      bcc: null,
      replyTo: null,
      status: "delivered",
      scheduledAt: null,
      tags: null,
      createdAt: new Date("2024-01-01"),
      events: [
        {
          type: "sent",
          timestamp: new Date("2024-01-01"),
          data: null,
        },
      ],
    };

    mockDb.query = {
      emails: {
        findFirst: vi.fn().mockResolvedValue(mockEmail),
      },
    } as unknown as ReturnType<typeof vi.fn>;

    const { GET } = await import("@/app/api/emails/[id]/route");
    const req = new Request("http://localhost:3015/api/emails/email-uuid", {
      headers: { Authorization: "Bearer re_test123" },
    });
    const res = await GET(req, {
      params: Promise.resolve({ id: "email-uuid" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("object", "email");
    expect(json).toHaveProperty("id", "email-uuid");
    expect(json).toHaveProperty("last_event", "delivered");
  });

  it("returns 404 for non-existent email", async () => {
    mockDb.query = {
      emails: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as ReturnType<typeof vi.fn>;

    const { GET } = await import("@/app/api/emails/[id]/route");
    const req = new Request("http://localhost:3015/api/emails/nonexistent", {
      headers: { Authorization: "Bearer re_test123" },
    });
    const res = await GET(req, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(res.status).toBe(404);
  });
});
