import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ── Better Auth Tables ──────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Tables ─────────────────────────────────────────────────────────

export const domains = pgTable("domains", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("not_started"),
  region: varchar("region", { length: 50 }).notNull().default("us-east-1"),
  dkimTokens: jsonb("dkim_tokens").$type<string[]>(),
  records:
    jsonb("records").$type<
      Array<{
        type: string;
        name: string;
        value: string;
        status: string;
        ttl: string;
        priority?: number;
      }>
    >(),
  trackClicks: boolean("track_clicks").notNull().default(false),
  trackOpens: boolean("track_opens").notNull().default(false),
  tls: varchar("tls", { length: 20 }).notNull().default("opportunistic"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  document: jsonb("document"),
  userId: text("user_id"),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    tokenHash: text("token_hash").notNull(),
    tokenPreview: varchar("token_preview", { length: 50 }),
    permission: varchar("permission", { length: 50 })
      .notNull()
      .default("full_access"),
    domain: varchar("domain", { length: 255 }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    document: jsonb("document"),
    userId: text("user_id"),
  },
  (table) => [uniqueIndex("api_keys_token_hash_idx").on(table.tokenHash)],
);

export const emails = pgTable(
  "emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    from: varchar("from", { length: 512 }).notNull(),
    to: jsonb("to").notNull().$type<string[]>(),
    cc: jsonb("cc").$type<string[]>(),
    bcc: jsonb("bcc").$type<string[]>(),
    replyTo: jsonb("reply_to").$type<string[]>(),
    subject: text("subject").notNull(),
    html: text("html"),
    text: text("text"),
    status: varchar("status", { length: 50 }).notNull().default("queued"),
    tags: jsonb("tags").$type<Array<{ name: string; value: string }>>(),
    headers: jsonb("headers").$type<Record<string, string>>(),
    attachments:
      jsonb("attachments").$type<
        Array<{ filename: string; content: string }>
      >(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    document: jsonb("document"),
    userId: text("user_id"),
  },
  (table) => [
    index("emails_status_idx").on(table.status),
    index("emails_created_at_idx").on(table.createdAt),
    index("emails_status_created_at_idx").on(table.status, table.createdAt),
  ],
);

export const segments = pgTable("segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  contactsCount: integer("contacts_count").notNull().default(0),
  unsubscribedCount: integer("unsubscribed_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  document: jsonb("document"),
  userId: text("user_id"),
});

export const topics = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 1024 }),
  defaultSubscription: varchar("default_subscription", { length: 50 })
    .notNull()
    .default("opt_out"),
  visibility: varchar("visibility", { length: 50 }).notNull().default("public"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  document: jsonb("document"),
  userId: text("user_id"),
});

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 512 }).notNull(),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    unsubscribed: boolean("unsubscribed").notNull().default(false),
    customProperties:
      jsonb("custom_properties").$type<Record<string, string>>(),
    segments: jsonb("segments").$type<string[]>(),
    topicSubscriptions: jsonb("topic_subscriptions").$type<
      Array<{ topicId: string; subscribed: boolean }>
    >(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    document: jsonb("document"),
    userId: text("user_id"),
  },
  (table) => [
    index("contacts_email_idx").on(table.email),
    index("contacts_unsubscribed_idx").on(table.unsubscribed),
    index("contacts_created_at_idx").on(table.createdAt),
  ],
);

export const broadcasts = pgTable("broadcasts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().default("Untitled"),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  from: varchar("from", { length: 512 }),
  subject: text("subject"),
  html: text("html"),
  replyTo: varchar("reply_to", { length: 512 }),
  previewText: text("preview_text"),
  audienceId: uuid("audience_id"),
  topicId: uuid("topic_id"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  document: jsonb("document"),
  userId: text("user_id"),
});

export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  eventTypes: jsonb("event_types").notNull().$type<string[]>(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  document: jsonb("document"),
  userId: text("user_id"),
});

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().default("Untitled Template"),
  alias: varchar("alias", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  subject: text("subject"),
  from: varchar("from", { length: 512 }),
  replyTo: varchar("reply_to", { length: 512 }),
  previewText: text("preview_text"),
  html: text("html"),
  text: text("text"),
  variables:
    jsonb("variables").$type<Array<{ name: string; required: boolean }>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  document: jsonb("document"),
  userId: text("user_id"),
});

export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpoint: text("endpoint"),
  status: integer("status"),
  method: varchar("method", { length: 10 }),
  userAgent: text("user_agent"),
  requestBody: jsonb("request_body"),
  responseBody: jsonb("response_body"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  document: jsonb("document"),
  userId: text("user_id"),
});
