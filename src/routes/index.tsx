import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Onboarding } from "@/components/tm/Onboarding";
import { TripsTab, type CompanionState } from "@/components/tm/TripsTab";
import { CompanionTab } from "@/components/tm/CompanionTab";
import { MineTab } from "@/components/tm/MineTab";
import type { TabKey } from "@/components/tm/MiniShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TravelMate 捣鼓旅行 · 微信小程序原型" },
      {
        name: "description",
        content:
          "TravelMate 捣鼓旅行小程序高保真原型：5 题旅行偏好测试、7 类动物搭子匹配、行程/资料/记录与 AA 结算。",
      },
      { property: "og:title", content: "TravelMate 捣鼓旅行 · 微信小程序原型" },
      {
        property: "og:description",
        content: "5 题偏好测试匹配旅行搭子，群聊结论一键变成可执行行程。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [onboarding, setOnboarding] = useState(true);
  const [tab, setTab] = useState<TabKey>("trips");
  const [companion, setCompanion] = useState<CompanionState>({
    key: null,
    name: "",
    memory: true,
  });

  return (
    <main className="prototype-stage flex min-h-screen items-center justify-center bg-surface-sunk px-4 py-8">
      <div className="prototype-wrap flex flex-col items-center gap-5">
        <header className="prototype-caption text-center">
          <h1 className="text-[20px] font-bold text-foreground">TravelMate · 捣鼓旅行</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            微信小程序 V1.1 交互原型 · 首次进入偏好测试与搭子匹配
          </p>
        </header>
        {onboarding ? (
          <Onboarding
            onSkip={() => setOnboarding(false)}
            onFinish={({ key, name, memory }) => {
              setCompanion({ key, name, memory });
              setOnboarding(false);
              setTab("trips");
            }}
          />
        ) : tab === "trips" ? (
          <TripsTab companion={companion} tab={tab} onTabChange={setTab} />
        ) : tab === "companion" ? (
          <CompanionTab
            companion={companion}
            tab={tab}
            onTabChange={setTab}
            onRetest={() => setOnboarding(true)}
            onToggleMemory={(v) => setCompanion((s) => ({ ...s, memory: v }))}
          />
        ) : (
          <MineTab companion={companion} tab={tab} onTabChange={setTab} />
        )}
      </div>
    </main>
  );
}
