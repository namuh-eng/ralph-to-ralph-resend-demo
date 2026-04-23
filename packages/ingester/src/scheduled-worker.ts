import { emailRepo, emailProvider } from "@namuh/core";

export class ScheduledEmailWorker {
  async process() {
    // Find emails scheduled for the past that are still in 'scheduled' status
    const now = new Date();
    const pending = await emailRepo.list({ 
      limit: 10,
      where: { 
        status: "scheduled",
        scheduledAt: now 
      } 
    });

    for (const email of pending.data) {
      console.log(`Processing scheduled email ${email.id}`);
      
      try {
        await emailProvider.sendEmail({
          from: email.from!,
          to: email.to as string[],
          subject: email.subject!,
          html: email.html!,
          text: email.text!,
          cc: email.cc as string[],
          bcc: email.bcc as string[],
          replyTo: email.replyTo as string[],
          headers: email.headers as Record<string, string>,
        });

        await emailRepo.update(email.id, { status: "sent" });
      } catch (err) {
        console.error(`Failed to send scheduled email ${email.id}:`, err);
      }
    }
  }
}

export const scheduledEmailWorker = new ScheduledEmailWorker();
