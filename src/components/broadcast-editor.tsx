"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface BroadcastData {
  id: string;
  name: string;
  from: string;
  replyTo: string;
  subject: string;
  previewText: string;
  html: string;
  status: string;
  segmentId: string | null;
  topicId: string | null;
  scheduledAt: string | null;
}

interface Domain {
  id: string;
  name: string;
  status: string;
}

interface Segment {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
}

export function BroadcastEditor({
  broadcastId,
}: {
  broadcastId: string;
}) {
  const [broadcast, setBroadcast] = useState<BroadcastData | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  // Form state
  const [name, setName] = useState("Untitled");
  const [from, setFrom] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [to, setTo] = useState("");
  const [segmentId, setSegmentId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [topicId, setTopicId] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");

  // Toggle states for optional fields
  const [showReplyTo, setShowReplyTo] = useState(false);
  const [showWhen, setShowWhen] = useState(false);
  const [showPreviewText, setShowPreviewText] = useState(false);

  // Autocomplete states
  const [fromFocused, setFromFocused] = useState(false);
  const [toFocused, setToFocused] = useState(false);
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);

  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const topicDropdownRef = useRef<HTMLDivElement>(null);

  // Load broadcast data
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/broadcasts/${broadcastId}`);
        if (res.ok) {
          const data = await res.json();
          setBroadcast(data);
          setName(data.name || "Untitled");
          setFrom(data.from || "");
          setReplyTo(data.replyTo || "");
          setSubject(data.subject || "");
          setPreviewText(data.previewText || "");
          setSegmentId(data.segmentId);
          setTopicId(data.topicId);
          if (data.scheduledAt) {
            setScheduledAt(data.scheduledAt);
            setShowWhen(true);
          }
          if (data.replyTo) setShowReplyTo(true);
          if (data.previewText) setShowPreviewText(true);
        }
      } catch {
        // ignore
      }
    };
    load();
  }, [broadcastId]);

  // Load domains, segments, topics
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [domainsRes, segmentsRes, topicsRes] = await Promise.all([
          fetch("/api/domains"),
          fetch("/api/segments?limit=100"),
          fetch("/api/topics?limit=100"),
        ]);
        if (domainsRes.ok) {
          const d = await domainsRes.json();
          setDomains(d.data || []);
        }
        if (segmentsRes.ok) {
          const s = await segmentsRes.json();
          setSegments(s.data || []);
        }
        if (topicsRes.ok) {
          const t = await topicsRes.json();
          setTopics(t.data || []);
        }
      } catch {
        // ignore
      }
    };
    loadOptions();
  }, []);

  // Close topic dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        topicDropdownRef.current &&
        !topicDropdownRef.current.contains(e.target as Node)
      ) {
        setTopicDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Auto-save
  const autoSave = useCallback(
    (updates: Record<string, unknown>) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        try {
          await fetch(`/api/broadcasts/${broadcastId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
        } catch {
          // ignore
        }
      }, 1000);
    },
    [broadcastId],
  );

  const verifiedDomains = domains.filter((d) => d.status === "verified");
  const fromSuggestions = verifiedDomains.map((d) => `@${d.name}`);

  const filteredSegments = segments.filter(
    (s) => !to || s.name.toLowerCase().includes(to.toLowerCase()),
  );

  const selectedTopic = topics.find((t) => t.id === topicId);
  const selectedSegment = segments.find((s) => s.id === segmentId);

  const statusLabel = broadcast?.status
    ? broadcast.status.charAt(0).toUpperCase() + broadcast.status.slice(1)
    : "Draft";

  return (
    <div className="flex flex-col h-full min-h-screen bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[52px] border-b border-[rgba(176,199,217,0.145)]">
        <div className="flex items-center gap-2">
          <Link
            href="/broadcasts"
            className="p-1.5 rounded hover:bg-[rgba(176,199,217,0.08)] text-[#A1A4A5] hover:text-[#F0F0F0] transition-colors"
            aria-label="Back to broadcasts"
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <Link
            href="/broadcasts"
            className="text-[13px] text-[#A1A4A5] hover:text-[#F0F0F0] transition-colors"
          >
            Broadcasts
          </Link>
          <span className="text-[13px] text-[#666]">/</span>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              autoSave({ name: e.target.value });
            }}
            onBlur={() => autoSave({ name })}
            className="text-[13px] text-[#F0F0F0] bg-transparent border-none outline-none font-medium min-w-[80px] max-w-[300px]"
          />
          <span className="text-[11px] px-2 py-0.5 rounded bg-[rgba(176,199,217,0.08)] text-[#A1A4A5] font-medium">
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-8 px-3 text-[13px] font-medium text-[#A1A4A5] border border-[rgba(176,199,217,0.145)] rounded-md hover:text-[#F0F0F0] hover:border-[rgba(176,199,217,0.3)] transition-colors flex items-center gap-1.5"
          >
            Test email
          </button>
          <button
            type="button"
            className="h-8 px-4 text-[13px] font-medium bg-white text-black rounded-md hover:bg-gray-200 transition-colors"
          >
            Review
          </button>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[700px] mx-auto py-8 px-6">
          {/* Form fields */}
          <div className="space-y-0">
            {/* From */}
            <div className="flex items-start border-b border-[rgba(176,199,217,0.08)] py-3 relative">
              <span className="text-[13px] text-[#A1A4A5] w-[100px] pt-1 shrink-0">
                From
              </span>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={from}
                  placeholder="Acme <acme@example.com>"
                  onChange={(e) => {
                    setFrom(e.target.value);
                    autoSave({ from: e.target.value });
                  }}
                  onFocus={() => setFromFocused(true)}
                  onBlur={() => setTimeout(() => setFromFocused(false), 200)}
                  className="w-full text-[14px] text-[#F0F0F0] bg-transparent border-none outline-none placeholder-[#666]"
                />
                {fromFocused && fromSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-[#0a0a0a] border border-[rgba(176,199,217,0.145)] rounded-md shadow-lg z-50 py-1">
                    {fromSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const newFrom = from
                            ? `${from.split("@")[0]}${s}`
                            : `sender${s}`;
                          setFrom(newFrom);
                          autoSave({
                            from: newFrom,
                          });
                          setFromFocused(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-[13px] text-[#A1A4A5] hover:bg-[rgba(176,199,217,0.08)] hover:text-[#F0F0F0] transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {!showReplyTo && (
                <button
                  type="button"
                  onClick={() => setShowReplyTo(true)}
                  className="text-[13px] text-[#A1A4A5] hover:text-[#F0F0F0] transition-colors shrink-0 ml-2"
                >
                  Reply-To
                </button>
              )}
            </div>

            {/* Reply-To (toggleable) */}
            {showReplyTo && (
              <div className="flex items-start border-b border-[rgba(176,199,217,0.08)] py-3">
                <span className="text-[13px] text-[#A1A4A5] w-[100px] pt-1 shrink-0">
                  Reply-To
                </span>
                <input
                  type="text"
                  value={replyTo}
                  placeholder="reply@example.com"
                  onChange={(e) => {
                    setReplyTo(e.target.value);
                    autoSave({
                      replyTo: e.target.value,
                    });
                  }}
                  className="flex-1 text-[14px] text-[#F0F0F0] bg-transparent border-none outline-none placeholder-[#666]"
                />
              </div>
            )}

            {/* To */}
            <div className="flex items-start border-b border-[rgba(176,199,217,0.08)] py-3 relative">
              <span className="text-[13px] text-[#A1A4A5] w-[100px] pt-1 shrink-0">
                To
              </span>
              <div className="flex-1 relative">
                {segmentId && selectedSegment ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] text-[#F0F0F0] bg-[rgba(176,199,217,0.08)] px-2 py-0.5 rounded inline-flex items-center gap-1">
                      {selectedSegment.name}
                      <button
                        type="button"
                        onClick={() => {
                          setSegmentId(null);
                          setTo("");
                          autoSave({
                            segmentId: null,
                          });
                        }}
                        className="text-[#A1A4A5] hover:text-[#F0F0F0] ml-0.5"
                      >
                        &times;
                      </button>
                    </span>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={to}
                      placeholder="Select a segment..."
                      onChange={(e) => setTo(e.target.value)}
                      onFocus={() => setToFocused(true)}
                      onBlur={() => setTimeout(() => setToFocused(false), 200)}
                      className="w-full text-[14px] text-[#F0F0F0] bg-transparent border-none outline-none placeholder-[#666]"
                    />
                    {toFocused && filteredSegments.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-[#0a0a0a] border border-[rgba(176,199,217,0.145)] rounded-md shadow-lg z-50 py-1">
                        {filteredSegments.map((seg) => (
                          <button
                            key={seg.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSegmentId(seg.id);
                              setTo(seg.name);
                              autoSave({
                                segmentId: seg.id,
                              });
                              setToFocused(false);
                            }}
                            className="w-full px-3 py-1.5 text-left text-[13px] text-[#A1A4A5] hover:bg-[rgba(176,199,217,0.08)] hover:text-[#F0F0F0] transition-colors"
                          >
                            {seg.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              {!showWhen && (
                <button
                  type="button"
                  onClick={() => setShowWhen(true)}
                  className="text-[13px] text-[#A1A4A5] hover:text-[#F0F0F0] transition-colors shrink-0 ml-2"
                >
                  When
                </button>
              )}
            </div>

            {/* When (toggleable) */}
            {showWhen && (
              <div className="flex items-start border-b border-[rgba(176,199,217,0.08)] py-3">
                <span className="text-[13px] text-[#A1A4A5] w-[100px] pt-1 shrink-0">
                  When
                </span>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => {
                    setScheduledAt(e.target.value);
                    autoSave({
                      scheduledAt: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    });
                  }}
                  className="flex-1 text-[14px] text-[#F0F0F0] bg-transparent border-none outline-none [color-scheme:dark]"
                />
              </div>
            )}

            {/* Subscribe to */}
            <div
              className="flex items-start border-b border-[rgba(176,199,217,0.08)] py-3 relative"
              ref={topicDropdownRef}
            >
              <span className="text-[13px] text-[#A1A4A5] w-[100px] pt-1 shrink-0">
                Subscribe to
              </span>
              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={() => setTopicDropdownOpen(!topicDropdownOpen)}
                  className="flex items-center gap-1 text-[14px] text-[#A1A4A5] hover:text-[#F0F0F0] transition-colors"
                >
                  <span>
                    {selectedTopic ? selectedTopic.name : "Select a topic"}
                  </span>
                  <svg
                    aria-hidden="true"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {topicDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-[240px] bg-[#0a0a0a] border border-[rgba(176,199,217,0.145)] rounded-md shadow-lg z-50 py-1">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setTopicId(null);
                        autoSave({ topicId: null });
                        setTopicDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-[13px] hover:bg-[rgba(176,199,217,0.08)] transition-colors ${!topicId ? "text-[#F0F0F0]" : "text-[#A1A4A5]"}`}
                    >
                      None
                    </button>
                    {topics.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setTopicId(t.id);
                          autoSave({
                            topicId: t.id,
                          });
                          setTopicDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-[13px] hover:bg-[rgba(176,199,217,0.08)] transition-colors ${topicId === t.id ? "text-[#F0F0F0]" : "text-[#A1A4A5]"}`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="flex items-start border-b border-[rgba(176,199,217,0.08)] py-3">
              <span className="text-[13px] text-[#A1A4A5] w-[100px] pt-1 shrink-0">
                Subject
              </span>
              <div className="flex-1 flex items-center">
                <input
                  type="text"
                  value={subject}
                  placeholder="Subject"
                  onChange={(e) => {
                    setSubject(e.target.value);
                    autoSave({
                      subject: e.target.value,
                    });
                  }}
                  className="flex-1 text-[14px] text-[#F0F0F0] bg-transparent border-none outline-none placeholder-[#666]"
                />
                {!showPreviewText && (
                  <button
                    type="button"
                    onClick={() => setShowPreviewText(true)}
                    className="text-[13px] text-[#A1A4A5] hover:text-[#F0F0F0] transition-colors shrink-0 ml-2"
                  >
                    Preview text
                  </button>
                )}
              </div>
            </div>

            {/* Preview text (toggleable) */}
            {showPreviewText && (
              <div className="flex items-start border-b border-[rgba(176,199,217,0.08)] py-3">
                <span className="text-[13px] text-[#A1A4A5] w-[100px] pt-1 shrink-0">
                  Preview text
                </span>
                <input
                  type="text"
                  value={previewText}
                  placeholder="Preview text (max 150 characters)"
                  maxLength={150}
                  onChange={(e) => {
                    setPreviewText(e.target.value);
                    autoSave({
                      previewText: e.target.value,
                    });
                  }}
                  className="flex-1 text-[14px] text-[#F0F0F0] bg-transparent border-none outline-none placeholder-[#666]"
                />
              </div>
            )}
          </div>

          {/* Content area placeholder */}
          <div className="mt-8 min-h-[400px] border border-[rgba(176,199,217,0.08)] rounded-lg p-4">
            <p className="text-[14px] text-[#666]">
              Press &apos;/&apos; for commands
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
