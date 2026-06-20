import { useState, useEffect, useCallback } from 'react';
import { PlusIcon, Pencil1Icon, Cross2Icon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { categoriesService } from '../../../services/supabase/categories.service';
import type { Category, CreateCategoryDTO, UpdateCategoryDTO } from '../../../types/category.types';
import { Modal } from '../../../components/Modal/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';
import { ColorPicker } from '../../../components/ColorPicker/ColorPicker';
import { toast } from '../../../store/toast.store';
import { SortableItem } from '../../../components/SortableList/SortableItem';
import { DragHandle } from '../../../components/DragHandle/DragHandle';
import '../../../components/SettingsList/SettingsList.scss';

type FormData = { name: string; color: string | null; icon: string | null };
const EMPTY_FORM: FormData = { name: '', color: null, icon: null };

function buildTree(flat: Category[]): Category[] {
  const map = new Map<string, Category>();
  flat.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: Category[] = [];
  flat.forEach((c) => {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children!.push(map.get(c.id)!);
    } else {
      roots.push(map.get(c.id)!);
    }
  });
  return roots;
}

function countDepth(cat: Category, allFlat: Category[]): number {
  let depth = 0;
  let current: Category | undefined = cat;
  while (current?.parent_id) {
    depth++;
    current = allFlat.find((c) => c.id === current!.parent_id);
  }
  return depth;
}

interface SortableCatLevelProps {
  cats: Category[];
  level: number;
  onReorder: (newOrder: Category[]) => void;
  onOpenAdd: (cat: Category) => void;
  onOpenEdit: (cat: Category) => void;
  onOpenDelete: (cat: Category) => void;
  renderName: (cat: Category) => string;
  t: (key: string) => string;
}

function SortableCatLevel({ cats, level, onReorder, onOpenAdd, onOpenEdit, onOpenDelete, renderName, t }: SortableCatLevelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = cats.findIndex((c) => c.id === active.id);
    const newIdx = cats.findIndex((c) => c.id === over.id);
    onReorder(arrayMove(cats, oldIdx, newIdx));
  }

  const levelClass = level === 1 ? 'settings-item--sub' : level === 2 ? 'settings-item--sub2' : '';

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={cats.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        {cats.map((cat) => (
          <SortableItem key={cat.id} id={cat.id}>
            {(handleProps) => (
              <div>
                <div className={`settings-item ${levelClass}`}>
                  <span className="settings-item__color" style={{ backgroundColor: cat.color ?? 'transparent' }} />
                  <span className="settings-item__name">{renderName(cat)}</span>
                  {cat.is_default && <span className="settings-item__default-badge">{t('common.default')}</span>}
                  <div className="settings-item__actions">
                    {level < 2 && (
                      <button className="btn btn--ghost btn--icon btn--sm" onClick={() => onOpenAdd(cat)} title={t('categories.add_sub')}><PlusIcon width={12} height={12} /></button>
                    )}
                    <button className="btn btn--ghost btn--icon btn--sm" onClick={() => onOpenEdit(cat)} title={t('common.edit')}><Pencil1Icon width={12} height={12} /></button>
                    <button className="btn btn--ghost btn--icon btn--sm" onClick={() => onOpenDelete(cat)} title={t('common.delete')}><Cross2Icon width={12} height={12} /></button>
                    <DragHandle {...handleProps} />
                  </div>
                </div>
                {cat.children && cat.children.length > 0 && (
                  <SortableCatLevel
                    cats={cat.children}
                    level={level + 1}
                    onReorder={onReorder}
                    onOpenAdd={onOpenAdd}
                    onOpenEdit={onOpenEdit}
                    onOpenDelete={onOpenDelete}
                    renderName={renderName}
                    t={t}
                  />
                )}
              </div>
            )}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}

export function CategoriesPage() {
  const { t } = useTranslation();
  const [flat, setFlat] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [parentTarget, setParentTarget] = useState<Category | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteBudgets, setDeleteBudgets] = useState(0);

  const load = useCallback(async () => {
    try {
      setFlat(await categoriesService.getAll());
    } catch {
      toast.error(t('common.error_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  function openAdd(parent?: Category) {
    setEditTarget(null);
    setParentTarget(parent ?? null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(cat: Category) {
    setEditTarget(cat);
    setParentTarget(null);
    setForm({ name: cat.is_default ? t(cat.name) : cat.name, color: cat.color, icon: cat.icon });
    setFormOpen(true);
  }

  async function openDelete(cat: Category) {
    const count = await categoriesService.getBudgetCount(cat.id);
    setDeleteBudgets(count);
    setDeleteTarget(cat);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        const dto: UpdateCategoryDTO = { name: form.name.trim(), color: form.color, icon: form.icon };
        const updated = await categoriesService.update(editTarget.id, dto);
        setFlat((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const dto: CreateCategoryDTO = { name: form.name.trim(), color: form.color, icon: form.icon, parent_id: parentTarget?.id ?? null };
        const created = await categoriesService.create(dto);
        setFlat((prev) => [...prev, created]);
      }
      toast.success(t('common.saved'));
      setFormOpen(false);
    } catch {
      toast.error(t('common.error_save'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await categoriesService.delete(deleteTarget.id);
      setFlat((prev) => prev.filter((c) => c.id !== deleteTarget.id && c.parent_id !== deleteTarget.id));
      toast.success(t('common.deleted'));
      setDeleteTarget(null);
    } catch {
      toast.error(t('common.error_delete'));
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleReorder(newOrder: Category[]) {
    setFlat((prev) => {
      const updated = [...prev];
      newOrder.forEach((cat, idx) => {
        const i = updated.findIndex((c) => c.id === cat.id);
        if (i >= 0) updated[i] = { ...updated[i], position: idx };
      });
      return updated;
    });
    await Promise.all(newOrder.map((cat, idx) => categoriesService.reorder(cat.id, idx)));
  }

  const renderName = (cat: Category) => cat.is_default ? t(cat.name) : cat.name;
  const tree = buildTree([...flat].sort((a, b) => a.position - b.position));

  const modalTitle = editTarget
    ? t('categories.edit')
    : parentTarget
    ? t('categories.add_sub')
    : t('categories.add');

  const depth = parentTarget ? countDepth(parentTarget, flat) + 1 : 0;

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">{t('settings_nav.categories')}</h1>
        <button className="btn btn--primary btn--sm" onClick={() => openAdd()}>{t('categories.add')}</button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
      ) : flat.length === 0 ? (
        <div className="settings-empty">{t('categories.empty')}</div>
      ) : (
        <div className="settings-list">
          <SortableCatLevel
            cats={tree}
            level={0}
            onReorder={handleReorder}
            onOpenAdd={openAdd}
            onOpenEdit={openEdit}
            onOpenDelete={openDelete}
            renderName={renderName}
            t={t as (key: string) => string}
          />
        </div>
      )}

      <Modal
        open={formOpen}
        title={modalTitle}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setFormOpen(false)} disabled={saving}>{t('common.cancel')}</button>
            <button className="btn btn--primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? '…' : t('common.save')}
            </button>
          </>
        }
      >
        <div className="form">
          {depth >= 2 && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('categories.max_depth')}</p>
          )}
          {editTarget?.is_default && (
            <p style={{ fontSize: '12px', color: 'var(--toast-warning-text)', background: 'var(--toast-warning-bg)', padding: '8px 12px' }}>
              {t('common.default_warning')}
            </p>
          )}
          <div className="field">
            <label className="field__label">{t('common.name')}</label>
            <input
              className="field__input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('categories.name_placeholder')}
              autoFocus
            />
          </div>
          <div className="field">
            <label className="field__label">{t('common.color')}</label>
            <ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} />
          </div>
          <div className="field">
            <label className="field__label">{t('common.icon')}</label>
            <input className="field__input" value={form.icon ?? ''} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value || null }))} placeholder="emoji or text" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('common.delete_confirm_title')}
        message={deleteBudgets > 0
          ? t('categories.delete_warning_budgets', { count: deleteBudgets })
          : t('categories.delete_warning')}
        confirmLabel={t('common.delete')}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
