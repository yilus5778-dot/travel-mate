import { useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  FileSearch,
  ImageUp,
  Link2,
  LoaderCircle,
  Route,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  buildSuggestedItinerary,
  createTravelDraft,
  displayTravelDate,
  extractTravelIntent,
  getDestinationCandidates,
  isMeaningfulIdea,
  organizePastedItinerary,
  type CompanionProfile,
  type ItineraryItem,
  type PlanningMode,
  type SourceItem,
  type TravelDateStatus,
  type TravelItem,
} from "@/lib/app-model";
import { MiniShell, Card, PrimaryButton, Tag } from "./MiniShell";

type Step = "input" | "analyzing" | "questions";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function CreateTrip({
  onCancel,
  onCreated,
  companion,
}: {
  onCancel: () => void;
  onCreated: (travel: TravelItem) => void;
  companion?: CompanionProfile | null;
}) {
  const [step, setStep] = useState<Step>("input");
  const [inputText, setInputText] = useState("");
  const [inputTouched, setInputTouched] = useState(false);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [analysisLabel, setAnalysisLabel] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [destination, setDestination] = useState("");
  const [destinationPreference, setDestinationPreference] = useState("");
  const [destinationCandidates, setDestinationCandidates] = useState<string[]>([]);
  const [dateStatus, setDateStatus] = useState<TravelDateStatus>("undecided");
  const [dateText, setDateText] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [peopleCount, setPeopleCount] = useState("");
  const [budget, setBudget] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const meaningfulText = isMeaningfulIdea(inputText);
  const recognizedSources = sources.filter((source) => source.status === "recognized");
  const recognizingSources = sources.filter((source) =>
    ["selected", "uploading", "recognizing"].includes(source.status),
  );
  const hasInput = meaningfulText || recognizedSources.length > 0;

  const createDraftFromPlan = ({
    mode,
    destinationValue = destination,
    destinationPreferenceValue = destinationPreference,
    destinationCandidatesValue = destinationCandidates,
    dateStatusValue = dateStatus,
    dateTextValue = dateText,
    durationDaysValue = durationDays ? Number(durationDays) : null,
    peopleCountValue = peopleCount ? Number(peopleCount) : null,
    itineraryValue,
    aiSummaryValue,
  }: {
    mode: PlanningMode;
    destinationValue?: string;
    destinationPreferenceValue?: string;
    destinationCandidatesValue?: string[];
    dateStatusValue?: TravelDateStatus;
    dateTextValue?: string;
    durationDaysValue?: number | null;
    peopleCountValue?: number | null;
    itineraryValue: ItineraryItem[];
    aiSummaryValue: string;
  }) => {
    const resolvedDateText =
      displayTravelDate(dateTextValue || null, durationDaysValue) ?? dateTextValue;

    onCreated(
      createTravelDraft({
        inputText,
        departureCity,
        destination: destinationValue,
        destinationPreference: destinationPreferenceValue,
        destinationCandidates: destinationCandidatesValue,
        dateStatus: dateStatusValue,
        dateText: resolvedDateText,
        durationDays: durationDaysValue,
        peopleCount: peopleCountValue,
        budget: budget ? Number(budget) : null,
        planningMode: mode,
        aiPlanStatus: mode === "plan" ? "generated" : "organized",
        aiSummary: aiSummaryValue,
        sources: recognizedSources,
        itinerary: itineraryValue,
      }),
    );
  };

  const recognizeSources = async (ids: string[]) => {
    setSources((current) =>
      current.map((source) =>
        ids.includes(source.id) && source.status !== "failed"
          ? { ...source, status: "uploading" }
          : source,
      ),
    );
    await wait(350);
    setSources((current) =>
      current.map((source) =>
        ids.includes(source.id) && source.status !== "failed"
          ? { ...source, status: "recognizing" }
          : source,
      ),
    );
    await wait(650);
    setSources((current) =>
      current.map((source) =>
        ids.includes(source.id) && source.status !== "failed"
          ? { ...source, status: "recognized" }
          : source,
      ),
    );
  };

  const addLink = () => {
    const value = link.trim();
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported");
      const source: SourceItem = {
        id: `link-${Date.now()}`,
        kind: "link",
        name: value,
        status: "selected",
      };
      setSources((current) => [...current, source]);
      setLink("");
      setLinkError("");
      void recognizeSources([source.id]);
    } catch {
      setLinkError("请输入完整的 http 或 https 网页链接");
    }
  };

  const analyzeInput = async () => {
    setInputTouched(true);
    if (!hasInput || recognizingSources.length) return;

    setStep("analyzing");
    setAnalysisLabel("正在判断你的需求…");
    await wait(500);
    setAnalysisLabel("正在区分现成行程与规划想法…");
    await wait(650);
    setAnalysisLabel("正在整理可执行攻略结构…");
    await wait(450);

    const intent = extractTravelIntent(inputText);
    const mode: PlanningMode =
      intent.looksLikeItinerary || (recognizedSources.length > 0 && !meaningfulText)
        ? "organize"
        : "plan";
    const candidates = intent.destination
      ? [intent.destination]
      : getDestinationCandidates(intent.destinationPreference);

    setDestination(intent.destination ?? candidates[0] ?? "");
    setDestinationPreference(intent.destinationPreference ?? "");
    setDestinationCandidates(candidates);
    setDateStatus(intent.dateStatus);
    setDateText(intent.dateText ?? "");
    setDurationDays(intent.durationDays ? String(intent.durationDays) : "");
    setPeopleCount(intent.peopleCount ? String(intent.peopleCount) : "");

    if (mode === "organize") {
      const organized = organizePastedItinerary(inputText);
      createDraftFromPlan({
        mode,
        destinationValue: intent.destination ?? candidates[0] ?? "",
        destinationPreferenceValue: intent.destinationPreference ?? "",
        destinationCandidatesValue: candidates,
        dateStatusValue: intent.dateStatus,
        dateTextValue: intent.dateText ?? "",
        durationDaysValue: intent.durationDays ?? null,
        peopleCountValue: intent.peopleCount ?? null,
        itineraryValue: organized,
        aiSummaryValue: organized.length
          ? `我识别到这是一份现成行程，已按顺序整理出 ${organized.length} 项内容。原文之外的信息不会自动补写。`
          : "我识别到你正在导入现成资料。当前原型已完成上传/链接读取状态，但不会只凭图片文件名或网页 URL 编造行程；识别出明确文字后才会进入攻略。",
      });
      return;
    }

    setStep("questions");
  };

  const generatePlan = () => {
    const selectedDestination = destination.trim() || null;
    const days = durationDays ? Number(durationDays) : 3;
    const generated = buildSuggestedItinerary(selectedDestination, days, companion?.key);
    createDraftFromPlan({
      mode: "plan",
      durationDaysValue: days,
      peopleCountValue: peopleCount ? Number(peopleCount) : null,
      itineraryValue: generated,
      aiSummaryValue: `已生成 ${days} 天可编辑攻略；基础路线、搭子加料、推荐理由、美食、路线图和资料补充都放在行程规划页继续调整。`,
    });
  };

  const back = () => {
    if (step === "input") return onCancel();
    if (step === "analyzing") return;
    if (step === "questions") return setStep("input");
  };

  return (
    <MiniShell title="创建新旅行" onBack={back} showTabBar={false}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        {step === "input" && (
          <>
            <div>
              <Tag tone="accent">统一多模态输入</Tag>
              <h2 className="mt-3 text-[20px] font-bold text-foreground">把你知道的都发给我</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                想法、完整行程、图片、订单、攻略和网页链接都可以混在一起；明确内容会作为已确认信息，AI
                不会凭空补写成事实。
              </p>
            </div>

            <Card>
              <textarea
                value={inputText}
                onBlur={() => setInputTouched(true)}
                onChange={(event) => setInputText(event.target.value)}
                rows={6}
                placeholder={"例如：国庆想去海边玩三天\n也可以直接粘贴 D1、D2 的完整行程"}
                className="w-full resize-none rounded-[14px] bg-surface-sunk p-3 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              />
              {inputTouched && inputText.trim() && !meaningfulText && (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  这段内容还不足以理解旅行需求，可以补充想去哪里、玩多久或已有安排。
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 rounded-[12px] bg-brand-soft py-2.5 text-[12px] font-medium text-foreground"
                >
                  <ImageUp className="size-4" /> 上传多张图片
                </button>
                <div className="flex items-center justify-center gap-1.5 rounded-[12px] bg-surface-sunk py-2.5 text-[11px] text-muted-foreground">
                  <FileSearch className="size-4" /> 识别后入规划
                </div>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const next: SourceItem[] = Array.from(event.target.files ?? []).map(
                    (file, index) => ({
                      id: `image-${Date.now()}-${index}-${file.name}`,
                      kind: "image",
                      name: file.name,
                      status: file.type.startsWith("image/") ? "selected" : "failed",
                      error: file.type.startsWith("image/") ? undefined : "请选择图片格式",
                    }),
                  );
                  setSources((current) => [...current, ...next]);
                  void recognizeSources(
                    next.filter((source) => source.status !== "failed").map((source) => source.id),
                  );
                  event.target.value = "";
                }}
              />

              <div className="mt-3 flex gap-2">
                <input
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder="粘贴网页链接"
                  className="min-w-0 flex-1 rounded-[12px] bg-surface-sunk px-3 py-2.5 text-[12px] outline-none"
                />
                <button
                  onClick={addLink}
                  className="flex shrink-0 items-center gap-1 rounded-[12px] bg-brand-soft px-3 text-[12px] font-medium"
                >
                  <Link2 className="size-3.5" /> 添加
                </button>
              </div>
              {linkError && <p className="mt-1 text-[10px] text-destructive">{linkError}</p>}

              {sources.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center gap-2 rounded-[12px] bg-surface-sunk px-3 py-2"
                    >
                      {source.status === "recognized" ? (
                        <Check className="size-4 shrink-0 text-accent" />
                      ) : source.status === "failed" ? (
                        <AlertCircle className="size-4 shrink-0 text-destructive" />
                      ) : (
                        <LoaderCircle className="size-4 shrink-0 animate-spin text-accent" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] text-foreground">{source.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {source.error ??
                            (source.status === "recognized"
                              ? "已加入资料区，可删除"
                              : source.status === "recognizing"
                                ? "正在识别内容…"
                                : "正在上传或读取…")}
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
            </Card>

            <PrimaryButton
              disabled={!hasInput || recognizingSources.length > 0}
              onClick={analyzeInput}
            >
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-4" /> 让 AI 理解并规划
              </span>
            </PrimaryButton>
            {!hasInput && (
              <p className="-mt-2 text-center text-[11px] text-muted-foreground">
                输入一段有效文字，或先上传图片、添加链接
              </p>
            )}
            {recognizingSources.length > 0 && (
              <p className="-mt-2 text-center text-[11px] text-muted-foreground">
                正在自动识别图片和链接，请稍候
              </p>
            )}
          </>
        )}

        {step === "analyzing" && (
          <div className="flex min-h-[30rem] flex-col items-center justify-center px-5 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-brand-soft">
              <Sparkles className="size-8 animate-pulse text-foreground/75" />
            </div>
            <p className="mt-5 text-[15px] font-semibold text-foreground">{analysisLabel}</p>
            <p className="mt-2 max-w-[17rem] text-[11px] leading-relaxed text-muted-foreground">
              现成行程会被结构化；模糊想法会生成可编辑攻略，并区分已确认、AI 建议和需确认。
            </p>
          </div>
        )}

        {step === "questions" && (
          <>
            {destinationCandidates.length > 0 && (
              <Card>
                <p className="text-[13px] font-semibold text-foreground">AI 推荐候选地</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  候选仅用于生成建议，不代表你已确认。
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {destinationCandidates.map((candidate) => (
                    <button
                      key={candidate}
                      onClick={() => setDestination(candidate)}
                      className={`rounded-[12px] py-2.5 text-[12px] font-medium ${
                        destination === candidate
                          ? "bg-brand-soft text-foreground"
                          : "bg-surface-sunk text-muted-foreground"
                      }`}
                    >
                      {candidate}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <p className="text-[13px] font-semibold text-foreground">可选补充 3 个关键问题</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                不填也可以继续，缺失信息不会挡住规划。
              </p>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-[11px] text-muted-foreground">从哪里出发？</span>
                  <input
                    value={departureCity}
                    onChange={(event) => setDepartureCity(event.target.value)}
                    placeholder="可稍后补"
                    className="mt-1 w-full rounded-[12px] bg-surface-sunk px-3 py-2.5 text-[12px] outline-none"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[11px] text-muted-foreground">几个人？</span>
                    <input
                      type="number"
                      min={1}
                      value={peopleCount}
                      onChange={(event) => setPeopleCount(event.target.value)}
                      placeholder="可稍后补"
                      className="mt-1 w-full rounded-[12px] bg-surface-sunk px-3 py-2.5 text-[12px] outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-muted-foreground">总预算？</span>
                    <input
                      type="number"
                      min={0}
                      value={budget}
                      onChange={(event) => setBudget(event.target.value)}
                      placeholder="可稍后补"
                      className="mt-1 w-full rounded-[12px] bg-surface-sunk px-3 py-2.5 text-[12px] outline-none"
                    />
                  </label>
                </div>
              </div>
            </Card>

            <PrimaryButton onClick={generatePlan}>
              <span className="inline-flex items-center gap-1.5">
                <Route className="size-4" /> 直接生成{durationDays || 3}日行程
              </span>
            </PrimaryButton>
            <p className="-mt-2 text-center text-[10px] text-muted-foreground">
              未填写项会作为少量需补充信息，不会阻止生成可编辑攻略
            </p>
          </>
        )}
      </div>
    </MiniShell>
  );
}
