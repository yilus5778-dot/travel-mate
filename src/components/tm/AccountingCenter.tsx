import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Pencil,
  Plus,
  Receipt,
  Share2,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import type {
  ExpenseCategory,
  ExpenseItem,
  ExpenseSplitMode,
  SettlementItem,
  TravelItem,
} from "@/lib/app-model";
import { formatMoney, participantNames, settlementSuggestions } from "@/lib/accounting";
import { Card, MiniShell, PrimaryButton, Tag } from "./MiniShell";

const CATEGORIES: Array<{ value: ExpenseCategory; label: string; emoji: string }> = [
  { value: "food", label: "餐饮", emoji: "🍜" },
  { value: "transport", label: "交通", emoji: "🚕" },
  { value: "hotel", label: "住宿", emoji: "🏨" },
  { value: "ticket", label: "门票", emoji: "🎫" },
  { value: "shopping", label: "购物", emoji: "🛍️" },
  { value: "other", label: "其他", emoji: "🧾" },
];

type LedgerTab = "detail" | "stats" | "settlement";

function localDateValue(value = new Date()) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function ExpenseForm({
  travel,
  participants,
  editing,
  onSave,
  onCancel,
}: {
  travel: TravelItem;
  participants: string[];
  editing: ExpenseItem | null;
  onSave: (expense: ExpenseItem) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [category, setCategory] = useState<ExpenseCategory>(editing?.category ?? "food");
  const [paidBy, setPaidBy] = useState(editing?.paidBy ?? participants[0] ?? "我");
  const [spentAt, setSpentAt] = useState(editing?.spentAt?.slice(0, 10) ?? localDateValue());
  const [note, setNote] = useState(editing?.note ?? "");
  const [splitMode, setSplitMode] = useState<ExpenseSplitMode>(editing?.splitMode ?? "equal");
  const [splitWith, setSplitWith] = useState<string[]>(
    editing?.shares.length ? editing.shares.map((share) => share.name) : participants,
  );
  const [customShares, setCustomShares] = useState<Record<string, string>>(() =>
    Object.fromEntries((editing?.shares ?? []).map((share) => [share.name, String(share.amount)])),
  );
  const [error, setError] = useState("");

  const save = () => {
    const numericAmount = Number(amount);
    if (!title.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("请填写消费名称和大于 0 的金额");
      return;
    }
    if (splitMode !== "personal" && !splitWith.length) {
      setError("请至少选择一位分摊成员");
      return;
    }

    let shares: ExpenseItem["shares"] = [];
    if (splitMode === "equal") {
      const each = Math.floor((numericAmount / splitWith.length) * 100) / 100;
      let allocated = 0;
      shares = splitWith.map((name, index) => {
        const shareAmount = index === splitWith.length - 1 ? numericAmount - allocated : each;
        allocated += shareAmount;
        return { name, amount: Number(shareAmount.toFixed(2)) };
      });
    }
    if (splitMode === "custom") {
      shares = splitWith.map((name) => ({ name, amount: Number(customShares[name] || 0) }));
      if (
        shares.some((share) => !Number.isFinite(share.amount) || share.amount < 0) ||
        Math.abs(shares.reduce((sum, share) => sum + share.amount, 0) - numericAmount) > 0.01
      ) {
        setError("自定义分摊金额之和必须等于本笔消费");
        return;
      }
    }

    const now = new Date().toISOString();
    onSave({
      id: editing?.id ?? `expense-${Date.now()}`,
      title: title.trim(),
      amount: numericAmount,
      category,
      paidBy,
      splitMode,
      shares,
      note: note.trim() || null,
      spentAt: new Date(`${spentAt}T12:00:00`).toISOString(),
      createdBy: editing?.createdBy ?? "我",
      createdAt: editing?.createdAt ?? now,
    });
  };

  return (
    <Card className="border border-accent/20">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold text-foreground">
          {editing ? "编辑消费" : "记一笔真实消费"}
        </p>
        <button onClick={onCancel} className="text-[10px] text-muted-foreground">
          取消
        </button>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_96px] gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="例如：午餐"
          className="min-w-0 rounded-[11px] bg-surface-sunk px-3 py-2.5 text-[11px] outline-none"
        />
        <input
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="金额"
          className="min-w-0 rounded-[11px] bg-surface-sunk px-3 py-2.5 text-[11px] outline-none"
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label>
          <span className="text-[9px] text-muted-foreground">付款人</span>
          <select
            value={paidBy}
            onChange={(event) => setPaidBy(event.target.value)}
            className="mt-1 w-full rounded-[11px] bg-surface-sunk px-3 py-2.5 text-[11px] outline-none"
          >
            {participants.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-[9px] text-muted-foreground">消费日期</span>
          <input
            type="date"
            value={spentAt}
            onChange={(event) => setSpentAt(event.target.value)}
            className="mt-1 w-full rounded-[11px] bg-surface-sunk px-3 py-2 text-[11px] outline-none"
          />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {CATEGORIES.map((item) => (
          <button
            type="button"
            key={item.value}
            onClick={() => setCategory(item.value)}
            className={`rounded-[10px] py-2 text-[10px] ${
              category === item.value
                ? "bg-brand-soft font-semibold text-foreground"
                : "bg-surface-sunk text-muted-foreground"
            }`}
          >
            {item.emoji} {item.label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <p className="text-[9px] text-muted-foreground">分摊方式</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {(
            [
              ["equal", "平均分摊"],
              ["custom", "自定义"],
              ["personal", "不计入AA"],
            ] as Array<[ExpenseSplitMode, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSplitMode(value)}
              className={`rounded-[10px] py-2 text-[9px] ${
                splitMode === value
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-sunk text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {splitMode !== "personal" && (
        <div className="mt-3 space-y-2 rounded-[13px] bg-surface-sunk p-3">
          <p className="text-[9px] text-muted-foreground">参与分摊</p>
          {participants.map((name) => {
            const checked = splitWith.includes(name);
            return (
              <div key={name} className="flex items-center gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 text-[10px] text-foreground">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSplitWith((current) =>
                        checked ? current.filter((item) => item !== name) : [...current, name],
                      )
                    }
                    className="size-3.5 accent-[var(--accent)]"
                  />
                  <span className="truncate">{name}</span>
                </label>
                {splitMode === "custom" && checked && (
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={customShares[name] ?? ""}
                    onChange={(event) =>
                      setCustomShares((current) => ({
                        ...current,
                        [name]: event.target.value,
                      }))
                    }
                    placeholder="金额"
                    className="w-20 rounded-[9px] bg-card px-2 py-1.5 text-[10px] outline-none"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder="备注（可选）"
        className="mt-3 w-full resize-none rounded-[11px] bg-surface-sunk p-3 text-[10px] outline-none"
      />
      {error && <p className="mt-2 text-[10px] text-destructive">{error}</p>}
      <button
        type="button"
        onClick={save}
        className="mt-3 w-full rounded-[11px] bg-primary py-2.5 text-[11px] font-semibold text-primary-foreground"
      >
        {editing ? "保存修改" : "保存这笔消费"}
      </button>
    </Card>
  );
}

export function AccountingCenter({
  travel,
  onUpdate,
  onBack,
  onShare,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
  onBack: () => void;
  onShare?: (travel: TravelItem) => void;
}) {
  const [tab, setTab] = useState<LedgerTab>("detail");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState(travel.budget ? String(travel.budget) : "");
  const participants = useMemo(() => participantNames(travel), [travel]);
  const total = travel.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = travel.budget === null ? null : travel.budget - total;
  const categoryTotals = CATEGORIES.map((category) => ({
    ...category,
    amount: travel.expenses
      .filter((expense) => expense.category === category.value)
      .reduce((sum, expense) => sum + expense.amount, 0),
  })).filter((category) => category.amount > 0);
  const payerTotals = participants
    .map((name) => ({
      name,
      amount: travel.expenses
        .filter((expense) => expense.paidBy === name)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .filter((payer) => payer.amount > 0);
  const { balances, suggestions } = settlementSuggestions(travel, participants);
  const editing = travel.expenses.find((expense) => expense.id === editingId) ?? null;

  const update = (patch: Partial<TravelItem>) =>
    onUpdate({ ...travel, ...patch, updatedAt: new Date().toISOString() });

  const saveExpense = (expense: ExpenseItem) => {
    update({
      expenses: editing
        ? travel.expenses.map((item) => (item.id === expense.id ? expense : item))
        : [expense, ...travel.expenses],
    });
    setShowForm(false);
    setEditingId(null);
  };

  const settle = (item: { from: string; to: string; amount: number }) => {
    const settlement: SettlementItem = {
      id: `settlement-${Date.now()}`,
      ...item,
      amount: Number(item.amount.toFixed(2)),
      settledAt: new Date().toISOString(),
    };
    update({ settlements: [settlement, ...travel.settlements] });
  };

  return (
    <MiniShell title="旅行账本" onBack={onBack} showTabBar={false}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        <Card className="relative overflow-hidden bg-brand-soft">
          <div className="absolute -right-12 -top-14 size-40 rounded-full bg-card/45" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <Tag tone="accent">共同账本</Tag>
              <span className="text-[9px] text-muted-foreground">
                {travel.collaboration ? "协作成员实时同步" : "仅当前旅行可见"}
              </span>
            </div>
            <p className="mt-4 text-[10px] text-muted-foreground">当前总支出</p>
            <p className="mt-1 text-[28px] font-bold text-foreground">{formatMoney(total)}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditingBudget(true)}
                className="rounded-[13px] bg-card/75 p-3 text-left"
              >
                <Wallet className="size-4 text-accent" />
                <p className="mt-2 text-[9px] text-muted-foreground">旅行预算</p>
                <p className="mt-0.5 text-[13px] font-bold text-foreground">
                  {travel.budget === null ? "待设置" : formatMoney(travel.budget)}
                </p>
              </button>
              <div className="rounded-[13px] bg-card/75 p-3">
                {remaining === null || remaining >= 0 ? (
                  <ArrowDownLeft className="size-4 text-accent" />
                ) : (
                  <ArrowUpRight className="size-4 text-destructive" />
                )}
                <p className="mt-2 text-[9px] text-muted-foreground">
                  {remaining === null ? "预算余量" : remaining >= 0 ? "剩余预算" : "已超预算"}
                </p>
                <p
                  className={`mt-0.5 text-[13px] font-bold ${
                    remaining !== null && remaining < 0 ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {remaining === null ? "待设置" : formatMoney(Math.abs(remaining))}
                </p>
              </div>
            </div>
            {travel.budget !== null && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-card/70">
                <div
                  className={`h-full rounded-full ${total > travel.budget ? "bg-destructive" : "bg-accent"}`}
                  style={{ width: `${Math.min((total / Math.max(travel.budget, 1)) * 100, 100)}%` }}
                />
              </div>
            )}
            {onShare && (
              <button
                type="button"
                onClick={() => onShare(travel)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 border-t border-card/80 pt-3 text-[11px] font-semibold text-foreground"
              >
                <Share2 className="size-3.5 text-accent" />
                分享账本到群
              </button>
            )}
          </div>
        </Card>

        {editingBudget && (
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-foreground">设置旅行总预算</p>
              <button
                onClick={() => setEditingBudget(false)}
                className="text-[10px] text-muted-foreground"
              >
                取消
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="number"
                min={0}
                value={budgetValue}
                onChange={(event) => setBudgetValue(event.target.value)}
                placeholder="未确定"
                className="min-w-0 flex-1 rounded-[11px] bg-surface-sunk px-3 py-2.5 text-[11px] outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  update({ budget: budgetValue ? Number(budgetValue) : null });
                  setEditingBudget(false);
                }}
                className="rounded-[11px] bg-primary px-4 text-[11px] font-semibold text-primary-foreground"
              >
                保存
              </button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-2 rounded-[15px] bg-card p-1 shadow-[var(--shadow-card)]">
          {(
            [
              ["detail", "明细", Receipt],
              ["stats", "统计", BarChart3],
              ["settlement", "AA结算", Users],
            ] as Array<[LedgerTab, string, typeof Receipt]>
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`flex items-center justify-center gap-1 rounded-[11px] py-2 text-[10px] ${
                tab === value
                  ? "bg-brand-soft font-semibold text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>

        {tab === "detail" && (
          <>
            {!showForm && (
              <PrimaryButton
                onClick={() => {
                  setEditingId(null);
                  setShowForm(true);
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Plus className="size-4" /> 记一笔
                </span>
              </PrimaryButton>
            )}
            {showForm && (
              <ExpenseForm
                key={editing?.id ?? "new-expense"}
                travel={travel}
                participants={participants}
                editing={editing}
                onSave={saveExpense}
                onCancel={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              />
            )}
            {travel.expenses.length ? (
              <div className="space-y-2">
                {travel.expenses.map((expense) => {
                  const category = CATEGORIES.find((item) => item.value === expense.category)!;
                  return (
                    <Card key={expense.id} className="!p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-surface-sunk text-lg">
                          {category.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold text-foreground">
                            {expense.title}
                          </p>
                          <p className="mt-0.5 text-[9px] text-muted-foreground">
                            {expense.spentAt.slice(5, 10).replace("-", "/")} · {expense.paidBy}支付
                            · {category.label}
                          </p>
                        </div>
                        <p className="text-[13px] font-bold text-foreground">
                          {formatMoney(expense.amount)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                        <p className="text-[9px] text-muted-foreground">
                          {expense.splitMode === "personal"
                            ? "不计入 AA"
                            : expense.splitMode === "custom"
                              ? `自定义分摊 · ${expense.shares.length} 人`
                              : `平均分摊 · ${expense.shares.length} 人`}
                        </p>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(expense.id);
                              setShowForm(true);
                            }}
                            aria-label={`编辑 ${expense.title}`}
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              update({
                                expenses: travel.expenses.filter((item) => item.id !== expense.id),
                              })
                            }
                            aria-label={`删除 ${expense.title}`}
                          >
                            <Trash2 className="size-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="text-center">
                <CircleDollarSign className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-2 text-[12px] font-semibold text-foreground">还没有费用记录</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  记录第一笔真实消费后，统计和 AA 结算才会开始计算。
                </p>
              </Card>
            )}
          </>
        )}

        {tab === "stats" && (
          <div className="space-y-3">
            <Card>
              <p className="text-[13px] font-semibold text-foreground">分类支出</p>
              {categoryTotals.length ? (
                <div className="mt-4 space-y-3">
                  {categoryTotals.map((category) => (
                    <div key={category.value}>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-foreground">
                          {category.emoji} {category.label}
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatMoney(category.amount)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunk">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${total ? (category.amount / total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[10px] text-muted-foreground">暂无可统计的消费。</p>
              )}
            </Card>
            <Card>
              <p className="text-[13px] font-semibold text-foreground">付款人统计</p>
              {payerTotals.length ? (
                <div className="mt-3 space-y-2">
                  {payerTotals.map((payer) => (
                    <div
                      key={payer.name}
                      className="flex items-center justify-between rounded-[11px] bg-surface-sunk p-3"
                    >
                      <span className="text-[10px] text-foreground">{payer.name}</span>
                      <span className="text-[11px] font-semibold text-foreground">
                        {formatMoney(payer.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[10px] text-muted-foreground">暂无付款记录。</p>
              )}
            </Card>
          </div>
        )}

        {tab === "settlement" && (
          <div className="space-y-3">
            <Card>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-foreground">成员收支</p>
                <Tag>{participants.length} 人</Tag>
              </div>
              <div className="mt-3 space-y-2">
                {participants.map((name) => {
                  const balance = balances.get(name) ?? 0;
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-[11px] bg-surface-sunk p-3"
                    >
                      <span className="text-[10px] font-medium text-foreground">{name}</span>
                      <span
                        className={`text-[10px] font-semibold ${
                          balance > 0.01
                            ? "text-accent"
                            : balance < -0.01
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }`}
                      >
                        {balance > 0.01
                          ? `应收 ${formatMoney(balance)}`
                          : balance < -0.01
                            ? `应付 ${formatMoney(-balance)}`
                            : "已平衡"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <p className="text-[13px] font-semibold text-foreground">最少转账方案</p>
              {suggestions.length ? (
                <div className="mt-3 space-y-2">
                  {suggestions.map((item, index) => (
                    <div
                      key={`${item.from}-${item.to}-${index}`}
                      className="rounded-[13px] border border-accent/20 bg-accent-soft p-3"
                    >
                      <p className="text-[11px] font-semibold text-foreground">
                        {item.from} → {item.to}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[15px] font-bold text-accent">
                          {formatMoney(item.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => settle(item)}
                          className="rounded-full bg-card px-3 py-1.5 text-[9px] font-semibold text-foreground"
                        >
                          标记已结清
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-[13px] bg-surface-sunk p-4 text-center">
                  <CheckCircle2 className="mx-auto size-5 text-accent" />
                  <p className="mt-2 text-[11px] font-semibold text-foreground">
                    {travel.expenses.length ? "当前账目已结清" : "有消费后再计算结算"}
                  </p>
                </div>
              )}
            </Card>
            {travel.settlements.length > 0 && (
              <Card>
                <p className="text-[13px] font-semibold text-foreground">结算记录</p>
                <div className="mt-3 space-y-2">
                  {travel.settlements.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-[11px] bg-surface-sunk p-3"
                    >
                      <div>
                        <p className="text-[10px] font-medium text-foreground">
                          {item.from} → {item.to}
                        </p>
                        <p className="mt-0.5 text-[9px] text-muted-foreground">
                          {item.settledAt.slice(0, 10)}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-foreground">
                        {formatMoney(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        <p className="text-center text-[9px] leading-relaxed text-muted-foreground">
          所有金额都来自真实录入；travelmate 不会自动补造消费或付款记录。
        </p>
      </div>
    </MiniShell>
  );
}
