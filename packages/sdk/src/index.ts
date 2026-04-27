import type {
  DomainResponse as CoreDomainResponse,
  DomainOptions,
  EmailOptions,
  EmailResponse,
} from "@namuh/core";

// ── Types ────────────────────────────────────────────────────────

interface SDKOptions {
  baseUrl?: string;
}

interface ApiResponse<T> {
  data: T | null;
  error: { message: string; statusCode: number } | null;
}

// ── Email Types ──────────────────────────────────────────────────

export type SendEmailPayload = EmailOptions & {
  react?: unknown;
};

export type { EmailResponse };

interface EmailListItem {
  id: string;
  from: string;
  to: string[];
  subject: string;
  cc: string[] | null;
  bcc: string[] | null;
  reply_to: string | null;
  last_event: string;
  scheduled_at: string | null;
  created_at: string;
}

interface EmailListResponse {
  object: string;
  has_more: boolean;
  data: EmailListItem[];
}

interface EmailDetailResponse {
  id: string;
  from: string;
  to: string[];
  subject: string;
  html: string | null;
  text: string | null;
  cc: string[] | null;
  bcc: string[] | null;
  reply_to: string | null;
  last_event: string;
  created_at: string;
}

// ── Domain Types ─────────────────────────────────────────────────

export type CreateDomainPayload = DomainOptions;
export type DomainResponse = CoreDomainResponse;

interface DomainListResponse {
  data: DomainResponse[];
}

// ── API Key Types ────────────────────────────────────────────────

interface CreateApiKeyPayload {
  name: string;
  permission?: "full_access" | "sending_access";
  domain_id?: string;
}

interface ApiKeyResponse {
  id: string;
  name: string;
  token?: string;
  key_prefix: string;
  permission: string;
  domain_id: string | null;
  created_at: string;
}

interface ApiKeyListResponse {
  data: ApiKeyResponse[];
}

// ── Contact Types ────────────────────────────────────────────────

interface CreateContactPayload {
  emails: string[];
  segment_ids?: string[];
}

interface ContactResponse {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  unsubscribed: boolean;
}

interface ContactListResponse {
  data: ContactResponse[];
  total: number;
  page: number;
  limit: number;
}

// ── React rendering helper ───────────────────────────────────────

function renderReactToHtml(element: unknown): string | null {
  try {
    // Dynamic import to avoid hard dependency on react-dom
    const ReactDOMServer = require("react-dom/server") as {
      renderToStaticMarkup: (element: unknown) => string;
    };
    return ReactDOMServer.renderToStaticMarkup(element);
  } catch {
    return null;
  }
}

// ── HTTP Client ──────────────────────────────────────────────────

class HttpClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      };

      const options: RequestInit = { method, headers };
      if (body !== undefined) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${path}`, options);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({
          error: response.statusText,
        }));
        return {
          data: null,
          error: {
            message:
              (errorBody as Record<string, string>).error ?? "Request failed",
            statusCode: response.status,
          },
        };
      }

      const data = (await response.json()) as T;
      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Unknown error",
          statusCode: 500,
        },
      };
    }
  }
}

// ── Resource Classes ─────────────────────────────────────────────

class Emails {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async send(payload: SendEmailPayload): Promise<ApiResponse<EmailResponse>> {
    const { react, ...rest } = payload;

    // If react prop is provided, render it to HTML
    if (react != null) {
      const rendered = renderReactToHtml(react);
      if (rendered) {
        rest.html = rendered;
      }
    }

    return this.http.request<EmailResponse>("POST", "/api/emails", rest);
  }

  async list(): Promise<ApiResponse<EmailListResponse>> {
    return this.http.request<EmailListResponse>("GET", "/api/emails");
  }

  async get(id: string): Promise<ApiResponse<EmailDetailResponse>> {
    return this.http.request<EmailDetailResponse>("GET", `/api/emails/${id}`);
  }
}

class Domains {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async create(
    payload: CreateDomainPayload,
  ): Promise<ApiResponse<DomainResponse>> {
    return this.http.request<DomainResponse>("POST", "/api/domains", payload);
  }

  async list(): Promise<ApiResponse<DomainListResponse>> {
    return this.http.request<DomainListResponse>("GET", "/api/domains");
  }

  async get(id: string): Promise<ApiResponse<DomainResponse>> {
    return this.http.request<DomainResponse>("GET", `/api/domains/${id}`);
  }

  async verify(id: string): Promise<ApiResponse<DomainResponse>> {
    return this.http.request<DomainResponse>(
      "POST",
      `/api/domains/${id}/verify`,
    );
  }
}

class ApiKeys {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async create(
    payload: CreateApiKeyPayload,
  ): Promise<ApiResponse<ApiKeyResponse>> {
    return this.http.request<ApiKeyResponse>("POST", "/api/api-keys", payload);
  }

  async list(): Promise<ApiResponse<ApiKeyListResponse>> {
    return this.http.request<ApiKeyListResponse>("GET", "/api/api-keys");
  }

  async delete(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.http.request<{ deleted: boolean }>(
      "DELETE",
      `/api/api-keys/${id}`,
    );
  }
}

class Contacts {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async create(
    payload: CreateContactPayload,
  ): Promise<ApiResponse<{ created: number; ids: string[] }>> {
    return this.http.request<{ created: number; ids: string[] }>(
      "POST",
      "/api/contacts",
      payload,
    );
  }

  async list(): Promise<ApiResponse<ContactListResponse>> {
    return this.http.request<ContactListResponse>("GET", "/api/contacts");
  }

  async get(id: string): Promise<ApiResponse<ContactResponse>> {
    return this.http.request<ContactResponse>("GET", `/api/contacts/${id}`);
  }
}

// ── Main SDK Class ───────────────────────────────────────────────

class NamuhSend {
  public readonly emails: Emails;
  public readonly domains: Domains;
  public readonly apiKeys: ApiKeys;
  public readonly contacts: Contacts;

  constructor(apiKey: string, options?: SDKOptions) {
    if (!apiKey) {
      throw new Error("API key is required");
    }

    const baseUrl = options?.baseUrl ?? "http://localhost:3015";
    const http = new HttpClient(apiKey, baseUrl);

    this.emails = new Emails(http);
    this.domains = new Domains(http);
    this.apiKeys = new ApiKeys(http);
    this.contacts = new Contacts(http);
  }
}

export { NamuhSend };
export type {
  SDKOptions,
  ApiResponse,
  SendEmailPayload,
  EmailResponse,
  EmailListItem,
  EmailListResponse,
  EmailDetailResponse,
  CreateDomainPayload,
  DomainResponse,
  DomainListResponse,
  CreateApiKeyPayload,
  ApiKeyResponse,
  ApiKeyListResponse,
  CreateContactPayload,
  ContactResponse,
  ContactListResponse,
};
