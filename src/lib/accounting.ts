import type { ExpenseItem, TravelItem } from "./app-model";

export function formatMoney(value: number) {
  return `¥${value.toFixed(2).replace(/\.00$/, "")}`;
}

export function participantNames(travel: TravelItem) {
  const named = [
    "我",
    ...travel.members.map((member) => member.name),
    ...(travel.collaboration?.members.map((member) => member.name) ?? []),
  ].filter((name, index, values) => name.trim() && values.indexOf(name) === index);
  const targetCount = Math.max(travel.peopleCount ?? 0, named.length);
  const placeholders = Array.from(
    { length: Math.max(targetCount - named.length, 0) },
    (_, index) => `同行人${index + 1}`,
  );
  return [...named, ...placeholders];
}

function sharesForExpense(expense: ExpenseItem, participants: string[]) {
  if (expense.splitMode === "personal") return [];
  if (expense.shares.length) return expense.shares;
  const amount = expense.amount / Math.max(participants.length, 1);
  return participants.map((name) => ({ name, amount }));
}

export function settlementSuggestions(travel: TravelItem, participants: string[]) {
  const balances = new Map(participants.map((name) => [name, 0]));
  travel.expenses.forEach((expense) => {
    balances.set(expense.paidBy, (balances.get(expense.paidBy) ?? 0) + expense.amount);
    sharesForExpense(expense, participants).forEach((share) => {
      balances.set(share.name, (balances.get(share.name) ?? 0) - share.amount);
    });
  });
  travel.settlements.forEach((settlement) => {
    balances.set(settlement.from, (balances.get(settlement.from) ?? 0) + settlement.amount);
    balances.set(settlement.to, (balances.get(settlement.to) ?? 0) - settlement.amount);
  });

  const debtors = [...balances.entries()]
    .filter(([, amount]) => amount < -0.01)
    .map(([name, amount]) => ({ name, amount: -amount }));
  const creditors = [...balances.entries()]
    .filter(([, amount]) => amount > 0.01)
    .map(([name, amount]) => ({ name, amount }));
  const suggestions: Array<{ from: string; to: string; amount: number }> = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);
    suggestions.push({ from: debtor.name, to: creditor.name, amount });
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount <= 0.01) debtorIndex += 1;
    if (creditor.amount <= 0.01) creditorIndex += 1;
  }
  return { balances, suggestions };
}
