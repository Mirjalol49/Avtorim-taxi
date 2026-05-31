import { Transaction, TransactionType } from '../../../core/types';

export interface ExpenseCategoryDefinition {
    id: string;
    label: string;
    icon: string;
    tKey?: string;
    custom?: boolean;
}

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryDefinition[] = [
    { id: 'expense:fuel', icon: '⛽', label: 'Benzin', tKey: 'catFuel' },
    { id: 'expense:parts', icon: '🔧', label: 'Ehtiyot qism', tKey: 'catParts' },
    { id: 'expense:repair', icon: '🔩', label: "Ta'mirlash", tKey: 'catRepair' },
    { id: 'expense:fine', icon: '🚨', label: 'Jarima', tKey: 'catFine' },
    { id: 'expense:utility', icon: '💡', label: 'Kommunal', tKey: 'catUtility' },
    { id: 'expense:rent', icon: '🏢', label: 'Ijara', tKey: 'catRent' },
    { id: 'expense:purchase', icon: '🛒', label: 'Xarid', tKey: 'catPurchase' },
    { id: 'expense:other', icon: '📝', label: 'Boshqa', tKey: 'catOther' },
];

export const CUSTOM_EXPENSE_CATEGORY_EVENT = 'avtorim:expense-categories-updated';

const CUSTOM_CATEGORY_STORAGE_PREFIX = 'avtorim_expense_categories';
const memoryStore = new Map<string, ExpenseCategoryDefinition[]>();

const isInternalCategory = (category?: string) =>
    !category ||
    category === 'deposit_topup' ||
    category === 'DEPOSIT' ||
    category === 'salary_payment' ||
    category === 'ledger_config';

const getBrowserAccountScope = () => {
    if (typeof window === 'undefined') return 'global';
    try {
        const role = window.localStorage.getItem('avtorim_role');
        const viewer = JSON.parse(window.localStorage.getItem('avtorim_viewer_profile') || 'null');
        const viewerFleetId = viewer?.fleet_id || viewer?.created_by;
        if (role === 'viewer' && viewerFleetId) return `fleet:${viewerFleetId}`;

        const admin = JSON.parse(window.localStorage.getItem('avtorim_admin_user') || 'null');
        if (admin?.id) return `admin:${admin.id}`;
        if (viewerFleetId) return `fleet:${viewerFleetId}`;
    } catch {
        // fall through to a stable browser-local namespace
    }
    return 'global';
};

const normalizeScope = (scope?: string) => scope?.trim() || getBrowserAccountScope();

export const getExpenseCategoryStorageKey = (scope?: string) =>
    `${CUSTOM_CATEGORY_STORAGE_PREFIX}:${normalizeScope(scope)}`;

export const slugifyExpenseCategory = (label: string) =>
    label
        .trim()
        .toLowerCase()
        .replace(/['’`]/g, '')
        .replace(/[^a-z0-9\u0400-\u04ff]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'custom';

const normalizeCustomCategory = (value: unknown): ExpenseCategoryDefinition | null => {
    if (!value || typeof value !== 'object') return null;
    const row = value as Partial<ExpenseCategoryDefinition>;
    const label = String(row.label ?? '').trim();
    if (!label) return null;
    return {
        id: String(row.id || `custom:${slugifyExpenseCategory(label)}`),
        label,
        icon: String(row.icon || '📦'),
        custom: true,
    };
};

export const readStoredExpenseCategories = (scope?: string): ExpenseCategoryDefinition[] => {
    const key = getExpenseCategoryStorageKey(scope);
    if (typeof window === 'undefined') return memoryStore.get(key) ?? [];
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(normalizeCustomCategory)
            .filter((item): item is ExpenseCategoryDefinition => Boolean(item));
    } catch {
        return [];
    }
};

const writeStoredExpenseCategories = (scope: string | undefined, categories: ExpenseCategoryDefinition[]) => {
    const key = getExpenseCategoryStorageKey(scope);
    if (typeof window === 'undefined') {
        memoryStore.set(key, categories);
        return;
    }
    window.localStorage.setItem(key, JSON.stringify(categories));
    window.dispatchEvent(new CustomEvent(CUSTOM_EXPENSE_CATEGORY_EVENT, { detail: { scope: normalizeScope(scope) } }));
};

export const saveCustomExpenseCategory = (
    scope: string | undefined,
    label: string,
    icon = '📦',
): { category: ExpenseCategoryDefinition; categories: ExpenseCategoryDefinition[]; created: boolean } => {
    const cleanLabel = label.trim();
    if (!cleanLabel) throw new Error('Category label is required');

    const current = readStoredExpenseCategories(scope);
    const existing = [...DEFAULT_EXPENSE_CATEGORIES, ...current].find(
        category => category.label.trim().toLowerCase() === cleanLabel.toLowerCase(),
    );
    if (existing) return { category: existing, categories: current, created: false };

    const category: ExpenseCategoryDefinition = {
        id: `custom:${slugifyExpenseCategory(cleanLabel)}`,
        label: cleanLabel,
        icon,
        custom: true,
    };
    const next = [...current, category];
    writeStoredExpenseCategories(scope, next);
    return { category, categories: next, created: true };
};

export const deleteCustomExpenseCategory = (
    scope: string | undefined,
    categoryId: string,
): ExpenseCategoryDefinition[] => {
    if (!categoryId.startsWith('custom:')) return readStoredExpenseCategories(scope);

    const next = readStoredExpenseCategories(scope).filter(category => category.id !== categoryId);
    writeStoredExpenseCategories(scope, next);
    return next;
};

export const isLegacyDescriptionCategoryMatch = (description: string, categoryLabel: string) =>
    description === categoryLabel ||
    description.startsWith(`${categoryLabel} `) ||
    description.startsWith(`${categoryLabel},`) ||
    description.startsWith(`${categoryLabel}:`);

const labelFromStoredCategoryId = (id: string) =>
    id
        .replace(/^custom:/, '')
        .replace(/^expense:/, '')
        .split('-')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Boshqa';

export const buildExpenseCategoryList = (
    transactions: Transaction[] = [],
    storedCategories: ExpenseCategoryDefinition[] = [],
): ExpenseCategoryDefinition[] => {
    const byId = new Map<string, ExpenseCategoryDefinition>();
    [...DEFAULT_EXPENSE_CATEGORIES, ...storedCategories].forEach(category => byId.set(category.id, category));

    transactions.forEach(tx => {
        if (tx.type !== TransactionType.EXPENSE || isInternalCategory(tx.category)) return;
        if (byId.has(tx.category!)) return;

        byId.set(tx.category!, {
            id: tx.category!,
            label: labelFromStoredCategoryId(tx.category!),
            icon: '📦',
            custom: true,
        });
    });

    return Array.from(byId.values());
};

export const resolveExpenseCategory = (
    tx: Pick<Transaction, 'type' | 'category' | 'description'>,
    categories: ExpenseCategoryDefinition[] = DEFAULT_EXPENSE_CATEGORIES,
): ExpenseCategoryDefinition | null => {
    if (tx.type !== TransactionType.EXPENSE) return null;

    if (!isInternalCategory(tx.category)) {
        const byId = categories.find(category => category.id === tx.category);
        if (byId) return byId;

        return {
            id: tx.category!,
            label: labelFromStoredCategoryId(tx.category!),
            icon: '📦',
            custom: true,
        };
    }

    const description = tx.description?.trim() ?? '';
    return categories.find(category => isLegacyDescriptionCategoryMatch(description, category.label)) ?? null;
};

export const resolveExpenseCategoryId = (
    tx: Pick<Transaction, 'type' | 'category' | 'description'>,
    categories: ExpenseCategoryDefinition[] = DEFAULT_EXPENSE_CATEGORIES,
) => resolveExpenseCategory(tx, categories)?.id ?? null;
