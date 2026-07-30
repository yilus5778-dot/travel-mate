import type { ReactNode } from "react";
import { ChevronLeft, Map, PawPrint, User } from "lucide-react";

export type TabKey = "trips" | "companion" | "mine";

export function MiniShell({
  title,
  onBack,
  tab,
  onTabChange,
  showTabBar = true,
  children,
}: {
  title: string;
  onBack?: () => void;
  tab?: TabKey;
  onTabChange?: (t: TabKey) => void;
  showTabBar?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mini-shell relative mx-auto flex h-[812px] w-[375px] flex-col overflow-hidden rounded-[2.75rem] border-8 border-foreground/85 bg-background shadow-[var(--shadow-float)]">
      {/* 状态栏 + 胶囊 */}
      <div className="shrink-0 bg-background">
        <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-medium text-foreground">
          <span>9:41</span>
          <span className="tracking-tight">●●● ᯤ ▮</span>
        </div>
        <div className="relative flex h-11 items-center justify-center">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="返回"
              className="absolute left-3 flex size-8 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-secondary"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <span className="text-[15px] font-semibold text-foreground">{title}</span>
          <div className="absolute right-3 flex h-7 w-[74px] items-center justify-center gap-3 rounded-full border border-border bg-secondary/70 text-[10px] text-muted-foreground">
            <span>•••</span>
            <span className="h-3 w-px bg-border" />
            <span>◎</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

      {showTabBar && tab && onTabChange && (
        <nav className="shrink-0 border-t border-border bg-card/95 pb-4 pt-2 backdrop-blur">
          <ul className="flex">
            {(
              [
                { key: "trips", label: "旅程", Icon: Map },
                { key: "companion", label: "搭子", Icon: PawPrint },
                { key: "mine", label: "我的", Icon: User },
              ] as const
            ).map(({ key, label, Icon }) => (
              <li key={key} className="flex-1">
                <button
                  type="button"
                  onClick={() => onTabChange(key)}
                  aria-current={tab === key ? "page" : undefined}
                  className={`flex w-full flex-col items-center gap-1 py-1 text-[11px] transition-colors ${
                    tab === key ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Icon
                    className={`size-5 ${tab === key ? "text-primary" : ""}`}
                    strokeWidth={tab === key ? 2.4 : 1.8}
                  />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[20px] bg-card p-4 shadow-[var(--shadow-card)] ${className}`}>
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-[14px] bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-all active:scale-[0.98] disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function Tag({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "brand" | "accent" }) {
  const tones = {
    muted: "bg-surface-sunk text-muted-foreground",
    brand: "bg-brand-soft text-primary-foreground",
    accent: "bg-accent-soft text-accent",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}>{children}</span>
  );
}
