import type {
  ApiKeyListResponse,
  ApiKeyResponse,
  AutoConfigureDomainResponse,
  BatchEmailResponse,
  ContactListItem,
  ContactListResponse,
  ContactResponse,
  CreateApiKeyPayload,
  CreateContactPayload,
  CreateContactResponse,
  DomainListItem,
  DomainListResponse,
  DomainOptions,
  DomainResponse,
  EmailDetailResponse,
  EmailListItem,
  EmailListOptions,
  EmailListResponse,
  EmailOptions,
  EmailResponse,
  EmailStatus,
  UpdateDomainPayload,
} from "../../core/src/dto";

interface SDKOptions {
  baseUrl: string;
}

interface ApiResponse<T> {
  data: T | null;
  error: { message: string; statusCode: number } | null;
}

export type SendEmailPayload = EmailOptions & {
  react?: unknown;
};
export type CreateDomainPayload = DomainOptions;

function normalizeBaseUrl(baseUrl?: string): string {
  if (!baseUrl?.trim()) {
    throw new Error("A non-empty baseUrl is required");
  }

  let normalized: URL;
  try {
    normalized = new URL(baseUrl);
  } catch {
    throw new Error("baseUrl must be a valid absolute URL");
  }

  if (!["http:", "https:"].includes(normalized.protocol)) {
    throw new Error("baseUrl must use http or https");
  }

  return normalized.toString().replace(/\/$/, "");
}

async function renderReactToHtml(element: unknown): Promise<string | null> {
  try {
    const { renderToStaticMarkup } = await import("react-dom/server");
    return renderToStaticMarkup(
      element as Parameters<typeof renderToStaticMarkup>[0],
    );
  } catch {
    return null;
  }
}

class HttpClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

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
      const rawBody = await response.text();
      const parsedBody = rawBody ? (JSON.parse(rawBody) as unknown) : null;

      if (!response.ok) {
        const errorBody =
          parsedBody && typeof parsedBody === "object" ? parsedBody : null;

        return {
          data: null,
          error: {
            message:
              errorBody &&
              "error" in errorBody &&
              typeof errorBody.error === "string"
                ? errorBody.error
                : response.statusText || "Request failed",
            statusCode: response.status,
          },
        };
      }

      return { data: parsedBody as T | null, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          statusCode: 500,
        },
      };
    }
  }
}

class Emails {
  constructor(private readonly http: HttpClient) {}

  async send(payload: SendEmailPayload): Promise<ApiResponse<EmailResponse>> {
    const { react, ...rest } = payload;

    if (react != null) {
      const rendered = await renderReactToHtml(react);
      if (rendered) {
        rest.html = rendered;
      }
    }

    return this.http.request<EmailResponse>("POST", "/api/emails", rest);
  }

  async sendBatch(
    payload: SendEmailPayload[],
  ): Promise<ApiResponse<BatchEmailResponse>> {
    return this.http.request<BatchEmailResponse>(
      "POST",
      "/api/emails/batch",
      payload,
    );
  }

  async list(
    options: EmailListOptions = {},
  ): Promise<ApiResponse<EmailListResponse>> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) {
      params.set("limit", String(options.limit));
    }
    if (options.after) {
      params.set("after", options.after);
    }
    if (options.before) {
      params.set("before", options.before);
    }
    if (options.status) {
      params.set("status", options.status);
    }

    const query = params.toString();
    return this.http.request<EmailListResponse>(
      "GET",
      query ? `/api/emails?${query}` : "/api/emails",
    );
  }

  async get(id: string): Promise<ApiResponse<EmailDetailResponse>> {
    return this.http.request<EmailDetailResponse>("GET", `/api/emails/${id}`);
  }
}

class Domains {
  constructor(private readonly http: HttpClient) {}

  async create(payload: DomainOptions): Promise<ApiResponse<DomainResponse>> {
    return this.http.request<DomainResponse>("POST", "/api/domains", payload);
  }

  async list(): Promise<ApiResponse<DomainListResponse>> {
    return this.http.request<DomainListResponse>("GET", "/api/domains");
  }

  async get(id: string): Promise<ApiResponse<DomainResponse>> {
    return this.http.request<DomainResponse>("GET", `/api/domains/${id}`);
  }

  async update(
    id: string,
    payload: UpdateDomainPayload,
  ): Promise<ApiResponse<Pick<DomainResponse, "object" | "id">>> {
    return this.http.request<Pick<DomainResponse, "object" | "id">>(
      "PATCH",
      `/api/domains/${id}`,
      payload,
    );
  }

  async verify(id: string): Promise<ApiResponse<DomainResponse>> {
    return this.http.request<DomainResponse>(
      "POST",
      `/api/domains/${id}/verify`,
    );
  }

  async autoConfigure(
    id: string,
  ): Promise<ApiResponse<AutoConfigureDomainResponse>> {
    return this.http.request<AutoConfigureDomainResponse>(
      "POST",
      `/api/domains/${id}/auto-configure`,
    );
  }
}

class ApiKeys {
  constructor(private readonly http: HttpClient) {}

  async create(
    payload: CreateApiKeyPayload,
  ): Promise<ApiResponse<ApiKeyResponse>> {
    return this.http.request<ApiKeyResponse>("POST", "/api/api-keys", payload);
  }

  async list(): Promise<ApiResponse<ApiKeyListResponse>> {
    return this.http.request<ApiKeyListResponse>("GET", "/api/api-keys");
  }

  async delete(id: string): Promise<ApiResponse<null>> {
    return this.http.request<null>("DELETE", `/api/api-keys/${id}`);
  }
}

class Contacts {
  constructor(private readonly http: HttpClient) {}

  async create(
    payload: CreateContactPayload,
  ): Promise<ApiResponse<CreateContactResponse>> {
    return this.http.request<CreateContactResponse>(
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

class NamuhSend {
  public readonly emails: Emails;
  public readonly domains: Domains;
  public readonly apiKeys: ApiKeys;
  public readonly contacts: Contacts;

  constructor(apiKey: string, options: SDKOptions) {
    if (!apiKey) {
      throw new Error("API key is required");
    }

    const http = new HttpClient(apiKey, normalizeBaseUrl(options.baseUrl));

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
  EmailOptions,
  EmailResponse,
  EmailStatus,
  EmailListOptions,
  BatchEmailResponse,
  EmailListItem,
  EmailListResponse,
  EmailDetailResponse,
  DomainOptions,
  UpdateDomainPayload,
  DomainResponse,
  DomainListItem,
  DomainListResponse,
  AutoConfigureDomainResponse,
  CreateApiKeyPayload,
  ApiKeyResponse,
  ApiKeyListResponse,
  CreateContactPayload,
  CreateContactResponse,
  ContactResponse,
  ContactListItem,
  ContactListResponse,
};
