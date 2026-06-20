import { useState, useEffect, useCallback } from 'react';
import { Pencil1Icon, Cross2Icon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import { displayName } from '../../../lib/displayName';
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
import { paymentMethodsService } from '../../../services/supabase/payment-methods.service';
import type { PaymentMethod } from '../../../types/payment-method.types';
import { Modal } from '../../../components/Modal/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';
import { toast } from '../../../store/toast.store';
import { SortableItem } from '../../../components/SortableList/SortableItem';
import { DragHandle } from '../../../components/DragHandle/DragHandle';
import '../../../components/SettingsList/SettingsList.scss';

export function PaymentMethodsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PaymentMethod | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    try { setItems(await paymentMethodsService.getAll()); }
    catch { toast.error(t('common.error_load')); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditTarget(null); setName(''); setIcon(''); setFormOpen(true); }
  function openEdit(pm: PaymentMethod) {
    setEditTarget(pm);
    setName(displayName(pm, t));
    setIcon(pm.icon ?? '');
    setFormOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await paymentMethodsService.update(editTarget.id, { name: name.trim(), icon: icon || null });
        setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await paymentMethodsService.create({ name: name.trim(), icon: icon || null });
        setItems((prev) => [...prev, created]);
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
      await paymentMethodsService.delete(deleteTarget.id);
      setItems((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success(t('common.deleted'));
      setDeleteTarget(null);
    } catch { toast.error(t('common.error_delete')); }
    finally { setDeleteLoading(false); }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sorted = [...items].sort((a, b) => a.position - b.position);
    const oldIdx = sorted.findIndex((x) => x.id === active.id);
    const newIdx = sorted.findIndex((x) => x.id === over.id);
    const newOrder = arrayMove(sorted, oldIdx, newIdx);
    setItems(newOrder.map((x, i) => ({ ...x, position: i })));
    await Promise.all(newOrder.map((x, i) => paymentMethodsService.reorder(x.id, i)));
  }

  const sorted = [...items].sort((a, b) => a.position - b.position);
  const renderName = (pm: PaymentMethod) => displayName(pm, t);

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">{t('settings_nav.payment_methods')}</h1>
        <button className="btn btn--primary btn--sm" onClick={openAdd}>{t('common.add')}</button>
      </div>
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
        : sorted.length === 0 ? <div className="settings-empty">{t('payment_methods.empty')}</div>
        : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sorted.map((x) => x.id)} strategy={verticalListSortingStrategy}>
              <div className="settings-list">
                {sorted.map((pm) => (
                  <SortableItem key={pm.id} id={pm.id}>
                    {(handleProps) => (
                      <div className="settings-item">
                        {pm.icon && <span style={{ fontSize: '16px' }}>{pm.icon}</span>}
                        <span className="settings-item__name">{renderName(pm)}</span>
                        {pm.is_default && <span className="settings-item__default-badge">{t('common.default')}</span>}
                        <div className="settings-item__actions">
                          <button className="btn btn--ghost btn--icon btn--sm" onClick={() => openEdit(pm)}><Pencil1Icon width={12} height={12} /></button>
                          <button className="btn btn--ghost btn--icon btn--sm" onClick={() => setDeleteTarget(pm)}><Cross2Icon width={12} height={12} /></button>
                          <DragHandle {...handleProps} />
                        </div>
                      </div>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

      <Modal open={formOpen} title={editTarget ? t('common.edit') : t('common.add')} onClose={() => setFormOpen(false)}
        footer={<>
          <button className="btn btn--ghost" onClick={() => setFormOpen(false)} disabled={saving}>{t('common.cancel')}</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving || !name.trim()}>{saving ? '…' : t('common.save')}</button>
        </>}>
        <div className="form">
          {editTarget?.is_default && (
            <p style={{ fontSize: '12px', color: 'var(--toast-warning-text)', background: 'var(--toast-warning-bg)', padding: '8px 12px' }}>
              {t('common.default_warning')}
            </p>
          )}
          <div className="field">
            <label className="field__label">{t('common.name')}</label>
            <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label className="field__label">{t('common.icon')}</label>
            <input className="field__input" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="emoji or text" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('common.delete_confirm_title')}
        message={t('payment_methods.delete_warning')}
        confirmLabel={t('common.delete')}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
