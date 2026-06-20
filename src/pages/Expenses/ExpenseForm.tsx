import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { displayName } from '../../lib/displayName';
import { Modal } from '../../components/Modal/Modal';
import { useExpenseFormData } from '../../hooks/useExpenseFormData';
import { useAuthStore } from '../../store/auth.store';
import type { Expense, CreateExpenseDTO, ExpenseType } from '../../types/expense.types';
import type { Category } from '../../types/category.types';
import './ExpenseForm.scss';

interface ExpenseFormProps {
  open: boolean;
  expense: Expense | null;
  onClose: () => void;
  onSave: (dto: CreateExpenseDTO, id?: string) => Promise<void>;
  saving: boolean;
}

function flattenCategories(cats: Category[], depth = 0): Array<{ cat: Category; depth: number }> {
  const result: Array<{ cat: Category; depth: number }> = [];
  const roots = cats.filter((c) => c.parent_id === null).sort((a, b) => a.position - b.position);
  function walk(list: Category[], d: number) {
    list.forEach((c) => {
      result.push({ cat: c, depth: d });
      const children = cats.filter((x) => x.parent_id === c.id).sort((a, b) => a.position - b.position);
      if (children.length) walk(children, d + 1);
    });
  }
  walk(roots, depth);
  return result;
}

const PREFIX = ['', '— ', '—— '];
const TODAY = new Date().toISOString().split('T')[0];

export function ExpenseForm({ open, expense, onClose, onSave, saving }: ExpenseFormProps) {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const fd = useExpenseFormData();

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<ExpenseType>('expense');
  const [date, setDate] = useState(TODAY);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [eventId, setEventId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setAmount(String(expense.amount));
      setType(expense.type);
      setDate(expense.date);
      setDescription(expense.description ?? '');
      setNotes(expense.notes ?? '');
      setCategoryId(expense.category_id ?? '');
      setPaymentMethodId(expense.payment_method_id ?? '');
      setEventId(expense.event_id ?? '');
      setProjectId(expense.project_id ?? '');
      setTagIds(expense.tag_ids);
    } else {
      setAmount('');
      setType('expense');
      setDate(TODAY);
      setDescription('');
      setNotes('');
      setCategoryId('');
      setPaymentMethodId('');
      setEventId('');
      setProjectId('');
      setTagIds([]);
    }
  }, [open, expense]);

  function toggleTag(id: string) {
    setTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  }

  async function handleSave() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!parsed || parsed <= 0 || !date) return;
    const dto: CreateExpenseDTO = {
      amount: parsed,
      type,
      date,
      description: description.trim() || null,
      notes: notes.trim() || null,
      category_id: categoryId || null,
      payment_method_id: paymentMethodId || null,
      event_id: eventId || null,
      project_id: projectId || null,
      tag_ids: tagIds,
    };
    await onSave(dto, expense?.id);
  }

  const flatCats = flattenCategories(fd.categories);
  const sortedGroups = [...fd.tagGroups].sort((a, b) => a.position - b.position);
  const sortedPm = [...fd.paymentMethods].sort((a, b) => a.position - b.position);

  const catName = (cat: Category) => displayName(cat, t);
  const pmName = (pm: { name: string; is_default: boolean }) => displayName(pm, t);
  const tgName = (name: string) => name.startsWith('tag_group.') ? t(name) : name;
  const tagName = (name: string, isDefault: boolean) => isDefault ? t(name) : name;

  const title = expense ? t('expenses.edit') : t('expenses.add');
  const valid = parseFloat(amount.replace(',', '.')) > 0 && date.length > 0;

  return (
    <Modal
      open={open}
      title={title}
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
        <div className="form expense-form">
          {/* Type */}
          <div className="field">
            <label className="field__label">{t('expenses.type')}</label>
            <div className="expense-form__type-row">
              {(['expense', 'income', 'refund'] as ExpenseType[]).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  className={`expense-form__type-btn expense-form__type-btn--${tp}${type === tp ? ' expense-form__type-btn--active' : ''}`}
                  onClick={() => setType(tp)}
                >
                  {t(`expenses.type_${tp}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Amount + Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
            <div className="field">
              <label className="field__label">{t('expenses.amount')}</label>
              <input
                className="field__input"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="field">
              <label className="field__label">{t('expenses.currency')}</label>
              <div className="expense-form__currency">{profile?.currency ?? '—'}</div>
            </div>
          </div>

          {/* Date */}
          <div className="field">
            <label className="field__label">{t('common.starts_at')}</label>
            <input type="date" className="field__input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Description */}
          <div className="field">
            <label className="field__label">{t('expenses.description')}</label>
            <input className="field__input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('expenses.description_placeholder')} />
          </div>

          {/* Category */}
          <div className="field">
            <label className="field__label">{t('settings_nav.categories')}</label>
            <select className="field__select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">{t('expenses.none')}</option>
              {flatCats.map(({ cat, depth }) => (
                <option key={cat.id} value={cat.id}>{PREFIX[depth]}{catName(cat)}</option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div className="field">
            <label className="field__label">{t('settings_nav.payment_methods')}</label>
            <select className="field__select" value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
              <option value="">{t('expenses.none')}</option>
              {sortedPm.map((pm) => (
                <option key={pm.id} value={pm.id}>{pmName(pm)}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          {sortedGroups.length > 0 && (
            <div className="field">
              <label className="field__label">{t('settings_nav.tags')}</label>
              <div className="expense-form__tags">
                {sortedGroups.map((group) => {
                  const groupTags = fd.tags.filter((t) => t.tag_group_id === group.id).sort((a, b) => a.position - b.position);
                  if (!groupTags.length) return null;
                  return (
                    <div key={group.id} className="expense-form__tag-group">
                      <div className="expense-form__tag-group-name">{tgName(group.name)}</div>
                      <div className="expense-form__tag-list">
                        {groupTags.map((tag) => (
                          <label key={tag.id} className={`expense-form__tag${tagIds.includes(tag.id) ? ' expense-form__tag--active' : ''}`}>
                            <input type="checkbox" checked={tagIds.includes(tag.id)} onChange={() => toggleTag(tag.id)} style={{ display: 'none' }} />
                            {tag.color && <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: tag.color, display: 'inline-block', flexShrink: 0 }} />}
                            {tagName(tag.name, tag.is_default)}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Event */}
          {fd.events.length > 0 && (
            <div className="field">
              <label className="field__label">{t('settings_nav.events')}</label>
              <select className="field__select" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">{t('expenses.none')}</option>
                {fd.events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </div>
          )}

          {/* Project */}
          {fd.projects.length > 0 && (
            <div className="field">
              <label className="field__label">{t('settings_nav.projects')}</label>
              <select className="field__select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">{t('expenses.none')}</option>
                {fd.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="field">
            <label className="field__label">{t('expenses.notes')}</label>
            <textarea className="field__textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      )}
    </Modal>
  );
}
