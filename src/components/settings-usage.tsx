// ABOUTME: Settings Usage tab — read-only quota dashboard showing Transactional, Marketing, and Team limits

"use client";

export interface UsageData {
  transactional: {
    monthlyUsed: number;
    monthlyLimit: number;
    dailyUsed: number;
    dailyLimit: number;
  };
  marketing: {
    contactsUsed: number;
    contactsLimit: number;
    segmentsUsed: number;
    segmentsLimit: number;
    broadcastsLimit: "Unlimited";
  };
  team: {
    domainsUsed: number;
    domainsLimit: number;
    rateLimit: number;
  };
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function QuotaIndicator({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  const ratio = limit > 0 ? used / limit : 0;
  const atLimit = ratio >= 1;
  const circumference = 2 * Math.PI * 7;
  const dashOffset = circumference - ratio * circumference;
  const strokeColor = atLimit ? "#EF4444" : ratio > 0.8 ? "#F59E0B" : "#3B82F6";

  return (
    <svg
      className={`quota-indicator${atLimit ? " at-limit" : ""}`}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="10"
        r="7"
        fill="none"
        stroke="rgba(176,199,217,0.145)"
        strokeWidth="2.5"
      />
      <circle
        cx="10"
        cy="10"
        r="7"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform="rotate(-90 10 10)"
      />
    </svg>
  );
}

function QuotaRow({
  label,
  value,
  used,
  limit,
}: {
  label: string;
  value: string;
  used?: number;
  limit?: number;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        {used !== undefined && limit !== undefined ? (
          <QuotaIndicator used={used} limit={limit} />
        ) : (
          <svg
            className="quota-indicator"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <circle
              cx="10"
              cy="10"
              r="7"
              fill="none"
              stroke="rgba(176,199,217,0.145)"
              strokeWidth="2.5"
            />
          </svg>
        )}
        <span className="text-[14px] text-[#A1A4A5]">{label}</span>
      </div>
      <span className="text-[14px] text-[#F0F0F0]">{value}</span>
    </div>
  );
}

function QuotaSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[rgba(176,199,217,0.145)] pb-8 mb-8 last:border-b-0 last:mb-0 last:pb-0">
      <div className="flex items-start justify-between gap-12">
        {/* Left side — title, description, upgrade */}
        <div className="max-w-[340px] shrink-0">
          <h2 className="text-[18px] font-semibold text-[#F0F0F0] mb-2">
            {title}
          </h2>
          <p className="text-[14px] text-[#A1A4A5] leading-relaxed mb-4">
            {description}
          </p>
          <button
            type="button"
            className="px-3 py-1.5 text-[13px] font-medium text-[#F0F0F0] bg-[rgba(24,25,28,0.88)] border border-[rgba(176,199,217,0.145)] rounded-md hover:bg-[rgba(24,25,28,1)]"
          >
            Upgrade
          </button>
        </div>

        {/* Right side — plan badge + quota rows */}
        <div className="flex-1">
          <div className="flex justify-end mb-4">
            <span className="text-[14px] font-medium text-[#F0F0F0]">Free</span>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function UsageTab({ usage }: { usage: UsageData }) {
  return (
    <div>
      <QuotaSection
        title="Transactional"
        description="Integrate email into your app using the Resend API or SMTP interface."
      >
        <QuotaRow
          label="Monthly limit"
          value={`${formatNumber(usage.transactional.monthlyUsed)} / ${formatNumber(usage.transactional.monthlyLimit)}`}
          used={usage.transactional.monthlyUsed}
          limit={usage.transactional.monthlyLimit}
        />
        <QuotaRow
          label="Daily limit"
          value={`${formatNumber(usage.transactional.dailyUsed)} / ${formatNumber(usage.transactional.dailyLimit)}`}
          used={usage.transactional.dailyUsed}
          limit={usage.transactional.dailyLimit}
        />
      </QuotaSection>

      <QuotaSection
        title="Marketing"
        description="Design and send marketing emails using Broadcasts and Audiences."
      >
        <QuotaRow
          label="Contacts limit"
          value={`${formatNumber(usage.marketing.contactsUsed)} / ${formatNumber(usage.marketing.contactsLimit)}`}
          used={usage.marketing.contactsUsed}
          limit={usage.marketing.contactsLimit}
        />
        <QuotaRow
          label="Segments limit"
          value={`${formatNumber(usage.marketing.segmentsUsed)} / ${formatNumber(usage.marketing.segmentsLimit)}`}
          used={usage.marketing.segmentsUsed}
          limit={usage.marketing.segmentsLimit}
        />
        <QuotaRow label="Broadcasts limit" value="Unlimited" />
      </QuotaSection>

      <QuotaSection
        title="Team"
        description="Manage your team settings, domains, and sending rate limits."
      >
        <QuotaRow
          label="Domains limit"
          value={`${formatNumber(usage.team.domainsUsed)} / ${formatNumber(usage.team.domainsLimit)}`}
          used={usage.team.domainsUsed}
          limit={usage.team.domainsLimit}
        />
        <QuotaRow label="Rate limit" value={`${usage.team.rateLimit} / sec`} />
      </QuotaSection>
    </div>
  );
}
