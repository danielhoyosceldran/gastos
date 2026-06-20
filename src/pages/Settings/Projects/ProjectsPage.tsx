import { useState, useEffect, useCallback } from 'react';
import { Pencil1Icon, Cross2Icon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import { projectsService } from '../../../services/supabase/projects.service';
import type { Project, CreateProjectDTO } from '../../../types/project.types';
import { Modal } from '../../../components/Modal/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';
import { toast } from '../../../store/toast.store';
import '../../../components/SettingsList/SettingsList.scss';

type FormData = { name: string; description: string; starts_at: string; ends_at: string };
const EMPTY: FormData = { name: '', description: '', starts_at: '', ends_at: '' };

export function ProjectsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteBudgets, setDeleteBudgets] = useState(0);

  const load = useCallback(async () => {
    try { setItems(await projectsService.getAll()); }
    catch { toast.error(t('common.error_load')); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditTarget(null); setForm(EMPTY); setFormOpen(true); }
  function openEdit(p: Project) {
    setEditTarget(p);
    setForm({ name: p.name, description: p.description ?? '', starts_at: p.starts_at ?? '', ends_at: p.ends_at ?? '' });
    setFormOpen(true);
  }

  async function openDelete(p: Project) {
    const count = await projectsService.getBudgetCount(p.id);
    setDeleteBudgets(count);
    setDeleteTarget(p);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const dto: CreateProjectDTO = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      };
      if (editTarget) {
        const updated = await projectsService.update(editTarget.id, dto);
        setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await projectsService.create(dto);
        setItems((prev) => [created, ...prev]);
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
      await projectsService.delete(deleteTarget.id);
      setItems((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success(t('common.deleted'));
      setDeleteTarget(null);
    } catch { toast.error(t('common.error_delete')); }
    finally { setDeleteLoading(false); }
  }

  const f = (s: string | null) => s ? new Date(s).toLocaleDateString() : '';

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">{t('settings_nav.projects')}</h1>
        <button className="btn btn--primary btn--sm" onClick={openAdd}>{t('common.add')}</button>
      </div>
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
        : items.length === 0 ? <div className="settings-empty">{t('projects.empty')}</div>
        : (
          <div className="settings-list">
            {items.map((p) => (
              <div key={p.id} className="settings-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="settings-item__name">{p.name}</div>
                  {(p.starts_at || p.ends_at) && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {f(p.starts_at)}{p.starts_at && p.ends_at ? ' — ' : ''}{f(p.ends_at)}
                    </div>
                  )}
                </div>
                <div className="settings-item__actions">
                  <button className="btn btn--ghost btn--icon btn--sm" onClick={() => openEdit(p)}><Pencil1Icon width={12} height={12} /></button>
                  <button className="btn btn--ghost btn--icon btn--sm" onClick={() => openDelete(p)}><Cross2Icon width={12} height={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

      <Modal open={formOpen} title={editTarget ? t('common.edit') : t('projects.add')} onClose={() => setFormOpen(false)}
        footer={<>
          <button className="btn btn--ghost" onClick={() => setFormOpen(false)} disabled={saving}>{t('common.cancel')}</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? '…' : t('common.save')}</button>
        </>}>
        <div className="form">
          <div className="field">
            <label className="field__label">{t('common.name')}</label>
            <input className="field__input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="field">
            <label className="field__label">{t('common.description')}</label>
            <textarea className="field__textarea" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="field">
              <label className="field__label">{t('common.starts_at')}</label>
              <input type="date" className="field__input" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} />
            </div>
            <div className="field">
              <label className="field__label">{t('common.ends_at')}</label>
              <input type="date" className="field__input" value={form.ends_at} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('common.delete_confirm_title')}
        message={deleteBudgets > 0 ? t('projects.delete_warning_budgets', { count: deleteBudgets }) : t('projects.delete_warning')}
        confirmLabel={t('common.delete')}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
