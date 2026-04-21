CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"token_hash" text NOT NULL,
	"token_preview" varchar(50),
	"permission" varchar(50) DEFAULT 'full_access' NOT NULL,
	"domain" varchar(255),
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document" jsonb
);
--> statement-breakpoint
CREATE TABLE "broadcasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) DEFAULT 'Untitled' NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"from" varchar(512),
	"subject" text,
	"html" text,
	"reply_to" varchar(512),
	"preview_text" text,
	"audience_id" uuid,
	"topic_id" uuid,
	"scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document" jsonb
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(512) NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"unsubscribed" boolean DEFAULT false NOT NULL,
	"custom_properties" jsonb,
	"segments" jsonb,
	"topic_subscriptions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document" jsonb
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'not_started' NOT NULL,
	"region" varchar(50) DEFAULT 'us-east-1' NOT NULL,
	"dkim_tokens" jsonb,
	"records" jsonb,
	"track_clicks" boolean DEFAULT false NOT NULL,
	"track_opens" boolean DEFAULT false NOT NULL,
	"tls" varchar(20) DEFAULT 'opportunistic' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document" jsonb
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from" varchar(512) NOT NULL,
	"to" jsonb NOT NULL,
	"cc" jsonb,
	"bcc" jsonb,
	"reply_to" jsonb,
	"subject" text NOT NULL,
	"html" text,
	"text" text,
	"status" varchar(50) DEFAULT 'queued' NOT NULL,
	"tags" jsonb,
	"headers" jsonb,
	"attachments" jsonb,
	"scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document" jsonb
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text,
	"status" integer,
	"method" varchar(10),
	"user_agent" text,
	"request_body" jsonb,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document" jsonb
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"contacts_count" integer DEFAULT 0 NOT NULL,
	"unsubscribed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document" jsonb
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) DEFAULT 'Untitled Template' NOT NULL,
	"alias" varchar(255),
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"subject" text,
	"from" varchar(512),
	"reply_to" varchar(512),
	"preview_text" text,
	"html" text,
	"text" text,
	"variables" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document" jsonb
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1024),
	"default_subscription" varchar(50) DEFAULT 'opt_out' NOT NULL,
	"visibility" varchar(50) DEFAULT 'public' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document" jsonb
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"event_types" jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document" jsonb
);
--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_token_hash_idx" ON "api_keys" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "contacts_unsubscribed_idx" ON "contacts" USING btree ("unsubscribed");--> statement-breakpoint
CREATE INDEX "contacts_created_at_idx" ON "contacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "emails_status_idx" ON "emails" USING btree ("status");--> statement-breakpoint
CREATE INDEX "emails_created_at_idx" ON "emails" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "emails_status_created_at_idx" ON "emails" USING btree ("status","created_at");