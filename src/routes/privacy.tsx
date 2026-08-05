import { createFileRoute } from "@tanstack/react-router";
import { MiniShell, Card } from "@/components/tm/MiniShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "隐私政策 · travelmate" }] }),
  component: PrivacyPage,
});

const sections: Array<{ title: string; body: string[] }> = [
  {
    title: "我们如何处理你的数据",
    body: [
      "travelmate 采用「本地优先」的设计:你的行程、记账、旅行清单、搭子测试结果和搭子记忆,默认全部保存在你自己设备的浏览器本地存储中,不会上传到我们的服务器。",
      "清除浏览器数据会同时清除这些内容,请你知悉。",
    ],
  },
  {
    title: "协作功能涉及的数据",
    body: [
      "当你主动创建或加入「协作旅行」时,该次旅行的行程内容、你填写的昵称以及成员间的编辑记录会保存在我们的服务器上(位于中国境内),仅用于成员间同步。",
      "你可以随时停止使用协作功能;如需删除某次协作旅行的数据,请联系我们。",
    ],
  },
  {
    title: "AI 功能涉及的数据",
    body: [
      "当你使用 AI 行程规划、攻略整理时,你输入的文字会经过我们的服务器转发给第三方大模型服务(深度求索 DeepSeek)处理后返回结果。",
      "当你使用图片识别时,你上传的图片会转发给第三方多模态模型服务(智谱 AI)用于提取文字。图片不会在我们的服务器上持久保存。",
      "请避免在输入中包含身份证号、银行卡号等敏感个人信息。",
    ],
  },
  {
    title: "第三方服务",
    body: [
      "地图展示与天气查询由高德开放平台提供,使用地图功能时高德可能按照其隐私政策收集设备与位置相关信息。",
      "深度求索 DeepSeek、智谱 AI 作为 AI 能力提供方,其数据处理以各自隐私政策为准。",
    ],
  },
  {
    title: "你的权利",
    body: [
      "你可以随时在「我的」页面删除搭子记忆、清除本地数据。",
      "如对我们的数据处理有任何疑问,或需要访问、更正、删除你的数据,可通过下方联系方式与我们取得联系,我们将在 15 个工作日内回复。",
    ],
  },
  {
    title: "联系我们",
    body: ["联系邮箱:(请替换为你的邮箱)"],
  },
];

function PrivacyPage() {
  return (
    <MiniShell title="隐私政策" showTabBar={false} onBack={() => window.history.back()}>
      <div className="space-y-3 px-4 pb-10 pt-2">
        <p className="text-[11px] text-muted-foreground">更新日期:2026 年 8 月 · 版本 v1.0</p>
        {sections.map((section) => (
          <Card key={section.title}>
            <h2 className="text-[14px] font-bold text-foreground">{section.title}</h2>
            {section.body.map((paragraph, index) => (
              <p
                key={index}
                className="mt-2 text-[12px] leading-relaxed text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
          </Card>
        ))}
      </div>
    </MiniShell>
  );
}
