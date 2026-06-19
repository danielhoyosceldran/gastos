import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/Modal/Modal';
import { useExpenseFormData } from '../../hooks/useExpenseFormData';
import { useAuthStore } from '../../store/auth.store';
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

function monthLabel(m: BudgetMonth, language: string) {
  return new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' })
    .format(new Date(m.year, m.month - 1, 1));
}

export function BudgetForm({ open, budget, onClose, onSave, saving }: BudgetFormProps) {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const fd = useExpenseFormData();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [budgetType, setBudgetType] = useState<BudgetType>('range');
  const [dimension, setDimension] = useState<BudgetDimension>('category');
  const [dimensionId, setDimensionId] = useState('');

  // months type
  const [selectedMonths, setSelectedMonths] = useState<BudgetMonth[]>([]);
  const [monthInput, setMonthInput] = useState(CUR_MONTH_STR);

  // range type
  const [startsMonth, setStartsMonth] = useState(CUR_MONTH_STR);
  const [endsMonth, setEndsMonth] = useState('');

  const lang = profile?.language ?? 'en';

  useEffect(() => {
    if (!open) return;
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
  }, [open, budget]);

  function addMonth() {
    if (!monthInput) return;
    const [y, m] = monthInput.split('-').map(Number);
    if (!y || !m) return;
    const already = selectedMonths.some((x) => x.year === y && x.month === m);
    if (!already) setSelectedMonths((prev) => [...prev, { year: y, month: m }].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month));
  }

  function removeMonth(idx: number) {
    setSelectedMonths((prev) => prev.filter((_, i) => i !== idx));
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

  // Dimension options
  const catName = (c: { name: string; is_default: boolean }) => c.is_default ? t(c.name) : c.name;
  const tagName = (tg: { name: string; is_default: boolean }) => tg.is_default ? t(tg.name) : tg.name;

  const dimOptions: Array<{ id: string; label: string }> = (() => {
    if (dimension === 'category') return [...fd.categories].sort((a, b) => a.position - b.position).map((c) => ({ id: c.id, label: catName(c) }));
    if (dimension === 'tag') return [...fd.tags].sort((a, b) => a.position - b.position).map((tg) => ({ id: tg.id, label: tagName(tg) }));
    if (dimension === 'project') return fd.projects.map((p) => ({ id: p.id, label: p.name }));
    return fd.events.map((e) => ({ id: e.id, label: e.name }));
  })();

  const isEdit = !!budget;

  return (
    <Modal
      open={open}
      title={isEdit ? t('budgets.edit') : t('budgets.add')}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving || !valid}>
            {saving ? '…' : t('common.save')}
          </button>
        </>
      }
    >
      {fd.loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
      ) : (
        <div className="form budget-form">
          {/* Name */}
          <div className="field">
            <label className="field__label">{t('common.name')}</label>
            <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          {/* Amount + Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
            <div className="field">
              <label className="field__label">{t('budgets.limit')}</label>
              <input className="field__input" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="field">
              <label className="field__label">{t('expenses.currency')}</label>
              <div className="budget-form__currency">{profile?.currency ?? '—'}</div>
            </div>
          </div>

          {/* Dimension */}
          {!isEdit && (
            <>
              <div className="field">
                <label className="field__label">{t('budgets.dimension')}</label>
                <div className="budget-form__type-row">
                  {(['category', 'tag', 'project', 'event'] as BudgetDimension[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`budget-form__type-btn${dimension === d ? ' budget-form__type-btn--active' : ''}`}
                      onClick={() => { setDimension(d); setDimensionId(''); }}
                    >
                      {t(`budgets.dim_${d}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="field__label">{t(`budgets.dim_${dimension}`)}</label>
                <select className="field__select" value={dimensionId} onChange={(e) => setDimensionId(e.target.value)}>
                  <option value="">{t('expenses.none')}</option>
                  {dimOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Budget type */}
          {!isEdit && (
            <div className="field">
              <label className="field__label">{t('budgets.type')}</label>
              <div className="budget-form__type-row">
                {(['range', 'months', 'total'] as BudgetType[]).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    className={`budget-form__type-btn${budgetType === tp ? ' budget-form__type-btn--active' : ''}`}
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
            <div className="form-row-2">
              <div className="field">
                <label className="field__label">{t('budgets.starts_month')}</label>
                <input type="month" className="field__input" value={startsMonth} onChange={(e) => setStartsMonth(e.target.value)} />
              </div>
              <div className="field">
                <label className="field__label">{t('budgets.ends_month')} ({t('budgets.optional')})</label>
                <input type="month" className="field__input" value={endsMonth} onChange={(e) => setEndsMonth(e.target.value)} />
              </div>
            </div>
          )}

          {/* Months config */}
          {budgetType === 'months' && (
            <div className="field">
              <label className="field__label">{t('budgets.months_label')}</label>
              <div className="budget-form__months-add">
                <input type="month" className="field__input" value={monthInput} onChange={(e) => setMonthInput(e.target.value)} />
                <button type="button" className="btn btn--ghost btn--sm" onClick={addMonth}>{t('common.add')}</button>
              </div>
              {selectedMonths.length > 0 && (
                <div className="budget-form__months-list">
                  {selectedMonths.map((m, i) => (
                    <div key={i} className="budget-form__month-chip">
                      <span>{monthLabel(m, lang)}</span>
                      <button type="button" onClick={() => removeMonth(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Total: no time config needed */}
          {budgetType === 'total' && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('budgets.type_total_hint')}</p>
          )}
        </div>
      )}
    </Modal>
  );
}
