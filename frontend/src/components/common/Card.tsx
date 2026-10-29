import type { ReactNode } from "react";
import { PageHero } from "@/components/layout/PageHero";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  variant = "hero",
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** "hero" (default) = full-bleed dark band; "plain" = inline light heading. */
  variant?: "hero" | "plain";
}) {
  if (variant === "plain") {
    return (
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-navy-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <PageHero className="-mx-4 -mt-8 mb-6 sm:-mx-8 lg:-mx-10">
      <div className="flex flex-wrap items-end justify-between gap-4 px-4 py-7 sm:px-8 lg:px-10">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-navy-200">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </PageHero>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 text-4xl">{icon}</div>}
      <h3 className="font-display text-lg font-bold text-navy-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-navy-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}