import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { displayName } from '../../lib/displayName';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import { expensesService } from '../../services/supabase/expenses.service';
import { budgetsService } from '../../services/supabase/budgets.service';
import type { Expense } from '../../types/expense.types';
import type { Budget, BudgetMonth } from '../../types/budget.types';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { toast } from '../../store/toast.store';
import { useAuthStore } from '../../store/auth.store';
import { useExpenseFormData } from '../../hooks/useExpenseFormData';
import { formatCurrency } from '../../lib/format';
import './DashboardPage.scss';

function getMonthLabel(year: number, month: number, language: string): string {
  return new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function toMonthStr(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function isBudgetActive(budget: Budget, year: number, month: number): boolean {
  if (budget.budget_type === 'total') return true;
  if (budget.budget_type === 'months') {
    return (budget.months ?? []).some((m: BudgetMonth) => m.year === year && m.month === month);
  }
  // range
  const cur = toMonthStr(year, month);
  const start = budget.starts_month ?? '';
  const end = budget.ends_month ?? '';
  if (start && cur < start) return false;
  if (end && cur > end) return false;
  return true;
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const fd = useExpenseFormData();
  const navigate = useNavigate();

  const swiperRef = useRef<SwiperType | null>(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [activeBudgets, setActiveBudgets] = useState<Budget[]>([]);
  const [budgetsLoading, setBudgetsLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setExpenses(await expensesService.getByMonth(year, month)); }
    catch { toast.error(t('common.error_load')); }
    finally { setLoading(false); }
  }, [year, month, t]);

  const loadBudgets = useCallback(async () => {
    setBudgetsLoading(true);
    try {
      const all = await budgetsService.getAll();
      const active = all.filter((b) => isBudgetActive(b, year, month));
      const withProgress = await Promise.all(
        active.map(async (b) => {
          try {
            const spent = await budgetsService.getProgress(b.id, year, month);
            return { ...b, spent };
          } catch {
            return { ...b, spent: 0 };
          }
        })
      );
      setActiveBudgets(withProgress);
    } catch { /* silent — budgets are secondary */ }
    finally { setBudgetsLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadBudgets(); }, [loadBudgets]);

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  function handleSwipeChange(swiper: SwiperType) {
    if (swiper.activeIndex === 0) {
      prevMonth();
      swiper.slideTo(1, 0);
    } else if (swiper.activeIndex === 2) {
      nextMonth();
      swiper.slideTo(1, 0);
    }
  }

  const lang = profile?.language ?? 'en';
  const currency = profile?.currency ?? 'EUR';

  const inCurrency = expenses.filter((e) => e.currency === currency);
  const totalSpent = inCurrency
    .filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
    - inCurrency.filter((e) => e.type === 'refund').reduce((s, e) => s + e.amount, 0);
  const totalIncome = inCurrency.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const netBalance = totalIncome - totalSpent;

  function openAdd() { navigate('/expenses/new'); }
  function openEdit(e: Expense) { navigate(`/expenses/${e.id}/edit`); }

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

  function catName(id: string | null) {
    if (!id) return null;
    const cat = fd.categories.find((c) => c.id === id);
    if (!cat) return null;
    return displayName(cat, t);
  }

  function rowColor(type: Expense['type']) {
    if (type === 'income') return '#22c55e';
    if (type === 'refund') return '#3b82f6';
    return '#ef4444';
  }

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard__month-nav">
        <button className="btn btn--ghost btn--icon" onClick={prevMonth} aria-label={t('dashboard.prev_month')}><ChevronLeftIcon /></button>
        <span className="dashboard__month-label">{getMonthLabel(year, month, lang)}</span>
        <button className="btn btn--ghost btn--icon" onClick={nextMonth} aria-label={t('dashboard.next_month')}><ChevronRightIcon /></button>
      </div>

    <Swiper
      initialSlide={1}
      slidesPerView={1}
      spaceBetween={0}
      onSwiper={(s) => { swiperRef.current = s; }}
      onSlideChangeTransitionEnd={handleSwipeChange}
      style={{ width: '100%', flex: 1, minHeight: 0 }}
    >
      <SwiperSlide />
      <SwiperSlide>
    <div className="dashboard">

      {/* Totals */}
      <div className="dashboard__totals">
        <div className="dashboard__total-row">
          <span className="dashboard__total-label">{t('dashboard.total_spent')}</span>
          <span className="dashboard__total-value dashboard__total-value--spent">
            {formatCurrency(totalSpent, currency, lang)}
          </span>
        </div>
        <div className="dashboard__total-row">
          <span className="dashboard__total-label">{t('dashboard.total_income')}</span>
          <span className="dashboard__total-value dashboard__total-value--income">
            {formatCurrency(totalIncome, currency, lang)}
          </span>
        </div>
        <div className="dashboard__total-row dashboard__total-row--net">
          <span className="dashboard__total-label">{t('dashboard.net_balance')}</span>
          <span className={`dashboard__total-value ${netBalance >= 0 ? 'dashboard__total-value--income' : 'dashboard__total-value--spent'}`}>
            {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance, currency, lang)}
          </span>
        </div>
      </div>

      {/* Active budgets */}
      {!budgetsLoading && activeBudgets.length > 0 && (
        <div className="dashboard__section">
          <div className="dashboard__section-header">
            <h2 className="dashboard__section-title">{t('dashboard.active_budgets')}</h2>
          </div>
          <div className="dashboard__budgets">
            {activeBudgets.map((b) => {
              const spent = b.spent ?? 0;
              const pct = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
              const over = spent > b.amount;
              return (
                <div key={b.id} className="dashboard__budget-item">
                  <div className="dashboard__budget-top">
                    <span className="dashboard__budget-name">{b.name}</span>
                    <span className={`dashboard__budget-amounts${over ? ' dashboard__budget-amounts--over' : ''}`}>
                      {formatCurrency(spent, b.currency, lang)}
                      <span className="dashboard__budget-limit"> / {formatCurrency(b.amount, b.currency, lang)}</span>
                    </span>
                  </div>
                  <div className="dashboard__budget-bar">
                    <div
                      className={`dashboard__budget-fill${over ? ' dashboard__budget-fill--over' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expenses */}
      <div className="dashboard__section">
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">{t('nav.expenses')}</h2>
          <button className="btn btn--primary btn--sm" onClick={openAdd}>{t('expenses.add')}</button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t('common.loading')}</p>
        ) : expenses.length === 0 ? (
          <div className="dashboard__empty">
            <p>{t('dashboard.no_expenses')}</p>
            <button className="btn btn--primary btn--sm" onClick={openAdd}>{t('expenses.add')}</button>
          </div>
        ) : (
          <div className="dashboard__expense-list">
            {expenses.map((exp) => (
              <div key={exp.id} className="dashboard__expense-row" onClick={() => openEdit(exp)}>
                <div className="dashboard__expense-main">
                  <div className="dashboard__expense-desc">
                    {exp.description ?? <span style={{ color: 'var(--text-disabled)' }}>{t(`expenses.type_${exp.type}`)}</span>}
                  </div>
                  {exp.category_id && (
                    <div className="dashboard__expense-category">{catName(exp.category_id)}</div>
                  )}
                </div>
                <div className="dashboard__expense-amount" style={{ color: rowColor(exp.type) }}>
                  {formatCurrency(exp.amount, exp.currency, lang)}
                </div>
                <button
                  className="dashboard__expense-delete btn btn--ghost btn--icon btn--sm"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(exp); }}
                  title={t('common.delete')}
                >
                  <Cross2Icon width={12} height={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
      </SwiperSlide>
      <SwiperSlide />
    </Swiper>
    </div>
  );
}
