import { MiniShell, Card, Tag, type TabKey } from "./MiniShell";
import { COMPANIONS } from "@/lib/travelmate-data";
import type { CompanionState } from "./TripsTab";
import { Bell, ChevronRight, ShieldCheck, Users } from "lucide-react";

const HISTORY = [
  { name: "大理 · 四天三夜", state: "进行中", tone: "brand" as const },
  { name: "厦门 · 三天两夜", state: "已完成", tone: "accent" as const },
  { name: "成都 · 周末", state: "已归档", tone: "muted" as const },
];

export function MineTab({
  companion,
  tab,
  onTabChange,
}: {
  companion: CompanionState;
  tab: TabKey;
  onTabChange: (t: TabKey) => void;
}) {
  const c = companion.key ? COMPANIONS[companion.key] : null;
  return (
    <MiniShell title="我的" tab={tab} onTabChange={onTabChange}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        <Card className="flex items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-full bg-surface-sunk text-2xl">🙂</div>
          <div className="flex-1">
            <p className="text-[16px] font-bold text-foreground">微信用户</p>
            <p className="text-[11px] text-muted-foreground">
              {c ? `搭子：${companion.name} · ${c.title}` : "尚未匹配搭子"}
            </p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Card>
        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-foreground">历史旅行</p>
          <div className="space-y-2">
            {HISTORY.map((h) => (
              <Card key={h.name} className="flex items-center justify-between !py-3">
                <span className="text-[14px] text-foreground">{h.name}</span>
                <Tag tone={h.tone}>{h.state}</Tag>
              </Card>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {[
            { icon: Users, label: "成员与权限", desc: "同行人角色管理" },
            { icon: Bell, label: "提醒设置", desc: "出发、集合与订单提醒" },
            { icon: ShieldCheck, label: "隐私与数据", desc: "记忆管理、导出与删除" },
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
          travelmate V1.1 原型
        </p>
      </div>
    </MiniShell>
  );
}
