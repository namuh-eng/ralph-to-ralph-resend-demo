// ── Send email with React components — just like Resend ──

import { ResendClone } from "../packages/sdk/src";

const resend = new ResendClone("re_demo_key", {
  baseUrl: "https://zjucbjapsn.us-east-1.awsapprunner.com",
});

// React email component
const WelcomeEmail = ({ name }: { name: string }) => (
  <html>
    <body style={{ background: "#0a0a0a", fontFamily: "sans-serif", padding: 40 }}>
      <div style={{ maxWidth: 600, margin: "0 auto", background: "#18181b", borderRadius: 12, padding: 40, border: "1px solid #27272a" }}>
        <h1 style={{ color: "#fff", fontSize: 28 }}>
          Welcome, {name}! 🚀
        </h1>
        <p style={{ color: "#a1a1aa", fontSize: 16, lineHeight: 1.6 }}>
          This email was sent using React components through our
          autonomously-cloned email API.
        </p>
        <a href="https://zjucbjapsn.us-east-1.awsapprunner.com"
          style={{ display: "inline-block", background: "#3b82f6", color: "#fff", padding: "12px 24px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
          View Dashboard →
        </a>
      </div>
    </body>
  </html>
);

// Send it
const { data, error } = await resend.emails.send({
  from: "jaeyunha@foreverbrowsing.com",
  to: "jaeyunha0317@gmail.com",
  subject: "Welcome to Resend Clone 🚀",
  react: <WelcomeEmail name="Jaeyun" />,
});

console.log(data); // { id: "email-id-here" }
