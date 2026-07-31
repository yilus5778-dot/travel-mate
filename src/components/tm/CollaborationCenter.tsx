import { useState } from "react";
import {
  Check,
  Clock3,
  Copy,
  Crown,
  Eye,
  Pencil,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRoundPlus,
  Users,
  WalletCards,
} from "lucide-react";
import type { CollaborationRole, TravelItem } from "@/lib/app-model";
import {
  collaborationInviteUrl,
  createCollaboration,
  loadCollaboration,
  setCollaborationInviteRole,
  setCollaborationMemberRole,
} from "@/lib/collaboration-client";
import { Card, MiniShell, PrimaryButton, Tag } from "./MiniShell";

const ROLE_LABELS: Record<CollaborationRole, string> = {
  owner: "创建者",
  editor: "可编辑",
  viewer: "只读",
};

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CollaborationCenter({
  travel,
  onReplace,
  onBack,
}: {
  travel: TravelItem;
  onReplace: (travel: TravelItem) => void;
  onBack: () => void;
}) {
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">(
    travel.collaboration?.inviteRole ?? "editor",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const collaboration = travel.collaboration;
  const inviteUrl = collaboration ? collaborationInviteUrl(collaboration.inviteCode) : "";

  const run = async (action: () => Promise<TravelItem>, success: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await action();
      onReplace(updated);
      setInviteRole(updated.collaboration?.inviteRole ?? inviteRole);
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage("协作邀请链接已复制，可以粘贴到微信群。\n");
    } catch {
      setError("当前浏览器无法自动复制，请长按下方邀请链接手动复制。\n");
    }
  };

  const shareInvite = async () => {
    if (!navigator.share) {
      await copyInvite();
      return;
    }
    try {
      await navigator.share({
        title: `一起编辑：${travel.title}`,
        text: `加入 travelmate 协作旅行，和我一起编辑行程与共同账本。\n${inviteUrl}`,
        url: inviteUrl,
      });
      setMessage("分享面板已完成操作。\n");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        setMessage("已取消分享，邀请没有发送。\n");
        return;
      }
      await copyInvite();
    }
  };

  if (!collaboration) {
    return (
      <MiniShell title="协作旅行" onBack={onBack} showTabBar={false}>
        <div className="space-y-4 px-5 pb-8 pt-2">
          <Card className="relative overflow-hidden bg-brand-soft">
            <div className="absolute -right-14 -top-16 size-44 rounded-full bg-card/45" />
            <div className="relative">
              <Tag tone="accent">多人共同编辑</Tag>
              <div className="mt-5 flex size-12 items-center justify-center rounded-[16px] bg-card/75">
                <Users className="size-5 text-accent" />
              </div>
              <h2 className="mt-4 text-[22px] font-bold text-foreground">把旅行变成共同计划</h2>
              <p className="mt-2 text-[11px] leading-relaxed text-foreground/70">
                生成邀请链接后，群成员可以在不同设备上加入，查看同一份行程；可编辑成员的修改会同步到所有协作者。
              </p>
            </div>
          </Card>

          <Card>
            <p className="text-[13px] font-semibold text-foreground">新加入成员的默认权限</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInviteRole("editor")}
                className={`rounded-[14px] p-3 text-left ${
                  inviteRole === "editor" ? "bg-brand-soft" : "bg-surface-sunk"
                }`}
              >
                <Pencil className="size-4 text-accent" />
                <p className="mt-2 text-[11px] font-semibold text-foreground">可编辑</p>
                <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
                  可改行程、共同记账和补充资料。
                </p>
              </button>
              <button
                type="button"
                onClick={() => setInviteRole("viewer")}
                className={`rounded-[14px] p-3 text-left ${
                  inviteRole === "viewer" ? "bg-brand-soft" : "bg-surface-sunk"
                }`}
              >
                <Eye className="size-4 text-accent" />
                <p className="mt-2 text-[11px] font-semibold text-foreground">只读</p>
                <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
                  只能查看，不会改动你的计划。
                </p>
              </button>
            </div>
          </Card>

          <Card>
            <p className="text-[13px] font-semibold text-foreground">协作范围</p>
            <div className="mt-3 space-y-2">
              {[
                [Check, "同步行程日期、日程、成员和路线调整"],
                [WalletCards, "同步共同账本、付款人和 AA 结算"],
                [ShieldCheck, "不共享搭子记忆、个人偏好和未确认隐私资料"],
              ].map(([Icon, label]) => {
                const RowIcon = Icon as typeof Check;
                return (
                  <div
                    key={String(label)}
                    className="flex items-start gap-2 rounded-[11px] bg-surface-sunk p-3"
                  >
                    <RowIcon className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    <p className="text-[10px] leading-relaxed text-foreground">{String(label)}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <PrimaryButton
            disabled={busy}
            onClick={() =>
              void run(
                () => createCollaboration(travel, inviteRole),
                "协作空间已创建，可以邀请同行人了。",
              )
            }
          >
            <span className="inline-flex items-center gap-1.5">
              <UserRoundPlus className="size-4" /> {busy ? "正在创建…" : "创建协作空间"}
            </span>
          </PrimaryButton>
          {error && (
            <p className="rounded-[12px] bg-destructive/10 p-3 text-[10px] text-destructive">
              {error}
            </p>
          )}
          <p className="text-center text-[9px] leading-relaxed text-muted-foreground">
            创建后会生成专属邀请码和访问凭证；没有邀请链接的人无法访问。
          </p>
        </div>
      </MiniShell>
    );
  }

  const isOwner = collaboration.role === "owner";
  return (
    <MiniShell title="协作旅行" onBack={onBack} showTabBar={false}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        <Card className="relative overflow-hidden bg-brand-soft">
          <div className="absolute -right-14 -top-16 size-44 rounded-full bg-card/45" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <Tag tone="accent">协作中</Tag>
              <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                <RefreshCw className={`size-3 ${busy ? "animate-spin" : ""}`} /> 第{" "}
                {collaboration.revision} 版
              </span>
            </div>
            <h2 className="mt-4 text-[21px] font-bold text-foreground">{travel.title}</h2>
            <p className="mt-1 text-[10px] text-muted-foreground">
              我的权限：{ROLE_LABELS[collaboration.role]} · {collaboration.members.length} 位成员
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() => loadCollaboration(collaboration.sharedTripId), "已同步到最新版本。")
              }
              className="mt-4 rounded-full bg-card/75 px-3 py-1.5 text-[9px] font-semibold text-foreground"
            >
              立即同步
            </button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-foreground">邀请同行人</p>
            <Tag>{collaboration.inviteCode}</Tag>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            当前邀请默认加入为“{ROLE_LABELS[collaboration.inviteRole]}”。链接可直接发到微信群。
          </p>
          <div className="mt-3 break-all rounded-[12px] bg-surface-sunk p-3 text-[9px] leading-relaxed text-foreground">
            {inviteUrl}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void shareInvite()}
              className="flex items-center justify-center gap-1.5 rounded-[12px] bg-primary py-2.5 text-[10px] font-semibold text-primary-foreground"
            >
              <Send className="size-3.5" /> 分享到群
            </button>
            <button
              type="button"
              onClick={() => void copyInvite()}
              className="flex items-center justify-center gap-1.5 rounded-[12px] bg-brand-soft py-2.5 text-[10px] font-semibold text-foreground"
            >
              <Copy className="size-3.5" /> 复制链接
            </button>
          </div>
          {isOwner && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-[9px] text-muted-foreground">调整后续新成员的权限</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["editor", "viewer"] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    disabled={busy || role === collaboration.inviteRole}
                    onClick={() =>
                      void run(
                        () => setCollaborationInviteRole(travel, role),
                        `新成员将以“${ROLE_LABELS[role]}”身份加入。`,
                      )
                    }
                    className={`rounded-[10px] py-2 text-[9px] ${
                      role === collaboration.inviteRole
                        ? "bg-accent text-accent-foreground"
                        : "bg-surface-sunk text-muted-foreground"
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-foreground">协作成员</p>
            <Tag>{collaboration.members.length} 人</Tag>
          </div>
          <div className="mt-3 space-y-2">
            {collaboration.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-[12px] bg-surface-sunk p-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card">
                  {member.role === "owner" ? (
                    <Crown className="size-4 text-accent" />
                  ) : member.role === "editor" ? (
                    <Pencil className="size-4 text-muted-foreground" />
                  ) : (
                    <Eye className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-foreground">
                    {member.name}
                  </p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">
                    {timeLabel(member.joinedAt)}加入
                  </p>
                </div>
                {isOwner && member.role !== "owner" ? (
                  <select
                    value={member.role}
                    disabled={busy}
                    onChange={(event) =>
                      void run(
                        () =>
                          setCollaborationMemberRole(
                            travel,
                            member.id,
                            event.target.value as "editor" | "viewer",
                          ),
                        `已更新${member.name}的权限。`,
                      )
                    }
                    className="rounded-[9px] bg-card px-2 py-1.5 text-[9px] outline-none"
                  >
                    <option value="editor">可编辑</option>
                    <option value="viewer">只读</option>
                  </select>
                ) : (
                  <Tag>{ROLE_LABELS[member.role]}</Tag>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-foreground">最近动态</p>
            <Clock3 className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-3 space-y-3">
            {collaboration.events.map((event, index) => (
              <div key={event.id} className="relative flex gap-3">
                {index < collaboration.events.length - 1 && (
                  <div className="absolute bottom-[-14px] left-[4px] top-3 w-px bg-border" />
                )}
                <div className="relative mt-1 size-2.5 shrink-0 rounded-full border-2 border-card bg-accent" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] leading-relaxed text-foreground">
                    <span className="font-semibold">{event.actor}</span> {event.action}
                  </p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">
                    {timeLabel(event.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-accent-soft">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
            <div>
              <p className="text-[11px] font-semibold text-foreground">协作边界清楚</p>
              <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
                行程和共同账本会同步；搭子记忆、个人偏好和登录信息不会进入协作旅行。
              </p>
            </div>
          </div>
        </Card>

        {(message || error) && (
          <p
            className={`whitespace-pre-line rounded-[12px] p-3 text-center text-[10px] ${
              error ? "bg-destructive/10 text-destructive" : "bg-accent-soft text-foreground"
            }`}
          >
            {error || message}
          </p>
        )}
      </div>
    </MiniShell>
  );
}
