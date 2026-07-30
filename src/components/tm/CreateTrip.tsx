import { useRef, useState } from "react";
import { MiniShell, Card, PrimaryButton, Tag } from "./MiniShell";
import {
  createTravelDraft,
  extractTravelFacts,
  isMeaningfulIdea,
  type SourceItem,
  type TravelItem,
} from "@/lib/app-model";
import {
  AlertCircle,
  Check,
  FileUp,
  Lightbulb,
  Link2,
  LoaderCircle,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";

type PathKey = "material" | "idea";
type Step = "path" | "input" | "processing" | "confirm" | "done";

const PATHS = [
  {
    key: "material" as const,
    icon: FileUp,
    title: "已有攻略或订单",
    desc: "选择真实资料 → 识别 → 逐项确认",
  },
  {
    key: "idea" as const,
    icon: Lightbulb,
    title: "只是先有一个想法",
    desc: "输入你的想法 → 提取已有信息 → 确认草稿",
  },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function CreateTrip({
  onCancel,
  onCreated,
  onRequireLogin,
}: {
  onCancel: () => void;
  onCreated: (travel: TravelItem) => void;
  onRequireLogin: (reason: string) => void;
}) {
  const [step, setStep] = useState<Step>("path");
  const [path, setPath] = useState<PathKey | null>(null);
  const [idea, setIdea] = useState("");
  const [ideaTouched, setIdeaTouched] = useState(false);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [processingLabel, setProcessingLabel] = useState("");
  const [destination, setDestination] = useState("");
  const [dateStatus, setDateStatus] = useState<"undecided" | "confirmed">("undecided");
  const [dateText, setDateText] = useState("");
  const [peopleCount, setPeopleCount] = useState("");
  const [budget, setBudget] = useState("");
  const [draft, setDraft] = useState<TravelItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const meaningfulIdea = isMeaningfulIdea(idea);
  const usableSources = sources.filter((source) => source.status !== "failed");
  const failedSources = sources.filter((source) => source.status === "failed");

  const back = () => {
    if (step === "path") return onCancel();
    if (step === "input") return setStep("path");
    if (step === "confirm") return setStep("input");
    if (step === "done") return setStep("confirm");
  };

  const prepareConfirmation = (evidence: string) => {
    const extracted = extractTravelFacts(evidence);
    setDestination(extracted.destination ?? "");
    setPeopleCount(extracted.peopleCount ? String(extracted.peopleCount) : "");
    if (extracted.dateText) {
      setDateStatus("confirmed");
      setDateText(extracted.dateText);
    } else {
      setDateStatus("undecided");
      setDateText("");
    }
    setStep("confirm");
  };

  const processInput = async () => {
    if (path === "idea") {
      setIdeaTouched(true);
      if (!meaningfulIdea) return;
    }
    if (path === "material" && usableSources.length === 0) return;

    setStep("processing");
    setProcessingLabel(path === "material" ? "正在上传资料…" : "正在读取你的想法…");
    if (path === "material") {
      setSources((current) =>
        current.map((source) =>
          source.status === "failed" ? source : { ...source, status: "uploading" },
        ),
      );
    }
    await wait(500);
    setProcessingLabel("正在提取明确存在的信息…");
    if (path === "material") {
      setSources((current) =>
        current.map((source) =>
          source.status === "failed" ? source : { ...source, status: "recognizing" },
        ),
      );
    }
    await wait(800);
    const evidence = path === "idea" ? idea : usableSources.map((source) => source.name).join(" ");
    setSources((current) =>
      current.map((source) =>
        source.status === "failed" ? source : { ...source, status: "recognized" },
      ),
    );
    prepareConfirmation(evidence);
  };

  const addLink = () => {
    const value = link.trim();
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported");
      setSources((current) => [
        ...current,
        {
          id: `link-${Date.now()}`,
          kind: "link",
          name: value,
          status: "selected",
        },
      ]);
      setLink("");
      setLinkError("");
    } catch {
      setLinkError("请输入完整的 http 或 https 链接");
    }
  };

  const createDraft = () => {
    if (dateStatus === "confirmed" && !dateText.trim()) return;
    const nextDraft = createTravelDraft({
      idea: path === "idea" ? idea : usableSources.map((source) => source.name).join(" "),
      destinationOverride: destination,
      dateStatus,
      dateText,
      peopleCount: peopleCount ? Number(peopleCount) : null,
      budget: budget ? Number(budget) : null,
      sourceMode: path ?? "idea",
      sources: sources.filter((source) => source.status !== "failed"),
    });
    setDraft(nextDraft);
    setStep("done");
  };

  return (
    <MiniShell title="创建新旅行" onBack={back} showTabBar={false}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        {step === "path" && (
          <>
            <div>
              <h2 className="text-[19px] font-bold text-foreground">你现在有哪些信息？</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">
                只使用你提供的内容，缺少的信息会保留为待确定
              </p>
            </div>
            {PATHS.map(({ key, icon: Icon, title, desc }) => (
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
                    <p className="text-[15px] font-semibold text-foreground">{title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>
              </button>
            ))}
          </>
        )}

        {step === "input" && path === "idea" && (
          <>
            <Card className="space-y-3">
              <p className="text-[15px] font-semibold text-foreground">用一句话说说你的真实想法</p>
              <textarea
                value={idea}
                onBlur={() => setIdeaTouched(true)}
                onChange={(event) => {
                  setIdea(event.target.value);
                  if (ideaTouched) setIdeaTouched(true);
                }}
                rows={5}
                placeholder="例如：秋天和三个朋友去海边走走，日期还没定"
                className="w-full resize-none rounded-[14px] bg-surface-sunk p-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              {ideaTouched && !meaningfulIdea ? (
                <p className="flex items-start gap-1.5 text-[11px] text-destructive">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  请补充有意义的旅行想法，例如目的地、时间、同行人或想体验的内容。
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  不确定的信息可以不写，系统不会自行补全。
                </p>
              )}
            </Card>
            <PrimaryButton disabled={!meaningfulIdea} onClick={processInput}>
              提取已有信息
            </PrimaryButton>
            {!meaningfulIdea && (
              <p className="-mt-2 text-center text-[11px] text-muted-foreground">
                输入内容过短或只有数字时无法继续
              </p>
            )}
          </>
        )}

        {step === "input" && path === "material" && (
          <>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-semibold text-foreground">导入真实资料</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">支持图片、PDF 和文本文件</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-[10px] bg-brand-soft px-3 py-2 text-[12px] font-medium text-foreground"
                >
                  选择文件
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt"
                  className="hidden"
                  onChange={(event) => {
                    const next = Array.from(event.target.files ?? []).map((file) => {
                      const supported =
                        file.type.startsWith("image/") ||
                        file.type === "application/pdf" ||
                        file.type === "text/plain";
                      return {
                        id: `file-${Date.now()}-${file.name}`,
                        kind: "file" as const,
                        name: file.name,
                        status: supported ? ("selected" as const) : ("failed" as const),
                        error: supported ? undefined : "暂不支持此文件类型",
                      };
                    });
                    setSources((current) => [...current, ...next]);
                    event.target.value = "";
                  }}
                />
              </div>

              {sources.length === 0 ? (
                <div className="mt-4 rounded-[14px] border border-dashed border-border bg-surface-sunk px-4 py-6 text-center">
                  <FileUp className="mx-auto size-5 text-muted-foreground" />
                  <p className="mt-2 text-[12px] font-medium text-foreground">尚未选择资料</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    选择后才会显示真实文件数量
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-start gap-2 rounded-[12px] bg-surface-sunk px-3 py-2"
                    >
                      {source.status === "failed" ? (
                        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                      ) : (
                        <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-foreground">
                          {source.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {source.error ?? "已选择，等待识别"}
                        </p>
                      </div>
                      <button
                        aria-label={`删除 ${source.name}`}
                        onClick={() =>
                          setSources((current) => current.filter((item) => item.id !== source.id))
                        }
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <input
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder="添加攻略或订单链接"
                  className="min-w-0 flex-1 rounded-[12px] bg-surface-sunk px-3 py-2 text-[12px] outline-none"
                />
                <button
                  onClick={addLink}
                  className="flex items-center gap-1 rounded-[12px] bg-brand-soft px-3 text-[12px] font-medium"
                >
                  <Link2 className="size-3.5" /> 添加
                </button>
              </div>
              {linkError && <p className="mt-1 text-[10px] text-destructive">{linkError}</p>}
            </Card>

            <PrimaryButton disabled={usableSources.length === 0} onClick={processInput}>
              上传并开始识别
            </PrimaryButton>
            {usableSources.length === 0 && (
              <p className="-mt-2 text-center text-[11px] text-muted-foreground">
                请先选择支持的文件或添加有效链接
              </p>
            )}
            {failedSources.length > 0 && usableSources.length === 0 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-1.5 py-2 text-[12px] text-foreground"
              >
                <RotateCcw className="size-3.5" /> 重新选择
              </button>
            )}
          </>
        )}

        {step === "processing" && (
          <div className="flex min-h-[28rem] flex-col items-center justify-center text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-brand-soft">
              <LoaderCircle className="size-8 animate-spin text-foreground/70" />
            </div>
            <p className="mt-5 text-[15px] font-semibold text-foreground">{processingLabel}</p>
            <p className="mt-2 max-w-[16rem] text-[11px] leading-relaxed text-muted-foreground">
              只提取资料中明确存在的信息，低置信度内容不会写入旅行。
            </p>
          </div>
        )}

        {step === "confirm" && (
          <>
            <div>
              <h2 className="text-[19px] font-bold text-foreground">确认旅行草稿</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">
                未填写的内容会明确保留为“待确定”
              </p>
            </div>
            {path === "material" && (
              <Card>
                <p className="text-[13px] font-semibold text-foreground">资料识别结果</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{usableSources.length} 项资料已完成识别</span>
                  <Tag tone="accent">需人工确认</Tag>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  未识别到的字段不会自动补全，请在下面逐项确认。
                </p>
              </Card>
            )}
            <Card className="space-y-4">
              <label className="block">
                <span className="text-[12px] font-medium text-foreground">目的地</span>
                <input
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="待确定"
                  className="mt-1.5 w-full rounded-[12px] bg-surface-sunk px-3 py-2.5 text-[13px] outline-none"
                />
              </label>
              <div>
                <span className="text-[12px] font-medium text-foreground">日期状态</span>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {[
                    ["undecided", "日期待确定"],
                    ["confirmed", "已有日期"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setDateStatus(value as "undecided" | "confirmed")}
                      className={`rounded-[12px] px-3 py-2.5 text-[12px] font-medium ${
                        dateStatus === value
                          ? "bg-brand-soft text-foreground"
                          : "bg-surface-sunk text-muted-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {dateStatus === "confirmed" && (
                  <input
                    value={dateText}
                    onChange={(event) => setDateText(event.target.value)}
                    placeholder="例如：8月12日—8月15日"
                    className="mt-2 w-full rounded-[12px] bg-surface-sunk px-3 py-2.5 text-[13px] outline-none"
                  />
                )}
              </div>
              <label className="block">
                <span className="text-[12px] font-medium text-foreground">预计人数</span>
                <input
                  value={peopleCount}
                  min={1}
                  type="number"
                  onChange={(event) => setPeopleCount(event.target.value)}
                  placeholder="待确定"
                  className="mt-1.5 w-full rounded-[12px] bg-surface-sunk px-3 py-2.5 text-[13px] outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-medium text-foreground">预算（可选）</span>
                <input
                  value={budget}
                  min={0}
                  type="number"
                  onChange={(event) => setBudget(event.target.value)}
                  placeholder="未设置"
                  className="mt-1.5 w-full rounded-[12px] bg-surface-sunk px-3 py-2.5 text-[13px] outline-none"
                />
              </label>
            </Card>
            <PrimaryButton
              disabled={dateStatus === "confirmed" && !dateText.trim()}
              onClick={createDraft}
            >
              创建旅行草稿
            </PrimaryButton>
            {dateStatus === "confirmed" && !dateText.trim() && (
              <p className="-mt-2 text-center text-[11px] text-muted-foreground">
                已选择“已有日期”，请填写具体日期
              </p>
            )}
          </>
        )}

        {step === "done" && draft && (
          <>
            <Card className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft">
                <Check className="size-6 text-accent" />
              </div>
              <p className="mt-3 text-[16px] font-bold text-foreground">{draft.title}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">旅行草稿已创建</p>
            </Card>
            <Card className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">目的地</span>
                <span className="font-medium text-foreground">{draft.destination ?? "待确定"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">日期</span>
                <span className="font-medium text-foreground">{draft.dateText ?? "待确定"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">人数</span>
                <span className="font-medium text-foreground">
                  {draft.peopleCount ? `${draft.peopleCount} 人` : "待确定"}
                </span>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-accent" />
                <p className="text-[14px] font-semibold text-foreground">下一步再邀请同行人</p>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                草稿已经建立。邀请成员需要登录，以便同步成员身份和权限。
              </p>
              <button
                onClick={() => onRequireLogin("邀请同行人需要登录，用于确认身份并同步成员权限。")}
                className="mt-3 w-full rounded-[12px] bg-surface-sunk py-2.5 text-[12px] font-medium"
              >
                邀请同行人
              </button>
            </Card>
            <PrimaryButton onClick={() => onCreated(draft)}>进入旅行草稿</PrimaryButton>
          </>
        )}
      </div>
    </MiniShell>
  );
}
