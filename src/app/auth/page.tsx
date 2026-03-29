"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuthPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (res.ok) {
        localStorage.setItem("api_key", apiKey);
        router.push("/emails");
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "Invalid API key");
      }
    } catch {
      setError("Failed to verify API key. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center text-sm font-semibold text-white mx-auto mb-4">
            f
          </div>
          <h1 className="text-xl font-semibold text-[#F0F0F0]">
            Sign in to Resend Clone
          </h1>
          <p className="text-[13px] text-[#A1A4A5] mt-1">
            Enter your API key to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="api-key"
              className="block text-[12px] font-medium text-[#A1A4A5] tracking-wider mb-2"
            >
              API KEY
            </label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="re_..."
              required
              className="w-full px-3 py-2 bg-[rgba(24,25,28,0.88)] border border-[rgba(176,199,217,0.145)] text-[#F0F0F0] text-[14px] rounded-md placeholder:text-[#555] focus:outline-none focus:ring-1 focus:ring-[rgba(176,199,217,0.3)]"
            />
          </div>

          {error && <p className="text-red-400 text-[13px] mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading || !apiKey}
            className="w-full px-4 py-2 text-[14px] font-medium text-black bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {loading ? "Verifying..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}
