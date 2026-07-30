import { useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import {
  COMPANIONS,
  PRODUCT_CAPABILITIES,
  QUESTIONS,
  matchCompanion,
  type AnimalKey,
  type MatchReason,
} from "@/lib/travelmate-data";
import { MiniShell, Card, PrimaryButton, Tag } from "./MiniShell";

type Step = "welcome" | "quiz" | "loading" | "result" | "naming";

export interface OnboardingResult {
  key: AnimalKey;
  name: string;
  memoryEnabled: boolean;
  reasons: MatchReason[];
}

export function Onboarding({
  onFinish,
  onSkip,
}: {
  onFinish: (result: OnboardingResult) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState<Step>("welcome");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [nameIndex, setNameIndex] = useState(0);
  const [name, setName] = useState("");
  const [memoryEnabled, setMemoryEnabled] = useState(false);

  const result = answers.length === QUESTIONS.length ? matchCompanion(answers) : null;
  const companion = result ? COMPANIONS[result.primary] : null;

  useEffect(() => {
    if (step !== "loading") return;
    const timer = setTimeout(() => setStep("result"), 900);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (companion) {
      setName(companion.suggestedNames[nameIndex % companion.suggestedNames.length]);
    }
  }, [companion, nameIndex]);

  if (step === "welcome") {
    return (
      <MiniShell title="travelmate" showTabBar={false}>
        <div className="flex min-h-full flex-col px-6 pb-6 pt-5">
          <div className="text-center">
            <p className="text-[13px] font-medium tracking-[0.3em] text-muted-foreground">
              travelmate
            </p>
            <h1 className="mt-3 text-[26px] font-bold leading-snug text-foreground">
              和搭子一起
              <br />
              把旅行想好、走好
            </h1>
            <p className="mx-auto mt-3 max-w-[17rem] text-[13px] leading-relaxed text-muted-foreground">
              6 个独立维度，约 1 分钟。每个匹配结论都能追溯到你的答案。
            </p>
          </div>
          <div className="relative mx-auto mt-5 flex h-40 w-full shrink-0 items-center justify-center">
            <div className="absolute size-40 rounded-full bg-brand-soft" />
            <div className="relative grid grid-cols-3 gap-x-5 gap-y-3 text-3xl">
              {Object.values(COMPANIONS)
                .slice(0, 6)
                .map((item) => (
                  <span key={item.key} className="drop-shadow-sm">
                    {item.emoji}
                  </span>
                ))}
            </div>
          </div>
          <div className="mt-auto space-y-2 pt-5">
            <PrimaryButton onClick={() => setStep("quiz")}>开始匹配我的搭子</PrimaryButton>
            <button
              onClick={onSkip}
              className="w-full py-2 text-[13px] font-medium text-muted-foreground"
            >
              先逛逛，稍后再测
            </button>
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground/80">
              保存搭子、邀请同行人或跨设备同步时才需要登录
            </p>
          </div>
        </div>
      </MiniShell>
    );
  }

  if (step === "quiz") {
    const question = QUESTIONS[index];
    return (
      <MiniShell
        title={`旅行偏好测试 ${index + 1}/${QUESTIONS.length}`}
        showTabBar={false}
        onBack={() => (index === 0 ? setStep("welcome") : setIndex(index - 1))}
      >
        <div className="flex min-h-full flex-col px-6 pb-8">
          <div className="mt-1 h-1.5 w-full rounded-full bg-surface-sunk">
            <div
              className="h-1.5 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((index + 1) / QUESTIONS.length) * 100}%` }}
            />
          </div>
          <div className="mt-10">
            <Tag tone="accent">{question.topic}</Tag>
            <h2 className="mt-4 text-[22px] font-bold leading-snug text-foreground">
              {question.text}
            </h2>
          </div>
          <div className="mt-8 space-y-3">
            {question.options.map((option, optionIndex) => {
              const selected = answers[index] === optionIndex;
              return (
                <button
                  key={option.label}
                  onClick={() => {
                    const next = answers.slice();
                    next[index] = optionIndex;
                    setAnswers(next);
                    setTimeout(() => {
                      if (index === QUESTIONS.length - 1) setStep("loading");
                      else setIndex(index + 1);
                    }, 140);
                  }}
                  className={`w-full rounded-[16px] border px-4 py-4 text-left text-[15px] transition-all active:scale-[0.99] ${
                    selected
                      ? "border-primary bg-brand-soft font-semibold text-foreground"
                      : "border-border bg-card text-foreground/80"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <button onClick={onSkip} className="mt-auto py-3 text-[13px] text-muted-foreground">
            跳过测试
          </button>
        </div>
      </MiniShell>
    );
  }

  if (step === "loading") {
    return (
      <MiniShell title="正在匹配" showTabBar={false}>
        <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
          <div className="flex size-24 animate-pulse items-center justify-center rounded-full bg-brand-soft text-5xl">
            ✨
          </div>
          <p className="text-[16px] font-semibold text-foreground">正在为你挑选搭子…</p>
          <p className="text-[13px] text-muted-foreground">
            逐项核对计划、节奏、社交、风险、消费和动机
          </p>
        </div>
      </MiniShell>
    );
  }

  if (step === "result" && companion && result) {
    return (
      <MiniShell title="匹配结果" showTabBar={false}>
        <div className="px-6 pb-8">
          <div className="mt-4 text-center">
            <div className="mx-auto flex size-28 items-center justify-center rounded-full bg-brand-soft text-[58px]">
              {companion.emoji}
            </div>
            <h2 className="mt-4 text-[24px] font-bold text-foreground">{companion.title}</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">{companion.tendency}</p>
          </div>
          <Card className="mt-5">
            <p className="text-[12px] font-semibold text-foreground">搭子人格</p>
            <p className="mt-2 text-[12px] leading-relaxed text-foreground/80">
              {companion.behavior}
            </p>
          </Card>
          <Card className="mt-3">
            <p className="text-[12px] font-semibold text-foreground">为什么匹配到它</p>
            <div className="mt-3 space-y-3">
              {result.reasons.map((reason) => (
                <div
                  key={reason.dimension}
                  className="border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Tag>{reason.dimensionLabel}</Tag>
                    <span className="text-right text-[10px] text-muted-foreground">
                      {reason.answer}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-foreground/75">
                    {reason.conclusion}
                  </p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="mt-3">
            <p className="text-[12px] font-semibold text-foreground">基础产品能力</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              以下能力对所有用户一致，与匹配到哪种动物无关。
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRODUCT_CAPABILITIES.map((capability) => (
                <Tag key={capability} tone="brand">
                  {capability}
                </Tag>
              ))}
            </div>
          </Card>
          <div className="space-y-2 pt-6">
            <PrimaryButton onClick={() => setStep("naming")}>给它取个名字</PrimaryButton>
            <button
              onClick={() => {
                setAnswers([]);
                setIndex(0);
                setStep("quiz");
              }}
              className="w-full py-2 text-[13px] text-muted-foreground"
            >
              重新测一次
            </button>
          </div>
        </div>
      </MiniShell>
    );
  }

  if (companion && result) {
    return (
      <MiniShell title="搭子命名" showTabBar={false} onBack={() => setStep("result")}>
        <div className="flex min-h-full flex-col px-6 pb-8">
          <div className="mt-6 text-center">
            <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-brand-soft text-5xl">
              {companion.emoji}
            </div>
            <h2 className="mt-4 text-[20px] font-bold text-foreground">
              给你的{companion.animal}搭子取个名字
            </h2>
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-[16px] border border-border bg-card px-4 py-3">
            <input
              value={name}
              maxLength={8}
              onChange={(event) => setName(event.target.value)}
              className="flex-1 bg-transparent text-[16px] font-semibold text-foreground outline-none"
              placeholder="最多 8 个字"
            />
            <button
              onClick={() => setNameIndex(nameIndex + 1)}
              className="flex items-center gap-1 text-[12px] text-muted-foreground"
            >
              <RefreshCw className="size-3.5" /> 换一个
            </button>
          </div>
          <Card className="mt-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={memoryEnabled}
                onChange={(event) => setMemoryEnabled(event.target.checked)}
                className="mt-1 size-4 accent-[var(--accent)]"
              />
              <span className="text-[12px] leading-relaxed text-muted-foreground">
                允许搭子保存本次偏好测试中我明确选择的答案。每条记忆都会标注来源；默认关闭，可随时停用或删除。
              </span>
            </label>
          </Card>
          <div className="mt-auto pt-6">
            <PrimaryButton
              disabled={!name.trim()}
              onClick={() =>
                onFinish({
                  key: companion.key,
                  name: name.trim(),
                  memoryEnabled,
                  reasons: result.reasons,
                })
              }
            >
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-4" /> 保存搭子并继续
              </span>
            </PrimaryButton>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              下一步将说明登录原因和数据用途
            </p>
          </div>
        </div>
      </MiniShell>
    );
  }

  return null;
}
