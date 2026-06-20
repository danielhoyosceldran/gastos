import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { displayName } from '../../lib/displayName';
import { ArrowLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { expensesService } from '../../services/supabase/expenses.service';
import { useExpenseFormData } from '../../hooks/useExpenseFormData';
import { useAuthStore } from '../../store/auth.store';
import { toast } from '../../store/toast.store';
import { NumericKeypad } from '../../components/NumericKeypad/NumericKeypad';
import type { ExpenseType } from '../../types/expense.types';
import type { Category } from '../../types/category.types';
import './AddExpensePage.scss';

const TODAY = new Date().toISOString().split('T')[0];

type ActiveField = 'amount' | 'date' | 'category' | 'paymentMethod' | 'tags' | 'event' | 'project' | null;

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7; // Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function buildCatLabel(cats: Category[], id: string, t: (k: string) => string): string {
  const cat = cats.find((c) => c.id === id);
  if (!cat) return '';
  return cat.is_default ? t(cat.name) : cat.name;
}

export function AddExpensePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const fd = useExpenseFormData();
  const [isMobile, setIsMobile] = useState(false);
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [catDrillPath, setCatDrillPath] = useState<string[]>([]);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

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

  const [loadingExpense, setLoadingExpense] = useState(!!id);
  const [saving, setSaving] = useState(false);

  const sortedPm = [...fd.paymentMethods].sort((a, b) => a.position - b.position);
  const sortedGroups = [...fd.tagGroups].sort((a, b) => a.position - b.position);

  // Field order drives auto-advance; recalculated when optional fields load
  const fieldOrder: ActiveField[] = [
    'amount',
    'date',
    'category',
    'paymentMethod',
    ...(sortedGroups.length > 0 ? ['tags' as ActiveField] : []),
    ...(fd.events.length > 0 ? ['event' as ActiveField] : []),
    ...(fd.projects.length > 0 ? ['project' as ActiveField] : []),
  ];

  function advanceFrom(field: ActiveField) {
    const idx = fieldOrder.indexOf(field);
    const next = idx >= 0 ? (fieldOrder[idx + 1] ?? null) : null;
    setActiveField(next);
    if (next === 'category') setCatDrillPath([]);
  }

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // On mobile, open numpad by default for new expense
  useEffect(() => {
    if (isMobile && !id && !fd.loading) {
      setActiveField('amount');
    }
  }, [isMobile, id, fd.loading]);

  useEffect(() => {
    if (!id) return;
    setLoadingExpense(true);
    expensesService.getById(id)
      .then((exp) => {
        setAmount(String(exp.amount));
        setType(exp.type);
        setDate(exp.date);
        setDescription(exp.description ?? '');
        setNotes(exp.notes ?? '');
        setCategoryId(exp.category_id ?? '');
        setPaymentMethodId(exp.payment_method_id ?? '');
        setEventId(exp.event_id ?? '');
        setProjectId(exp.project_id ?? '');
        setTagIds(exp.tag_ids);
      })
      .catch(() => { toast.error(t('common.error_load')); navigate(-1); })
      .finally(() => setLoadingExpense(false));
  }, [id, navigate, t]);

  function toggleTag(tid: string) {
    setTagIds((prev) => prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]);
  }

  async function handleSave() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!parsed || parsed <= 0 || !date) return;
    setSaving(true);
    try {
      const dto = {
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
      if (id) {
        await expensesService.update(id, dto);
      } else {
        await expensesService.create(dto);
      }
      toast.success(t('common.saved'));
      navigate(-1);
    } catch {
      toast.error(t('common.error_save'));
    } finally {
      setSaving(false);
    }
  }

  const valid = parseFloat(amount.replace(',', '.')) > 0 && date.length > 0;

  const catName = useCallback((cat: Category) => displayName(cat, t), [t]);
  const pmName = (pm: { name: string; is_default: boolean }) => displayName(pm, t);
  const tgName = (name: string) => name.startsWith('tag_group.') ? t(name) : name;
  const tagName = (name: string, isDefault: boolean) => isDefault ? t(name) : name;

  // Category drill-down
  const currentParentId = catDrillPath.length > 0 ? catDrillPath[catDrillPath.length - 1] : null;
  const currentLevelCats = fd.categories
    .filter((c) => c.parent_id === currentParentId)
    .sort((a, b) => a.position - b.position);

  function handleCatClick(cat: Category) {
    setCategoryId(cat.id);
    const hasChildren = fd.categories.some((c) => c.parent_id === cat.id);
    if (hasChildren) {
      setCatDrillPath((prev) => [...prev, cat.id]);
    } else {
      // Leaf node — auto advance
      advanceFrom('category');
    }
  }

  function handleFieldTap(field: ActiveField) {
    if (field === activeField) {
      setActiveField(null);
    } else {
      setActiveField(field);
      if (field === 'date') {
        const d = new Date(date + 'T00:00:00');
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
      if (field === 'category') {
        if (categoryId) {
          const cat = fd.categories.find((c) => c.id === categoryId);
          if (cat) {
            const path: string[] = [];
            let current = cat;
            while (current.parent_id) {
              path.unshift(current.parent_id);
              const parent = fd.categories.find((c) => c.id === current.parent_id);
              if (!parent) break;
              current = parent;
            }
            setCatDrillPath(path);
          }
        } else {
          setCatDrillPath([]);
        }
      }
    }
  }

  // Display values for field rows
  const amountDisplay = amount ? `${amount} ${profile?.currency ?? ''}` : `0.00 ${profile?.currency ?? ''}`;
  const dateDisplay = date
    ? new Intl.DateTimeFormat(profile?.language ?? 'en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date + 'T00:00:00'))
    : '—';
  const categoryDisplay = categoryId ? buildCatLabel(fd.categories, categoryId, t) : '—';
  const pmDisplay = paymentMethodId
    ? (sortedPm.find((p) => p.id === paymentMethodId) ? pmName(sortedPm.find((p) => p.id === paymentMethodId)!) : '—')
    : '—';
  const tagsDisplay = tagIds.length > 0
    ? tagIds.map((tid) => { const tag = fd.tags.find((tg) => tg.id === tid); return tag ? tagName(tag.name, tag.is_default) : ''; }).filter(Boolean).join(', ')
    : '—';
  const eventDisplay = eventId ? (fd.events.find((e) => e.id === eventId)?.name ?? '—') : '—';
  const projectDisplay = projectId ? (fd.projects.find((p) => p.id === projectId)?.name ?? '—') : '—';

  const panelOpen = activeField !== null && !(activeField === 'amount' && !isMobile);

  if (loadingExpense || fd.loading) {
    return (
      <div className="add-expense-page add-expense-page--loading">
        <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="add-expense-page">
      {/* Header */}
      <div className="add-expense-page__header">
        <button className="btn btn--ghost btn--icon" onClick={() => navigate(-1)}>
          <ArrowLeftIcon width={18} height={18} />
        </button>
        <h1 className="add-expense-page__title">
          {id ? t('expenses.edit') : t('expenses.add')}
        </h1>
      </div>

      {/* Type selector */}
      <div className="add-expense-page__type-row">
        {(['expense', 'income', 'refund'] as ExpenseType[]).map((tp) => (
          <button
            key={tp}
            type="button"
            className={`add-expense-page__type-btn add-expense-page__type-btn--${tp}${type === tp ? ' add-expense-page__type-btn--active' : ''}`}
            onClick={() => setType(tp)}
          >
            {t(`expenses.type_${tp}`)}
          </button>
        ))}
      </div>

      {/* Amount display (mobile: big tappable; desktop: inline input) */}
      <div
        className={`add-expense-page__amount-row${activeField === 'amount' ? ' add-expense-page__amount-row--active' : ''}`}
        onClick={() => isMobile ? handleFieldTap('amount') : undefined}
      >
        <span className="add-expense-page__amount-label">{t('expenses.amount')}</span>
        {isMobile ? (
          <span className={`add-expense-page__amount-value${!amount ? ' add-expense-page__amount-value--placeholder' : ''}`}>
            {amountDisplay}
          </span>
        ) : (
          <div className="add-expense-page__amount-input-wrap">
            <input
              className="field__input add-expense-page__amount-input"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
            <span className="add-expense-page__currency">{profile?.currency ?? ''}</span>
          </div>
        )}
      </div>

      {/* Field rows (scrollable) */}
      <div className="add-expense-page__fields">
        {/* Date */}
        <div
          className={`add-expense-page__field-row${activeField === 'date' ? ' add-expense-page__field-row--active' : ''}`}
          onClick={() => handleFieldTap('date')}
        >
          <span className="add-expense-page__field-label">{t('common.starts_at')}</span>
          <span className="add-expense-page__field-value">{dateDisplay}</span>
          <ChevronRightIcon width={14} height={14} className="add-expense-page__field-chevron" />
        </div>

        {/* Category */}
        <div
          className={`add-expense-page__field-row${activeField === 'category' ? ' add-expense-page__field-row--active' : ''}`}
          onClick={() => handleFieldTap('category')}
        >
          <span className="add-expense-page__field-label">{t('settings_nav.categories')}</span>
          <span className="add-expense-page__field-value">{categoryDisplay}</span>
          <ChevronRightIcon width={14} height={14} className="add-expense-page__field-chevron" />
        </div>

        {/* Payment Method */}
        <div
          className={`add-expense-page__field-row${activeField === 'paymentMethod' ? ' add-expense-page__field-row--active' : ''}`}
          onClick={() => handleFieldTap('paymentMethod')}
        >
          <span className="add-expense-page__field-label">{t('settings_nav.payment_methods')}</span>
          <span className="add-expense-page__field-value">{pmDisplay}</span>
          <ChevronRightIcon width={14} height={14} className="add-expense-page__field-chevron" />
        </div>

        {/* Tags */}
        {sortedGroups.length > 0 && (
          <div
            className={`add-expense-page__field-row${activeField === 'tags' ? ' add-expense-page__field-row--active' : ''}`}
            onClick={() => handleFieldTap('tags')}
          >
            <span className="add-expense-page__field-label">{t('settings_nav.tags')}</span>
            <span className="add-expense-page__field-value">{tagsDisplay}</span>
            <ChevronRightIcon width={14} height={14} className="add-expense-page__field-chevron" />
          </div>
        )}

        {/* Event */}
        {fd.events.length > 0 && (
          <div
            className={`add-expense-page__field-row${activeField === 'event' ? ' add-expense-page__field-row--active' : ''}`}
            onClick={() => handleFieldTap('event')}
          >
            <span className="add-expense-page__field-label">{t('settings_nav.events')}</span>
            <span className="add-expense-page__field-value">{eventDisplay}</span>
            <ChevronRightIcon width={14} height={14} className="add-expense-page__field-chevron" />
          </div>
        )}

        {/* Project */}
        {fd.projects.length > 0 && (
          <div
            className={`add-expense-page__field-row${activeField === 'project' ? ' add-expense-page__field-row--active' : ''}`}
            onClick={() => handleFieldTap('project')}
          >
            <span className="add-expense-page__field-label">{t('settings_nav.projects')}</span>
            <span className="add-expense-page__field-value">{projectDisplay}</span>
            <ChevronRightIcon width={14} height={14} className="add-expense-page__field-chevron" />
          </div>
        )}

        {/* Description — inline, system keyboard */}
        <div className="add-expense-page__field-row add-expense-page__field-row--text" onClick={() => setActiveField(null)}>
          <span className="add-expense-page__field-label">{t('expenses.description')}</span>
          <input
            className="add-expense-page__inline-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('expenses.description_placeholder')}
            onFocus={() => setActiveField(null)}
          />
        </div>

        {/* Notes — inline, system keyboard */}
        <div className="add-expense-page__field-row add-expense-page__field-row--text" onClick={() => setActiveField(null)}>
          <span className="add-expense-page__field-label">{t('expenses.notes')}</span>
          <textarea
            className="add-expense-page__inline-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            onFocus={() => setActiveField(null)}
          />
        </div>
      </div>

      {/* Save bar — fixed at bottom, always visible */}
      <div className="add-expense-page__save-bar">
        {/* Tags panel shows Next here since tags is multi-select */}
        {activeField === 'tags' && (
          <button
            type="button"
            className="btn add-expense-page__next-btn"
            onClick={() => advanceFrom('tags')}
          >
            Next →
          </button>
        )}
        <button
          className="btn btn--primary add-expense-page__save-btn"
          onClick={handleSave}
          disabled={saving || !valid}
        >
          {saving ? '…' : t('common.save')}
        </button>
      </div>

      {/* Bottom panel */}
      <div className={`add-expense-page__panel${panelOpen ? ' add-expense-page__panel--open' : ''}`}>
        {/* Amount → numpad (mobile only) */}
        {activeField === 'amount' && isMobile && (
          <NumericKeypad
            value={amount}
            onChange={setAmount}
            onNext={() => advanceFrom('amount')}
          />
        )}

        {/* Date → custom calendar */}
        {activeField === 'date' && (() => {
          const calDays = buildCalendarDays(viewYear, viewMonth);
          const monthLabel = new Intl.DateTimeFormat(profile?.language ?? 'en', { month: 'long', year: 'numeric' })
            .format(new Date(viewYear, viewMonth, 1));
          const prevMonth = () => {
            if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
            else setViewMonth(m => m - 1);
          };
          const nextMonth = () => {
            if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
            else setViewMonth(m => m + 1);
          };
          const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
          return (
            <div className="date-picker">
              <div className="date-picker__header">
                <button type="button" className="date-picker__nav" onClick={prevMonth}>‹</button>
                <span className="date-picker__month">{monthLabel}</span>
                <button type="button" className="date-picker__nav" onClick={nextMonth}>›</button>
              </div>
              <div className="date-picker__grid">
                {DOW.map(d => <span key={d} className="date-picker__dow">{d}</span>)}
                {calDays.map((day, i) => {
                  if (!day) return <span key={`e-${i}`} />;
                  const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  return (
                    <button
                      key={iso}
                      type="button"
                      className={`date-picker__day${date === iso ? ' date-picker__day--selected' : ''}${TODAY === iso ? ' date-picker__day--today' : ''}`}
                      onClick={() => { setDate(iso); advanceFrom('date'); }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Category → drill-down */}
        {activeField === 'category' && (
          <div className="panel-content">
            {/* Breadcrumb */}
            <div className="panel-content__breadcrumb">
              <button
                className={`panel-content__crumb${currentParentId === null ? ' panel-content__crumb--active' : ''}`}
                onClick={() => setCatDrillPath([])}
              >
                {t('expenses.none')}
              </button>
              {catDrillPath.map((cid, i) => {
                const crumbCat = fd.categories.find((c) => c.id === cid);
                if (!crumbCat) return null;
                return (
                  <span key={cid} className="panel-content__crumb-wrap">
                    <ChevronRightIcon width={10} height={10} />
                    <button
                      className={`panel-content__crumb${i === catDrillPath.length - 1 ? ' panel-content__crumb--active' : ''}`}
                      onClick={() => setCatDrillPath((prev) => prev.slice(0, i + 1))}
                    >
                      {catName(crumbCat)}
                    </button>
                  </span>
                );
              })}
            </div>

            {/* None option */}
            <div className="panel-content__list">
              {currentParentId === null && (
                <button
                  className={`panel-content__item${categoryId === '' ? ' panel-content__item--selected' : ''}`}
                  onClick={() => { setCategoryId(''); advanceFrom('category'); }}
                >
                  {t('expenses.none')}
                </button>
              )}
              {currentLevelCats.map((cat) => {
                const hasChildren = fd.categories.some((c) => c.parent_id === cat.id);
                return (
                  <button
                    key={cat.id}
                    className={`panel-content__item${categoryId === cat.id ? ' panel-content__item--selected' : ''}`}
                    onClick={() => handleCatClick(cat)}
                  >
                    {cat.color && (
                      <span
                        className="panel-content__item-dot"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}
                    {catName(cat)}
                    {hasChildren && <ChevronRightIcon width={12} height={12} className="panel-content__item-arrow" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Method */}
        {activeField === 'paymentMethod' && (
          <div className="panel-content">
            <div className="panel-content__list">
              <button
                className={`panel-content__item${paymentMethodId === '' ? ' panel-content__item--selected' : ''}`}
                onClick={() => { setPaymentMethodId(''); advanceFrom('paymentMethod'); }}
              >
                {t('expenses.none')}
              </button>
              {sortedPm.map((pm) => (
                <button
                  key={pm.id}
                  className={`panel-content__item${paymentMethodId === pm.id ? ' panel-content__item--selected' : ''}`}
                  onClick={() => { setPaymentMethodId(pm.id); advanceFrom('paymentMethod'); }}
                >
                  {pmName(pm)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {activeField === 'tags' && (
          <div className="panel-content panel-content--tags">
            {sortedGroups.map((group) => {
              const groupTags = fd.tags.filter((tg) => tg.tag_group_id === group.id).sort((a, b) => a.position - b.position);
              if (!groupTags.length) return null;
              return (
                <div key={group.id} className="panel-content__tag-group">
                  <div className="panel-content__tag-group-name">{tgName(group.name)}</div>
                  <div className="panel-content__tag-list">
                    {groupTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className={`panel-content__tag${tagIds.includes(tag.id) ? ' panel-content__tag--active' : ''}`}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.color && (
                          <span
                            className="panel-content__tag-dot"
                            style={{ backgroundColor: tag.color }}
                          />
                        )}
                        {tagName(tag.name, tag.is_default)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Event */}
        {activeField === 'event' && (
          <div className="panel-content">
            <div className="panel-content__list">
              <button
                className={`panel-content__item${eventId === '' ? ' panel-content__item--selected' : ''}`}
                onClick={() => { setEventId(''); advanceFrom('event'); }}
              >
                {t('expenses.none')}
              </button>
              {fd.events.map((ev) => (
                <button
                  key={ev.id}
                  className={`panel-content__item${eventId === ev.id ? ' panel-content__item--selected' : ''}`}
                  onClick={() => { setEventId(ev.id); advanceFrom('event'); }}
                >
                  {ev.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Project */}
        {activeField === 'project' && (
          <div className="panel-content">
            <div className="panel-content__list">
              <button
                className={`panel-content__item${projectId === '' ? ' panel-content__item--selected' : ''}`}
                onClick={() => { setProjectId(''); advanceFrom('project'); }}
              >
                {t('expenses.none')}
              </button>
              {fd.projects.map((p) => (
                <button
                  key={p.id}
                  className={`panel-content__item${projectId === p.id ? ' panel-content__item--selected' : ''}`}
                  onClick={() => { setProjectId(p.id); advanceFrom('project'); }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
