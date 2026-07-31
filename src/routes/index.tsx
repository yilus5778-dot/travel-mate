import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Onboarding, type OnboardingResult } from "@/components/tm/Onboarding";
import { TripsTab } from "@/components/tm/TripsTab";
import { CompanionTab } from "@/components/tm/CompanionTab";
import { MineTab } from "@/components/tm/MineTab";
import { LoginDialog } from "@/components/tm/LoginDialog";
import { MiniShell } from "@/components/tm/MiniShell";
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
      { title: "travelmate · 微信小程序原型" },
      {
        name: "description",
        content: "travelmate AI 旅行规划原型：统一多模态输入、主动追问、可编辑行程和可靠状态。",
      },
      { property: "og:title", content: "travelmate · 微信小程序原型" },
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
  const pendingLoginActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (EXPERIENCE_MODE) {
      window.localStorage.removeItem(STORAGE_KEY);
      setState(EMPTY_STATE);
      setHydrated(true);
      return;
    }

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
    if (!hydrated || EXPERIENCE_MODE) return;
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
    setState((current) => ({
      ...current,
      travels: [travel, ...current.travels],
      activeTravelId: travel.id,
    }));
  };

  const updateTravel = (travel: TravelItem) => {
    setState((current) => ({
      ...current,
      travels: current.travels.map((item) => (item.id === travel.id ? travel : item)),
      activeTravelId: travel.id,
    }));
  };

  const deleteTravel = (id: string) => {
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

  const content = !hydrated ? (
    <MiniShell title="travelmate" showTabBar={false}>
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="flex size-16 animate-pulse items-center justify-center rounded-full bg-brand-soft text-2xl">
          🧳
        </div>
        <p className="mt-4 text-[13px] text-muted-foreground">正在开始一段全新体验…</p>
      </div>
    </MiniShell>
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
    <main className="prototype-stage flex min-h-screen items-center justify-center bg-surface-sunk px-4 py-8">
      <div className="prototype-wrap flex flex-col items-center gap-5">
        <header className="prototype-caption text-center">
          <h1 className="text-[20px] font-bold text-foreground">travelmate</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            全新体验模式 · 每次打开都从欢迎页开始
          </p>
        </header>
        <div className="relative">
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
        </div>
      </div>
    </main>
  );
}
