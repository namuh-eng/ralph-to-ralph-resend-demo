ALTER TABLE "email_events" ADD COLUMN "source_id" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX "email_events_source_id_idx" ON "email_events" USING btree ("source_id");
