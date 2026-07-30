export type AnimalKey = "cat" | "dolphin" | "panda" | "bird" | "dog" | "elephant" | "fox";

export type AssessmentDimension = "plan" | "pace" | "social" | "risk" | "spending" | "motivation";

export interface Companion {
  key: AnimalKey;
  emoji: string;
  animal: string;
  title: string;
  tendency: string;
  behavior: string;
  suggestedNames: string[];
}

export interface MatchReason {
  dimension: AssessmentDimension;
  dimensionLabel: string;
  question: string;
  answer: string;
  conclusion: string;
}

export const PRODUCT_CAPABILITIES = [
  "订单与出发提醒",
  "时间冲突检查",
  "同行协作与变更同步",
  "记账与 AA 结算",
];

export const COMPANIONS: Record<AnimalKey, Companion> = {
  cat: {
    key: "cat",
    emoji: "🐱",
    animal: "猫",
    title: "独立漫游者",
    tendency: "尊重空间 · 保持好奇",
    behavior: "我会少打扰、给你选择，在你需要时再靠近。",
    suggestedNames: ["小满", "橘子", "阿宁"],
  },
  dolphin: {
    key: "dolphin",
    emoji: "🐬",
    animal: "海豚",
    title: "快乐同游者",
    tendency: "热情互动 · 分享感受",
    behavior: "我会用轻松热情的方式陪你，也会照顾同行氛围。",
    suggestedNames: ["浪浪", "阿蓝", "开心"],
  },
  panda: {
    key: "panda",
    emoji: "🐼",
    animal: "熊猫",
    title: "松弛疗愈者",
    tendency: "温和陪伴 · 留有余地",
    behavior: "我会温和提醒，不催促，让旅行保留喘息感。",
    suggestedNames: ["团团", "慢慢", "汤圆"],
  },
  bird: {
    key: "bird",
    emoji: "🐦",
    animal: "小鸟",
    title: "自由探索者",
    tendency: "开放好奇 · 灵感驱动",
    behavior: "我会提供新鲜选择，但把最后决定留给你。",
    suggestedNames: ["啾啾", "小风", "云朵"],
  },
  dog: {
    key: "dog",
    emoji: "🐶",
    animal: "小狗",
    title: "可靠同行者",
    tendency: "真诚回应 · 重视团队",
    behavior: "我会关注每个人的感受，用可靠、直接的方式沟通。",
    suggestedNames: ["豆豆", "阿旺", "麦麦"],
  },
  elephant: {
    key: "elephant",
    emoji: "🐘",
    animal: "大象",
    title: "稳健规划者",
    tendency: "清晰沉稳 · 重视确定性",
    behavior: "我会把信息讲清楚、分步骤确认，减少不确定感。",
    suggestedNames: ["稳稳", "大象君", "阿策"],
  },
  fox: {
    key: "fox",
    emoji: "🦊",
    animal: "狐狸",
    title: "灵活应变者",
    tendency: "冷静机敏 · 接受变化",
    behavior: "遇到变化时我会先稳住情绪，再陪你比较替代方案。",
    suggestedNames: ["小狐", "灵灵", "阿橙"],
  },
};

export interface Question {
  id: string;
  dimension: AssessmentDimension;
  topic: string;
  text: string;
  options: Array<{
    label: string;
    conclusion: string;
    scores: Partial<Record<AnimalKey, number>>;
  }>;
}

export const QUESTIONS: Question[] = [
  {
    id: "Q1",
    dimension: "plan",
    topic: "计划强度",
    text: "出发前，你希望计划细到什么程度？",
    options: [
      {
        label: "时间和地点尽量提前定好",
        conclusion: "你更安心于明确的行程结构",
        scores: { elephant: 2, dog: 1 },
      },
      {
        label: "定好主线，细节当天再看",
        conclusion: "你偏好有主线也保留调整空间",
        scores: { fox: 2, panda: 1 },
      },
      {
        label: "只定必要事项，其余随缘",
        conclusion: "你希望计划保持轻量和开放",
        scores: { bird: 2, cat: 1 },
      },
    ],
  },
  {
    id: "Q2",
    dimension: "pace",
    topic: "旅行节奏",
    text: "一天怎样安排会让你最舒服？",
    options: [
      {
        label: "多看多走，行程紧凑",
        conclusion: "你享受高密度的旅行节奏",
        scores: { dolphin: 2, elephant: 1 },
      },
      {
        label: "重点体验，松紧平衡",
        conclusion: "你偏好重点明确、节奏均衡",
        scores: { dog: 1, fox: 2 },
      },
      {
        label: "少安排，多停留和休息",
        conclusion: "你更在意从容和充分体验",
        scores: { panda: 2, cat: 1 },
      },
    ],
  },
  {
    id: "Q3",
    dimension: "social",
    topic: "社交方式",
    text: "和同行人相处时，你更喜欢？",
    options: [
      {
        label: "大家多互动，一起行动",
        conclusion: "你重视共同参与和互动氛围",
        scores: { dolphin: 2, dog: 1 },
      },
      {
        label: "一起讨论，也保留个人时间",
        conclusion: "你希望同行与个人空间保持平衡",
        scores: { cat: 2, fox: 1 },
      },
      {
        label: "分头探索，需要时再集合",
        conclusion: "你珍惜独立探索的空间",
        scores: { bird: 2, cat: 1 },
      },
    ],
  },
  {
    id: "Q4",
    dimension: "risk",
    topic: "风险偏好",
    text: "计划临时变化时，你通常会？",
    options: [
      {
        label: "先确认影响，再选择稳妥方案",
        conclusion: "你倾向先控制风险再行动",
        scores: { elephant: 2, dog: 1 },
      },
      {
        label: "快速比较几个替代方案",
        conclusion: "你擅长在变化中快速调整",
        scores: { fox: 2, bird: 1 },
      },
      {
        label: "顺势改变，把意外当体验",
        conclusion: "你对不确定性更开放",
        scores: { bird: 2, dolphin: 1 },
      },
    ],
  },
  {
    id: "Q5",
    dimension: "spending",
    topic: "消费倾向",
    text: "旅行花费上，你更接近哪种方式？",
    options: [
      {
        label: "先定预算，再安排选择",
        conclusion: "你会用预算边界帮助自己做决定",
        scores: { elephant: 2, dog: 1 },
      },
      {
        label: "看重性价比，关键体验愿意花",
        conclusion: "你在性价比与重点体验之间取平衡",
        scores: { fox: 2, panda: 1 },
      },
      {
        label: "更看重体验，不设固定预算",
        conclusion: "你更愿意为当下体验保留弹性",
        scores: { dolphin: 2, bird: 1 },
      },
    ],
  },
  {
    id: "Q6",
    dimension: "motivation",
    topic: "旅行动机",
    text: "这次旅行对你最重要的是什么？",
    options: [
      {
        label: "发现新地方和新鲜事物",
        conclusion: "探索和发现是你的主要动力",
        scores: { bird: 2, cat: 1 },
      },
      {
        label: "和重要的人留下共同回忆",
        conclusion: "共同经历和连接对你更重要",
        scores: { dolphin: 2, dog: 1 },
      },
      {
        label: "休息、恢复和照顾自己",
        conclusion: "放松与恢复是你的主要期待",
        scores: { panda: 2, cat: 1 },
      },
    ],
  },
];

const TIE_BREAK_ORDER: AnimalKey[] = ["cat", "dolphin", "panda", "bird", "dog", "elephant", "fox"];

export function matchCompanion(answers: number[]) {
  const scores: Record<AnimalKey, number> = {
    cat: 0,
    dolphin: 0,
    panda: 0,
    bird: 0,
    dog: 0,
    elephant: 0,
    fox: 0,
  };

  QUESTIONS.forEach((question, index) => {
    const option = question.options[answers[index]];
    if (!option) return;
    Object.entries(option.scores).forEach(([key, value]) => {
      scores[key as AnimalKey] += value ?? 0;
    });
  });

  const ranked = TIE_BREAK_ORDER.slice().sort((a, b) => scores[b] - scores[a]);
  const primary = ranked[0];
  const secondary = ranked[1];
  const reasons: MatchReason[] = QUESTIONS.map((question, index) => {
    const option = question.options[answers[index]];
    return {
      dimension: question.dimension,
      dimensionLabel: question.topic,
      question: question.text,
      answer: option?.label ?? "未回答",
      conclusion: option?.conclusion ?? "这一维度尚未形成结论",
    };
  });

  return {
    primary,
    secondary,
    blended: scores[primary] - scores[secondary] <= 1,
    scores,
    reasons,
  };
}
