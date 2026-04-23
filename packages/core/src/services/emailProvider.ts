import {
  CreateEmailIdentityCommand,
  DeleteEmailIdentityCommand,
  GetEmailIdentityCommand,
  SESv2Client,
  SendEmailCommand,
} from "@aws-sdk/client-sesv2";

export class EmailProviderService {
  private client: SESv2Client | null = null;

  private getClient() {
    if (this.client) return this.client;
    this.client = new SESv2Client({
      region: process.env.AWS_REGION ?? "us-east-1",
    });
    return this.client;
  }

  async sendEmail(params: {
    from: string;
    to: string[];
    subject: string;
    html?: string;
    text?: string;
    cc?: string[];
    bcc?: string[];
    replyTo?: string[];
    headers?: Record<string, string>;
    attachments?: Array<{ filename: string; content: string }>;
  }) {
    const command = new SendEmailCommand({
      FromEmailAddress: params.from,
      Destination: {
        ToAddresses: params.to,
        CcAddresses: params.cc,
        BccAddresses: params.bcc,
      },
      Content: {
        Simple: {
          Subject: { Data: params.subject },
          Body: {
            Html: params.html ? { Data: params.html } : undefined,
            Text: params.text ? { Data: params.text } : undefined,
          },
        },
      },
      ReplyToAddresses: params.replyTo,
    });

    if (!process.env.AWS_ACCESS_KEY_ID) {
      console.log(
        `[DEV] SES send skipped: ${params.subject} to ${params.to.join(", ")}`,
      );
      return { id: `dev-${Date.now()}` };
    }

    const res = await this.getClient().send(command);
    return { id: res.MessageId };
  }

  async getDomainIdentity(domain: string) {
    if (!process.env.AWS_ACCESS_KEY_ID)
      return { verified: true, dkimTokens: ["dev1", "dev2", "dev3"] };
    const res = await this.getClient().send(
      new GetEmailIdentityCommand({ EmailIdentity: domain }),
    );
    return {
      verified: res.VerifiedForSendingStatus,
      dkimTokens: res.DkimAttributes?.Tokens,
    };
  }

  async deleteDomainIdentity(domain: string) {
    if (!process.env.AWS_ACCESS_KEY_ID) return;
    await this.getClient().send(
      new DeleteEmailIdentityCommand({ EmailIdentity: domain }),
    );
  }

  async createDomainIdentity(domain: string) {
    if (!process.env.AWS_ACCESS_KEY_ID)
      return { dkimTokens: ["dev1", "dev2", "dev3"] };
    const res = await this.getClient().send(
      new CreateEmailIdentityCommand({ EmailIdentity: domain }),
    );
    return { dkimTokens: res.DkimAttributes?.Tokens };
  }
}

export const emailProvider = new EmailProviderService();
