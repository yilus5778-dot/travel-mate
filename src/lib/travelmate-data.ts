export type AnimalKey = "cat" | "dolphin" | "panda" | "bird" | "dog" | "elephant" | "fox";

export interface Companion {
  key: AnimalKey;
  emoji: string;
  animal: string;
  title: string;
  tendency: string;
  behavior: string;
  suggestedNames: string[];
}

export const COMPANIONS: Record<AnimalKey, Companion> = {
  cat: {
    key: "cat",
    emoji: "🐱",
    animal: "猫",
    title: "独立漫游者",
    tendency: "审美 · 好奇 · 保持个人空间",
    behavior: "优先小众地点和自由时间，提醒更克制。",
    suggestedNames: ["小满", "橘子", "阿宁"],
  },
  dolphin: {
    key: "dolphin",
    emoji: "🐬",
    animal: "海豚",
    title: "快乐同游者",
    tendency: "社交 · 互动 · 共享体验",
    behavior: "优先多人活动，主动总结同行人的共同偏好。",
    suggestedNames: ["浪浪", "阿蓝", "开心"],
  },
  panda: {
    key: "panda",
    emoji: "🐼",
    animal: "熊猫",
    title: "松弛疗愈者",
    tendency: "舒适 · 治愈 · 慢节奏",
    behavior: "降低每日地点密度，增加休息与留白。",
    suggestedNames: ["团团", "慢慢", "汤圆"],
  },
  bird: {
    key: "bird",
    emoji: "🐦",
    animal: "小鸟",
    title: "自由探索者",
    tendency: "开放 · 随性 · 发现新鲜事物",
    behavior: "保留弹性时段，推荐可临时决定的备选地点。",
    suggestedNames: ["啾啾", "小风", "云朵"],
  },
  dog: {
    key: "dog",
    emoji: "🐶",
    animal: "小狗",
    title: "可靠同行者",
    tendency: "团队 · 照顾 · 共同完成",
    behavior: "突出待办负责人、成员同步和集合提醒。",
    suggestedNames: ["豆豆", "阿旺", "麦麦"],
  },
  elephant: {
    key: "elephant",
    emoji: "🐘",
    animal: "大象",
    title: "稳健规划者",
    tendency: "秩序 · 预算 · 可控感",
    behavior: "提前提示订单、时间冲突与预算风险。",
    suggestedNames: ["稳稳", "大象君", "阿planner"],
  },
  fox: {
    key: "fox",
    emoji: "🦊",
    animal: "狐狸",
    title: "灵活应变者",
    tendency: "机敏 · 适应 · 快速替代",
    behavior: "优先准备 Plan B，旅中变化时快速重排。",
    suggestedNames: ["小狐", "灵灵", "阿橙"],
  },
};

export interface Question {
  id: string;
  topic: string;
  text: string;
  options: { label: string; scores: Partial<Record<AnimalKey, number>> }[];
}

export const QUESTIONS: Question[] = [
  {
    id: "Q1",
    topic: "规划方式",
    text: "出发前一周，你通常会怎么准备？",
    options: [
      { label: "做一份详细计划表", scores: { elephant: 2, dog: 1 } },
      { label: "定好大方向就行", scores: { fox: 2, dolphin: 1 } },
      { label: "边走边看，不太准备", scores: { bird: 2, cat: 1 } },
    ],
  },
  {
    id: "Q2",
    topic: "旅行节奏",
    text: "面对一份旅行计划，你更喜欢哪种安排？",
    options: [
      { label: "充实打卡，尽量都去", scores: { elephant: 1, dolphin: 2 } },
      { label: "松紧平衡，留点余地", scores: { fox: 2, dog: 1 } },
      { label: "慢慢体验，一天两三处", scores: { panda: 2, cat: 1 } },
    ],
  },
  {
    id: "Q3",
    topic: "同行角色",
    text: "和朋友一起旅行时，你通常是什么角色？",
    options: [
      { label: "负责规划", scores: { elephant: 2, dog: 1 } },
      { label: "照顾大家", scores: { dog: 2, panda: 1 } },
      { label: "制造气氛", scores: { dolphin: 2 } },
      { label: "自由探索", scores: { cat: 2, bird: 1 } },
    ],
  },
  {
    id: "Q4",
    topic: "应变方式",
    text: "原计划临时变化时，你更倾向怎么做？",
    options: [
      { label: "按备选方案调整", scores: { fox: 2, elephant: 1 } },
      { label: "和大家一起确认", scores: { dog: 2, dolphin: 1 } },
      { label: "顺势发现新可能", scores: { bird: 2, cat: 1 } },
    ],
  },
  {
    id: "Q5",
    topic: "旅行动机",
    text: "旅行结束后，你最希望留下什么？",
    options: [
      { label: "新鲜发现", scores: { bird: 2, cat: 1 } },
      { label: "共同回忆", scores: { dolphin: 2, dog: 1 } },
      { label: "放松治愈", scores: { panda: 2 } },
      { label: "完成感", scores: { elephant: 2, fox: 1 } },
    ],
  },
];

export const SCORING_VERSION = "v1.1.0";

const TIE_BREAK_ORDER: AnimalKey[] = ["cat", "dolphin", "panda", "bird", "dog", "elephant", "fox"];

export function matchCompanion(answers: number[]) {
  const scores: Record<AnimalKey, number> = {
    cat: 0, dolphin: 0, panda: 0, bird: 0, dog: 0, elephant: 0, fox: 0,
  };
  QUESTIONS.forEach((q, i) => {
    const opt = q.options[answers[i]];
    if (!opt) return;
    for (const [k, v] of Object.entries(opt.scores)) {
      scores[k as AnimalKey] += v ?? 0;
    }
  });
  const ranked = TIE_BREAK_ORDER.slice().sort((a, b) => scores[b] - scores[a]);
  const primary = ranked[0];
  const secondary = ranked[1];
  const gap = scores[primary] - scores[secondary];
  return { primary, secondary, gap, blended: gap <= 1, scores, scoringVersion: SCORING_VERSION };
}