import { Link } from "react-router-dom";
import { ArrowRight, Users, Map, FileText } from "lucide-react";

/* ─── Feature definitions ────────────────────────────────────────────────── */
const FEATURES = [
  {
    num: "01",
    icon: Users,
    title: "The Person Graph",
    body: "A unified record for every person, regardless of where they came from. NationBuilder imports, manual additions, and future integrations all resolve to a single identity. No duplicates. No guessing.",
  },
  {
    num: "02",
    icon: Map,
    title: "Electoral Intelligence",
    body: "Visualise your membership density across every federal electorate. Identify where you're strong, where you're growing, and where the next campaign effort should land.",
  },
  {
    num: "03",
    icon: FileText,
    title: "Compliance-Ready Data",
    body: "Member counts by division, full audit trails, and structured exports built to meet Australian Electoral Commission return requirements. Ready when the deadline isn't.",
  },
] as const;

/* ─── Component ──────────────────────────────────────────────────────────── */
export function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--navy)",
        color: "oklch(90% 0.008 240)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 48px",
          borderBottom: "1px solid var(--navy-border)",
          position: "sticky",
          top: 0,
          background: "var(--navy)",
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: 17,
            color: "oklch(98% 0.006 240)",
            letterSpacing: "-0.01em",
          }}
        >
          PoliCRM
        </span>

        <Link
          to="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13.5,
            fontWeight: 600,
            color: "oklch(72% 0.18 260)",
            padding: "7px 16px",
            borderRadius: 8,
            border: "1px solid oklch(52% 0.22 260 / 0.35)",
            transition: "background-color 150ms ease-out, border-color 150ms ease-out",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background =
              "oklch(52% 0.22 260 / 0.12)";
            (e.currentTarget as HTMLAnchorElement).style.borderColor =
              "oklch(52% 0.22 260 / 0.6)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            (e.currentTarget as HTMLAnchorElement).style.borderColor =
              "oklch(52% 0.22 260 / 0.35)";
          }}
        >
          Sign In
        </Link>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "100px 48px 80px",
          maxWidth: 840,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "oklch(55% 0.015 260)",
            marginBottom: 24,
          }}
        >
          Australian Political Operations Platform
        </div>

        <h1
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(40px, 5.5vw, 68px)",
            lineHeight: 1.08,
            letterSpacing: "-0.025em",
            color: "oklch(97% 0.006 240)",
            margin: "0 0 28px",
            maxWidth: "14ch",
          }}
        >
          Your party's operating system.
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.65,
            color: "oklch(65% 0.018 240)",
            maxWidth: "54ch",
            margin: "0 0 44px",
          }}
        >
          PoliCRM replaces disconnected spreadsheets and ageing platforms with a
          modern, secure foundation built specifically for Australian parties.
          One system for your members, your interactions, and your data
          obligations.
        </p>

        <Link
          to="/login"
          className="btn-primary"
          style={{
            fontSize: 15,
            padding: "12px 24px",
            gap: 8,
          }}
        >
          Open the Console
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
      </section>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 1,
          background:
            "linear-gradient(90deg, var(--navy-border) 0%, oklch(38% 0.025 260) 50%, var(--navy-border) 100%)",
          margin: "0 48px",
        }}
      />

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section style={{ padding: "0 48px 80px" }}>
        {FEATURES.map(({ num, icon: Icon, title, body }, i) => (
          <div key={num}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "64px 1fr",
                gap: "0 40px",
                padding: "52px 0",
                alignItems: "start",
              }}
            >
              {/* Number */}
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: "0.06em",
                  color: "oklch(42% 0.025 260)",
                  paddingTop: 4,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {num}
              </div>

              {/* Content */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <Icon
                    size={18}
                    strokeWidth={2}
                    style={{ color: "oklch(68% 0.22 260)", flexShrink: 0 }}
                  />
                  <h2
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: 20,
                      color: "oklch(95% 0.006 240)",
                      margin: 0,
                    }}
                  >
                    {title}
                  </h2>
                </div>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "oklch(62% 0.018 240)",
                    margin: 0,
                    maxWidth: "60ch",
                  }}
                >
                  {body}
                </p>
              </div>
            </div>

            {/* Row divider — not after last item */}
            {i < FEATURES.length - 1 && (
              <div
                style={{
                  height: 1,
                  background: "var(--navy-border)",
                }}
              />
            )}
          </div>
        ))}
      </section>

      {/* ── CTA strip ───────────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--navy-border)",
          padding: "56px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 32,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: 22,
              color: "oklch(97% 0.006 240)",
              marginBottom: 8,
            }}
          >
            Ready to get started?
          </div>
          <div
            style={{
              fontSize: 14,
              color: "oklch(58% 0.018 240)",
            }}
          >
            Sign in to access your party's operations console.
          </div>
        </div>

        <Link
          to="/login"
          className="btn-primary"
          style={{ fontSize: 14, padding: "11px 22px" }}
        >
          Open the Console
          <ArrowRight size={15} strokeWidth={2.5} />
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--navy-border)",
          padding: "20px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: 13,
            color: "oklch(45% 0.015 260)",
          }}
        >
          PoliCRM
        </span>
        <span
          style={{
            fontSize: 12,
            color: "oklch(40% 0.012 260)",
          }}
        >
          {new Date().getFullYear()} — All rights reserved
        </span>
      </footer>
    </div>
  );
}
