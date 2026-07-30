import { useState } from "react";
import { MiniShell, Card, PrimaryButton, Tag, type TabKey } from "./MiniShell";
import { COMPANIONS, type AnimalKey } from "@/lib/travelmate-data";
import { CreateTrip } from "./CreateTrip";
import {
  CalendarDays, Image as ImageIcon, MapPin, Plus, Receipt,
  Share2, Ticket, Users, Wallet,
} from "lucide-react";

export interface CompanionState {
  key: AnimalKey | null;
  name: string;
  memory: boolean;
}

const TRIP = {
  title: "大理 · 四天三夜",
  dates: "8月12日 — 8月15日",
  members: ["小雨", "阿哲", "Coco", "我"],
  status: "行前",
  day: "D2 · 8月13日",
};

const ITINERARY = [
  { time: "09:30", name: "喜洲古镇早餐", place: "四方街", tag: "已确认" },
  { time: "11:00", name: "海舌生态公园", place: "骑行 20 分钟", tag: "已确认" },
  { time: "14:30", name: "苍山洗马潭索道", place: "需提前购票", tag: "待确认" },
  { time: "19:00", name: "洱海边晚餐", place: "候选 2 家", tag: "候选" },
];

const RESOURCES = [
  { icon: ImageIcon, name: "截图与链接", desc: "7 条 · 2 条待整理" },
  { icon: Ticket, name: "订单", desc: "高铁 2 张 · 民宿 2 间" },
  { icon: CalendarDays, name: "清单与待办", desc: "3 项未完成" },
  { icon: MapPin, name: "候选方案", desc: "晚餐 2 个候选" },
];

export function TripsTab({
  companion,
  tab,
  onTabChange,
}: {
  companion: CompanionState;
  tab: TabKey;
  onTabChange: (t: TabKey) => void;
}) {
  const [view, setView] = useState<"home" | "trip" | "create">("home");
  const [tripTab, setTripTab] = useState<"itinerary" | "resources" | "records">("itinerary");
  const c = companion.key ? COMPANIONS[companion.key] : null;

  if (view === "create") {
    return <CreateTrip onCancel={() => setView("home")} onCreated={() => setView("trip")} />;
  }

  if (view === "home") {
    return (
      <MiniShell title="旅程" tab={tab} onTabChange={onTabChange}>
        <div className="space-y-4 px-5 pb-8 pt-2">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-2xl">
              {c?.emoji ?? "🧳"}
            </div>
            <Card className="flex-1 !p-3">
              <p className="text-[13px] leading-relaxed text-foreground/85">
                {c
                  ? `${companion.name}：还有 3 天出发，苍山索道的票还没买哦。`
                  : "完成偏好测试，就能拥有专属搭子提醒啦。"}
              </p>
            </Card>
          </div>
          <div className="rounded-[20px] bg-card p-4 shadow-[var(--shadow-card)]">
            <button onClick={() => setView("trip")} className="w-full text-left">
              <div className="flex items-center justify-between">
                <Tag tone="brand">进行中 · {TRIP.status}</Tag>
                <span className="text-[11px] text-muted-foreground">4 人同行</span>
              </div>
              <h3 className="mt-3 text-[18px] font-bold text-foreground">{TRIP.title}</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">{TRIP.dates}</p>
              <div className="mt-3 rounded-[14px] bg-surface-sunk px-3 py-2 text-[12px] text-foreground/75">
                下一步：确认苍山索道票 · 收集晚餐候选
              </div>
            </button>
            <button className="mt-3 flex w-full items-center justify-center gap-1.5 border-t border-border pt-3 text-[12px] font-medium text-foreground">
              <Share2 className="size-4 text-accent" /> 分享到群
            </button>
          </div>
          <PrimaryButton onClick={() => setView("create")}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="size-4" /> 创建新旅行
            </span>
          </PrimaryButton>
          <div>
            <p className="mb-2 px-1 text-[13px] font-semibold text-foreground">最近旅行</p>
            <Card className="!py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-foreground">厦门 · 三天两夜</p>
                  <p className="text-[11px] text-muted-foreground">已完成 · 6月20日</p>
                </div>
                <Tag>已归档</Tag>
              </div>
              <button className="mt-3 flex w-full items-center justify-center gap-1.5 border-t border-border pt-3 text-[12px] font-medium text-foreground">
                <Share2 className="size-4 text-accent" /> 分享到群
              </button>
            </Card>
          </div>
        </div>
      </MiniShell>
    );
  }

  return (
    <MiniShell title={TRIP.title} tab={tab} onTabChange={onTabChange} onBack={() => setView("home")}>
      <div className="px-5 pb-8 pt-1">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] text-muted-foreground">{TRIP.dates}</p>
              <p className="mt-1 text-[15px] font-bold text-foreground">{TRIP.day} · 今日行程</p>
            </div>
            <Tag tone="brand">{TRIP.status}</Tag>
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <Users className="size-4 text-muted-foreground" />
            <span className="text-[12px] text-muted-foreground">{TRIP.members.join("、")}</span>
          </div>
        </Card>
        <div className="mt-4 flex rounded-[14px] bg-surface-sunk p-1">
          {(
            [
              ["itinerary", "行程"],
              ["resources", "资料"],
              ["records", "记录"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTripTab(key)}
              className={`flex-1 rounded-[11px] py-2 text-[13px] font-medium transition-colors ${
                tripTab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {tripTab === "itinerary" && (
          <div className="mt-4 space-y-3">
            {ITINERARY.map((it) => (
              <Card key={it.name} className="flex gap-3 !py-3">
                <span className="w-11 shrink-0 text-[13px] font-semibold text-foreground">{it.time}</span>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-foreground">{it.name}</p>
                  <p className="text-[11px] text-muted-foreground">{it.place}</p>
                </div>
                <Tag tone={it.tag === "已确认" ? "accent" : "muted"}>{it.tag}</Tag>
              </Card>
            ))}
            <p className="px-1 text-[11px] text-muted-foreground">
              AI 整理自群聊截图，低置信度内容已标注为「待确认」
            </p>
          </div>
        )}
        {tripTab === "resources" && (
          <div className="mt-4 space-y-3">
            {RESOURCES.map(({ icon: Icon, name, desc }) => (
              <Card key={name} className="flex items-center gap-3 !py-3">
                <div className="flex size-9 items-center justify-center rounded-[12px] bg-brand-soft">
                  <Icon className="size-4 text-foreground/70" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-foreground">{name}</p>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
                <span className="text-muted-foreground">›</span>
              </Card>
            ))}
          </div>
        )}
        {tripTab === "records" && (
          <div className="mt-4 space-y-3">
            <Card>
              <div className="flex items-center gap-2">
                <Wallet className="size-4 text-accent" />
                <p className="text-[14px] font-semibold text-foreground">费用与 AA</p>
              </div>
              <p className="mt-2 text-[24px] font-bold text-foreground">¥ 4,286</p>
              <p className="text-[11px] text-muted-foreground">人均 ¥1,071 · 2 人待支付</p>
              <div className="mt-3 space-y-2 border-t border-border pt-3 text-[12px]">
                {[
                  ["民宿 2 晚", "¥1,680", "阿哲垫付"],
                  ["高铁往返", "¥1,240", "我垫付"],
                  ["洱海环湖包车", "¥600", "小雨垫付"],
                ].map(([n, a, w]) => (
                  <div key={n} className="flex items-center justify-between">
                    <span className="text-foreground/80">{n}</span>
                    <span className="text-muted-foreground">
                      {w} · <span className="font-semibold text-foreground">{a}</span>
                    </span>
                  </div>
                ))}
              </div>
              <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-surface-sunk py-2.5 text-[13px] font-medium text-foreground">
                <Receipt className="size-4" /> 发起结算
              </button>
            </Card>
            <Card>
              <p className="text-[14px] font-semibold text-foreground">旅行总结</p>
              <p className="mt-1 text-[11px] text-muted-foreground">128 张照片 · 9 个地点 · 待生成封面</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {["🏔️", "🌊", "🍜", "🌇"].map((e) => (
                  <div key={e} className="flex aspect-square items-center justify-center rounded-[12px] bg-surface-sunk text-xl">
                    {e}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </MiniShell>
  );
}