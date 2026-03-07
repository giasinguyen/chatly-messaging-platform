import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    MessageCircle,
    Zap,
    Shield,
    Users,
    Bell,
    Search,
    Video,
    Send,
    ChevronRight,
    Github,
    Twitter,
    Star,
} from "lucide-react";

// ─── Scroll Reveal Hook ───────────────────────────────────────────────────────
function useScrollReveal() {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.12 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return { ref, visible };
}

// ─── Reveal Wrapper ───────────────────────────────────────────────────────────
function Reveal({
    children,
    delay = 0,
}: {
    children: React.ReactNode;
    delay?: number;
}) {
    const { ref, visible } = useScrollReveal();
    return (
        <div
            ref={ref}
            style={{
                transitionDelay: `${delay}ms`,
                transition:
                    "opacity 600ms cubic-bezier(0.25,0.46,0.45,0.94), transform 600ms cubic-bezier(0.25,0.46,0.45,0.94)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(28px)",
            }}
        >
            {children}
        </div>
    );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <nav
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 900,
                background: scrolled
                    ? "rgba(255,255,255,0.72)"
                    : "rgba(255,255,255,0)",
                backdropFilter: scrolled ? "saturate(180%) blur(20px)" : "none",
                WebkitBackdropFilter: scrolled
                    ? "saturate(180%) blur(20px)"
                    : "none",
                borderBottom: scrolled ? "1px solid rgba(0,0,0,0.08)" : "none",
                transition: "all 300ms cubic-bezier(0.25,0.46,0.45,0.94)",
            }}
        >
            <div
                style={{
                    maxWidth: 1200,
                    margin: "0 auto",
                    padding: "0 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    height: 60,
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                    }}
                >
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            background:
                                "linear-gradient(135deg,#0071E3 0%,#34aadc 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <MessageCircle size={18} color="#fff" />
                    </div>
                    <span
                        style={{
                            fontFamily:
                                '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                            fontWeight: 700,
                            fontSize: 18,
                            color: "#1D1D1F",
                            letterSpacing: "-0.3px",
                        }}
                    >
                        Chatly
                    </span>
                </div>

                {/* Nav links */}
                <div
                    style={{
                        display: "flex",
                        gap: 36,
                        alignItems: "center",
                    }}
                    className="hidden md:flex"
                >
                    {["Features", "Pricing", "Docs", "Blog"].map((item) => (
                        <a
                            key={item}
                            href="#"
                            style={{
                                fontFamily:
                                    '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                                fontSize: 15,
                                fontWeight: 400,
                                color: "#1D1D1F",
                                textDecoration: "none",
                                transition: "color 200ms ease",
                            }}
                            onMouseEnter={(e) =>
                                ((e.target as HTMLElement).style.color =
                                    "#0071E3")
                            }
                            onMouseLeave={(e) =>
                                ((e.target as HTMLElement).style.color =
                                    "#1D1D1F")
                            }
                        >
                            {item}
                        </a>
                    ))}
                </div>

                {/* CTA */}
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <a
                        href="/auth"
                        style={{
                            fontFamily:
                                '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                            fontSize: 15,
                            fontWeight: 400,
                            color: "#0071E3",
                            textDecoration: "none",
                            cursor: "pointer",
                        }}
                    >
                        Sign in
                    </a>
                    <button
                        onClick={() => navigate("/auth")}
                        style={{
                            background: "#0071E3",
                            color: "#fff",
                            border: "none",
                            borderRadius: 980,
                            padding: "8px 20px",
                            fontFamily:
                                '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                            fontWeight: 500,
                            fontSize: 15,
                            cursor: "pointer",
                            transition:
                                "background 300ms ease, transform 300ms ease",
                        }}
                        onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.background =
                                "#0077ED";
                            (e.target as HTMLElement).style.transform =
                                "scale(1.02)";
                        }}
                        onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.background =
                                "#0071E3";
                            (e.target as HTMLElement).style.transform =
                                "scale(1)";
                        }}
                    >
                        Get started
                    </button>
                </div>
            </div>
        </nav>
    );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
    const navigate = useNavigate();
    return (
        <section
            style={{
                minHeight: "100vh",
                background:
                    "linear-gradient(160deg,#F5F5F7 0%,#EBF3FE 60%,#F5F5F7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                textAlign: "center",
                padding: "120px 24px 80px",
            }}
        >
            {/* Badge */}
            <div
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(0,113,227,0.08)",
                    border: "1px solid rgba(0,113,227,0.2)",
                    borderRadius: 980,
                    padding: "6px 16px",
                    marginBottom: 32,
                    animation: "fade-in 500ms ease",
                }}
            >
                <Star size={13} color="#0071E3" fill="#0071E3" />
                <span
                    style={{
                        fontFamily:
                            '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#0071E3",
                    }}
                >
                    Built for modern teams
                </span>
            </div>

            <h1
                style={{
                    fontFamily:
                        '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                    fontSize: "clamp(40px, 6vw, 76px)",
                    fontWeight: 700,
                    color: "#1D1D1F",
                    lineHeight: 1.05,
                    letterSpacing: "-2px",
                    maxWidth: 860,
                    margin: "0 auto 24px",
                }}
            >
                Demo{" "}
                <span
                    style={{
                        background:
                            "linear-gradient(135deg,#0071E3 0%,#34aadc 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}
                >
                    xong xoá
                </span>
            </h1>

            <p
                style={{
                    fontFamily:
                        '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                    fontSize: "clamp(17px, 2vw, 21px)",
                    fontWeight: 300,
                    color: "#6E6E73",
                    maxWidth: 600,
                    lineHeight: 1.6,
                    margin: "0 auto 48px",
                }}
            >
                Demo only
            </p>

            <div
                style={{
                    display: "flex",
                    gap: 16,
                    flexWrap: "wrap",
                    justifyContent: "center",
                }}
            >
                <button
                    onClick={() => navigate("/auth")}
                    style={{
                        background: "#0071E3",
                        color: "#fff",
                        border: "none",
                        borderRadius: 980,
                        padding: "14px 32px",
                        fontFamily:
                            '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                        fontWeight: 500,
                        fontSize: 17,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        transition:
                            "background 300ms ease, transform 300ms ease",
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                            "#0077ED";
                        (e.currentTarget as HTMLElement).style.transform =
                            "scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                            "#0071E3";
                        (e.currentTarget as HTMLElement).style.transform =
                            "scale(1)";
                    }}
                >
                    Start for free
                    <ChevronRight size={18} />
                </button>

                <button
                    style={{
                        background: "transparent",
                        color: "#0071E3",
                        border: "1.5px solid #D2D2D7",
                        borderRadius: 980,
                        padding: "14px 32px",
                        fontFamily:
                            '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                        fontWeight: 500,
                        fontSize: 17,
                        cursor: "pointer",
                        transition: "all 300ms ease",
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor =
                            "#0071E3";
                        (e.currentTarget as HTMLElement).style.transform =
                            "scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor =
                            "#D2D2D7";
                        (e.currentTarget as HTMLElement).style.transform =
                            "scale(1)";
                    }}
                >
                    View demo
                </button>
            </div>

            {/* Stats */}
            <div
                style={{
                    display: "flex",
                    gap: 48,
                    marginTop: 80,
                    flexWrap: "wrap",
                    justifyContent: "center",
                    padding: "32px 40px",
                    background: "rgba(255,255,255,0.6)",
                    backdropFilter: "blur(20px)",
                    borderRadius: 20,
                    border: "1px solid rgba(210,210,215,0.6)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                }}
            >
                {[
                    { num: "50K+", label: "Active users" },
                    { num: "99.9%", label: "Uptime SLA" },
                    { num: "<50ms", label: "Message latency" },
                    { num: "E2E", label: "Encrypted" },
                ].map((stat) => (
                    <div key={stat.label} style={{ textAlign: "center" }}>
                        <div
                            style={{
                                fontFamily:
                                    '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                                fontSize: 28,
                                fontWeight: 700,
                                color: "#1D1D1F",
                                letterSpacing: "-1px",
                            }}
                        >
                            {stat.num}
                        </div>
                        <div
                            style={{
                                fontFamily:
                                    '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                                fontSize: 13,
                                color: "#6E6E73",
                                marginTop: 4,
                            }}
                        >
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ─── Bento Features ───────────────────────────────────────────────────────────
const features = [
    {
        icon: <Zap size={24} color="#0071E3" />,
        title: "Instant delivery",
        desc: "Messages delivered in under 50ms using WebSocket + Redis pub/sub architecture.",
        span: 2,
    },
    {
        icon: <Shield size={24} color="#34C759" />,
        title: "End-to-end encrypted",
        desc: "Every message is encrypted before it leaves your device.",
        span: 1,
    },
    {
        icon: <Video size={24} color="#FF6B6B" />,
        title: "HD Video calls",
        desc: "Crystal clear video with adaptive bitrate streaming.",
        span: 1,
    },
    {
        icon: <Users size={24} color="#FF9F0A" />,
        title: "Team channels",
        desc: "Organize conversations into topic-focused channels for your whole team.",
        span: 1,
    },
    {
        icon: <Search size={24} color="#BF5AF2" />,
        title: "Powerful search",
        desc: "Find any message, file, or link instantly with full-text search.",
        span: 1,
    },
    {
        icon: <Bell size={24} color="#FF6B6B" />,
        title: "Smart notifications",
        desc: "Only get notified for what matters. Customizable per channel.",
        span: 1,
    },
    {
        icon: <Send size={24} color="#0071E3" />,
        title: "Rich messaging",
        desc: "Reactions, threads, file sharing, code blocks, and markdown — built in.",
        span: 2,
    },
];

function BentoFeatures() {
    return (
        <section
            style={{
                background: "#F5F5F7",
                padding: "100px 24px",
            }}
        >
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <Reveal>
                    <div style={{ textAlign: "center", marginBottom: 64 }}>
                        <p
                            style={{
                                fontFamily:
                                    '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                                fontSize: 13,
                                fontWeight: 500,
                                color: "#0071E3",
                                textTransform: "uppercase",
                                letterSpacing: "1.5px",
                                marginBottom: 16,
                            }}
                        >
                            Features
                        </p>
                        <h2
                            style={{
                                fontFamily:
                                    '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                                fontSize: "clamp(32px, 4vw, 52px)",
                                fontWeight: 700,
                                color: "#1D1D1F",
                                letterSpacing: "-1.5px",
                                margin: 0,
                            }}
                        >
                            Everything you need. Nothing you don&apos;t.
                        </h2>
                    </div>
                </Reveal>

                {/* Bento grid */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 20,
                    }}
                >
                    {features.map((f, i) => (
                        <Reveal key={f.title} delay={i * 70}>
                            <div
                                style={{
                                    gridColumn: `span ${f.span}`,
                                    background: "#FFFFFF",
                                    borderRadius: 20,
                                    padding: 32,
                                    border: "1px solid #D2D2D7",
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                                    cursor: "pointer",
                                    transition:
                                        "box-shadow 300ms cubic-bezier(0.25,0.46,0.45,0.94), transform 300ms cubic-bezier(0.25,0.46,0.45,0.94)",
                                }}
                                onMouseEnter={(e) => {
                                    (
                                        e.currentTarget as HTMLElement
                                    ).style.boxShadow =
                                        "0 8px 40px rgba(0,0,0,0.12)";
                                    (
                                        e.currentTarget as HTMLElement
                                    ).style.transform = "scale(1.02)";
                                }}
                                onMouseLeave={(e) => {
                                    (
                                        e.currentTarget as HTMLElement
                                    ).style.boxShadow =
                                        "0 4px 20px rgba(0,0,0,0.06)";
                                    (
                                        e.currentTarget as HTMLElement
                                    ).style.transform = "scale(1)";
                                }}
                            >
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 12,
                                        background: "rgba(0,113,227,0.06)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginBottom: 20,
                                    }}
                                >
                                    {f.icon}
                                </div>
                                <h3
                                    style={{
                                        fontFamily:
                                            '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                                        fontSize: 19,
                                        fontWeight: 600,
                                        color: "#1D1D1F",
                                        marginBottom: 10,
                                        letterSpacing: "-0.3px",
                                    }}
                                >
                                    {f.title}
                                </h3>
                                <p
                                    style={{
                                        fontFamily:
                                            '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                                        fontSize: 15,
                                        color: "#6E6E73",
                                        lineHeight: 1.6,
                                        margin: 0,
                                    }}
                                >
                                    {f.desc}
                                </p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── Social Proof ─────────────────────────────────────────────────────────────
const testimonials = [
    {
        name: "Sarah K.",
        role: "Product Lead @ Vercel",
        quote: "Chatly replaced Slack for our entire org. Cleaner UI and insanely fast.",
    },
    {
        name: "James T.",
        role: "CTO @ Raycast",
        quote: "The developer experience is top-tier. API is clean and well-documented.",
    },
    {
        name: "Linh N.",
        role: "Founder @ Stacks",
        quote: "Best messaging tool I've used. Feels native on every platform.",
    },
];

function SocialProof() {
    return (
        <section
            style={{
                background: "#1D1D1F",
                padding: "100px 24px",
            }}
        >
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <Reveal>
                    <div style={{ textAlign: "center", marginBottom: 64 }}>
                        <p
                            style={{
                                fontFamily:
                                    '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                                fontSize: 13,
                                fontWeight: 500,
                                color: "#34aadc",
                                textTransform: "uppercase",
                                letterSpacing: "1.5px",
                                marginBottom: 16,
                            }}
                        >
                            Testimonials
                        </p>
                        <h2
                            style={{
                                fontFamily:
                                    '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                                fontSize: "clamp(32px, 4vw, 52px)",
                                fontWeight: 700,
                                color: "#FBFBFD",
                                letterSpacing: "-1.5px",
                                margin: 0,
                            }}
                        >
                            Loved by teams worldwide
                        </h2>
                    </div>
                </Reveal>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(300px, 1fr))",
                        gap: 20,
                    }}
                >
                    {testimonials.map((t, i) => (
                        <Reveal key={t.name} delay={i * 80}>
                            <div
                                style={{
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 20,
                                    padding: 32,
                                    transition:
                                        "background 300ms ease, transform 300ms ease",
                                    cursor: "pointer",
                                }}
                                onMouseEnter={(e) => {
                                    (
                                        e.currentTarget as HTMLElement
                                    ).style.background =
                                        "rgba(255,255,255,0.1)";
                                    (
                                        e.currentTarget as HTMLElement
                                    ).style.transform = "scale(1.02)";
                                }}
                                onMouseLeave={(e) => {
                                    (
                                        e.currentTarget as HTMLElement
                                    ).style.background =
                                        "rgba(255,255,255,0.06)";
                                    (
                                        e.currentTarget as HTMLElement
                                    ).style.transform = "scale(1)";
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 4,
                                        marginBottom: 20,
                                    }}
                                >
                                    {Array(5)
                                        .fill(0)
                                        .map((_, k) => (
                                            <Star
                                                key={k}
                                                size={14}
                                                color="#FF9F0A"
                                                fill="#FF9F0A"
                                            />
                                        ))}
                                </div>
                                <p
                                    style={{
                                        fontFamily:
                                            '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                                        fontSize: 16,
                                        color: "#FBFBFD",
                                        lineHeight: 1.65,
                                        marginBottom: 24,
                                    }}
                                >
                                    &ldquo;{t.quote}&rdquo;
                                </p>
                                <div>
                                    <div
                                        style={{
                                            fontFamily:
                                                '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                                            fontWeight: 600,
                                            fontSize: 14,
                                            color: "#FBFBFD",
                                        }}
                                    >
                                        {t.name}
                                    </div>
                                    <div
                                        style={{
                                            fontFamily:
                                                '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                                            fontSize: 13,
                                            color: "#6E6E73",
                                            marginTop: 2,
                                        }}
                                    >
                                        {t.role}
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTA() {
    const navigate = useNavigate();
    return (
        <section
            style={{
                background: "#F5F5F7",
                padding: "100px 24px",
                textAlign: "center",
            }}
        >
            <Reveal>
                <div
                    style={{
                        maxWidth: 660,
                        margin: "0 auto",
                        background: "#FFFFFF",
                        borderRadius: 28,
                        padding: "64px 48px",
                        border: "1px solid #D2D2D7",
                        boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
                    }}
                >
                    <h2
                        style={{
                            fontFamily:
                                '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                            fontSize: "clamp(28px, 4vw, 44px)",
                            fontWeight: 700,
                            color: "#1D1D1F",
                            letterSpacing: "-1.5px",
                            marginBottom: 20,
                        }}
                    >
                        Ready to start chatting?
                    </h2>
                    <p
                        style={{
                            fontFamily:
                                '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                            fontSize: 17,
                            color: "#6E6E73",
                            lineHeight: 1.6,
                            marginBottom: 40,
                        }}
                    >
                        Join thousands of teams already using Chatly. Free
                        forever for small teams.
                    </p>
                    <div
                        style={{
                            display: "flex",
                            gap: 14,
                            justifyContent: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        <button
                            onClick={() => navigate("/auth")}
                            style={{
                                background: "#0071E3",
                                color: "#fff",
                                border: "none",
                                borderRadius: 980,
                                padding: "14px 36px",
                                fontFamily:
                                    '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                                fontWeight: 500,
                                fontSize: 17,
                                cursor: "pointer",
                                transition: "all 300ms ease",
                            }}
                            onMouseEnter={(e) => {
                                (
                                    e.currentTarget as HTMLElement
                                ).style.background = "#0077ED";
                                (
                                    e.currentTarget as HTMLElement
                                ).style.transform = "scale(1.02)";
                            }}
                            onMouseLeave={(e) => {
                                (
                                    e.currentTarget as HTMLElement
                                ).style.background = "#0071E3";
                                (
                                    e.currentTarget as HTMLElement
                                ).style.transform = "scale(1)";
                            }}
                        >
                            Create free account
                        </button>
                    </div>
                </div>
            </Reveal>
        </section>
    );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
    return (
        <footer
            style={{
                background: "#1D1D1F",
                padding: "48px 24px 32px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
        >
            <div
                style={{
                    maxWidth: 1200,
                    margin: "0 auto",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 24,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <div
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background:
                                "linear-gradient(135deg,#0071E3 0%,#34aadc 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <MessageCircle size={15} color="#fff" />
                    </div>
                    <span
                        style={{
                            fontFamily:
                                '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                            fontWeight: 600,
                            fontSize: 16,
                            color: "#FBFBFD",
                        }}
                    >
                        Chatly
                    </span>
                </div>

                <p
                    style={{
                        fontFamily:
                            '"Inter",-apple-system,BlinkMacSystemFont,sans-serif',
                        fontSize: 13,
                        color: "#6E6E73",
                        margin: 0,
                    }}
                >
                    © 2026 Chatly. Built with React + Vite.
                </p>

                <div style={{ display: "flex", gap: 16 }}>
                    {[Github, Twitter].map((Icon, i) => (
                        <a
                            key={i}
                            href="#"
                            style={{
                                color: "#6E6E73",
                                transition: "color 200ms ease",
                                cursor: "pointer",
                            }}
                            onMouseEnter={(e) =>
                                ((e.currentTarget as HTMLElement).style.color =
                                    "#FBFBFD")
                            }
                            onMouseLeave={(e) =>
                                ((e.currentTarget as HTMLElement).style.color =
                                    "#6E6E73")
                            }
                        >
                            <Icon size={20} />
                        </a>
                    ))}
                </div>
            </div>
        </footer>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        @keyframes fade-in { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .bento-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
            <Navbar />
            <main>
                <Hero />
                <BentoFeatures />
                <SocialProof />
                <CTA />
            </main>
            <Footer />
        </>
    );
}
