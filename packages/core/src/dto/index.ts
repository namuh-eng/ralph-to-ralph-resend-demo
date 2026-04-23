export interface EmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
  tags?: EmailTag[];
  scheduledAt?: string;
  topicId?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
}

export interface EmailTag {
  name: string;
  value: string;
}

export interface SendEmailResponse {
  id: string;
}

export interface DomainOptions {
  name: string;
  region?: "us-east-1" | "us-west-2" | "eu-west-1";
}

export interface DomainResponse {
  id: string;
  name: string;
  status: "pending" | "verified" | "failed";
  createdAt: string;
  region: string;
  dkimTokens?: string[];
}
