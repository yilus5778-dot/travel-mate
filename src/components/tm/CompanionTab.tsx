import { useState } from "react";
import { Database, ShieldCheck, Sparkles } from "lucide-react";
import { COMPANIONS, PRODUCT_CAPABILITIES } from "@/lib/travelmate-data";
import type { CompanionProfile, MemoryItem } from "@/lib/app-model";
import { MiniShell, Card, PrimaryButton, Tag, type TabKey } from "./MiniShell";

export function CompanionTab({
  companion,
  memories,
  tab,
  onTabChange,
  onRetest,
  onEnableMemory,
  onDisableMemory,
  onDeleteMemory,
}: {
  companion: CompanionProfile | null;
  memories: MemoryItem[];
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onRetest: () => void;
  onEnableMemory: () => void;
  onDisableMemory: (mode: "pause" | "delete") => void;
  onDeleteMemory: (id: string) => void;
}) {
  const [showMemoryChoice, setShowMemoryChoice] = useState(false);
  const companionType = companion ? COMPANIONS[companion.key] : null;

  return (
    <MiniShell title="搭子" tab={tab} onTabChange={onTabChange}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        {companion && companionType ? (
          <>
            <Card className="text-center">
              <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-brand-soft text-5xl">
                {companionType.emoji}
              </div>
              <h2 className="mt-3 text-[20px] font-bold text-foreground">{companion.name}</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {companionType.title} · {companionType.tendency}
              </p>
              <p className="mt-3 rounded-[14px] bg-surface-sunk px-3 py-2 text-[12px] text-foreground/80">
                {companionType.behavior}
              </p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                这是搭子的表达与陪伴风格，不代表你的个人偏好。
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-foreground">搭子记忆</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    默认关闭，只保存你明确授权的内容
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="搭子记忆"
                  aria-checked={companion.memoryEnabled}
                  onClick={() => {
                    if (companion.memoryEnabled) setShowMemoryChoice(true);
                    else onEnableMemory();
                  }}
                  className={`h-6 w-11 rounded-full transition-colors ${
                    companion.memoryEnabled ? "bg-accent" : "bg-surface-sunk"
                  }`}
                >
                  <span
                    className={`block size-5 rounded-full bg-card shadow transition-transform ${
                      companion.memoryEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {!companion.memoryEnabled ? (
                <div className="mt-3 rounded-[14px] bg-surface-sunk p-3 text-center">
                  <ShieldCheck className="mx-auto size-5 text-muted-foreground" />
                  <p className="mt-2 text-[12px] font-medium text-foreground">记忆未启用</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    不会生成、使用或展示任何个人记忆。
                  </p>
                </div>
              ) : memories.length ? (
                <div className="mt-3 space-y-2">
                  {memories.map((memory) => (
                    <div key={memory.id} className="rounded-[14px] bg-surface-sunk px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[12px] font-medium text-foreground">{memory.type}</p>
                          <p className="text-[11px] text-muted-foreground">{memory.value}</p>
                        </div>
                        <button
                          onClick={() => onDeleteMemory(memory.id)}
                          className="shrink-0 text-[11px] text-muted-foreground"
                        >
                          删除
                        </button>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground/80">{memory.source}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-[14px] bg-surface-sunk p-3 text-center">
                  <Database className="mx-auto size-5 text-muted-foreground" />
                  <p className="mt-2 text-[12px] font-medium text-foreground">还没有记忆</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    只有明确来源的信息才会出现在这里。
                  </p>
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent" />
                <p className="text-[14px] font-semibold text-foreground">为什么匹配到它</p>
              </div>
              <div className="mt-3 space-y-3">
                {companion.reasons.map((reason) => (
                  <div
                    key={reason.dimension}
                    className="border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Tag>{reason.dimensionLabel}</Tag>
                      <span className="text-right text-[10px] text-muted-foreground">
                        你的答案：{reason.answer}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-foreground/75">
                      {reason.conclusion}
                    </p>
                  </div>
                ))}
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
            <p className="mt-1 text-[12px] text-muted-foreground">
              6 个独立维度，结果可追溯到每个答案
            </p>
            <div className="mt-4">
              <PrimaryButton onClick={onRetest}>开始匹配</PrimaryButton>
            </div>
          </Card>
        )}

        <Card>
          <p className="text-[14px] font-semibold text-foreground">所有用户都有的基础能力</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            这些是产品能力，不随搭子人格变化。
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {PRODUCT_CAPABILITIES.map((capability) => (
              <div
                key={capability}
                className="rounded-[12px] bg-surface-sunk px-3 py-2 text-[11px] text-foreground/75"
              >
                {capability}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {showMemoryChoice && (
        <div className="absolute inset-0 z-30 flex items-end bg-foreground/35 p-4">
          <Card className="w-full">
            <h3 className="text-[16px] font-bold text-foreground">关闭搭子记忆</h3>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              你可以只停止使用并保留已有记忆，也可以同时删除全部记忆。
            </p>
            <div className="mt-4 space-y-2">
              <PrimaryButton
                onClick={() => {
                  onDisableMemory("pause");
                  setShowMemoryChoice(false);
                }}
              >
                停止使用，保留已有记忆
              </PrimaryButton>
              <button
                onClick={() => {
                  onDisableMemory("delete");
                  setShowMemoryChoice(false);
                }}
                className="w-full rounded-[14px] bg-surface-sunk py-3 text-[13px] font-medium text-foreground"
              >
                停止使用并删除全部记忆
              </button>
              <button
                onClick={() => setShowMemoryChoice(false)}
                className="w-full py-2 text-[12px] text-muted-foreground"
              >
                取消
              </button>
            </div>
          </Card>
        </div>
      )}
    </MiniShell>
  );
}
