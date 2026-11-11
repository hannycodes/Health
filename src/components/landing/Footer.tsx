import { Link } from "react-router-dom";

import { Logo } from "@/components/branding/Logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How It Works", href: "#how-it-works" },
      { label: "Features", href: "#features" },
      { label: "AI & Trust", href: "#about" },
    ],
  },
  {
    title: "For patients",
    links: [
      { label: "Find a doctor", href: "/login" },
      { label: "Book an appointment", href: "/login" },
      { label: "Medical history", href: "/login" },
    ],
  },
  {
    title: "For healthcare providers",
    links: [
      { label: "Doctor workspace", href: "/login" },
      { label: "Hospital administration", href: "/login" },
      { label: "Platform administration", href: "/login" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-surface-dark text-white/70">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo size="sm" onDark />
            <p className="max-w-xs text-sm leading-relaxed">
              MyHealth connects patients, doctors, and hospitals in one coordinated
              platform — from discovering care to keeping the healthcare journey
              connected.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-white/50 uppercase">
                {column.title}
              </p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("#") ? (
                      <a
                        href={link.href}
                        className="text-sm text-white/70 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-sm text-white/70 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MyHealth. All rights reserved.</p>
          <p className="text-white/45">
            Coordinated care for patients, doctors and hospitals.
          </p>
        </div>
      </div>
    </footer>
  );
}
