import { MiniShell, Card, PrimaryButton, Tag, type TabKey } from "./MiniShell";
import { COMPANIONS, SCORING_VERSION } from "@/lib/travelmate-data";
import type { CompanionState } from "./TripsTab";

const MEMORIES = [
  { type: "节奏偏好", value: "每天 3 个地点以内，午后留白" },
  { type: "住宿偏好", value: "偏好安静民宿、近洱海" },
  { type: "饮食偏好", value: "不吃辣，喜欢当地小馆" },
];

export function CompanionTab({
  companion,
  tab,
  onTabChange,
  onRetest,
  onToggleMemory,
}: {
  companion: CompanionState;
  tab: TabKey;
  onTabChange: (t: TabKey) => void;
  onRetest: () => void;
  onToggleMemory: (v: boolean) => void;
}) {
  const c = companion.key ? COMPANIONS[companion.key] : null;

  return (
    <MiniShell title="搭子" tab={tab} onTabChange={onTabChange}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        {c ? (
          <>
            <Card className="text-center">
              <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-brand-soft text-5xl">
                {c.emoji}
              </div>
              <h2 className="mt-3 text-[20px] font-bold text-foreground">{companion.name}</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {c.title} · {c.tendency}
              </p>
              <p className="mt-3 rounded-[14px] bg-surface-sunk px-3 py-2 text-[12px] text-foreground/80">
                {c.behavior}
              </p>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold text-foreground">搭子记忆</p>
                <button
                  type="button"
                  role="switch"
                  aria-label="搭子记忆"
                  aria-checked={companion.memory}
                  onClick={() => onToggleMemory(!companion.memory)}
                  className={`h-6 w-11 rounded-full transition-colors ${
                    companion.memory ? "bg-accent" : "bg-surface-sunk"
                  }`}
                >
                  <span
                    className={`block size-5 rounded-full bg-card shadow transition-transform ${
                      companion.memory ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {MEMORIES.map((m) => (
                  <div
                    key={m.type}
                    className={`flex items-start justify-between gap-3 rounded-[14px] bg-surface-sunk px-3 py-2 ${
                      companion.memory ? "" : "opacity-40"
                    }`}
                  >
                    <div>
                      <p className="text-[12px] font-medium text-foreground">{m.type}</p>
                      <p className="text-[11px] text-muted-foreground">{m.value}</p>
                    </div>
                    <button className="shrink-0 text-[11px] text-muted-foreground">删除</button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground/80">
                记忆仅用于行程建议，可随时关闭或逐条删除。
              </p>
            </Card>
            <Card>
              <p className="text-[14px] font-semibold text-foreground">匹配信息</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Tag tone="brand">{c.title}</Tag>
                <Tag>评分版本 {SCORING_VERSION}</Tag>
                <Tag>5 题 · 已完成</Tag>
              </div>
              <button
                onClick={onRetest}
                className="mt-3 w-full rounded-[12px] bg-surface-sunk py-2.5 text-[13px] font-medium text-foreground"
              >
                重新匹配搭子
              </button>
            </Card>
          </>
        ) : (
          <Card className="text-center">
            <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-surface-sunk text-5xl">
              🐾
            </div>
            <h2 className="mt-3 text-[18px] font-bold text-foreground">你还没有搭子</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">5 道小问题，45 秒完成匹配</p>
            <div className="mt-4">
              <PrimaryButton onClick={onRetest}>完成匹配</PrimaryButton>
            </div>
          </Card>
        )}
        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-foreground">七类搭子</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(COMPANIONS).map((x) => (
              <Card key={x.key} className="!p-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{x.emoji}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{x.title}</p>
                    <p className="text-[10px] text-muted-foreground">{x.animal}</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{x.tendency}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MiniShell>
  );
}
