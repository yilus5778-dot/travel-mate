import type { ReactNode } from "react";
import { ChevronLeft, Map, PawPrint, Receipt, User } from "lucide-react";

export type TabKey = "trips" | "accounting" | "companion" | "mine";

const TABS = [
  { key: "trips", label: "旅程", Icon: Map },
  { key: "accounting", label: "记账", Icon: Receipt },
  { key: "companion", label: "搭子", Icon: PawPrint },
  { key: "mine", label: "我的", Icon: User },
] as const;

/**
 * 响应式应用外壳:
 * - 手机端:顶部标题栏 + 底部 Tab 导航(类小程序体验)
 * - 桌面端(md 及以上):顶部 Logo + 居中导航,内容限宽居中
 */
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
  const showTabs = Boolean(showTabBar && tab && onTabChange);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="relative mx-auto flex h-14 w-full max-w-4xl items-center px-2 md:px-6">
          {onBack ? (
            <>
              <button
                onClick={onBack}
                aria-label="返回"
                className="flex size-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-secondary"
              >
                <ChevronLeft className="size-5" />
              </button>
              <span className="ml-1 hidden text-[15px] font-semibold md:inline">{title}</span>
              <span className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold md:hidden">
                {title}
              </span>
            </>
          ) : (
            <>
              <span className="px-2 text-[16px] font-bold text-primary">travelmate</span>
              <span className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold md:hidden">
                {title}
              </span>
            </>
          )}

          {showTabs && !onBack && (
            <nav aria-label="主导航" className="absolute left-1/2 hidden -translate-x-1/2 md:block">
              <ul className="flex items-center gap-1">
                {TABS.map(({ key, label, Icon }) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => onTabChange?.(key)}
                      aria-current={tab === key ? "page" : undefined}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                        tab === key
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      }`}
                    >
                      <Icon
                        className={`size-4 ${tab === key ? "text-primary" : ""}`}
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
      </header>

      <main
        className={`mx-auto w-full max-w-4xl flex-1 px-4 py-4 md:px-6 md:py-8 ${
          showTabs ? "pb-24 md:pb-8" : ""
        }`}
      >
        {children}
      </main>

      {showTabs && (
        <nav
          aria-label="主导航"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
        >
          <ul className="flex pb-[env(safe-area-inset-bottom)]">
            {TABS.map(({ key, label, Icon }) => (
              <li key={key} className="flex-1">
                <button
                  type="button"
                  onClick={() => onTabChange?.(key)}
                  aria-current={tab === key ? "page" : undefined}
                  className={`flex w-full flex-col items-center gap-1 py-2 text-[11px] transition-colors ${
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

export function Tag({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "brand" | "accent";
}) {
  const tones = {
    muted: "bg-surface-sunk text-muted-foreground",
    brand: "bg-brand-soft text-primary-foreground",
    accent: "bg-accent-soft text-accent",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
