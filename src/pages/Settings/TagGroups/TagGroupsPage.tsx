import { useState, useEffect, useCallback } from 'react';
import { ArrowUpIcon, ArrowDownIcon, Pencil1Icon, Cross2Icon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import { tagGroupsService } from '../../../services/supabase/tag-groups.service';
import type { TagGroup } from '../../../types/tag.types';
import { Modal } from '../../../components/Modal/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';
import { toast } from '../../../store/toast.store';
import '../../../components/SettingsList/SettingsList.scss';

const UNGROUPED_KEY = 'tag_group.ungrouped';

export function TagGroupsPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TagGroup | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TagGroup | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    try { setGroups(await tagGroupsService.getAll()); }
    catch { toast.error(t('common.error_load')); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditTarget(null); setName(''); setFormOpen(true); }
  function openEdit(g: TagGroup) {
    setEditTarget(g);
    setName(g.name === UNGROUPED_KEY ? t('tag_group.ungrouped') : g.name);
    setFormOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await tagGroupsService.update(editTarget.id, { name: name.trim() });
        setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      } else {
        const created = await tagGroupsService.create({ name: name.trim() });
        setGroups((prev) => [...prev, created]);
      }
      toast.success(t('common.saved'));
      setFormOpen(false);
    } catch { toast.error(t('common.error_save')); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const ungrouped = groups.find((g) => g.name === UNGROUPED_KEY);
    if (!ungrouped) return;
    setDeleteLoading(true);
    try {
      await tagGroupsService.delete(deleteTarget.id, ungrouped.id);
      setGroups((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      toast.success(t('common.deleted'));
      setDeleteTarget(null);
    } catch { toast.error(t('common.error_delete')); }
    finally { setDeleteLoading(false); }
  }

  async function move(g: TagGroup, dir: -1 | 1) {
    const sorted = [...groups].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((x) => x.id === g.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    await Promise.all([tagGroupsService.reorder(g.id, swap.position), tagGroupsService.reorder(swap.id, g.position)]);
    setGroups((prev) => prev.map((x) => {
      if (x.id === g.id) return { ...x, position: swap.position };
      if (x.id === swap.id) return { ...x, position: g.position };
      return x;
    }));
  }

  const sorted = [...groups].sort((a, b) => a.position - b.position);
  const isUngrouped = (g: TagGroup) => g.name === UNGROUPED_KEY;
  const renderName = (g: TagGroup) => isUngrouped(g) ? t('tag_group.ungrouped') : g.name;

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">{t('settings_nav.tag_groups')}</h1>
        <button className="btn btn--primary btn--sm" onClick={openAdd}>{t('common.add')}</button>
      </div>
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
        : sorted.length === 0 ? <div className="settings-empty">{t('tag_groups.empty')}</div>
        : (
          <div className="settings-list">
            {sorted.map((g, idx) => (
              <div key={g.id} className="settings-item">
                <span className="settings-item__name">{renderName(g)}</span>
                {isUngrouped(g) && <span className="settings-item__default-badge">{t('common.system')}</span>}
                <div className="settings-item__actions">
                  <button className="btn btn--ghost btn--icon btn--sm" onClick={() => move(g, -1)} disabled={idx === 0}><ArrowUpIcon width={12} height={12} /></button>
                  <button className="btn btn--ghost btn--icon btn--sm" onClick={() => move(g, 1)} disabled={idx === sorted.length - 1}><ArrowDownIcon width={12} height={12} /></button>
                  <button className="btn btn--ghost btn--icon btn--sm" onClick={() => openEdit(g)}><Pencil1Icon width={12} height={12} /></button>
                  {!isUngrouped(g) && (
                    <button className="btn btn--ghost btn--icon btn--sm" onClick={() => setDeleteTarget(g)}><Cross2Icon width={12} height={12} /></button>
                  )}
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
        <div className="field">
          <label className="field__label">{t('common.name')}</label>
          <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('common.delete_confirm_title')}
        message={t('tag_groups.delete_warning')}
        confirmLabel={t('common.delete')}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
