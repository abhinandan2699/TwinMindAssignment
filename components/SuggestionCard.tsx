"use client";

export type SuggestionType = "question" | "talking" | "answer" | "fact";

export interface Suggestion {
  type: SuggestionType;
  text: string;
}

const TAG_STYLES: Record<SuggestionType, { bg: string; color: string; label: string }> = {
  question: { bg: "rgba(110,168,254,.15)", color: "var(--accent)",   label: "Question to ask" },
  talking:  { bg: "rgba(179,136,255,.15)", color: "var(--accent-2)", label: "Talking point" },
  answer:   { bg: "rgba(74,222,128,.15)",  color: "var(--good)",     label: "Answer" },
  fact:     { bg: "rgba(251,191,36,.15)",  color: "var(--warn)",     label: "Fact-check" },
};

interface Props {
  suggestion: Suggestion;
  fresh?: boolean;
  onClick?: (suggestion: Suggestion) => void;
}

export default function SuggestionCard({ suggestion, fresh = false, onClick }: Props) {
  const tag = TAG_STYLES[suggestion.type];

  return (
    <div
      onClick={() => onClick?.(suggestion)}
      style={{
        border: `1px solid ${fresh ? "var(--accent)" : "var(--border)"}`,
        background: "var(--panel-2)",
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        cursor: "pointer",
        opacity: fresh ? 1 : 0.55,
        transition: "border-color .15s, transform .15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = fresh ? "var(--accent)" : "var(--border)";
        (e.currentTarget as HTMLDivElement).style.transform = "none";
      }}
    >
      <span
        style={{
          display: "inline-block",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 1,
          padding: "2px 6px",
          borderRadius: 4,
          marginBottom: 6,
          background: tag.bg,
          color: tag.color,
        }}
      >
        {tag.label}
      </span>
      <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{suggestion.text}</div>
    </div>
  );
}
