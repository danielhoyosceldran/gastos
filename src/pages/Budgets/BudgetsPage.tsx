import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { budgetsService } from '../../services/supabase/budgets.service';
import type { Budget, CreateBudgetDTO } from '../../types/budget.types';
import { BudgetForm } from './BudgetForm';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { toast } from '../../store/toast.store';
import { useAuthStore } from '../../store/auth.store';
import { useExpenseFormData } from '../../hooks/useExpenseFormData';
import { formatCurrency } from '../../lib/format';
import './BudgetsPage.scss';

const NOW = new Date();
const CUR_YEAR = NOW.getFullYear();
const CUR_MONTH = NOW.getMonth() + 1;
const CUR_MONTH_STR = `${CUR_YEAR}-${String(CUR_MONTH).padStart(2, '0')}`;

function isActive(b: Budget): boolean {
  if (b.budget_type === 'total') return true;
  if (b.budget_type === 'range') return !b.ends_month || b.ends_month >= CUR_MONTH_STR;
  if (b.budget_type === 'months') {
    return (b.months ?? []).some(
      (m) => `${m.year}-${String(m.month).padStart(2, '0')}` >= CUR_MONTH_STR
    );
  }
  return false;
}

function progressPercent(spent: number, limit: number): number {
  return Math.min(100, Math.round((spent / limit) * 100));
}

export function BudgetsPage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const fd = useExpenseFormData();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [progress, setProgress] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showExpired, setShowExpired] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Budget | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await budgetsService.getAll();
      setBudgets(all);
      // Load progress for all budgets in parallel
      const entries = await Promise.all(
        all.map(async (b) => {
          try {
            const spent = await budgetsService.getProgress(b.id, CUR_YEAR, CUR_MONTH);
            return [b.id, spent] as [string, number];
          } catch { return [b.id, 0] as [string, number]; }
        })
      );
      setProgress(new Map(entries));
    } catch { toast.error(t('common.error_load')); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const displayed = useMemo(() => {
    return budgets.filter((b) => showExpired ? !isActive(b) : isActive(b));
  }, [budgets, showExpired]);

  function openAdd() { setEditTarget(null); setFormOpen(true); }
  function openEdit(b: Budget) { setEditTarget(b); setFormOpen(true); }

  async function handleSave(dto: CreateBudgetDTO, id?: string) {
    setSaving(true);
    try {
      if (id) {
        const updated = await budgetsService.update(id, dto);
        setBudgets((prev) => prev.map((b) => (b.id === id ? updated : b)));
        // Refresh progress for this budget
        const spent = await budgetsService.getProgress(id, CUR_YEAR, CUR_MONTH);
        setProgress((prev) => new Map(prev).set(id, spent));
      } else {
        const created = await budgetsService.create(dto);
        setBudgets((prev) => [created, ...prev]);
        const spent = await budgetsService.getProgress(created.id, CUR_YEAR, CUR_MONTH);
        setProgress((prev) => new Map(prev).set(created.id, spent));
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
      await budgetsService.delete(deleteTarget.id);
      setBudgets((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      toast.success(t('common.deleted'));
      setDeleteTarget(null);
    } catch { toast.error(t('common.error_delete')); }
    finally { setDeleteLoading(false); }
  }

  const lang = profile?.language ?? 'en';

  function dimensionLabel(b: Budget): string {
    if (b.category_id) {
      const cat = fd.categories.find((c) => c.id === b.category_id);
      return cat ? (cat.is_default ? t(cat.name) : cat.name) : '—';
    }
    if (b.tag_id) {
      const tag = fd.tags.find((tg) => tg.id === b.tag_id);
      return tag ? (tag.is_default ? t(tag.name) : tag.name) : '—';
    }
    if (b.project_id) {
      const proj = fd.projects.find((p) => p.id === b.project_id);
      return proj?.name ?? '—';
    }
    if (b.event_id) {
      const ev = fd.events.find((e) => e.id === b.event_id);
      return ev?.name ?? '—';
    }
    return '—';
  }

  function typeLabel(b: Budget): string {
    if (b.budget_type === 'total') return t('budgets.type_total');
    if (b.budget_type === 'range') {
      const start = b.starts_month ?? '';
      const end = b.ends_month ? ` → ${b.ends_month}` : ' → ∞';
      return `${t('budgets.type_range')}: ${start}${end}`;
    }
    if (b.budget_type === 'months') {
      return `${t('budgets.type_months')}: ${(b.months ?? []).length} ${t('budgets.months_count')}`;
    }
    return '';
  }

  return (
    <div className="budgets-page">
      <div className="budgets-page__header">
        <h1 className="budgets-page__title">{t('nav.budgets')}</h1>
        <div className="budgets-page__header-actions">
          <button
            className={`btn btn--ghost btn--sm${showExpired ? ' btn--active' : ''}`}
            onClick={() => setShowExpired((s) => !s)}
          >
            {showExpired ? t('budgets.show_active') : t('budgets.show_expired')}
          </button>
          <button className="btn btn--primary btn--sm" onClick={openAdd}>{t('budgets.add')}</button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
      ) : displayed.length === 0 ? (
        <div className="budgets-empty">
          <p>{showExpired ? t('budgets.no_expired') : t('budgets.empty')}</p>
          {!showExpired && <button className="btn btn--primary" onClick={openAdd}>{t('budgets.add')}</button>}
        </div>
      ) : (
        <div className="budgets-list">
          {displayed.map((b) => {
            const spent = progress.get(b.id) ?? 0;
            const pct = progressPercent(spent, b.amount);
            const over = spent > b.amount;
            return (
              <div key={b.id} className="budget-card" onClick={() => openEdit(b)}>
                <div className="budget-card__header">
                  <div className="budget-card__info">
                    <span className="budget-card__name">{b.name}</span>
                    <span className="budget-card__meta">{dimensionLabel(b)} · {typeLabel(b)}</span>
                  </div>
                  <button
                    className="btn btn--ghost btn--icon btn--sm"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(b); }}
                    title={t('common.delete')}
                  >
                    ✕
                  </button>
                </div>

                <div className="budget-card__progress-bar">
                  <div
                    className={`budget-card__progress-fill${over ? ' budget-card__progress-fill--over' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="budget-card__amounts">
                  <span className={`budget-card__spent${over ? ' budget-card__spent--over' : ''}`}>
                    {formatCurrency(spent, b.currency, lang)}
                  </span>
                  <span className="budget-card__limit">
                    / {formatCurrency(b.amount, b.currency, lang)} ({pct}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BudgetForm
        open={formOpen}
        budget={editTarget}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        saving={saving}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('common.delete_confirm_title')}
        message={t('budgets.delete_warning')}
        confirmLabel={t('common.delete')}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
