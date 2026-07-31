import { useEffect, useState } from "react";
import { ArrowRight, Eye, Pencil, ShieldCheck, Users } from "lucide-react";
import type { TravelItem } from "@/lib/app-model";
import {
  getSavedCollaborationTripId,
  joinCollaboration,
  loadCollaboration,
} from "@/lib/collaboration-client";
import { Card, MiniShell, PrimaryButton, Tag } from "./MiniShell";

export function JoinCollaboration({
  inviteCode,
  onJoined,
  onCancel,
}: {
  inviteCode: string;
  onJoined: (travel: TravelItem) => void;
  onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const sharedTripId = getSavedCollaborationTripId(inviteCode);
    if (!sharedTripId) {
      setChecking(false);
      return;
    }
    void loadCollaboration(sharedTripId)
      .then((travel) => {
        if (!cancelled) onJoined(travel);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inviteCode, onJoined]);

  const join = async () => {
    if (!displayName.trim()) {
      setError("请先填写你在这次旅行中显示的名字");
      return;
    }
    setBusy(true);
    setError("");
    try {
      onJoined(await joinCollaboration(inviteCode, displayName.trim()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "加入失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <MiniShell title="协作旅行" showTabBar={false}>
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <div className="flex size-16 animate-pulse items-center justify-center rounded-full bg-brand-soft">
            <Users className="size-6 text-accent" />
          </div>
          <p className="mt-4 text-[12px] font-semibold text-foreground">正在恢复协作旅行…</p>
          <p className="mt-1 text-[10px] text-muted-foreground">只读取这个邀请对应的共享行程。</p>
        </div>
      </MiniShell>
    );
  }

  return (
    <MiniShell title="加入协作旅行" onBack={onCancel} showTabBar={false}>
      <div className="space-y-4 px-5 pb-8 pt-3">
        <Card className="relative overflow-hidden bg-brand-soft">
          <div className="absolute -right-12 -top-16 size-44 rounded-full bg-card/45" />
          <div className="relative">
            <Tag tone="accent">来自同行人的邀请</Tag>
            <div className="mt-5 flex size-12 items-center justify-center rounded-[16px] bg-card/75">
              <Users className="size-5 text-accent" />
            </div>
            <h2 className="mt-4 text-[22px] font-bold text-foreground">一起把旅行计划好</h2>
            <p className="mt-2 text-[11px] leading-relaxed text-foreground/70">
              加入后会看到同一份行程。创建者可授予你编辑或只读权限，所有修改都会留下动态记录。
            </p>
          </div>
        </Card>

        <Card>
          <p className="text-[13px] font-semibold text-foreground">这次协作包含</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[12px] bg-surface-sunk p-3">
              <Pencil className="size-4 text-accent" />
              <p className="mt-2 text-[10px] font-semibold text-foreground">共同编辑行程</p>
              <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
                日程、路线和旅行资料。
              </p>
            </div>
            <div className="rounded-[12px] bg-surface-sunk p-3">
              <Eye className="size-4 text-accent" />
              <p className="mt-2 text-[10px] font-semibold text-foreground">共同查看账本</p>
              <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
                消费、付款与 AA 结算。
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <label>
            <span className="text-[10px] text-muted-foreground">你在旅行中显示的名字</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={20}
              placeholder="例如：小陆"
              className="mt-2 w-full rounded-[12px] bg-surface-sunk px-3 py-3 text-[12px] outline-none"
            />
          </label>
          <div className="mt-3 flex items-start gap-2 rounded-[12px] bg-accent-soft p-3">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent" />
            <p className="text-[9px] leading-relaxed text-muted-foreground">
              加入协作需要快捷登录，用于区分编辑者并保护共享数据；不会导入你的搭子记忆或历史旅行。
            </p>
          </div>
        </Card>

        <PrimaryButton disabled={busy} onClick={() => void join()}>
          <span className="inline-flex items-center gap-1.5">
            {busy ? "正在加入…" : "微信快捷登录并加入"} <ArrowRight className="size-4" />
          </span>
        </PrimaryButton>
        {error && (
          <p className="rounded-[12px] bg-destructive/10 p-3 text-center text-[10px] text-destructive">
            {error}
          </p>
        )}
        <p className="text-center text-[9px] text-muted-foreground">邀请码：{inviteCode}</p>
      </div>
    </MiniShell>
  );
}
