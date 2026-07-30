import { useState } from "react";
import { MiniShell, Card, PrimaryButton, Tag } from "./MiniShell";
import { Camera, Check, FileUp, Lightbulb, ListChecks, Share2, Sparkles } from "lucide-react";

type PathKey = "material" | "idea";

const PATHS: { key: PathKey; icon: typeof ListChecks; title: string; desc: string }[] = [
  { key: "material", icon: FileUp, title: "已有攻略或订单", desc: "上传资料 → AI 识别 → 你确认" },
  { key: "idea", icon: Lightbulb, title: "只是先有一个想法", desc: "输入一句话，我来搭框架" },
];

const AI_RESULT = [
  { name: "大理古城住宿", desc: "民宿 2 间 · 8/12 入住", ok: true },
  { name: "高铁 G2612", desc: "8/12 09:05 出发", ok: true },
  { name: "苍山索道", desc: "时间未识别，需确认", ok: false },
];

const AI_DAYS = [
  {
    key: "d1",
    label: "D1",
    date: "8月12日",
    items: [
      { time: "09:05", name: "高铁 G2612 出发", place: "昆明南 → 大理", ok: true },
      { time: "13:30", name: "民宿入住", place: "大理古城 · 2 间", ok: true },
      { time: "17:00", name: "古城散步 + 晚餐", place: "人民路一带", ok: false },
    ],
  },
  {
    key: "d2",
    label: "D2",
    date: "8月13日",
    items: [
      { time: "09:30", name: "喜洲古镇早餐", place: "四方街", ok: true },
      { time: "11:00", name: "海舌生态公园", place: "骑行 20 分钟", ok: true },
      { time: "14:30", name: "苍山洗马潭索道", place: "时间未识别，需确认", ok: false },
    ],
  },
  {
    key: "d3",
    label: "D3",
    date: "8月14日",
    items: [
      { time: "10:00", name: "洱海环湖包车", place: "全天 · 已下单", ok: true },
      { time: "19:00", name: "洱海边晚餐", place: "候选 2 家", ok: false },
    ],
  },
];

export function CreateTrip({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<"path" | "input" | "done">("path");
  const [path, setPath] = useState<PathKey | null>(null);
  const [idea, setIdea] = useState("");
  const [imported, setImported] = useState(false);
  const [activeDay, setActiveDay] = useState("d1");

  const back = () => {
    if (step === "path") return onCancel();
    if (step === "input") return setStep("path");
    setStep("input");
  };

  const canNext = path === "material" ? imported : idea.trim().length > 0;

  return (
    <MiniShell title="创建新旅行" onBack={back} showTabBar={false}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        {step === "path" && (
          <>
            <div>
              <h2 className="text-[19px] font-bold text-foreground">你现在准备到哪一步了？</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">选一个最接近的，后面都能补充</p>
            </div>
            {PATHS.map(({ key, icon: Icon, title: t, desc }) => (
              <button
                key={key}
                onClick={() => {
                  setPath(key);
                  setStep("input");
                }}
                className="w-full rounded-[20px] bg-card p-4 text-left shadow-[var(--shadow-card)] transition-transform active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-[14px] bg-brand-soft">
                    <Icon className="size-5 text-foreground/75" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold text-foreground">{t}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>
              </button>
            ))}
          </>
        )}

        {step === "input" && path === "material" && (
          <>
            <Card>
              <p className="text-[15px] font-semibold text-foreground">上传资料</p>
              <p className="mt-1 text-[11px] text-muted-foreground">群聊截图、订单短信、攻略链接都可以</p>
              <button
                onClick={() => setImported(true)}
                className="mt-3 flex w-full flex-col items-center gap-1.5 rounded-[14px] border border-dashed border-border bg-surface-sunk py-6 transition-transform active:scale-[0.98]"
              >
                <Camera className="size-5 text-accent" />
                <span className="text-[13px] font-medium text-foreground">截图导入 / 选择文件</span>
                <span className="text-[11px] text-muted-foreground">已选 3 张截图 · 1 条链接</span>
              </button>
            </Card>
            {imported && (
              <>
              <Card>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-accent" />
                  <p className="text-[14px] font-semibold text-foreground">AI 识别结果 · 请确认</p>
                </div>
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {AI_RESULT.map((r) => (
                    <div key={r.name} className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-foreground">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground">{r.desc}</p>
                      </div>
                      <Tag tone={r.ok ? "accent" : "muted"}>{r.ok ? "已确认" : "待确认"}</Tag>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-accent" />
                  <p className="text-[14px] font-semibold text-foreground">AI 生成的分天行程</p>
                </div>
                <div className="mt-3 flex rounded-[14px] bg-surface-sunk p-1">
                  {AI_DAYS.map((d) => (
                    <button
                      key={d.key}
                      onClick={() => setActiveDay(d.key)}
                      className={`flex-1 rounded-[11px] py-1.5 text-[12px] font-medium transition-colors ${
                        activeDay === d.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      {d.label} · {d.date.replace("月", "/").replace("日", "")}
                    </button>
                  ))}
                </div>
                {AI_DAYS.filter((d) => d.key === activeDay).map((d) => (
                  <div key={d.key} className="mt-3 space-y-0">
                    {d.items.map((it, i) => (
                      <div key={it.name} className="flex gap-3">
                        <div className="flex w-11 shrink-0 justify-end pt-0.5">
                          <span className="text-[12px] font-semibold text-foreground">{it.time}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span
                            className={`mt-1.5 size-2 rounded-full ${it.ok ? "bg-accent" : "bg-border"}`}
                          />
                          {i < d.items.length - 1 && <span className="w-px flex-1 bg-border" />}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <p className="text-[13px] font-medium text-foreground">{it.name}</p>
                              <p className="text-[11px] text-muted-foreground">{it.place}</p>
                            </div>
                            <Tag tone={it.ok ? "accent" : "muted"}>{it.ok ? "已确认" : "待确认"}</Tag>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">
                  行程由 AI 自动分天生成，低置信度内容标为「待确认」，可稍后修改。
                </p>
              </Card>
              </>
            )}
          </>
        )}

        {step === "input" && path === "idea" && (
          <Card className="space-y-3">
            <p className="text-[15px] font-semibold text-foreground">用一句话说说你的想法</p>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={4}
              placeholder="例如：八月和三个朋友去个不太热、能看湖的地方待四天"
              className="w-full resize-none rounded-[14px] bg-surface-sunk p-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <p className="text-[11px] text-muted-foreground">先建立旅行空间，之后再一起补齐细节。</p>
          </Card>
        )}

        {step === "input" && (
          <PrimaryButton disabled={!canNext} onClick={() => setStep("done")}>
            建立旅行空间
          </PrimaryButton>
        )}

        {step === "done" && (
          <>
            <Card className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft">
                <Check className="size-6 text-accent" />
              </div>
              <p className="mt-3 text-[16px] font-bold text-foreground">旅行空间已建立</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {path === "material"
                  ? "已导入 3 张截图 · 1 条链接 · 生成 3 天行程"
                  : "已根据你的想法生成初始框架"}
              </p>
            </Card>
            <Card>
              <p className="text-[12px] text-muted-foreground">根据当前信息，推荐的下一步</p>
              <p className="mt-1 text-[15px] font-semibold text-foreground">
                {path === "material"
                  ? "确认 1 条待确认信息（苍山索道时间）"
                  : "确认出行日期与人数"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">每次只做一件事，其余稍后再说。</p>
            </Card>
            <Card>
              <p className="text-[14px] font-semibold text-foreground">分享到群</p>
              <p className="mt-1 text-[11px] text-muted-foreground">同行人打开就是同一个版本</p>
              <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-surface-sunk py-2.5 text-[13px] font-medium text-foreground transition-transform active:scale-[0.98]">
                <Share2 className="size-4 text-accent" /> 分享到微信群
              </button>
            </Card>
            <PrimaryButton onClick={onCreated}>进入旅行概览</PrimaryButton>
          </>
        )}
      </div>
    </MiniShell>
  );
}
