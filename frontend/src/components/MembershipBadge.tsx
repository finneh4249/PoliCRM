import { CheckCircle2, Clock, UserMinus, Ban } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */
export type MembershipStatus = "active" | "lapsed" | "resigned" | "suspended";

interface MembershipBadgeProps {
  status: MembershipStatus;
}

/* ─── Config ─────────────────────────────────────────────────────────────── */
const CONFIG: Record<
  MembershipStatus,
  {
    label: string;
    Icon: React.FC<{ size?: number; strokeWidth?: number }>;
    bg: string;
    color: string;
    borderColor: string;
  }
> = {
  active: {
    label: "Active",
    Icon: CheckCircle2,
    bg:          "oklch(62% 0.17 145 / 0.1)",
    color:       "oklch(44% 0.14 145)",
    borderColor: "oklch(62% 0.17 145 / 0.25)",
  },
  lapsed: {
    label: "Lapsed",
    Icon: Clock,
    bg:          "oklch(75% 0.15 70 / 0.1)",
    color:       "oklch(52% 0.13 70)",
    borderColor: "oklch(75% 0.15 70 / 0.25)",
  },
  resigned: {
    label: "Resigned",
    Icon: UserMinus,
    bg:          "oklch(54% 0.02 250 / 0.08)",
    color:       "oklch(42% 0.015 250)",
    borderColor: "oklch(54% 0.02 250 / 0.2)",
  },
  suspended: {
    label: "Suspended",
    Icon: Ban,
    bg:          "oklch(58% 0.22 25 / 0.09)",
    color:       "oklch(42% 0.18 25)",
    borderColor: "oklch(58% 0.22 25 / 0.25)",
  },
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export function MembershipBadge({ status }: MembershipBadgeProps) {
  const { label, Icon, bg, color, borderColor } = CONFIG[status];

  return (
    <span
      className="badge"
      style={{
        background: bg,
        color,
        border: `1px solid ${borderColor}`,
      }}
    >
      <Icon size={10} strokeWidth={2.5} />
      {label}
    </span>
  );
}
