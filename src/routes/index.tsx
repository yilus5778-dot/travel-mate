import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Onboarding, type OnboardingResult } from "@/components/tm/Onboarding";
import { TripsTab } from "@/components/tm/TripsTab";
import { AccountingTab } from "@/components/tm/AccountingTab";
import { CompanionTab } from "@/components/tm/CompanionTab";
import { MineTab } from "@/components/tm/MineTab";
import { LoginDialog } from "@/components/tm/LoginDialog";
import { JoinCollaboration } from "@/components/tm/JoinCollaboration";
import { MiniShell } from "@/components/tm/MiniShell";
import { loadCollaboration, syncCollaboration } from "@/lib/collaboration-client";
import {
  EMPTY_STATE,
  memoriesFromReasons,
  normalizeTravelItem,
  type CompanionProfile,
  type TravelItem,
  type TravelmateState,
} from "@/lib/app-model";

const STORAGE_KEY = "travelmate-state-v2";
const EXPERIENCE_MODE = true;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "travelmate · AI 旅行搭子" },
      {
        name: "description",
        content: "travelmate AI 旅行搭子：统一多模态输入、主动追问、可编辑行程、协作记账和可靠状态。",
      },
      { property: "og:title", content: "travelmate · AI 旅行搭子" },
      {
        property: "og:description",
        content: "用户随便说、随便传，AI 主动整理并交付可编辑旅行方案。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [state, setState] = useState<TravelmateState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [loginReason, setLoginReason] = useState<string | null>(null);
  const [pendingCompanion, setPendingCompanion] = useState<OnboardingResult | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinedInviteTravelId, setJoinedInviteTravelId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState("");
  const pendingLoginActionRef = useRef<(() => void) | null>(null);
  const latestTravelRef = useRef(new Map<string, TravelItem>());
  const syncTimersRef = useRef(new Map<string, number>());
  const syncInFlightRef = useRef(new Set<string>());

  useEffect(() => {
    const incomingInvite = new URL(window.location.href).searchParams.get("invite");
    setInviteCode(incomingInvite?.trim().toUpperCase() || null);

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TravelmateState;
        if (parsed.version === 2) {
          setState({
            ...parsed,
            travels: (parsed.travels ?? []).map(normalizeTravelItem),
          });
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    state.travels.forEach((travel) => latestTravelRef.current.set(travel.id, travel));
  }, [state.travels]);

  useEffect(
    () => () => {
      syncTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  useEffect(() => {
    if (!syncNotice) return;
    const timer = window.setTimeout(() => setSyncNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [syncNotice]);

  useEffect(() => {
    if (!hydrated || !state.travels.some((travel) => travel.collaboration)) return;
    const poll = window.setInterval(() => {
      state.travels.forEach((travel) => {
        const collaboration = travel.collaboration;
        if (
          !collaboration ||
          syncTimersRef.current.has(travel.id) ||
          syncInFlightRef.current.has(travel.id)
        )
          return;
        void loadCollaboration(collaboration.sharedTripId)
          .then((remote) => {
            if ((remote.collaboration?.revision ?? 0) <= collaboration.revision) return;
            latestTravelRef.current.set(remote.id, remote);
            setState((current) => ({
              ...current,
              travels: current.travels.map((item) => (item.id === remote.id ? remote : item)),
            }));
            setSyncNotice("同行人更新了行程，已同步到最新版本");
          })
          .catch(() => undefined);
      });
    }, 7000);
    return () => window.clearInterval(poll);
  }, [hydrated, state.travels]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const saveCompanion = (result: OnboardingResult) => {
    const profile: CompanionProfile = {
      key: result.key,
      name: result.name,
      memoryEnabled: result.memoryEnabled,
      reasons: result.reasons,
    };
    setState((current) => ({
      ...current,
      onboardingComplete: true,
      tab: "trips",
      companion: profile,
      memories: result.memoryEnabled ? memoriesFromReasons(result.reasons) : [],
    }));
  };

  const requestLogin = (reason: string, onAuthenticated?: () => void) => {
    if (state.auth === "authenticated") {
      onAuthenticated?.();
      return;
    }
    pendingLoginActionRef.current = onAuthenticated ?? null;
    setLoginReason(reason);
  };

  const handleCompanionFinish = (result: OnboardingResult) => {
    if (state.auth === "guest") {
      setPendingCompanion(result);
      setLoginReason(
        result.memoryEnabled
          ? "保存搭子匹配结果，以及你主动授权的偏好测试记忆"
          : "保存搭子匹配结果",
      );
      return;
    }
    saveCompanion(result);
  };

  const handleLoginConfirm = () => {
    setState((current) => ({ ...current, auth: "authenticated" }));
    if (pendingCompanion) saveCompanion(pendingCompanion);
    const pendingAction = pendingLoginActionRef.current;
    pendingLoginActionRef.current = null;
    setPendingCompanion(null);
    setLoginReason(null);
    pendingAction?.();
  };

  const createTravel = (travel: TravelItem) => {
    latestTravelRef.current.set(travel.id, travel);
    setState((current) => ({
      ...current,
      travels: [travel, ...current.travels],
      activeTravelId: travel.id,
    }));
  };

  const scheduleCollaborationSync = (travel: TravelItem, action: string) => {
    const existingTimer = syncTimersRef.current.get(travel.id);
    if (existingTimer) window.clearTimeout(existingTimer);
    const timer = window.setTimeout(() => {
      syncTimersRef.current.delete(travel.id);
      const latest = latestTravelRef.current.get(travel.id);
      if (!latest?.collaboration || latest.collaboration.role === "viewer") return;
      if (syncInFlightRef.current.has(travel.id)) {
        scheduleCollaborationSync(latest, action);
        return;
      }
      syncInFlightRef.current.add(travel.id);
      void syncCollaboration(latest, action)
        .then((synced) => {
          const newestLocal = latestTravelRef.current.get(travel.id);
          if (newestLocal && newestLocal.updatedAt !== latest.updatedAt) {
            const merged = { ...newestLocal, collaboration: synced.collaboration };
            latestTravelRef.current.set(merged.id, merged);
            setState((current) => ({
              ...current,
              travels: current.travels.map((item) => (item.id === merged.id ? merged : item)),
            }));
            scheduleCollaborationSync(merged, action);
            return;
          }
          latestTravelRef.current.set(synced.id, synced);
          setState((current) => ({
            ...current,
            travels: current.travels.map((item) => (item.id === synced.id ? synced : item)),
          }));
          setSyncNotice("协作修改已同步");
        })
        .catch((cause) =>
          setSyncNotice(cause instanceof Error ? cause.message : "协作同步失败，请稍后重试"),
        )
        .finally(() => syncInFlightRef.current.delete(travel.id));
    }, 750);
    syncTimersRef.current.set(travel.id, timer);
  };

  const updateTravel = (travel: TravelItem, options?: { sync?: boolean; action?: string }) => {
    if (options?.sync !== false && travel.collaboration?.role === "viewer") {
      setSyncNotice("你以只读身份加入，不能修改这次旅行");
      return;
    }
    latestTravelRef.current.set(travel.id, travel);
    setState((current) => ({
      ...current,
      travels: current.travels.map((item) => (item.id === travel.id ? travel : item)),
      activeTravelId: travel.id,
    }));
    if (options?.sync !== false && travel.collaboration) {
      scheduleCollaborationSync(travel, options?.action ?? "更新了旅行内容");
    }
  };

  const deleteTravel = (id: string) => {
    const timer = syncTimersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    syncTimersRef.current.delete(id);
    syncInFlightRef.current.delete(id);
    latestTravelRef.current.delete(id);
    setState((current) => {
      const travels = current.travels.filter((travel) => travel.id !== id);
      return {
        ...current,
        travels,
        activeTravelId:
          current.activeTravelId === id ? (travels[0]?.id ?? null) : current.activeTravelId,
      };
    });
  };

  const handleJoinedCollaboration = useCallback((travel: TravelItem) => {
    const normalized = normalizeTravelItem(travel);
    latestTravelRef.current.set(normalized.id, normalized);
    setState((current) => ({
      ...current,
      onboardingComplete: true,
      auth: "authenticated",
      tab: "trips",
      travels: [normalized],
      activeTravelId: normalized.id,
    }));
    setJoinedInviteTravelId(normalized.id);
    setInviteCode(null);
  }, []);

  const content = !hydrated ? (
    <MiniShell title="travelmate" showTabBar={false}>
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-8 text-center">
        <div className="flex size-16 animate-pulse items-center justify-center rounded-full bg-brand-soft text-2xl">
          🧳
        </div>
        <p className="mt-4 text-[13px] text-muted-foreground">正在加载…</p>
      </div>
    </MiniShell>
  ) : inviteCode ? (
    <JoinCollaboration
      inviteCode={inviteCode}
      onJoined={handleJoinedCollaboration}
      onCancel={() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("invite");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        setInviteCode(null);
      }}
    />
  ) : !state.onboardingComplete ? (
    <Onboarding
      onSkip={() =>
        setState((current) => ({
          ...current,
          onboardingComplete: true,
          tab: "trips",
        }))
      }
      onFinish={handleCompanionFinish}
    />
  ) : state.tab === "trips" ? (
    <TripsTab
      companion={state.companion}
      travels={state.travels}
      activeTravelId={state.activeTravelId}
      tab={state.tab}
      onTabChange={(tab) => setState((current) => ({ ...current, tab }))}
      onSelectTravel={(id) => setState((current) => ({ ...current, activeTravelId: id }))}
      onCreateTravel={createTravel}
      onUpdateTravel={updateTravel}
      onDeleteTravel={deleteTravel}
      onRequireLogin={requestLogin}
      startInTrip={Boolean(joinedInviteTravelId)}
    />
  ) : state.tab === "companion" ? (
    <CompanionTab
      companion={state.companion}
      memories={state.memories}
      tab={state.tab}
      onTabChange={(tab) => setState((current) => ({ ...current, tab }))}
      onRetest={() => setState((current) => ({ ...current, onboardingComplete: false }))}
      onEnableMemory={() =>
        setState((current) => {
          if (!current.companion) return current;
          return {
            ...current,
            companion: { ...current.companion, memoryEnabled: true },
            memories: memoriesFromReasons(current.companion.reasons),
          };
        })
      }
      onDisableMemory={(mode) =>
        setState((current) => ({
          ...current,
          companion: current.companion ? { ...current.companion, memoryEnabled: false } : null,
          memories: mode === "delete" ? [] : current.memories,
        }))
      }
      onDeleteMemory={(id) =>
        setState((current) => ({
          ...current,
          memories: current.memories.filter((memory) => memory.id !== id),
        }))
      }
    />
  ) : state.tab === "accounting" ? (
    <AccountingTab
      travels={state.travels}
      activeTravelId={state.activeTravelId}
      tab={state.tab}
      onTabChange={(tab) => setState((current) => ({ ...current, tab }))}
      onSelectTravel={(id) => setState((current) => ({ ...current, activeTravelId: id }))}
      onCreateTravel={createTravel}
      onUpdateTravel={updateTravel}
      onRequireLogin={requestLogin}
    />
  ) : (
    <MineTab
      auth={state.auth}
      companion={state.companion}
      travels={state.travels}
      tab={state.tab}
      onTabChange={(tab) => setState((current) => ({ ...current, tab }))}
      onRequireLogin={requestLogin}
    />
  );

  return (
    <div className="relative min-h-dvh bg-background">
      {content}
      {loginReason && (
        <LoginDialog
          reason={loginReason}
          onCancel={() => {
            setLoginReason(null);
            setPendingCompanion(null);
            pendingLoginActionRef.current = null;
          }}
          onConfirm={handleLoginConfirm}
        />
      )}
      {syncNotice && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 w-[82%] max-w-sm -translate-x-1/2 rounded-[13px] bg-foreground/90 px-4 py-2.5 text-center text-[10px] text-background shadow-lg">
          {syncNotice}
        </div>
      )}
    </div>
  );
}
