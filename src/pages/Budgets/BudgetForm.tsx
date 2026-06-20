import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Cross2Icon, ChevronRightIcon } from '@radix-ui/react-icons';
import { useExpenseFormData } from '../../hooks/useExpenseFormData';
import { useAuthStore } from '../../store/auth.store';
import { NumericKeypad } from '../../components/NumericKeypad/NumericKeypad';
import type { Budget, CreateBudgetDTO, BudgetType, BudgetDimension, BudgetMonth } from '../../types/budget.types';
import './BudgetForm.scss';

interface BudgetFormProps {
  open: boolean;
  budget: Budget | null;
  onClose: () => void;
  onSave: (dto: CreateBudgetDTO, id?: string) => Promise<void>;
  saving: boolean;
}

const NOW = new Date();
const CUR_YEAR = NOW.getFullYear();
const CUR_MONTH = NOW.getMonth() + 1;
const CUR_MONTH_STR = `${CUR_YEAR}-${String(CUR_MONTH).padStart(2, '0')}`;

type ActiveField = 'amount' | 'dimensionValue' | 'startsMonth' | 'endsMonth' | 'addMonth' | null;

function monthLabel(year: number, month: number, language: string) {
  return new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1));
}

const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function BudgetForm({ open, budget, onClose, onSave, saving }: BudgetFormProps) {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const fd = useExpenseFormData();

  const [isMobile, setIsMobile] = useState(false);
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [viewYear, setViewYear] = useState(CUR_YEAR);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [budgetType, setBudgetType] = useState<BudgetType>('range');
  const [dimension, setDimension] = useState<BudgetDimension>('category');
  const [dimensionId, setDimensionId] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<BudgetMonth[]>([]);
  const [startsMonth, setStartsMonth] = useState(CUR_MONTH_STR);
  const [endsMonth, setEndsMonth] = useState('');

  const lang = profile?.language ?? 'en';
  const isEdit = !!budget;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!open) { setActiveField(null); return; }
    if (budget) {
      setName(budget.name);
      setAmount(String(budget.amount));
      setBudgetType(budget.budget_type);
      setDimension(
        budget.category_id ? 'category' :
        budget.tag_id ? 'tag' :
        budget.project_id ? 'project' : 'event'
      );
      setDimensionId(budget.category_id ?? budget.tag_id ?? budget.project_id ?? budget.event_id ?? '');
      setSelectedMonths(budget.months ?? []);
      setStartsMonth(budget.starts_month ?? CUR_MONTH_STR);
      setEndsMonth(budget.ends_month ?? '');
    } else {
      setName('');
      setAmount('');
      setBudgetType('range');
      setDimension('category');
      setDimensionId('');
      setSelectedMonths([]);
      setStartsMonth(CUR_MONTH_STR);
      setEndsMonth('');
    }
    if (isMobile) setActiveField('amount');
  }, [open, budget]);

  function handleFieldTap(field: ActiveField) {
    setActiveField(field === activeField ? null : field);
    if (field === 'startsMonth') {
      const [y] = startsMonth.split('-').map(Number);
      setViewYear(y || CUR_YEAR);
    } else if (field === 'endsMonth') {
      const [y] = (endsMonth || CUR_MONTH_STR).split('-').map(Number);
      setViewYear(y || CUR_YEAR);
    } else if (field === 'addMonth') {
      setViewYear(CUR_YEAR);
    }
  }

  function toggleSelectedMonth(year: number, month: number) {
    const exists = selectedMonths.some((x) => x.year === year && x.month === month);
    if (exists) {
      setSelectedMonths((prev) => prev.filter((x) => !(x.year === year && x.month === month)));
    } else {
      setSelectedMonths((prev) =>
        [...prev, { year, month }].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
      );
    }
  }

  async function handleSave() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!name.trim() || !parsed || parsed <= 0 || !dimensionId) return;
    if (budgetType === 'months' && selectedMonths.length === 0) return;
    const dto: CreateBudgetDTO = {
      name: name.trim(),
      amount: parsed,
      budget_type: budgetType,
      category_id: dimension === 'category' ? dimensionId : null,
      tag_id: dimension === 'tag' ? dimensionId : null,
      project_id: dimension === 'project' ? dimensionId : null,
      event_id: dimension === 'event' ? dimensionId : null,
      months: budgetType === 'months' ? selectedMonths : null,
      starts_month: budgetType === 'range' ? startsMonth : null,
      ends_month: budgetType === 'range' ? (endsMonth || null) : null,
    };
    await onSave(dto, budget?.id);
  }

  const valid =
    name.trim().length > 0 &&
    parseFloat(amount.replace(',', '.')) > 0 &&
    dimensionId.length > 0 &&
    (budgetType !== 'months' || selectedMonths.length > 0);

  const catName = useCallback((c: { name: string; is_default: boolean }) =>
    c.is_default ? t(c.name) : c.name, [t]);
  const tagName = useCallback((tg: { name: string; is_default: boolean }) =>
    tg.is_default ? t(tg.name) : tg.name, [t]);

  const dimOptions: Array<{ id: string; label: string }> = (() => {
    if (dimension === 'category') return [...fd.categories].sort((a, b) => a.position - b.position).map((c) => ({ id: c.id, label: catName(c) }));
    if (dimension === 'tag') return [...fd.tags].sort((a, b) => a.position - b.position).map((tg) => ({ id: tg.id, label: tagName(tg) }));
    if (dimension === 'project') return fd.projects.map((p) => ({ id: p.id, label: p.name }));
    return fd.events.map((e) => ({ id: e.id, label: e.name }));
  })();

  const dimValueLabel = dimensionId
    ? (dimOptions.find((o) => o.id === dimensionId)?.label ?? '—')
    : '—';

  const amountDisplay = amount
    ? `${amount} ${profile?.currency ?? ''}`
    : `0.00 ${profile?.currency ?? ''}`;

  const startsMonthDisplay = startsMonth
    ? (() => { const [y, m] = startsMonth.split('-').map(Number); return monthLabel(y, m, lang); })()
    : '—';

  const endsMonthDisplay = endsMonth
    ? (() => { const [y, m] = endsMonth.split('-').map(Number); return monthLabel(y, m, lang); })()
    : `— (${t('budgets.optional')})`;

  const panelOpen = activeField !== null && !(activeField === 'amount' && !isMobile);

  if (!open) return null;

  return (
    <div className="budget-form-page">
      {/* Header */}
      <div className="budget-form-page__header">
        <button className="btn btn--ghost btn--icon" onClick={onClose}>
          <Cross2Icon width={18} height={18} />
        </button>
        <h1 className="budget-form-page__title">
          {isEdit ? t('budgets.edit') : t('budgets.add')}
        </h1>
      </div>

      {/* Scrollable fields */}
      <div className="budget-form-page__fields">
        {fd.loading ? (
          <p style={{ color: 'var(--text-secondary)', padding: '24px' }}>{t('common.loading')}</p>
        ) : (
          <>
            {/* Amount */}
            <div
              className={`budget-form-page__amount-row${activeField === 'amount' ? ' budget-form-page__amount-row--active' : ''}`}
              onClick={() => isMobile ? handleFieldTap('amount') : undefined}
            >
              <span className="budget-form-page__field-label">{t('budgets.limit')}</span>
              {isMobile ? (
                <span className={`budget-form-page__amount-value${!amount ? ' budget-form-page__amount-value--placeholder' : ''}`}>
                  {amountDisplay}
                </span>
              ) : (
                <div className="budget-form-page__amount-input-wrap">
                  <input
                    className="field__input budget-form-page__amount-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <span className="budget-form-page__currency">{profile?.currency ?? ''}</span>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="budget-form-page__field-row budget-form-page__field-row--text" onClick={() => setActiveField(null)}>
              <span className="budget-form-page__field-label">{t('common.name')}</span>
              <input
                className="budget-form-page__inline-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('budgets.add')}
                onFocus={() => setActiveField(null)}
              />
            </div>

            {/* Dimension type selector */}
            {!isEdit && (
              <div className="budget-form-page__field-row budget-form-page__field-row--inline">
                <span className="budget-form-page__field-label">{t('budgets.dimension')}</span>
                <div className="budget-form-page__btn-row">
                  {(['category', 'tag', 'project', 'event'] as BudgetDimension[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`budget-form-page__seg-btn${dimension === d ? ' budget-form-page__seg-btn--active' : ''}`}
                      onClick={() => { setDimension(d); setDimensionId(''); }}
                    >
                      {t(`budgets.dim_${d}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dimension value */}
            {!isEdit && (
              <div
                className={`budget-form-page__field-row${activeField === 'dimensionValue' ? ' budget-form-page__field-row--active' : ''}`}
                onClick={() => handleFieldTap('dimensionValue')}
              >
                <span className="budget-form-page__field-label">{t(`budgets.dim_${dimension}`)}</span>
                <span className="budget-form-page__field-value">{dimValueLabel}</span>
                <ChevronRightIcon width={14} height={14} className="budget-form-page__field-chevron" />
              </div>
            )}

            {/* Budget type selector */}
            {!isEdit && (
              <div className="budget-form-page__field-row budget-form-page__field-row--inline">
                <span className="budget-form-page__field-label">{t('budgets.type')}</span>
                <div className="budget-form-page__btn-row">
                  {(['range', 'months', 'total'] as BudgetType[]).map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      className={`budget-form-page__seg-btn${budgetType === tp ? ' budget-form-page__seg-btn--active' : ''}`}
                      onClick={() => setBudgetType(tp)}
                    >
                      {t(`budgets.type_${tp}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Range config */}
            {budgetType === 'range' && (
              <>
                <div
                  className={`budget-form-page__field-row${activeField === 'startsMonth' ? ' budget-form-page__field-row--active' : ''}`}
                  onClick={() => handleFieldTap('startsMonth')}
                >
                  <span className="budget-form-page__field-label">{t('budgets.starts_month')}</span>
                  <span className="budget-form-page__field-value">{startsMonthDisplay}</span>
                  <ChevronRightIcon width={14} height={14} className="budget-form-page__field-chevron" />
                </div>
                <div
                  className={`budget-form-page__field-row${activeField === 'endsMonth' ? ' budget-form-page__field-row--active' : ''}`}
                  onClick={() => handleFieldTap('endsMonth')}
                >
                  <span className="budget-form-page__field-label">{t('budgets.ends_month')}</span>
                  <span className={`budget-form-page__field-value${!endsMonth ? ' budget-form-page__field-value--placeholder' : ''}`}>{endsMonthDisplay}</span>
                  {endsMonth && (
                    <button
                      type="button"
                      className="budget-form-page__clear-btn"
                      onClick={(e) => { e.stopPropagation(); setEndsMonth(''); setActiveField(null); }}
                    >
                      ✕
                    </button>
                  )}
                  {!endsMonth && <ChevronRightIcon width={14} height={14} className="budget-form-page__field-chevron" />}
                </div>
              </>
            )}

            {/* Months config */}
            {budgetType === 'months' && (
              <>
                {selectedMonths.length > 0 && (
                  <div className="budget-form-page__field-row budget-form-page__field-row--chips">
                    <span className="budget-form-page__field-label">{t('budgets.months_label')}</span>
                    <div className="budget-form-page__chips">
                      {selectedMonths.map((m, i) => (
                        <span key={i} className="budget-form-page__chip">
                          {monthLabel(m.year, m.month, lang)}
                          <button type="button" onClick={() => setSelectedMonths((prev) => prev.filter((_, j) => j !== i))}>✕</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div
                  className={`budget-form-page__field-row${activeField === 'addMonth' ? ' budget-form-page__field-row--active' : ''}`}
                  onClick={() => handleFieldTap('addMonth')}
                >
                  <span className="budget-form-page__field-label">{t('common.add')}</span>
                  <span className="budget-form-page__field-value">{t('budgets.months_label')}</span>
                  <ChevronRightIcon width={14} height={14} className="budget-form-page__field-chevron" />
                </div>
              </>
            )}

            {/* Total hint */}
            {budgetType === 'total' && (
              <div className="budget-form-page__field-row">
                <span className="budget-form-page__field-label" />
                <span className="budget-form-page__field-value">{t('budgets.type_total_hint')}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Save bar */}
      <div className="budget-form-page__save-bar">
        {activeField === 'addMonth' && (
          <button type="button" className="btn budget-form-page__next-btn" onClick={() => setActiveField(null)}>
            {t('common.done')} ✓
          </button>
        )}
        <button
          className="btn btn--primary budget-form-page__save-btn"
          onClick={handleSave}
          disabled={saving || !valid}
        >
          {saving ? '…' : t('common.save')}
        </button>
      </div>

      {/* Bottom panel */}
      <div className={`budget-form-page__panel${panelOpen ? ' budget-form-page__panel--open' : ''}`}>
        {/* Amount → numpad (mobile only) */}
        {activeField === 'amount' && isMobile && (
          <NumericKeypad
            value={amount}
            onChange={setAmount}
            onNext={() => setActiveField(null)}
          />
        )}

        {/* Dimension value picker */}
        {activeField === 'dimensionValue' && (
          <div className="panel-content">
            <div className="panel-content__list">
              <button
                className={`panel-content__item${dimensionId === '' ? ' panel-content__item--selected' : ''}`}
                onClick={() => { setDimensionId(''); setActiveField(null); }}
              >
                {t('expenses.none')}
              </button>
              {dimOptions.map((o) => (
                <button
                  key={o.id}
                  className={`panel-content__item${dimensionId === o.id ? ' panel-content__item--selected' : ''}`}
                  onClick={() => { setDimensionId(o.id); setActiveField(null); }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Month picker — single select (starts/ends) */}
        {(activeField === 'startsMonth' || activeField === 'endsMonth') && (() => {
          const currentVal = activeField === 'startsMonth' ? startsMonth : endsMonth;
          return (
            <div className="month-picker">
              <div className="month-picker__header">
                <button type="button" className="month-picker__nav" onClick={() => setViewYear((y) => y - 1)}>‹</button>
                <span className="month-picker__year">{viewYear}</span>
                <button type="button" className="month-picker__nav" onClick={() => setViewYear((y) => y + 1)}>›</button>
              </div>
              <div className="month-picker__grid">
                {MONTH_NAMES_SHORT.map((name, idx) => {
                  const iso = `${viewYear}-${String(idx + 1).padStart(2, '0')}`;
                  const isSelected = currentVal === iso;
                  const isCurrent = iso === CUR_MONTH_STR;
                  return (
                    <button
                      key={iso}
                      type="button"
                      className={`month-picker__month${isSelected ? ' month-picker__month--selected' : ''}${isCurrent ? ' month-picker__month--today' : ''}`}
                      onClick={() => {
                        if (activeField === 'startsMonth') setStartsMonth(iso);
                        else setEndsMonth(iso);
                        setActiveField(null);
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Month picker — multi select (addMonth) */}
        {activeField === 'addMonth' && (
          <div className="month-picker">
            <div className="month-picker__header">
              <button type="button" className="month-picker__nav" onClick={() => setViewYear((y) => y - 1)}>‹</button>
              <span className="month-picker__year">{viewYear}</span>
              <button type="button" className="month-picker__nav" onClick={() => setViewYear((y) => y + 1)}>›</button>
            </div>
            <div className="month-picker__grid">
              {MONTH_NAMES_SHORT.map((name, idx) => {
                const month = idx + 1;
                const isSelected = selectedMonths.some((x) => x.year === viewYear && x.month === month);
                const isCurrent = viewYear === CUR_YEAR && month === CUR_MONTH;
                return (
                  <button
                    key={`${viewYear}-${month}`}
                    type="button"
                    className={`month-picker__month${isSelected ? ' month-picker__month--selected' : ''}${isCurrent ? ' month-picker__month--today' : ''}`}
                    onClick={() => toggleSelectedMonth(viewYear, month)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
