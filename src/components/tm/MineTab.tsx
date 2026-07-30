import { Bell, ChevronRight, Cloud, ShieldCheck, Users } from "lucide-react";
import { COMPANIONS } from "@/lib/travelmate-data";
import {
  TRAVEL_STATUS_LABELS,
  type AuthState,
  type CompanionProfile,
  type TravelItem,
} from "@/lib/app-model";
import { MiniShell, Card, Tag, type TabKey } from "./MiniShell";

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

        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-foreground">历史旅行</p>
          {travels.length ? (
            <div className="space-y-2">
              {travels.map((travel) => (
                <Card key={travel.id} className="flex items-center justify-between !py-3">
                  <div>
                    <p className="text-[14px] text-foreground">{travel.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {travel.dateText ?? "日期待确定"}
                    </p>
                  </div>
                  <Tag tone={travel.status === "active" ? "accent" : "muted"}>
                    {TRAVEL_STATUS_LABELS[travel.status]}
                  </Tag>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center">
              <p className="text-[13px] font-semibold text-foreground">还没有历史旅行</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                创建过的真实旅行才会出现在这里。
              </p>
            </Card>
          )}
        </div>

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
