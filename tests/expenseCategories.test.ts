import { describe, expect, it } from 'vitest';
import { TransactionType } from '../src/core/types';
import {
  buildExpenseCategoryList,
  DEFAULT_EXPENSE_CATEGORIES,
  deleteCustomExpenseCategory,
  readStoredExpenseCategories,
  resolveExpenseCategory,
  resolveExpenseCategoryId,
  saveCustomExpenseCategory,
} from '../src/features/finance/utils/expenseCategories';

describe('expense category helpers', () => {
  it('resolves structured expense categories before legacy description prefixes', () => {
    const category = resolveExpenseCategory({
      type: TransactionType.EXPENSE,
      category: 'expense:fuel',
      description: 'Some note',
    }, DEFAULT_EXPENSE_CATEGORIES);

    expect(category?.label).toBe('Benzin');
    expect(resolveExpenseCategoryId({
      type: TransactionType.EXPENSE,
      category: 'expense:fuel',
      description: 'Some note',
    }, DEFAULT_EXPENSE_CATEGORIES)).toBe('expense:fuel');
  });

  it('keeps old rows readable through the description prefix fallback', () => {
    const category = resolveExpenseCategory({
      type: TransactionType.EXPENSE,
      description: "Ta'mirlash moy almashtirish",
    }, DEFAULT_EXPENSE_CATEGORIES);

    expect(category?.id).toBe('expense:repair');
  });

  it('builds options from saved custom categories and transaction rows', () => {
    const custom = { id: 'custom:yuvish', label: 'Yuvish', icon: '🧽', custom: true };
    const categories = buildExpenseCategoryList([
      {
        id: 'tx-1',
        amount: 1000,
        type: TransactionType.EXPENSE,
        category: 'custom:moy',
        description: 'Moy',
        timestamp: Date.now(),
      },
    ], [custom]);

    expect(categories.some(category => category.id === 'custom:yuvish' && category.label === 'Yuvish')).toBe(true);
    expect(categories.some(category => category.id === 'custom:moy' && category.label === 'Moy')).toBe(true);
  });

  it('deduplicates saved custom categories by label', () => {
    const scope = `test-${Date.now()}`;
    const first = saveCustomExpenseCategory(scope, 'Yuvish', '🧽');
    const second = saveCustomExpenseCategory(scope, ' yuvish ', '📦');

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.category.id).toBe(first.category.id);
  });

  it('removes saved custom categories without touching defaults', () => {
    const scope = `test-delete-${Date.now()}`;
    const saved = saveCustomExpenseCategory(scope, 'Yuvish', '🧽');
    const afterDelete = deleteCustomExpenseCategory(scope, saved.category.id);

    expect(afterDelete.some(category => category.id === saved.category.id)).toBe(false);
    expect(readStoredExpenseCategories(scope)).toHaveLength(0);

    deleteCustomExpenseCategory(scope, DEFAULT_EXPENSE_CATEGORIES[0].id);
    expect(readStoredExpenseCategories(scope)).toHaveLength(0);
  });
});
