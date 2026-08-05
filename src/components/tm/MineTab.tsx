import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Cloud,
  MapPinned,
  Navigation,
  ShieldCheck,
  Users,
} from "lucide-react";
import { COMPANIONS } from "@/lib/travelmate-data";
import {
  TRAVEL_STATUS_LABELS,
  type CompanionProfile,
  type TravelItem,
} from "@/lib/app-model";
import { MiniShell, Card, Tag, type TabKey } from "./MiniShell";
import { ProvinceMap, PROVINCE_COLORS } from "./ProvinceMap";

type TravelMapFilter = "all" | "visited" | "planned";

function isVisited(travel: TravelItem) {
  return ["completed", "archived"].includes(travel.status);
}

function hasLocationHint(travel: TravelItem) {
  return Boolean(
    travel.destination?.trim() ||
      travel.destinationPreference?.trim() ||
      travel.destinationCandidates?.some((item) => item.trim()),
  );
}

function TravelMap({ travels }: { travels: TravelItem[] }) {
  const [filter, setFilter] = useState<TravelMapFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(travels[0]?.id ?? null);
  const visibleTravels = travels.filter((travel) => {
    if (filter === "visited") return isVisited(travel);
    if (filter === "planned") return !isVisited(travel);
    return true;
  });
  const located = visibleTravels.filter((travel) => hasLocationHint(travel));
  const unlocated = visibleTravels.filter((travel) => !hasLocationHint(travel));
  const selected =
    visibleTravels.find((travel) => travel.id === selectedId) ?? visibleTravels[0] ?? null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[14px] font-semibold text-foreground">我的旅行地图</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            去过和计划去的省份会在真实地图上点亮
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

      <div>
        <ProvinceMap travels={visibleTravels} />
        <div className="mt-2 flex items-center justify-center gap-4 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span
              className="size-2 rounded-full border border-white/60"
              style={{ backgroundColor: PROVINCE_COLORS.visited }}
            />
            去过的省份
          </span>
          <span className="flex items-center gap-1">
            <span
              className="size-2 rounded-full border border-white/60"
              style={{ backgroundColor: PROVINCE_COLORS.planned }}
            />
            计划去的省份
          </span>
        </div>
        {!located.length && (
          <div className="mt-3 rounded-[16px] bg-surface-sunk p-3 text-center">
            <p className="text-[12px] font-semibold text-foreground">地图还是空的</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              创建含有真实目的地的旅行后，对应省份会自动点亮。
            </p>
          </div>
        )}
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
        省份颜色按旅行目的地自动点亮；点击点亮省份可查看对应旅行卡片。
      </p>
    </div>
  );
}

export function MineTab({
  companion,
  travels,
  tab,
  onTabChange,
}: {
  companion: CompanionProfile | null;
  travels: TravelItem[];
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
}) {
  const companionType = companion ? COMPANIONS[companion.key] : null;

  return (
    <MiniShell title="我的" tab={tab} onTabChange={onTabChange}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        <Card className="flex items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-full bg-surface-sunk text-2xl">
            🧭
          </div>
          <div className="flex-1">
            <p className="text-[16px] font-bold text-foreground">旅行者</p>
            <p className="text-[11px] text-muted-foreground">
              {companion && companionType
                ? `搭子：${companion.name} · ${companionType.title}`
                : "尚未匹配搭子"}
            </p>
          </div>
          <span className="rounded-full bg-surface-sunk px-2.5 py-1 text-[10px] text-muted-foreground">
            本地模式
          </span>
        </Card>

        <TravelMap travels={travels} />

        <div className="space-y-2">
          <Card className="flex items-center gap-3 !py-3">
            <Cloud className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-foreground">数据保存在本设备</p>
              <p className="text-[11px] text-muted-foreground">
                当前为免登录本地模式,清除浏览器数据会同时清空行程
              </p>
            </div>
          </Card>
          <Link to="/privacy" className="block">
            <Card className="flex items-center gap-3 !py-3">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-foreground">隐私政策</p>
                <p className="text-[11px] text-muted-foreground">了解我们如何保护你的数据</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Card>
          </Link>
          <Link to="/terms" className="block">
            <Card className="flex items-center gap-3 !py-3">
              <Users className="size-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-foreground">用户协议</p>
                <p className="text-[11px] text-muted-foreground">服务条款与出行风险提示</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Card>
          </Link>
        </div>
        <p className="pt-2 text-center text-[11px] text-muted-foreground/70">
          travelmate · 你的 AI 旅行搭子
        </p>
      </div>
    </MiniShell>
  );
}
