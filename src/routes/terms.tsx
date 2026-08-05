import { createFileRoute } from "@tanstack/react-router";
import { MiniShell, Card } from "@/components/tm/MiniShell";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "用户协议 · travelmate" }] }),
  component: TermsPage,
});

const sections: Array<{ title: string; body: string[] }> = [
  {
    title: "服务说明",
    body: [
      "travelmate 是一款旅行规划辅助工具,提供行程规划、记账分摊、旅行清单、结伴协作等功能。使用本服务即表示你同意本协议。",
    ],
  },
  {
    title: "AI 生成内容的性质",
    body: [
      "行程规划、攻略整理等内容由人工智能生成,仅供参考,不构成对景点开放状态、票价、交通时刻等信息的保证。出行前请通过官方渠道核实关键信息。",
      "因信赖 AI 生成内容而产生的任何损失,我们不承担责任,但我们会持续改进内容质量。",
    ],
  },
  {
    title: "结伴出行的风险提示",
    body: [
      "「协作旅行」是行程信息共享工具,不构成对同行人身份、信用的任何担保。与陌生人结伴出行存在人身与财产风险,请自行审慎判断,建议首次见面选择公共场所并告知亲友行程。",
      "你对自己发布的内容负责,不得发布违法违规、侵犯他人权益的信息。我们有权删除违规内容。",
    ],
  },
  {
    title: "账号与数据",
    body: [
      "当前版本为免登录模式,你的数据保存在自己的设备上,清除浏览器数据后将无法恢复,请知悉。",
    ],
  },
  {
    title: "服务变更与免责",
    body: [
      "我们可能根据运营情况调整服务功能。因不可抗力、第三方服务中断(如地图、天气、AI 服务)导致的功能不可用,我们不承担责任。",
    ],
  },
  {
    title: "联系我们",
    body: ["如对本协议有任何疑问,可通过隐私政策页面中的联系方式与我们取得联系。"],
  },
];

function TermsPage() {
  return (
    <MiniShell title="用户协议" showTabBar={false} onBack={() => window.history.back()}>
      <div className="space-y-3 px-4 pb-10 pt-2">
        <p className="text-[11px] text-muted-foreground">生效日期:2026 年 8 月 · 版本 v1.0</p>
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
