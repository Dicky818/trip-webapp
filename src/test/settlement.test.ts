import { describe, it, expect } from 'vitest';

// We need to extract calcSettlement for testing. Since it's not exported,
// we'll re-implement the same algorithm here and test it.
// In a real refactor, this would be extracted to a shared utility.

interface Expense {
  Expense_ID: string;
  Trip_ID: string;
  Date: string;
  Main_Category: string;
  Sub_Category: string;
  Note: string;
  Original_Amount: string | number;
  Currency: string;
  Exchange_Rate: string | number;
  Base_Amount: string | number;
  Payer: string;
  Splitters: string;
  Is_Settled?: string | boolean;
  Created_At: string;
  Updated_At: string;
}

interface Settlement {
  totalBase: number;
  categoryStats: Record<string, number>;
  memberBalances: Record<string, number>;
  memberPaid: Record<string, number>;
  memberOwed: Record<string, number>;
  settlements: Array<{ from: string; to: string; amount: number }>;
  rawDebts: Record<string, Record<string, number>>;
}

// Exact copy of the calcSettlement function from supabaseApi.ts
function calcSettlement(expenses: Expense[], members: string[]): Settlement {
  const totalBase = expenses.reduce((s, e) => s + Number(e.Base_Amount || 0), 0);
  const categoryStats: Record<string, number> = {};
  const memberPaid: Record<string, number> = {};
  const memberOwed: Record<string, number> = {};

  members.forEach(m => { memberPaid[m] = 0; memberOwed[m] = 0; });

  const rawDebts: Record<string, Record<string, number>> = {};
  const initRaw = (a: string, b: string) => {
    if (!rawDebts[a]) rawDebts[a] = {};
    if (!rawDebts[a][b]) rawDebts[a][b] = 0;
  };

  expenses.forEach(e => {
    const cat = e.Main_Category || '其他';
    categoryStats[cat] = (categoryStats[cat] || 0) + Number(e.Base_Amount || 0);

    const payer = e.Payer;
    const amt = Number(e.Base_Amount || 0);
    if (payer) memberPaid[payer] = (memberPaid[payer] || 0) + amt;

    const splitterList = e.Splitters
      ? e.Splitters.split(',').map(s => s.trim()).filter(Boolean)
      : members;
    const share = splitterList.length > 0 ? amt / splitterList.length : 0;
    splitterList.forEach(m => {
      memberOwed[m] = (memberOwed[m] || 0) + share;
      if (payer && m !== payer) {
        initRaw(m, payer);
        rawDebts[m][payer] += share;
      }
    });
  });

  const memberBalances: Record<string, number> = {};
  const allMembers = new Set([...Object.keys(memberPaid), ...Object.keys(memberOwed)]);
  allMembers.forEach(m => {
    memberBalances[m] = (memberPaid[m] || 0) - (memberOwed[m] || 0);
  });

  const settlements: Array<{ from: string; to: string; amount: number }> = [];
  const bal = { ...memberBalances };
  const debtors = Object.entries(bal).filter(([, v]) => v < -0.01).sort((a, b) => a[1] - b[1]);
  const creditors = Object.entries(bal).filter(([, v]) => v > 0.01).sort((a, b) => b[1] - a[1]);

  let di = 0, ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const [debtor, dAmt] = debtors[di];
    const [creditor, cAmt] = creditors[ci];
    const transfer = Math.min(-dAmt, cAmt);
    if (transfer > 0.01) {
      settlements.push({ from: debtor, to: creditor, amount: Math.round(transfer * 100) / 100 });
    }
    debtors[di][1] += transfer;
    creditors[ci][1] -= transfer;
    if (Math.abs(debtors[di][1]) < 0.01) di++;
    if (Math.abs(creditors[ci][1]) < 0.01) ci++;
  }

  return { totalBase, categoryStats, memberBalances, memberPaid, memberOwed, settlements, rawDebts };
}

// Helper to create a minimal expense object
function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    Expense_ID: 'exp-1',
    Trip_ID: 'trip-1',
    Date: '2026-07-01',
    Main_Category: '餐飲',
    Sub_Category: '午餐',
    Note: '',
    Original_Amount: 1000,
    Currency: 'JPY',
    Exchange_Rate: 1,
    Base_Amount: 1000,
    Payer: 'Alice',
    Splitters: '',
    Created_At: '2026-07-01',
    Updated_At: '2026-07-01',
    ...overrides,
  };
}

describe('calcSettlement', () => {
  it('should return zero totals for empty expenses', () => {
    const result = calcSettlement([], ['Alice', 'Bob']);
    expect(result.totalBase).toBe(0);
    expect(result.settlements).toHaveLength(0);
    expect(result.memberPaid['Alice']).toBe(0);
    expect(result.memberPaid['Bob']).toBe(0);
  });

  it('should calculate even split between 2 members', () => {
    const expenses = [
      makeExpense({ Base_Amount: 1000, Payer: 'Alice', Splitters: 'Alice, Bob' }),
    ];
    const result = calcSettlement(expenses, ['Alice', 'Bob']);

    expect(result.totalBase).toBe(1000);
    expect(result.memberPaid['Alice']).toBe(1000);
    expect(result.memberOwed['Alice']).toBe(500);
    expect(result.memberOwed['Bob']).toBe(500);
    expect(result.memberBalances['Alice']).toBe(500);  // paid 1000, owes 500
    expect(result.memberBalances['Bob']).toBe(-500);   // paid 0, owes 500

    expect(result.settlements).toHaveLength(1);
    expect(result.settlements[0]).toEqual({ from: 'Bob', to: 'Alice', amount: 500 });
  });

  it('should handle 3-way split correctly', () => {
    const expenses = [
      makeExpense({ Base_Amount: 900, Payer: 'Alice', Splitters: 'Alice, Bob, Charlie' }),
    ];
    const result = calcSettlement(expenses, ['Alice', 'Bob', 'Charlie']);

    expect(result.memberOwed['Alice']).toBe(300);
    expect(result.memberOwed['Bob']).toBe(300);
    expect(result.memberOwed['Charlie']).toBe(300);
    expect(result.memberBalances['Alice']).toBe(600);  // paid 900, owes 300
    expect(result.memberBalances['Bob']).toBe(-300);
    expect(result.memberBalances['Charlie']).toBe(-300);

    // Bob and Charlie each owe Alice 300
    const totalOwedToAlice = result.settlements
      .filter(s => s.to === 'Alice')
      .reduce((sum, s) => sum + s.amount, 0);
    expect(totalOwedToAlice).toBe(600);
  });

  it('should handle multiple payers and minimize transfers', () => {
    const expenses = [
      makeExpense({ Expense_ID: 'e1', Base_Amount: 600, Payer: 'Alice', Splitters: 'Alice, Bob, Charlie' }),
      makeExpense({ Expense_ID: 'e2', Base_Amount: 300, Payer: 'Bob', Splitters: 'Alice, Bob, Charlie' }),
    ];
    const result = calcSettlement(expenses, ['Alice', 'Bob', 'Charlie']);

    // Alice paid 600, owes 300 → balance +300
    // Bob paid 300, owes 300 → balance 0
    // Charlie paid 0, owes 300 → balance -300
    expect(result.memberBalances['Alice']).toBe(300);
    expect(result.memberBalances['Bob']).toBe(0);
    expect(result.memberBalances['Charlie']).toBe(-300);

    // Only one transfer needed: Charlie → Alice 300
    expect(result.settlements).toHaveLength(1);
    expect(result.settlements[0]).toEqual({ from: 'Charlie', to: 'Alice', amount: 300 });
  });

  it('should default to all members when Splitters is empty', () => {
    const expenses = [
      makeExpense({ Base_Amount: 400, Payer: 'Alice', Splitters: '' }),
    ];
    const result = calcSettlement(expenses, ['Alice', 'Bob']);

    // Split evenly among all members (Alice, Bob)
    expect(result.memberOwed['Alice']).toBe(200);
    expect(result.memberOwed['Bob']).toBe(200);
  });

  it('should handle category statistics correctly', () => {
    const expenses = [
      makeExpense({ Expense_ID: 'e1', Base_Amount: 500, Main_Category: '餐飲' }),
      makeExpense({ Expense_ID: 'e2', Base_Amount: 300, Main_Category: '交通' }),
      makeExpense({ Expense_ID: 'e3', Base_Amount: 200, Main_Category: '餐飲' }),
    ];
    const result = calcSettlement(expenses, ['Alice', 'Bob']);

    expect(result.categoryStats['餐飲']).toBe(700);
    expect(result.categoryStats['交通']).toBe(300);
    expect(result.totalBase).toBe(1000);
  });

  it('should track raw debts correctly', () => {
    const expenses = [
      makeExpense({ Base_Amount: 600, Payer: 'Alice', Splitters: 'Alice, Bob, Charlie' }),
    ];
    const result = calcSettlement(expenses, ['Alice', 'Bob', 'Charlie']);

    // Bob owes Alice 200, Charlie owes Alice 200
    expect(result.rawDebts['Bob']['Alice']).toBe(200);
    expect(result.rawDebts['Charlie']['Alice']).toBe(200);
    // Alice doesn't owe anyone
    expect(result.rawDebts['Alice']).toBeUndefined();
  });

  it('should handle rounding correctly', () => {
    const expenses = [
      makeExpense({ Base_Amount: 100, Payer: 'Alice', Splitters: 'Alice, Bob, Charlie' }),
    ];
    const result = calcSettlement(expenses, ['Alice', 'Bob', 'Charlie']);

    // 100 / 3 = 33.333...
    // Settlements should be rounded to 2 decimal places
    result.settlements.forEach(s => {
      const decimals = s.amount.toString().split('.')[1]?.length || 0;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });

  it('should handle single member (no settlements needed)', () => {
    const expenses = [
      makeExpense({ Base_Amount: 1000, Payer: 'Alice', Splitters: 'Alice' }),
    ];
    const result = calcSettlement(expenses, ['Alice']);

    expect(result.settlements).toHaveLength(0);
    expect(result.memberBalances['Alice']).toBe(0); // paid 1000, owes 1000
  });
});
