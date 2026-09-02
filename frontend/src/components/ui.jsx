import { X } from "lucide-react";
import { useRef } from "react";

function useTilt(max = 3) {
  const ref = useRef(null);
  const handleMouseMove = (event) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--tilt-x", `${(-py * max).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(px * max).toFixed(2)}deg`);
  };
  const resetTilt = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  };
  return { ref, handleMouseMove, resetTilt };
}

export function Button({
  variant = "primary",
  icon: Icon,
  children,
  className = "",
  ...props
}) {
  const variants = {
    primary: "gradient-action text-white shadow-subtle",
    secondary:
      "bg-white/6 text-charcoal border border-white/10 hover:bg-white/10 hover:text-white",
    ghost: "bg-transparent text-slate hover:bg-white/6 hover:text-white",
    danger:
      "bg-white/6 text-tangerine border border-white/10 hover:border-tangerine hover:bg-tangerine/10",
    blue: "gradient-blue text-white shadow-subtle",
  };
  return (
    <button
      className={`button-surface focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 ease-in-out ${variants[variant]} ${className}`}
      {...props}
    >
      {Icon ? <Icon size={18} strokeWidth={2} /> : null}
      {children}
    </button>
  );
}

export function Card({ title, description, action, children, className = "" }) {
  const { ref, handleMouseMove, resetTilt } = useTilt();
  return (
    <section
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className={`panel p-5 transition-all duration-300 ease-in-out sm:p-6 ${className}`}
    >
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title ? (
              <h2 className="section-title text-lg font-semibold">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, tone = "neutral" }) {
  const { ref, handleMouseMove, resetTilt } = useTilt();
  const tones = {
    neutral: "text-charcoal",
    blue: "text-electric-blue",
    green: "text-vivid-green",
    orange: "text-tangerine",
    violet: "text-lavender",
  };
  const fills = {
    neutral: "bg-white/14",
    blue: "bg-electric-blue",
    green: "bg-vivid-green",
    orange: "bg-tangerine",
    violet: "bg-lavender",
  };
  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className="stat-card panel relative overflow-hidden p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate">{label}</p>
        <span className={`relative z-10 h-2.5 w-2.5 rounded-full shadow-sm ${fills[tone]}`} />
      </div>
      <p className={`tabular relative z-10 mt-3 text-3xl font-semibold leading-none ${tones[tone]}`}>
        {value}
      </p>
      {hint ? <p className="relative z-10 mt-2 text-sm text-slate">{hint}</p> : null}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <div className={`page-hero p-6 sm:p-7 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase text-slate">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="art-title mt-2 text-3xl leading-tight sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-base leading-7 text-slate">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

const badgeTones = {
  neutral: "bg-white/6 text-slate ring-1 ring-white/10",
  blue: "bg-electric-blue/16 text-electric-blue ring-1 ring-electric-blue/20",
  green: "bg-vivid-green/16 text-vivid-green ring-1 ring-vivid-green/20",
  orange: "bg-tangerine/16 text-tangerine ring-1 ring-tangerine/20",
  violet: "bg-lavender/16 text-lavender ring-1 ring-lavender/20",
  dark: "bg-white/10 text-white",
};

export function Badge({ children, tone = "neutral", className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold leading-5 ${badgeTones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label ? <span className="label">{label}</span> : null}
      <input className={`field ${className}`} {...props} />
    </label>
  );
}

export function Select({ label, children, className = "", ...props }) {
  return (
    <label className="block">
      {label ? <span className="label">{label}</span> : null}
      <select className={`field ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label ? <span className="label">{label}</span> : null}
      <textarea className={`field min-h-28 ${className}`} {...props} />
    </label>
  );
}

export function Spinner({ label = "加载中..." }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-electric-blue" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="panel-soft flex min-h-40 flex-col items-center justify-center px-6 py-8 text-center">
      <p className="text-lg font-semibold text-charcoal">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm leading-6 text-slate">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Pagination({ page, perPage, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-slate">
      <span>
        第 {page} / {pages} 页，共 {total} 条
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          上一页
        </Button>
        <Button
          variant="secondary"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}

export function Modal({ open, title, onClose, children, width = "max-w-2xl" }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-midnight-ink/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`modal-panel panel max-h-[90vh] w-full overflow-y-auto p-5 ${width}`}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-charcoal">{title}</h2>
          <button
            className="focus-ring rounded-lg p-1.5 text-slate hover:bg-white/6 hover:text-charcoal"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
