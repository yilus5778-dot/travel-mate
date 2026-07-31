import { useEffect, useRef, useState } from "react";
import {
  Archive,
  CalendarDays,
  Camera,
  CarFront,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  ImageUp,
  Link2,
  MapPin,
  Navigation,
  PackageOpen,
  Plus,
  Receipt,
  Route,
  Share2,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { COMPANIONS } from "@/lib/travelmate-data";
import {
  buildSuggestedItinerary,
  TRAVEL_STATUS_LABELS,
  type CompanionProfile,
  type ItineraryItem,
  type SourceItem,
  type TravelItem,
  type TravelStatus,
} from "@/lib/app-model";
import { MiniShell, Card, PrimaryButton, Tag, type TabKey } from "./MiniShell";
import { CreateTrip } from "./CreateTrip";

function valueOrPending(value: string | number | null) {
  return value === null || value === "" ? "待确定" : String(value);
}

function EmptySection({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof PackageOpen;
  title: string;
  description: string;
}) {
  return (
    <Card className="text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-surface-sunk">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-[13px] font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
    </Card>
  );
}

function StatusAction({
  travel,
  onUpdate,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
}) {
  const next: Partial<Record<TravelStatus, { label: string; status: TravelStatus }>> = {
    draft: { label: "确认信息，进入待出发", status: "upcoming" },
    upcoming: { label: "开始旅行", status: "active" },
    active: { label: "结束旅行", status: "completed" },
    completed: { label: "归档旅行", status: "archived" },
  };
  const action = next[travel.status];
  if (!action) return null;

  const draftIncomplete =
    travel.status === "draft" &&
    (!travel.destination ||
      travel.dateStatus !== "confirmed" ||
      !travel.dateText ||
      !travel.peopleCount ||
      travel.itinerary.length === 0);

  return (
    <div>
      <PrimaryButton
        disabled={draftIncomplete}
        onClick={() =>
          onUpdate({
            ...travel,
            status: action.status,
            updatedAt: new Date().toISOString(),
          })
        }
      >
        {action.label}
      </PrimaryButton>
      {draftIncomplete && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          请先确认目的地、日期和人数，并生成基础行程
        </p>
      )}
    </div>
  );
}

function openMapSearch(title: string, destination: string | null) {
  const url = new URL("https://uri.amap.com/search");
  url.searchParams.set("keyword", [destination, title].filter(Boolean).join(" "));
  if (destination) url.searchParams.set("city", destination);
  url.searchParams.set("view", "map");
  url.searchParams.set("src", "travelmate");
  url.searchParams.set("callnative", "1");
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

function DayPlanEditor({
  travel,
  onPatch,
}: {
  travel: TravelItem;
  onPatch: (patch: Partial<TravelItem>) => void;
}) {
  const itineraryDays = travel.itinerary
    .map((item) => item.day ?? 1)
    .filter((day) => Number.isFinite(day));
  const dayCount = Math.min(
    Math.max(travel.durationDays ?? 0, itineraryDays.length ? Math.max(...itineraryDays) : 0, 1),
    7,
  );
  const [selectedDay, setSelectedDay] = useState(1);
  const dayItems = travel.itinerary.filter((item) => (item.day ?? 1) === selectedDay);

  useEffect(() => {
    if (selectedDay > dayCount) setSelectedDay(dayCount);
  }, [dayCount, selectedDay]);

  const updateItem = (id: string, patch: Partial<ItineraryItem>) => {
    onPatch({
      itinerary: travel.itinerary.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const removeItem = (id: string) => {
    onPatch({ itinerary: travel.itinerary.filter((item) => item.id !== id) });
  };

  const addItem = () => {
    const lastTime = dayItems.at(-1)?.time;
    onPatch({
      itinerary: [
        ...travel.itinerary,
        {
          id: `manual-itinerary-${Date.now()}`,
          day: selectedDay,
          time: lastTime ?? "16:00",
          title: "待编辑的新行程",
          confirmed: false,
          source: "user",
        },
      ],
    });
  };

  const addDay = () => {
    if (dayCount >= 7) return;
    const nextDay = dayCount + 1;
    onPatch({
      durationDays: nextDay,
      itinerary: [
        ...travel.itinerary,
        {
          id: `manual-itinerary-${Date.now()}`,
          day: nextDay,
          time: "09:00",
          title: "待编辑的新行程",
          confirmed: false,
          source: "user",
        },
      ],
    });
    setSelectedDay(nextDay);
  };

  const firstStop = dayItems[0] ?? null;
  const routeItems = dayItems.slice(0, 4);
  const routePositions = [
    { left: "10%", top: "26%" },
    { left: "40%", top: "58%" },
    { left: "70%", top: "24%" },
    { left: "82%", top: "66%" },
  ];

  return (
    <Card className="overflow-hidden !p-0">
      <div className="bg-brand-soft px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Tag tone="accent">AI 可编辑行程</Tag>
              <span className="text-[10px] text-muted-foreground">按天查看</span>
            </div>
            <h3 className="mt-3 text-[19px] font-bold text-foreground">
              D{selectedDay} ·{" "}
              {travel.destination ?? travel.destinationPreference ?? "目的地待确定"}
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {travel.dateText ?? "日期待确定"} · 第 {selectedDay} 天
            </p>
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[15px] bg-card/75">
            <Route className="size-5 text-accent" />
          </div>
        </div>
      </div>

      <div className="border-b border-border px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => (
            <button
              type="button"
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`min-w-[58px] rounded-[14px] px-3 py-2.5 text-center transition-colors ${
                selectedDay === day
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-sunk text-muted-foreground"
              }`}
            >
              <span className="block text-[13px] font-bold">D{day}</span>
              <span className="mt-0.5 block text-[9px]">第 {day} 天</span>
            </button>
          ))}
          {dayCount < 7 && (
            <button
              type="button"
              onClick={addDay}
              aria-label="增加一天"
              className="flex min-w-[48px] items-center justify-center rounded-[14px] border border-dashed border-border text-muted-foreground"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-foreground">当天时间线</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              时间和地点都可以直接修改，AI 建议不会冒充已确认信息。
            </p>
          </div>
          <Tag>{dayItems.length} 站</Tag>
        </div>

        {dayItems.length ? (
          <div className="mt-4">
            {dayItems.map((item, index) => (
              <div key={item.id}>
                <div className="grid grid-cols-[54px_18px_minmax(0,1fr)] gap-2">
                  <input
                    type="time"
                    value={item.time ?? ""}
                    onChange={(event) => updateItem(item.id, { time: event.target.value || null })}
                    aria-label={`${item.title}的时间`}
                    className="mt-3 w-full bg-transparent text-[10px] font-medium text-muted-foreground outline-none"
                  />
                  <div className="relative flex justify-center">
                    <span className="relative z-10 mt-4 size-2.5 rounded-full border-2 border-card bg-accent shadow-sm" />
                    {index < dayItems.length - 1 && (
                      <span className="absolute bottom-[-18px] top-5 w-px bg-border" />
                    )}
                  </div>
                  <div className="rounded-[16px] bg-surface-sunk p-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                      <input
                        value={item.title}
                        onChange={(event) => updateItem(item.id, { title: event.target.value })}
                        className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-foreground outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`删除 ${item.title}`}
                      >
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Tag tone={item.source === "ai" ? "accent" : "muted"}>
                        {item.source === "ai" ? "AI 建议" : "用户添加"}
                      </Tag>
                      <button
                        type="button"
                        onClick={() => openMapSearch(item.title, travel.destination)}
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground"
                      >
                        <Navigation className="size-3 text-accent" /> 导航
                      </button>
                    </div>
                  </div>
                </div>
                {index < dayItems.length - 1 && (
                  <div className="ml-[74px] flex h-8 items-center gap-1.5 text-[9px] text-muted-foreground">
                    <CarFront className="size-3" />
                    <span>前往下一站 · 路程由地图实时计算</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[14px] bg-surface-sunk p-4 text-center">
            <p className="text-[11px] text-muted-foreground">这一天还没有安排。</p>
          </div>
        )}

        <button
          type="button"
          onClick={addItem}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-[12px] border border-dashed border-border py-2.5 text-[11px] font-medium text-foreground"
        >
          <Plus className="size-3.5" /> 添加当天行程
        </button>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-foreground">当日路线</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                地点位置由地图实时搜索确认，不使用编造坐标。
              </p>
            </div>
            <Route className="size-4 text-accent" />
          </div>
          <div className="relative h-40 overflow-hidden rounded-[18px] bg-accent-soft">
            <div className="absolute -left-10 top-6 h-16 w-52 rotate-12 rounded-full border-[10px] border-card/75" />
            <div className="absolute -right-14 bottom-2 h-20 w-56 -rotate-12 rounded-full border-[10px] border-brand-soft" />
            {routeItems.length > 1 && (
              <>
                <div className="absolute left-[15%] top-[39%] h-1 w-[30%] rotate-[24deg] rounded-full bg-accent/35" />
                <div className="absolute left-[44%] top-[43%] h-1 w-[30%] -rotate-[28deg] rounded-full bg-accent/35" />
                {routeItems.length > 3 && (
                  <div className="absolute left-[70%] top-[46%] h-1 w-[18%] rotate-[55deg] rounded-full bg-accent/35" />
                )}
              </>
            )}
            {routeItems.map((item, index) => (
              <div
                key={item.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={routePositions[index]}
              >
                <div className="mx-auto flex size-7 items-center justify-center rounded-full border-2 border-card bg-accent text-[10px] font-bold text-accent-foreground shadow-sm">
                  {index + 1}
                </div>
                <p className="mt-1 max-w-[88px] truncate rounded-full bg-card/90 px-2 py-1 text-[8px] font-medium text-foreground shadow-sm">
                  {item.title}
                </p>
              </div>
            ))}
            {!routeItems.length && (
              <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                添加地点后自动形成路线
              </div>
            )}
          </div>
          <p className="mt-2 truncate text-[10px] text-muted-foreground">
            {dayItems.length ? dayItems.map((item) => item.title).join(" → ") : "当天路线待补充"}
          </p>
          <button
            type="button"
            disabled={!firstStop}
            onClick={() => firstStop && openMapSearch(firstStop.title, travel.destination)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[13px] bg-accent py-3 text-[12px] font-semibold text-accent-foreground disabled:opacity-40"
          >
            <Navigation className="size-4" /> 从第一站开始导航
            <ExternalLink className="size-3.5" />
          </button>
          <p className="mt-2 text-center text-[9px] text-muted-foreground">
            将打开高德地图搜索第一站，后续地点可在时间线中继续导航。
          </p>
        </div>
      </div>
    </Card>
  );
}

function DraftView({
  travel,
  onUpdate,
  onDelete,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
  onDelete: (id: string) => void;
}) {
  const [supplement, setSupplement] = useState("");
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const patchTravel = (patch: Partial<TravelItem>) =>
    onUpdate({
      ...travel,
      ...patch,
      updatedAt: new Date().toISOString(),
    });

  const missing = [
    !travel.destination ? "具体目的地" : null,
    travel.dateStatus !== "confirmed" ? "具体日期" : null,
    !travel.peopleCount ? "同行人数" : null,
    !travel.budget ? "预算" : null,
  ].filter(Boolean) as string[];

  const generatePlan = () => {
    const days = travel.durationDays ?? 3;
    patchTravel({
      itinerary: buildSuggestedItinerary(travel.destination, days),
      durationDays: days,
      aiPlanStatus: "generated",
      aiSummary: `已根据“${
        travel.destinationPreference || travel.destination || "当前旅行想法"
      }”生成 ${days} 天可编辑方案。所有新增行程均标注为 AI 建议，等待你确认。`,
    });
  };

  const addLink = () => {
    const value = link.trim();
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported");
      const source: SourceItem = {
        id: `draft-link-${Date.now()}`,
        kind: "link",
        name: value,
        status: "recognized",
      };
      patchTravel({ sources: [...travel.sources, source] });
      setLink("");
      setLinkError("");
    } catch {
      setLinkError("请输入完整网页链接");
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <p className="text-[14px] font-semibold text-foreground">AI 初步建议</p>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-foreground/75">
          {travel.aiSummary ?? "我会基于你已经提供的信息生成方案；还没有的信息会继续保持待确认。"}
        </p>
        <div className="mt-3 rounded-[12px] bg-surface-sunk p-3">
          <p className="text-[11px] font-medium text-foreground">
            待确认：{missing.length ? missing.join("、") : "基础信息已完整"}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            推荐下一步：
            {travel.itinerary.length ? "调整每天安排并确认日期" : "先生成一版可编辑行程"}
          </p>
        </div>
        <button
          onClick={generatePlan}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-brand-soft py-2.5 text-[12px] font-semibold text-foreground"
        >
          <Sparkles className="size-4" />
          {travel.itinerary.length ? "让 AI 重新补全方案" : "直接生成行程"}
        </button>
      </Card>

      {travel.itinerary.length ? (
        <DayPlanEditor travel={travel} onPatch={patchTravel} />
      ) : (
        <Card className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft">
            <Route className="size-5 text-accent" />
          </div>
          <p className="mt-3 text-[14px] font-semibold text-foreground">还没有按天行程</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            点击上方“直接生成行程”，AI 会自动整理成按天标签、当天时间线和路线导航。
          </p>
        </Card>
      )}

      <Card>
        <p className="text-[14px] font-semibold text-foreground">编辑基础信息</p>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-[10px] text-muted-foreground">出发城市</span>
              <input
                value={travel.departureCity ?? ""}
                onChange={(event) => patchTravel({ departureCity: event.target.value || null })}
                placeholder="待确认"
                className="mt-1 w-full rounded-[11px] bg-surface-sunk px-3 py-2 text-[12px] outline-none"
              />
            </label>
            <label>
              <span className="text-[10px] text-muted-foreground">目的地</span>
              <input
                value={travel.destination ?? ""}
                onChange={(event) =>
                  patchTravel({
                    destination: event.target.value || null,
                    title: event.target.value ? `${event.target.value}旅行草稿` : "未命名旅行草稿",
                  })
                }
                placeholder={travel.destinationPreference || "待确认"}
                className="mt-1 w-full rounded-[11px] bg-surface-sunk px-3 py-2 text-[12px] outline-none"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-[10px] text-muted-foreground">日期</span>
              <input
                value={travel.dateText ?? ""}
                onChange={(event) => patchTravel({ dateText: event.target.value || null })}
                placeholder="待确认"
                className="mt-1 w-full rounded-[11px] bg-surface-sunk px-3 py-2 text-[12px] outline-none"
              />
            </label>
            <label>
              <span className="text-[10px] text-muted-foreground">日期状态</span>
              <select
                value={travel.dateStatus}
                onChange={(event) =>
                  patchTravel({
                    dateStatus: event.target.value as TravelItem["dateStatus"],
                  })
                }
                className="mt-1 w-full rounded-[11px] bg-surface-sunk px-2 py-2 text-[12px] outline-none"
              >
                <option value="undecided">待确定</option>
                <option value="approximate">大概时间</option>
                <option value="confirmed">已确认</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label>
              <span className="text-[10px] text-muted-foreground">天数</span>
              <input
                type="number"
                min={1}
                value={travel.durationDays ?? ""}
                onChange={(event) =>
                  patchTravel({
                    durationDays: event.target.value ? Number(event.target.value) : null,
                  })
                }
                placeholder="待定"
                className="mt-1 w-full rounded-[11px] bg-surface-sunk px-2 py-2 text-[12px] outline-none"
              />
            </label>
            <label>
              <span className="text-[10px] text-muted-foreground">人数</span>
              <input
                type="number"
                min={1}
                value={travel.peopleCount ?? ""}
                onChange={(event) =>
                  patchTravel({
                    peopleCount: event.target.value ? Number(event.target.value) : null,
                  })
                }
                placeholder="待定"
                className="mt-1 w-full rounded-[11px] bg-surface-sunk px-2 py-2 text-[12px] outline-none"
              />
            </label>
            <label>
              <span className="text-[10px] text-muted-foreground">预算</span>
              <input
                type="number"
                min={0}
                value={travel.budget ?? ""}
                onChange={(event) =>
                  patchTravel({
                    budget: event.target.value ? Number(event.target.value) : null,
                  })
                }
                placeholder="待定"
                className="mt-1 w-full rounded-[11px] bg-surface-sunk px-2 py-2 text-[12px] outline-none"
              />
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-[14px] font-semibold text-foreground">继续补充内容</p>
        <textarea
          value={supplement}
          onChange={(event) => setSupplement(event.target.value)}
          rows={3}
          placeholder="继续输入想法、订单信息或粘贴完整行程"
          className="mt-3 w-full resize-none rounded-[12px] bg-surface-sunk p-3 text-[11px] outline-none"
        />
        <button
          disabled={!supplement.trim()}
          onClick={() => {
            patchTravel({
              sourceText: [travel.sourceText, supplement.trim()].filter(Boolean).join("\n"),
              aiSummary: "已收到新的文字补充。点击“让 AI 重新补全方案”即可纳入下一版建议。",
            });
            setSupplement("");
          }}
          className="mt-2 w-full rounded-[11px] bg-brand-soft py-2 text-[11px] font-medium text-foreground disabled:opacity-40"
        >
          加入旅行资料
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center justify-center gap-1 rounded-[11px] bg-surface-sunk py-2 text-[11px] text-foreground"
          >
            <ImageUp className="size-3.5" /> 上传图片
          </button>
          <div className="flex gap-1">
            <input
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="网页链接"
              className="min-w-0 flex-1 rounded-[11px] bg-surface-sunk px-2 text-[10px] outline-none"
            />
            <button
              onClick={addLink}
              aria-label="添加网页链接"
              className="rounded-[10px] bg-brand-soft px-2"
            >
              <Link2 className="size-3.5" />
            </button>
          </div>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const added: SourceItem[] = Array.from(event.target.files ?? []).map((file, index) => ({
              id: `draft-image-${Date.now()}-${index}`,
              kind: "image",
              name: file.name,
              status: "recognized",
            }));
            patchTravel({ sources: [...travel.sources, ...added] });
            event.target.value = "";
          }}
        />
        {linkError && <p className="mt-1 text-[10px] text-destructive">{linkError}</p>}
        {travel.sources.length > 0 && (
          <div className="mt-3 space-y-1">
            {travel.sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-2 rounded-[10px] bg-surface-sunk px-2 py-1.5"
              >
                {source.kind === "image" ? (
                  <ImageUp className="size-3 text-muted-foreground" />
                ) : (
                  <Link2 className="size-3 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate text-[10px] text-foreground">
                  {source.name}
                </span>
                <button
                  aria-label={`删除资料 ${source.name}`}
                  onClick={() =>
                    patchTravel({
                      sources: travel.sources.filter((entry) => entry.id !== source.id),
                    })
                  }
                >
                  <Trash2 className="size-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <StatusAction travel={travel} onUpdate={onUpdate} />

      <button
        onClick={() => setConfirmDelete(true)}
        className="w-full py-2 text-[11px] font-medium text-destructive"
      >
        删除这份草稿
      </button>
      {confirmDelete && (
        <Card>
          <p className="text-[13px] font-semibold text-foreground">确认删除草稿？</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            删除后，这份草稿及其中的 AI 方案不会保留。
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-[11px] bg-surface-sunk py-2 text-[11px] text-foreground"
            >
              取消
            </button>
            <button
              onClick={() => onDelete(travel.id)}
              className="rounded-[11px] bg-destructive py-2 text-[11px] font-medium text-destructive-foreground"
            >
              确认删除
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

function UpcomingView({
  travel,
  onUpdate,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
}) {
  return (
    <div className="space-y-3">
      {travel.itinerary.length > 0 && (
        <DayPlanEditor
          travel={travel}
          onPatch={(patch) =>
            onUpdate({
              ...travel,
              ...patch,
              updatedAt: new Date().toISOString(),
            })
          }
        />
      )}
      <EmptySection
        icon={Receipt}
        title={travel.orders.length ? `${travel.orders.length} 个订单` : "没有订单"}
        description={
          travel.orders.length
            ? "订单提醒会对所有搭子类型生效。"
            : "添加真实订单后，这里会显示预订与提醒。"
        }
      />
      <EmptySection
        icon={ClipboardList}
        title={travel.itinerary.length ? `${travel.itinerary.length} 项行程` : "行程尚未确认"}
        description="待出发阶段只展示清单、预订、提醒和行程确认。"
      />
      <EmptySection
        icon={Users}
        title={travel.members.length ? `${travel.members.length} 位同行人` : "没有同行人"}
        description="邀请同行人后，成员和权限会出现在这里。"
      />
      <StatusAction travel={travel} onUpdate={onUpdate} />
    </div>
  );
}

function ActiveView({
  travel,
  onUpdate,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
}) {
  return (
    <div className="space-y-3">
      {travel.itinerary.length > 0 && (
        <DayPlanEditor
          travel={travel}
          onPatch={(patch) =>
            onUpdate({
              ...travel,
              ...patch,
              updatedAt: new Date().toISOString(),
            })
          }
        />
      )}
      <EmptySection
        icon={Navigation}
        title={travel.itinerary.length ? "查看今日行程" : "今天还没有行程"}
        description="旅行中可查看导航、临时调整和时间冲突提醒。"
      />
      <EmptySection
        icon={Wallet}
        title={travel.expenses.length ? `${travel.expenses.length} 笔费用` : "没有费用记录"}
        description="记录真实消费后再进行记账，不会自动生成金额。"
      />
      <StatusAction travel={travel} onUpdate={onUpdate} />
    </div>
  );
}

function CompletedView({
  travel,
  onUpdate,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
}) {
  return (
    <div className="space-y-3">
      <EmptySection
        icon={Receipt}
        title={travel.expenses.length ? "查看费用与 AA 结算" : "没有费用记录"}
        description="只有真实记录过的费用才会参与结算。"
      />
      <EmptySection
        icon={Camera}
        title={travel.photos.length ? `${travel.photos.length} 张旅行照片` : "没有旅行照片"}
        description="上传照片后才会生成旅行回顾，不使用演示照片代替。"
      />
      <EmptySection
        icon={CheckCircle2}
        title="旅行总结尚未生成"
        description="总结只基于这次旅行中的真实行程、费用和照片。"
      />
      <StatusAction travel={travel} onUpdate={onUpdate} />
    </div>
  );
}

function ArchivedView({
  travel,
  onCreateAgain,
}: {
  travel: TravelItem;
  onCreateAgain: () => void;
}) {
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center gap-2">
          <Archive className="size-4 text-muted-foreground" />
          <p className="text-[14px] font-semibold text-foreground">只读归档</p>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          归档旅行不会再发生变化。需要新的计划时，请重新创建一份草稿。
        </p>
      </Card>
      <EmptySection
        icon={PackageOpen}
        title="归档内容"
        description={`目的地：${valueOrPending(travel.destination)} · 日期：${
          travel.dateText ?? "待确定"
        }`}
      />
      <PrimaryButton onClick={onCreateAgain}>再次创建</PrimaryButton>
    </div>
  );
}

function CompanionGreeting({ companion }: { companion: CompanionProfile | null }) {
  const companionType = companion ? COMPANIONS[companion.key] : null;

  return (
    <div className="flex items-start gap-3">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-2xl">
        {companionType?.emoji ?? "🧳"}
      </div>
      <Card className="flex-1 !p-3">
        <p className="text-[13px] leading-relaxed text-foreground/85">
          {companion
            ? `${companion.name}：把想法、图片或链接给我，我们一起把下一次旅行想好。`
            : "把想法、图片或链接给我，我会先理解需求，再帮你完成旅行计划。"}
        </p>
      </Card>
    </div>
  );
}

function NewTripCard({ prominent, onClick }: { prominent: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-[24px] bg-primary text-left shadow-[var(--shadow-card)] transition-transform active:scale-[0.99] ${
        prominent ? "min-h-[210px] p-5" : "min-h-[118px] p-4"
      }`}
    >
      <div
        className={`absolute rounded-full bg-card/35 ${
          prominent ? "-right-10 -top-12 size-40" : "-right-8 -top-10 size-28"
        }`}
      />
      <div
        className={`absolute rounded-full border border-card/45 ${
          prominent ? "bottom-5 right-8 size-16" : "-bottom-5 right-16 size-14"
        }`}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex size-10 items-center justify-center rounded-[14px] bg-card/75">
          <Plus className="size-5 text-foreground" />
        </div>
        <div className={prominent ? "mt-6" : "mt-3"}>
          <p className="text-[11px] font-medium text-foreground/65">AI 旅行规划</p>
          <h2 className={`${prominent ? "mt-1 text-[23px]" : "mt-0.5 text-[18px]"} font-bold`}>
            新建旅行
          </h2>
          <p
            className={`mt-1 max-w-[16rem] leading-relaxed text-foreground/70 ${
              prominent ? "text-[12px]" : "text-[11px]"
            }`}
          >
            随便说、随便传，先得到一份能继续修改的旅行方案。
          </p>
        </div>
        {prominent && (
          <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-card/75 px-3 py-1.5 text-[11px] font-semibold text-foreground">
            开始规划 <Sparkles className="size-3.5" />
          </span>
        )}
      </div>
    </button>
  );
}

function createExperienceSample(): TravelItem {
  const itinerary: ItineraryItem[] = (
    [
      ["sample-d1-1", 1, "09:00", "抵达厦门与办理入住"],
      ["sample-d1-2", 1, "13:30", "环岛路海岸慢游"],
      ["sample-d1-3", 1, "18:00", "曾厝垵晚餐与散步"],
      ["sample-d2-1", 2, "08:30", "鼓浪屿轮渡与登岛"],
      ["sample-d2-2", 2, "11:00", "鼓浪屿核心街区"],
      ["sample-d2-3", 2, "17:30", "海边日落与返程"],
      ["sample-d3-1", 3, "09:30", "沙坡尾艺术街区"],
      ["sample-d3-2", 3, "12:00", "八市在地午餐体验"],
      ["sample-d3-3", 3, "15:30", "伴手礼与返程"],
    ] as Array<[string, number, string, string]>
  ).map(([id, day, time, title]) => ({
    id: String(id),
    day: Number(day),
    time: String(time),
    title: String(title),
    confirmed: true,
    source: "ai",
  }));

  return {
    id: "experience-sample-xiamen",
    title: "厦门三日轻旅行",
    departureCity: "广州",
    destination: "厦门",
    destinationPreference: "海边",
    destinationCandidates: ["厦门", "青岛", "北海"],
    dateStatus: "confirmed",
    dateText: "10月1日—10月3日",
    durationDays: 3,
    peopleCount: 2,
    budget: 5000,
    status: "upcoming",
    planningMode: "plan",
    aiPlanStatus: "generated",
    aiSummary: "这是独立的体验样例：每天保留三个核心节点，兼顾海边慢游、在地体验和返程节奏。",
    sourceMode: "idea",
    sourceText: "体验样例，不属于任何真实用户",
    sources: [],
    itinerary,
    orders: [
      { id: "sample-order-flight", title: "往返交通 · 已确认" },
      { id: "sample-order-hotel", title: "两晚住宿 · 已确认" },
    ],
    members: [
      { id: "sample-member-1", name: "体验成员 A" },
      { id: "sample-member-2", name: "体验成员 B" },
    ],
    expenses: [],
    photos: [],
    createdAt: "2026-07-31T00:00:00.000Z",
    updatedAt: "2026-07-31T00:00:00.000Z",
  };
}

function ExperienceSampleView({
  travel,
  onPatch,
  onBack,
  onStartPlanning,
}: {
  travel: TravelItem;
  onPatch: (patch: Partial<TravelItem>) => void;
  onBack: () => void;
  onStartPlanning: () => void;
}) {
  return (
    <MiniShell title="体验样例" onBack={onBack} showTabBar={false}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        <Card className="relative overflow-hidden bg-brand-soft">
          <div className="absolute -right-10 -top-12 size-36 rounded-full bg-card/45" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <Tag tone="accent">完整体验样例</Tag>
              <span className="text-[10px] font-medium text-muted-foreground">不写入用户数据</span>
            </div>
            <p className="mt-4 text-[11px] font-medium text-muted-foreground">广州 → 厦门</p>
            <h2 className="mt-1 text-[23px] font-bold text-foreground">{travel.title}</h2>
            <p className="mt-2 max-w-[17rem] text-[11px] leading-relaxed text-foreground/70">
              {travel.aiSummary}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                [CalendarDays, travel.dateText],
                [Users, `${travel.peopleCount} 人`],
                [Wallet, `预算 ¥${travel.budget}`],
              ].map(([Icon, label]) => {
                const FieldIcon = Icon as typeof CalendarDays;
                return (
                  <div key={String(label)} className="rounded-[13px] bg-card/75 p-2.5">
                    <FieldIcon className="size-3.5 text-muted-foreground" />
                    <p className="mt-1 text-[9px] font-medium text-foreground">{String(label)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <DayPlanEditor travel={travel} onPatch={onPatch} />

        <div className="grid grid-cols-2 gap-3">
          <Card className="!p-3">
            <Receipt className="size-4 text-accent" />
            <p className="mt-2 text-[12px] font-semibold text-foreground">订单已确认</p>
            <p className="mt-1 text-[10px] text-muted-foreground">交通、住宿共 2 项</p>
          </Card>
          <Card className="!p-3">
            <ClipboardList className="size-4 text-accent" />
            <p className="mt-2 text-[12px] font-semibold text-foreground">行前清单</p>
            <p className="mt-1 text-[10px] text-muted-foreground">5 项已完成，1 项待办</p>
          </Card>
        </div>

        <Card>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-accent" />
            <p className="text-[13px] font-semibold text-foreground">这个样例为什么可执行</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["每天 3 个核心节点", "路线顺序明确", "时间可编辑", "订单与清单已关联"].map((item) => (
              <Tag key={item}>{item}</Tag>
            ))}
          </div>
        </Card>

        <PrimaryButton onClick={onStartPlanning}>按这种方式规划我的旅行</PrimaryButton>
        <p className="-mt-2 text-center text-[9px] text-muted-foreground">
          只会打开真实创建流程，不会复制样例中的目的地、日期、同行人或预算。
        </p>
      </div>
    </MiniShell>
  );
}

function RecentTrips({
  travels,
  compact = false,
  onOpen,
  onOpenSample,
}: {
  travels: TravelItem[];
  compact?: boolean;
  onOpen: (id: string) => void;
  onOpenSample: () => void;
}) {
  const recent = travels
    .filter((item) => ["completed", "archived"].includes(item.status))
    .slice(0, 2);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-foreground">近期旅行</h2>
        <Tag>体验样例可查看</Tag>
      </div>
      <div className="space-y-2">
        {recent.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onOpen(item.id)}
            className="flex w-full items-center gap-3 rounded-[18px] bg-card p-3 text-left shadow-[var(--shadow-card)]"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-surface-sunk">
              <MapPin className="size-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-foreground">{item.title}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {item.dateText ?? "日期待确定"} · {TRAVEL_STATUS_LABELS[item.status]}
              </p>
            </div>
          </button>
        ))}
        <button
          type="button"
          onClick={onOpenSample}
          className={`flex w-full items-center gap-3 rounded-[18px] border border-dashed border-border bg-card/70 text-left transition-transform active:scale-[0.99] ${
            compact ? "p-3" : "p-4"
          }`}
        >
          <div
            className={`flex shrink-0 items-center justify-center rounded-[14px] bg-accent-soft ${
              compact ? "size-10" : "size-12"
            }`}
          >
            <MapPin className="size-4 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[13px] font-semibold text-foreground">厦门三日轻旅行</p>
              <span className="shrink-0 text-[9px] font-medium text-accent">示例</span>
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              厦门 · 3 天 · 点击查看完整标杆案例
            </p>
          </div>
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </div>
    </section>
  );
}

export function TripsTab({
  companion,
  travels,
  activeTravelId,
  tab,
  onTabChange,
  onSelectTravel,
  onCreateTravel,
  onUpdateTravel,
  onDeleteTravel,
  onRequireLogin,
}: {
  companion: CompanionProfile | null;
  travels: TravelItem[];
  activeTravelId: string | null;
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onSelectTravel: (id: string) => void;
  onCreateTravel: (travel: TravelItem) => void;
  onUpdateTravel: (travel: TravelItem) => void;
  onDeleteTravel: (id: string) => void;
  onRequireLogin: (reason: string) => void;
}) {
  const [view, setView] = useState<"home" | "trip" | "create" | "sample">("home");
  const [sampleTravel, setSampleTravel] = useState<TravelItem>(createExperienceSample);
  const travel = travels.find((item) => item.id === activeTravelId) ?? travels[0] ?? null;
  const plannedTravel =
    travels.find((item) => ["active", "upcoming", "draft"].includes(item.status)) ?? travel;

  useEffect(() => {
    if (!travel && view === "trip") setView("home");
  }, [travel, view]);

  if (view === "sample") {
    return (
      <ExperienceSampleView
        travel={sampleTravel}
        onBack={() => setView("home")}
        onStartPlanning={() => setView("create")}
        onPatch={(patch) =>
          setSampleTravel((current) => ({
            ...current,
            ...patch,
            updatedAt: new Date().toISOString(),
          }))
        }
      />
    );
  }

  if (view === "create") {
    return (
      <CreateTrip
        onCancel={() => setView("home")}
        onCreated={(created) => {
          onCreateTravel(created);
          setView("trip");
        }}
      />
    );
  }

  if (view === "home" && !travels.length) {
    return (
      <MiniShell title="旅程" tab={tab} onTabChange={onTabChange}>
        <div className="space-y-5 px-5 pb-8 pt-3">
          <CompanionGreeting companion={companion} />
          <NewTripCard prominent onClick={() => setView("create")} />
          <RecentTrips
            travels={travels}
            onOpen={(id) => {
              onSelectTravel(id);
              setView("trip");
            }}
            onOpenSample={() => setView("sample")}
          />
        </div>
      </MiniShell>
    );
  }

  if (view === "home") {
    return (
      <MiniShell title="旅程" tab={tab} onTabChange={onTabChange}>
        <div className="space-y-5 px-5 pb-8 pt-3">
          <CompanionGreeting companion={companion} />

          {plannedTravel && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-foreground">计划出行</h2>
                <Tag tone={plannedTravel.status === "active" ? "accent" : "brand"}>
                  {TRAVEL_STATUS_LABELS[plannedTravel.status]}
                </Tag>
              </div>
              <Card className="relative min-h-[228px] overflow-hidden !p-0">
                <div className="absolute -right-14 -top-16 size-44 rounded-full bg-brand-soft" />
                <div className="absolute right-7 top-8 flex size-16 items-center justify-center rounded-full bg-card/70">
                  <Navigation className="size-6 text-accent" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTravel(plannedTravel.id);
                    setView("trip");
                  }}
                  className="relative flex min-h-[228px] w-full flex-col p-5 text-left"
                >
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {plannedTravel.destination ??
                      plannedTravel.destinationPreference ??
                      "目的地待确定"}
                  </p>
                  <h3 className="mt-1 max-w-[13rem] text-[22px] font-bold leading-snug text-foreground">
                    {plannedTravel.title}
                  </h3>
                  <div className="mt-auto grid grid-cols-3 gap-2">
                    <div className="rounded-[13px] bg-surface-sunk p-2.5">
                      <CalendarDays className="size-3.5 text-muted-foreground" />
                      <p className="mt-1 text-[10px] font-medium text-foreground">
                        {plannedTravel.dateText ?? "日期待确定"}
                      </p>
                    </div>
                    <div className="rounded-[13px] bg-surface-sunk p-2.5">
                      <Users className="size-3.5 text-muted-foreground" />
                      <p className="mt-1 text-[10px] font-medium text-foreground">
                        {plannedTravel.peopleCount ? `${plannedTravel.peopleCount} 人` : "人数待定"}
                      </p>
                    </div>
                    <div className="rounded-[13px] bg-surface-sunk p-2.5">
                      <ClipboardList className="size-3.5 text-muted-foreground" />
                      <p className="mt-1 text-[10px] font-medium text-foreground">
                        {plannedTravel.itinerary.length
                          ? `${plannedTravel.itinerary.length} 项安排`
                          : "待生成行程"}
                      </p>
                    </div>
                  </div>
                </button>
                {plannedTravel.status !== "archived" &&
                  Boolean(plannedTravel.destination) &&
                  plannedTravel.itinerary.length > 0 &&
                  plannedTravel.aiPlanStatus !== "not_started" && (
                    <button
                      onClick={() => onRequireLogin("邀请同行人并同步旅行变更")}
                      className="relative flex w-full items-center justify-center gap-1.5 border-t border-border bg-card px-4 py-3 text-[11px] font-medium text-foreground"
                    >
                      <Share2 className="size-3.5 text-accent" /> 基本规划完成后邀请同行人
                    </button>
                  )}
              </Card>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-foreground">开始下一段旅行</h2>
              <span className="text-[10px] text-muted-foreground">随时创建</span>
            </div>
            <NewTripCard prominent={false} onClick={() => setView("create")} />
          </section>

          <RecentTrips
            compact
            travels={travels}
            onOpen={(id) => {
              onSelectTravel(id);
              setView("trip");
            }}
            onOpenSample={() => setView("sample")}
          />

          {travels
            .filter(
              (item) =>
                item.id !== plannedTravel?.id && !["completed", "archived"].includes(item.status),
            )
            .map((item) => (
              <Card key={item.id}>
                <button
                  onClick={() => {
                    onSelectTravel(item.id);
                    setView("trip");
                  }}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <Tag tone={item.status === "active" ? "accent" : "brand"}>
                      {TRAVEL_STATUS_LABELS[item.status]}
                    </Tag>
                    <span className="text-[11px] text-muted-foreground">
                      {item.peopleCount ? `${item.peopleCount} 人` : "人数待确定"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-[18px] font-bold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {item.dateText ?? "日期待确定"}
                  </p>
                </button>
                {item.status !== "archived" &&
                  Boolean(item.destination) &&
                  item.itinerary.length > 0 &&
                  item.aiPlanStatus !== "not_started" && (
                    <button
                      onClick={() => onRequireLogin("邀请同行人并同步旅行变更")}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 border-t border-border pt-3 text-[12px] font-medium text-foreground"
                    >
                      <Share2 className="size-4 text-accent" /> 邀请同行人
                    </button>
                  )}
              </Card>
            ))}
        </div>
      </MiniShell>
    );
  }

  if (!travel) return null;

  return (
    <MiniShell
      title={travel.title}
      tab={tab}
      onTabChange={onTabChange}
      onBack={() => setView("home")}
    >
      <div className="space-y-4 px-5 pb-8 pt-1">
        <Card>
          <div className="flex items-center justify-between">
            <Tag tone={travel.status === "active" ? "accent" : "brand"}>
              {TRAVEL_STATUS_LABELS[travel.status]}
            </Tag>
            <span className="text-[11px] text-muted-foreground">
              {travel.peopleCount ? `${travel.peopleCount} 人` : "人数待确定"}
            </span>
          </div>
          <p className="mt-3 text-[14px] font-semibold text-foreground">
            {travel.destination ?? "目的地待确定"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {travel.dateText ?? "日期待确定"}
          </p>
        </Card>
        {travel.status === "draft" && (
          <DraftView
            travel={travel}
            onUpdate={onUpdateTravel}
            onDelete={(id) => {
              onDeleteTravel(id);
              setView("home");
            }}
          />
        )}
        {travel.status === "upcoming" && <UpcomingView travel={travel} onUpdate={onUpdateTravel} />}
        {travel.status === "active" && <ActiveView travel={travel} onUpdate={onUpdateTravel} />}
        {travel.status === "completed" && (
          <CompletedView travel={travel} onUpdate={onUpdateTravel} />
        )}
        {travel.status === "archived" && (
          <ArchivedView travel={travel} onCreateAgain={() => setView("create")} />
        )}
      </div>
    </MiniShell>
  );
}
