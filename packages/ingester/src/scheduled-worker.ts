import { queueWorker } from "./queue-worker";

export class ScheduledEmailWorker {
  async process(options: { limit?: number } = {}) {
    return await queueWorker.processDueScheduledEmails(options.limit);
  }
}

export const scheduledEmailWorker = new ScheduledEmailWorker();
