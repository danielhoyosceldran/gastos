import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Cross2Icon } from '@radix-ui/react-icons';
import { expensesService } from '../../services/supabase/expenses.service';
import type { Expense, CreateExpenseDTO, ExpenseType } from '../../types/expense.types';
import { ExpenseForm } from './ExpenseForm';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { toast } from '../../store/toast.store';
import { useAuthStore } from '../../store/auth.store';
import { useExpenseFormData } from '../../hooks/useExpenseFormData';
import { formatCurrency, formatDate } from '../../lib/format';
import { displayName } from '../../lib/displayName';
import './ExpensesPage.scss';

interface Filters {
  type: ExpenseType | '';
  categoryId: string;
  tagId: string;
  paymentMethodId: string;
  eventId: string;
  projectId: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: Filters = {
  type: '', categoryId: '', tagId: '', paymentMethodId: '',
  eventId: '', projectId: '', dateFrom: '', dateTo: '',
};

function hasActiveFilters(f: Filters) {
  return Object.values(f).some((v) => v !== '');
}

const PAGE_SIZE = 100;

export function ExpensesPage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const fd = useExpenseFormData();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await expensesService.getPage(PAGE_SIZE, 0);
      setExpenses(page);
      setHasMore(page.length === PAGE_SIZE);
    } catch { toast.error(t('common.error_load')); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const page = await expensesService.getPage(PAGE_SIZE, expenses.length);
      setExpenses((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...page.filter((e) => !seen.has(e.id))];
      });
      setHasMore(page.length === PAGE_SIZE);
    } catch { toast.error(t('common.error_load')); }
    finally { setLoadingMore(false); }
  }, [expenses.length, t]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const filtered = useMemo(() => {
    return expenses.filter((exp) => {
      if (filters.type && exp.type !== filters.type) return false;
      if (filters.categoryId && exp.category_id !== filters.categoryId) return false;
      if (filters.tagId && !exp.tag_ids.includes(filters.tagId)) return false;
      if (filters.paymentMethodId && exp.payment_method_id !== filters.paymentMethodId) return false;
      if (filters.eventId && exp.event_id !== filters.eventId) return false;
      if (filters.projectId && exp.project_id !== filters.projectId) return false;
      if (filters.dateFrom && exp.date < filters.dateFrom) return false;
      if (filters.dateTo && exp.date > filters.dateTo) return false;
      return true;
    });
  }, [expenses, filters]);

  function openAdd() { setEditTarget(null); setFormOpen(true); }
  function openEdit(e: Expense) { setEditTarget(e); setFormOpen(true); }

  async function handleSave(dto: CreateExpenseDTO, id?: string) {
    setSaving(true);
    try {
      if (id) {
        const updated = await expensesService.update(id, dto);
        setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
      } else {
        const created = await expensesService.create(dto);
        setExpenses((prev) => [created, ...prev]);
      }
      toast.success(t('common.saved'));
      setFormOpen(false);
    } catch { toast.error(t('common.error_save')); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await expensesService.delete(deleteTarget.id);
      setExpenses((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      toast.success(t('common.deleted'));
      setDeleteTarget(null);
    } catch { toast.error(t('common.error_delete')); }
    finally { setDeleteLoading(false); }
  }

  const lang = profile?.language ?? 'en';
  const active = hasActiveFilters(filters);

  function catName(id: string | null) {
    if (!id) return null;
    const cat = fd.categories.find((c) => c.id === id);
    if (!cat) return null;
    return displayName(cat, t);
  }

  function pmName(pm: { name: string; is_default: boolean }) {
    return displayName(pm, t);
  }

  function amountColor(type: ExpenseType) {
    if (type === 'income') return 'var(--toast-success-text)';
    if (type === 'refund') return 'var(--toast-warning-text)';
    return 'var(--text-primary)';
  }

  function amountSign(type: ExpenseType) {
    return type === 'income' ? '+' : type === 'refund' ? '±' : '-';
  }

  const sortedCats = [...fd.categories].sort((a, b) => a.position - b.position);
  const sortedPm = [...fd.paymentMethods].sort((a, b) => a.position - b.position);
  const sortedTags = [...fd.tags].sort((a, b) => a.position - b.position);

  return (
    <div className="expenses-page">
      <div className="expenses-page__header">
        <h1 className="expenses-page__title">{t('nav.expenses')}</h1>
        <div className="expenses-page__header-actions">
          <button
            className={`btn btn--ghost btn--sm${active ? ' expenses-page__filter-btn--active' : ''}`}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            {t('expenses.filters')}{active ? ` (${Object.values(filters).filter(Boolean).length})` : ''}
          </button>
          <button className="btn btn--primary btn--sm" onClick={openAdd}>{t('expenses.add')}</button>
        </div>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="expenses-filters">
          <div className="expenses-filters__grid">
            <div className="field">
              <label className="field__label">{t('expenses.type')}</label>
              <select className="field__select" value={filters.type} onChange={(e) => setFilter('type', e.target.value as ExpenseType | '')}>
                <option value="">{t('expenses.all_types')}</option>
                <option value="expense">{t('expenses.type_expense')}</option>
                <option value="income">{t('expenses.type_income')}</option>
                <option value="refund">{t('expenses.type_refund')}</option>
              </select>
            </div>

            <div className="field">
              <label className="field__label">{t('settings_nav.categories')}</label>
              <select className="field__select" value={filters.categoryId} onChange={(e) => setFilter('categoryId', e.target.value)}>
                <option value="">{t('expenses.all')}</option>
                {sortedCats.map((c) => (
                  <option key={c.id} value={c.id}>{displayName(c, t)}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field__label">{t('settings_nav.tags')}</label>
              <select className="field__select" value={filters.tagId} onChange={(e) => setFilter('tagId', e.target.value)}>
                <option value="">{t('expenses.all')}</option>
                {sortedTags.map((tg) => (
                  <option key={tg.id} value={tg.id}>{displayName(tg, t)}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field__label">{t('settings_nav.payment_methods')}</label>
              <select className="field__select" value={filters.paymentMethodId} onChange={(e) => setFilter('paymentMethodId', e.target.value)}>
                <option value="">{t('expenses.all')}</option>
                {sortedPm.map((pm) => (
                  <option key={pm.id} value={pm.id}>{pmName(pm)}</option>
                ))}
              </select>
            </div>

            {fd.events.length > 0 && (
              <div className="field">
                <label className="field__label">{t('settings_nav.events')}</label>
                <select className="field__select" value={filters.eventId} onChange={(e) => setFilter('eventId', e.target.value)}>
                  <option value="">{t('expenses.all')}</option>
                  {fd.events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
              </div>
            )}

            {fd.projects.length > 0 && (
              <div className="field">
                <label className="field__label">{t('settings_nav.projects')}</label>
                <select className="field__select" value={filters.projectId} onChange={(e) => setFilter('projectId', e.target.value)}>
                  <option value="">{t('expenses.all')}</option>
                  {fd.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            <div className="field">
              <label className="field__label">{t('expenses.date_from')}</label>
              <input type="date" className="field__input" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} />
            </div>

            <div className="field">
              <label className="field__label">{t('expenses.date_to')}</label>
              <input type="date" className="field__input" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} />
            </div>
          </div>

          {active && (
            <button className="btn btn--ghost btn--sm" onClick={() => setFilters(EMPTY_FILTERS)}>
              {t('expenses.clear_filters')}
            </button>
          )}
        </div>
      )}

      {/* Count */}
      {active && !loading && (
        <p className="expenses-page__count">
          {t('expenses.showing', { count: filtered.length, total: expenses.length })}
        </p>
      )}

      {/* List */}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <div className="expenses-empty">
          <p>{active ? t('expenses.no_results') : t('expenses.empty')}</p>
          {!active && <button className="btn btn--primary" onClick={openAdd}>{t('expenses.add')}</button>}
        </div>
      ) : (
        <div className="expenses-list">
          {filtered.map((exp) => (
            <div key={exp.id} className="expense-row" onClick={() => openEdit(exp)}>
              <div className="expense-row__date">{formatDate(exp.date, lang)}</div>
              <div className="expense-row__main">
                <div className="expense-row__desc">
                  {exp.description ?? <span style={{ color: 'var(--text-disabled)' }}>{t(`expenses.type_${exp.type}`)}</span>}
                </div>
                {exp.category_id && (
                  <div className="expense-row__category">{catName(exp.category_id)}</div>
                )}
              </div>
              <div className="expense-row__amount" style={{ color: amountColor(exp.type) }}>
                {amountSign(exp.type)}{formatCurrency(exp.amount, exp.currency, lang)}
              </div>
              <button
                className="expense-row__delete btn btn--ghost btn--icon btn--sm"
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(exp); }}
                title={t('common.delete')}
              >
                <Cross2Icon width={12} height={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && hasMore && (
        <div className="expenses-page__load-more">
          {active && <p className="expenses-page__load-more-hint">{t('expenses.filter_partial')}</p>}
          <button className="btn btn--ghost" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? t('common.loading') : t('expenses.load_more')}
          </button>
        </div>
      )}

      <ExpenseForm
        open={formOpen}
        expense={editTarget}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        saving={saving}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('common.delete_confirm_title')}
        message={t('expenses.delete_warning')}
        confirmLabel={t('common.delete')}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
