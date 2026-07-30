import { useEffect, useState } from "react";
import { MiniShell, Card, PrimaryButton, Tag } from "./MiniShell";
import { COMPANIONS, QUESTIONS, matchCompanion, type AnimalKey } from "@/lib/travelmate-data";
import { RefreshCw, Sparkles } from "lucide-react";

type Step = "welcome" | "quiz" | "loading" | "result" | "naming";

export function Onboarding({
  onFinish,
  onSkip,
}: {
  onFinish: (c: { key: AnimalKey; name: string; secondary: AnimalKey; blended: boolean; memory: boolean }) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState<Step>("welcome");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [nameIdx, setNameIdx] = useState(0);
  const [name, setName] = useState("");
  const [memory, setMemory] = useState(true);

  const result = answers.length === QUESTIONS.length ? matchCompanion(answers) : null;
  const companion = result ? COMPANIONS[result.primary] : null;

  useEffect(() => {
    if (step !== "loading") return;
    const t = setTimeout(() => setStep("result"), 1600);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (companion) setName(companion.suggestedNames[nameIdx % companion.suggestedNames.length]);
  }, [companion, nameIdx]);

  if (step === "welcome") {
    return (
      <MiniShell title="travelmate" showTabBar={false}>
        <div className="flex h-full flex-col justify-between px-6 pb-8 pt-10">
          <div className="text-center">
            <p className="text-[13px] font-medium tracking-[0.3em] text-muted-foreground">travelmate</p>
            <h1 className="mt-3 text-[26px] font-bold leading-snug text-foreground">
              和搭子一起
              <br />
              把旅行想好、走好
            </h1>
            <p className="mx-auto mt-3 max-w-[16rem] text-[13px] leading-relaxed text-muted-foreground">
              5 道小问题，约 45 秒，帮你匹配一位专属旅行搭子。
            </p>
          </div>
          <div className="relative flex justify-center py-6">
            <div className="absolute size-52 rounded-full bg-brand-soft" />
            <div className="relative grid grid-cols-3 gap-3 text-4xl">
              {Object.values(COMPANIONS).slice(0, 6).map((c) => (
                <span key={c.key} className="drop-shadow-sm">{c.emoji}</span>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <PrimaryButton onClick={() => setStep("quiz")}>秒匹配我的搭子</PrimaryButton>
            <button
              onClick={onSkip}
              className="w-full py-2 text-[13px] font-medium text-muted-foreground"
            >
              先逛逛，稍后再测
            </button>
            <p className="text-center text-[11px] text-muted-foreground/80">
              仅在保存搭子结果时需要微信快捷登录
            </p>
          </div>
        </div>
      </MiniShell>
    );
  }

  if (step === "quiz") {
    const q = QUESTIONS[idx];
    return (
      <MiniShell
        title={`旅行偏好测试 ${idx + 1}/5`}
        showTabBar={false}
        onBack={() => (idx === 0 ? setStep("welcome") : setIdx(idx - 1))}
      >
        <div className="flex h-full flex-col px-6 pb-8">
          <div className="mt-1 h-1.5 w-full rounded-full bg-surface-sunk">
            <div
              className="h-1.5 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((idx + 1) / QUESTIONS.length) * 100}%` }}
            />
          </div>
          <div className="mt-10">
            <Tag tone="accent">{q.topic}</Tag>
            <h2 className="mt-4 text-[22px] font-bold leading-snug text-foreground">{q.text}</h2>
          </div>
          <div className="mt-8 space-y-3">
            {q.options.map((opt, i) => {
              const selected = answers[idx] === i;
              return (
                <button
                  key={opt.label}
                  onClick={() => {
                    const next = answers.slice();
                    next[idx] = i;
                    setAnswers(next);
                    setTimeout(() => {
                      if (idx === QUESTIONS.length - 1) setStep("loading");
                      else setIdx(idx + 1);
                    }, 180);
                  }}
                  className={`w-full rounded-[16px] border px-4 py-4 text-left text-[15px] transition-all active:scale-[0.99] ${
                    selected
                      ? "border-primary bg-brand-soft font-semibold text-foreground"
                      : "border-border bg-card text-foreground/80"
                  }`}
                >
                  {opt.label}
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
          <p className="text-[13px] text-muted-foreground">根据你的节奏、角色和旅行动机</p>
        </div>
      </MiniShell>
    );
  }

  if (step === "result" && companion && result) {
    const second = COMPANIONS[result.secondary];
    return (
      <MiniShell title="匹配结果" showTabBar={false}>
        <div className="flex h-full flex-col px-6 pb-8">
          <div className="mt-4 text-center">
            <div className="mx-auto flex size-32 items-center justify-center rounded-full bg-brand-soft text-[64px]">
              {companion.emoji}
            </div>
            <h2 className="mt-4 text-[24px] font-bold text-foreground">{companion.title}</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {result.blended ? "复合倾向 · " : ""}也很会{second.title.replace("者", "")}
            </p>
          </div>
          <Card className="mt-6">
            <p className="text-[13px] leading-relaxed text-foreground/80">
              你喜欢{companion.tendency}。{companion.behavior}
            </p>
          </Card>
          <Card className="mt-3">
            <p className="text-[12px] font-semibold text-foreground">在 travelmate 里，我会这样帮你</p>
            <ul className="mt-2 space-y-1.5 text-[12px] text-muted-foreground">
              <li>· {companion.behavior}</li>
              <li>· 记住你的节奏偏好，下次直接套用</li>
              <li>· 出发前用一句话提醒你还差什么</li>
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground/70">
              评分版本 {result.scoringVersion} · 结果可随时重测或删除
            </p>
          </Card>
          <div className="mt-auto space-y-2 pt-6">
            <PrimaryButton onClick={() => setStep("naming")}>给它取个名字</PrimaryButton>
            <button
              onClick={() => {
                setAnswers([]);
                setIdx(0);
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
        <div className="flex h-full flex-col px-6 pb-8">
          <div className="mt-6 text-center">
            <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-brand-soft text-5xl">
              {companion.emoji}
            </div>
            <h2 className="mt-4 text-[20px] font-bold text-foreground">给你的{companion.animal}搭子取个名字</h2>
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-[16px] border border-border bg-card px-4 py-3">
            <input
              value={name}
              maxLength={8}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-transparent text-[16px] font-semibold text-foreground outline-none"
              placeholder="最多 8 个字"
            />
            <button
              onClick={() => setNameIdx(nameIdx + 1)}
              className="flex items-center gap-1 text-[12px] text-muted-foreground"
            >
              <RefreshCw className="size-3.5" /> 换一个
            </button>
          </div>
          <Card className="mt-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={memory}
                onChange={(e) => setMemory(e.target.checked)}
                className="mt-1 size-4 accent-[var(--accent)]"
              />
              <span className="text-[12px] leading-relaxed text-muted-foreground">
                允许搭子记住我的旅行偏好（节奏、住宿、饮食），用于行程建议。可在「搭子记忆」中随时关闭或删除。
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
                  secondary: result.secondary,
                  blended: result.blended,
                  memory,
                })
              }
            >
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-4" /> 完成，开始旅行
              </span>
            </PrimaryButton>
          </div>
        </div>
      </MiniShell>
    );
  }

  return null;
}
