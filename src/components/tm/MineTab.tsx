import { useState } from "react";
import {
  Bell,
  ChevronRight,
  Cloud,
  LocateFixed,
  MapPin,
  MapPinned,
  Navigation,
  ShieldCheck,
  Users,
} from "lucide-react";
import { COMPANIONS } from "@/lib/travelmate-data";
import {
  TRAVEL_STATUS_LABELS,
  type AuthState,
  type CompanionProfile,
  type TravelItem,
} from "@/lib/app-model";
import { MiniShell, Card, Tag, type TabKey } from "./MiniShell";

type TravelMapFilter = "all" | "visited" | "planned";

const DESTINATION_MAP_POINTS: Record<string, { left: string; top: string }> = {
  北京: { left: "72%", top: "22%" },
  上海: { left: "84%", top: "48%" },
  杭州: { left: "79%", top: "52%" },
  苏州: { left: "82%", top: "46%" },
  南京: { left: "75%", top: "45%" },
  青岛: { left: "82%", top: "34%" },
  西安: { left: "54%", top: "39%" },
  成都: { left: "38%", top: "49%" },
  重庆: { left: "44%", top: "54%" },
  大理: { left: "28%", top: "65%" },
  昆明: { left: "34%", top: "69%" },
  厦门: { left: "75%", top: "70%" },
  福州: { left: "80%", top: "64%" },
  广州: { left: "65%", top: "78%" },
  深圳: { left: "70%", top: "82%" },
  长沙: { left: "59%", top: "59%" },
  北海: { left: "53%", top: "82%" },
  三亚: { left: "58%", top: "92%" },
};

function isVisited(travel: TravelItem) {
  return ["completed", "archived"].includes(travel.status);
}

function TravelMap({ travels }: { travels: TravelItem[] }) {
  const [filter, setFilter] = useState<TravelMapFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(travels[0]?.id ?? null);
  const visibleTravels = travels.filter((travel) => {
    if (filter === "visited") return isVisited(travel);
    if (filter === "planned") return !isVisited(travel);
    return true;
  });
  const located = visibleTravels.filter(
    (travel) => travel.destination && DESTINATION_MAP_POINTS[travel.destination],
  );
  const unlocated = visibleTravels.filter(
    (travel) => !travel.destination || !DESTINATION_MAP_POINTS[travel.destination],
  );
  const selected =
    visibleTravels.find((travel) => travel.id === selectedId) ?? visibleTravels[0] ?? null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[14px] font-semibold text-foreground">我的旅行地图</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            像翻相册一样查看去过和即将去的地方
          </p>
        </div>
        <MapPinned className="size-5 text-accent" />
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {(
          [
            ["all", "全部"],
            ["visited", "去过"],
            ["planned", "即将去"],
          ] as Array<[TravelMapFilter, string]>
        ).map(([key, label]) => (
          <button
            type="button"
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full py-2 text-[10px] font-medium ${
              filter === key
                ? "bg-primary text-primary-foreground"
                : "bg-surface-sunk text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative h-[350px] overflow-hidden rounded-[24px] bg-accent-soft shadow-[var(--shadow-card)]">
        <div className="absolute -left-12 top-6 size-52 rounded-[45%] border-[18px] border-card/65" />
        <div className="absolute -right-12 bottom-8 size-64 rounded-[42%] border-[20px] border-brand-soft/90" />
        <div className="absolute left-[18%] top-[45%] h-1 w-[62%] rotate-[18deg] rounded-full bg-accent/20" />
        <div className="absolute left-[35%] top-[58%] h-1 w-[46%] -rotate-[26deg] rounded-full bg-accent/20" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3">
          <div className="rounded-full bg-card/80 px-3 py-1.5 text-[9px] font-medium text-foreground">
            {located.length} 个已定位地点
          </div>
          <div className="flex items-center gap-1 rounded-full bg-card/80 px-3 py-1.5 text-[9px] text-muted-foreground">
            <LocateFixed className="size-3" /> 旅行概览
          </div>
        </div>

        {located.map((travel, index) => {
          const point = DESTINATION_MAP_POINTS[travel.destination!];
          const visited = isVisited(travel);
          const active = selected?.id === travel.id;
          return (
            <button
              type="button"
              key={travel.id}
              onClick={() => setSelectedId(travel.id)}
              className={`absolute w-[104px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border bg-card px-2.5 pb-2 pt-3 text-left shadow-[0_8px_20px_-10px_oklch(0.45_0.08_80/0.7)] transition-transform ${
                active ? "z-20 scale-105 border-accent" : "z-10 border-card"
              } ${index % 2 ? "rotate-2" : "-rotate-2"}`}
              style={point}
            >
              <span
                className={`absolute left-1/2 top-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card ${
                  visited ? "bg-muted-foreground" : "bg-accent"
                }`}
              />
              <p className="truncate text-[11px] font-bold text-foreground">{travel.destination}</p>
              <p className="mt-0.5 truncate text-[8px] text-muted-foreground">
                {travel.dateText ?? "日期待确定"}
              </p>
              <span
                className={`mt-1.5 inline-block rounded-full px-1.5 py-0.5 text-[7px] font-medium ${
                  visited ? "bg-surface-sunk text-muted-foreground" : "bg-accent-soft text-accent"
                }`}
              >
                {visited ? "去过" : travel.status === "active" ? "旅行中" : "即将去"}
              </span>
            </button>
          );
        })}

        {!located.length && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-card/80">
              <MapPin className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-[13px] font-semibold text-foreground">地图还是空的</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              创建含有真实目的地的旅行后，会自动形成一张旅行便签。
            </p>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-4 rounded-full bg-card/80 px-3 py-2 text-[8px] text-muted-foreground backdrop-blur">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-accent" /> 即将去
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-muted-foreground" /> 去过
          </span>
        </div>
      </div>

      {selected && (
        <Card className="mt-3 !p-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-brand-soft">
              <Navigation className="size-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {selected.title}
                </p>
                <Tag tone={isVisited(selected) ? "muted" : "accent"}>
                  {TRAVEL_STATUS_LABELS[selected.status]}
                </Tag>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {selected.destination ?? "目的地待确定"} · {selected.dateText ?? "日期待确定"}
              </p>
            </div>
          </div>
        </Card>
      )}

      {unlocated.length > 0 && (
        <div className="mt-3 rounded-[16px] bg-surface-sunk p-3">
          <p className="text-[10px] font-medium text-foreground">
            还有 {unlocated.length} 个地点待确认
          </p>
          <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
            {unlocated.map((travel) => travel.title).join("、")}不会被随意放在地图上。
          </p>
        </div>
      )}

      <p className="mt-2 text-center text-[8px] leading-relaxed text-muted-foreground">
        便签位置用于旅行概览；具体路线和导航仍以行程详情中的地图实时结果为准。
      </p>
    </div>
  );
}

export function MineTab({
  auth,
  companion,
  travels,
  tab,
  onTabChange,
  onRequireLogin,
}: {
  auth: AuthState;
  companion: CompanionProfile | null;
  travels: TravelItem[];
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onRequireLogin: (reason: string) => void;
}) {
  const companionType = companion ? COMPANIONS[companion.key] : null;
  const isGuest = auth === "guest";

  return (
    <MiniShell title="我的" tab={tab} onTabChange={onTabChange}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        <Card className="flex items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-full bg-surface-sunk text-2xl">
            {isGuest ? "👋" : "🙂"}
          </div>
          <div className="flex-1">
            <p className="text-[16px] font-bold text-foreground">{isGuest ? "游客" : "微信用户"}</p>
            <p className="text-[11px] text-muted-foreground">
              {companion && companionType
                ? `搭子：${companion.name} · ${companionType.title}`
                : "尚未匹配搭子"}
            </p>
          </div>
          {isGuest && (
            <button
              onClick={() => onRequireLogin("登录后保存搭子与跨设备同步")}
              className="text-[12px] font-medium text-accent"
            >
              登录
            </button>
          )}
        </Card>

        <TravelMap travels={travels} />

        <div className="space-y-2">
          <button
            onClick={() => onRequireLogin("跨设备同步旅行、搭子和偏好设置")}
            className="w-full text-left"
          >
            <Card className="flex items-center gap-3 !py-3">
              <Cloud className="size-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-foreground">跨设备同步</p>
                <p className="text-[11px] text-muted-foreground">
                  {isGuest ? "登录后可用" : "登录状态已确认"}
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Card>
          </button>
          {[
            { icon: Users, label: "成员与权限", desc: "只管理真实加入的同行人" },
            { icon: Bell, label: "提醒设置", desc: "出发、集合与订单提醒" },
            { icon: ShieldCheck, label: "隐私与数据", desc: "查看记忆来源、停用或删除" },
          ].map(({ icon: Icon, label, desc }) => (
            <Card key={label} className="flex items-center gap-3 !py-3">
              <Icon className="size-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Card>
          ))}
        </div>
        <p className="pt-2 text-center text-[11px] text-muted-foreground/70">
          travelmate 产品逻辑原型
        </p>
      </div>
    </MiniShell>
  );
}
