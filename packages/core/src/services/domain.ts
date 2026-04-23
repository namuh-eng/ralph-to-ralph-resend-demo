import { domainRepo } from "../db/repositories/domainRepo";
import { emailProvider } from "./emailProvider";
import { dnsService } from "./dns";

export class DomainService {
  async create(params: { name: string; region?: string }) {
    const dkim = await emailProvider.createDomainIdentity(params.name);
    return await domainRepo.create({
      name: params.name,
      region: params.region || "us-east-1",
      status: "pending",
      dkimTokens: dkim.dkimTokens,
    });
  }

  async verify(id: string) {
    const domain = await domainRepo.findById(id);
    if (!domain) throw new Error("Domain not found");

    const identity = await emailProvider.getDomainIdentity(domain.name);
    
    let status: "pending" | "verified" | "failed" = identity.verified ? "verified" : "pending";
    
    return await domainRepo.update(id, { status });
  }

  async delete(id: string) {
    const domain = await domainRepo.findById(id);
    if (domain) {
      await emailProvider.deleteDomainIdentity(domain.name);
    }
    return await domainRepo.delete(id);
  }
}

export const domainService = new DomainService();
