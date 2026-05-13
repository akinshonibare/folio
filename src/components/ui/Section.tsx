import Link from "next/link";

/**
 * Delta-style section header: small all-caps subhead above a bold title.
 * Optional right-side accessory (See all link, icon button, etc).
 */
export function Section({
  subhead,
  title,
  right,
  children,
}: {
  subhead?: string;
  title: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          {subhead && <p className="subhead">{subhead}</p>}
          <h2 className="section-title mt-0.5">{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function SeeAllLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="pill text-xs hover:bg-[color:var(--color-surface-3)]"
    >
      See all
    </Link>
  );
}
