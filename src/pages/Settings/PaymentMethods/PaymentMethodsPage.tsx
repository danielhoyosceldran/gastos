import { useState, useEffect, useCallback } from 'react';
import { ArrowUpIcon, ArrowDownIcon, Pencil1Icon, Cross2Icon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import { paymentMethodsService } from '../../../services/supabase/payment-methods.service';
import type { PaymentMethod } from '../../../types/payment-method.types';
import { Modal } from '../../../components/Modal/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';
import { toast } from '../../../store/toast.store';
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

  const load = useCallback(async () => {
    try { setItems(await paymentMethodsService.getAll()); }
    catch { toast.error(t('common.error_load')); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditTarget(null); setName(''); setIcon(''); setFormOpen(true); }
  function openEdit(pm: PaymentMethod) {
    setEditTarget(pm);
    setName(pm.is_default ? t(pm.name) : pm.name);
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

  async function move(pm: PaymentMethod, dir: -1 | 1) {
    const sorted = [...items].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((x) => x.id === pm.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    await Promise.all([paymentMethodsService.reorder(pm.id, swap.position), paymentMethodsService.reorder(swap.id, pm.position)]);
    setItems((prev) => prev.map((x) => {
      if (x.id === pm.id) return { ...x, position: swap.position };
      if (x.id === swap.id) return { ...x, position: pm.position };
      return x;
    }));
  }

  const sorted = [...items].sort((a, b) => a.position - b.position);
  const renderName = (pm: PaymentMethod) => pm.is_default ? t(pm.name) : pm.name;

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">{t('settings_nav.payment_methods')}</h1>
        <button className="btn btn--primary btn--sm" onClick={openAdd}>{t('common.add')}</button>
      </div>
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
        : sorted.length === 0 ? <div className="settings-empty">{t('payment_methods.empty')}</div>
        : (
          <div className="settings-list">
            {sorted.map((pm, idx) => (
              <div key={pm.id} className="settings-item">
                {pm.icon && <span style={{ fontSize: '16px' }}>{pm.icon}</span>}
                <span className="settings-item__name">{renderName(pm)}</span>
                {pm.is_default && <span className="settings-item__default-badge">{t('common.default')}</span>}
                <div className="settings-item__actions">
                  <button className="btn btn--ghost btn--icon btn--sm" onClick={() => move(pm, -1)} disabled={idx === 0}><ArrowUpIcon width={12} height={12} /></button>
                  <button className="btn btn--ghost btn--icon btn--sm" onClick={() => move(pm, 1)} disabled={idx === sorted.length - 1}><ArrowDownIcon width={12} height={12} /></button>
                  <button className="btn btn--ghost btn--icon btn--sm" onClick={() => openEdit(pm)}><Pencil1Icon width={12} height={12} /></button>
                  <button className="btn btn--ghost btn--icon btn--sm" onClick={() => setDeleteTarget(pm)}><Cross2Icon width={12} height={12} /></button>
                </div>
              </div>
            ))}
          </div>
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
