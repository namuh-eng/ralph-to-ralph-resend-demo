ALTER TABLE "email_events" ADD COLUMN IF NOT EXISTS "source_id" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_events_source_id_idx" ON "email_events" USING btree ("source_id");
