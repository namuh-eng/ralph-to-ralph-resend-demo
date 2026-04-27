import { afterEach, describe, expect, it, vi } from "vitest";
import { NamuhSend } from "../packages/sdk/src";

describe("NamuhSend SDK", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires an explicit baseUrl", () => {
    expect(() => new NamuhSend("re_test", {} as never)).toThrow(
      "A non-empty baseUrl is required",
    );
  });

  it("normalizes the baseUrl and sends requests to the HTTP API", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const client = new NamuhSend("re_test", {
      baseUrl: "https://api.example.com/",
    });

    const response = await client.emails.send({
      from: "hello@example.com",
      to: "user@example.com",
      subject: "Hello",
      html: "<p>Hello</p>",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test",
        }),
      }),
    );
    expect(response).toEqual({
      data: { id: "email_123" },
      error: null,
    });
  });

  it("renders react payloads to html before sending", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_456" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const client = new NamuhSend("re_test", {
      baseUrl: "https://api.example.com",
    });

    await client.emails.send({
      from: "hello@example.com",
      to: "user@example.com",
      subject: "Hello",
      react: <strong>Hello</strong>,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] ?? [];
    expect(options?.body).toContain("<strong>Hello</strong>");
  });

  it("treats empty successful responses as null data", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const client = new NamuhSend("re_test", {
      baseUrl: "https://api.example.com",
    });

    const response = await client.apiKeys.delete("key_123");

    expect(response).toEqual({
      data: null,
      error: null,
    });
  });
});
