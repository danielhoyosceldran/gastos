import { useState, useEffect, useCallback } from 'react';
import { ArrowUpIcon, ArrowDownIcon, Pencil1Icon, Cross2Icon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import { tagsService } from '../../../services/supabase/tags.service';
import { tagGroupsService } from '../../../services/supabase/tag-groups.service';
import type { Tag, TagGroup } from '../../../types/tag.types';
import { Modal } from '../../../components/Modal/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';
import { ColorPicker } from '../../../components/ColorPicker/ColorPicker';
import { toast } from '../../../store/toast.store';
import '../../../components/SettingsList/SettingsList.scss';

type FormData = { name: string; color: string | null; icon: string | null; tag_group_id: string };

export function TagsPage() {
  const { t } = useTranslation();
  const [tags, setTags] = useState<Tag[]>([]);
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Tag | null>(null);
  const [form, setForm] = useState<FormData>({ name: '', color: null, icon: null, tag_group_id: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t2, g] = await Promise.all([tagsService.getAll(), tagGroupsService.getAll()]);
      setTags(t2);
      setGroups(g);
    } catch { toast.error(t('common.error_load')); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  function openAdd(groupId: string) {
    setEditTarget(null);
    setForm({ name: '', color: null, icon: null, tag_group_id: groupId });
    setFormOpen(true);
  }

  function openEdit(tag: Tag) {
    setEditTarget(tag);
    setForm({
      name: tag.is_default ? t(tag.name) : tag.name,
      color: tag.color,
      icon: tag.icon,
      tag_group_id: tag.tag_group_id,
    });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await tagsService.update(editTarget.id, {
          name: form.name.trim(), color: form.color, icon: form.icon, tag_group_id: form.tag_group_id,
        });
        setTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await tagsService.create({ name: form.name.trim(), color: form.color, icon: form.icon, tag_group_id: form.tag_group_id });
        setTags((prev) => [...prev, created]);
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
      await tagsService.delete(deleteTarget.id);
      setTags((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast.success(t('common.deleted'));
      setDeleteTarget(null);
    } catch { toast.error(t('common.error_delete')); }
    finally { setDeleteLoading(false); }
  }

  async function move(tag: Tag, siblings: Tag[], dir: -1 | 1) {
    const idx = siblings.findIndex((t) => t.id === tag.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const swap = siblings[swapIdx];
    await Promise.all([tagsService.reorder(tag.id, swap.position), tagsService.reorder(swap.id, tag.position)]);
    setTags((prev) => prev.map((t) => {
      if (t.id === tag.id) return { ...t, position: swap.position };
      if (t.id === swap.id) return { ...t, position: tag.position };
      return t;
    }));
  }

  const renderTagName = (tag: Tag) => tag.is_default ? t(tag.name) : tag.name;
  const renderGroupName = (g: TagGroup) => g.name.startsWith('tag_group.') ? t(g.name) : g.name;
  const sortedGroups = [...groups].sort((a, b) => a.position - b.position);

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">{t('settings_nav.tags')}</h1>
      </div>
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
        : sortedGroups.map((group) => {
          const groupTags = [...tags.filter((t) => t.tag_group_id === group.id)].sort((a, b) => a.position - b.position);
          return (
            <div key={group.id} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                  {renderGroupName(group)}
                </h2>
                <button className="btn btn--ghost btn--sm" onClick={() => openAdd(group.id)}>+ {t('tags.add')}</button>
              </div>
              {groupTags.length === 0
                ? <div className="settings-empty" style={{ padding: '16px' }}>{t('tags.empty_group')}</div>
                : (
                  <div className="settings-list">
                    {groupTags.map((tag, idx) => (
                      <div key={tag.id} className="settings-item">
                        <span className="settings-item__color" style={{ backgroundColor: tag.color ?? 'transparent' }} />
                        <span className="settings-item__name">{renderTagName(tag)}</span>
                        {tag.is_default && <span className="settings-item__default-badge">{t('common.default')}</span>}
                        <div className="settings-item__actions">
                          <button className="btn btn--ghost btn--icon btn--sm" onClick={() => move(tag, groupTags, -1)} disabled={idx === 0}><ArrowUpIcon width={12} height={12} /></button>
                          <button className="btn btn--ghost btn--icon btn--sm" onClick={() => move(tag, groupTags, 1)} disabled={idx === groupTags.length - 1}><ArrowDownIcon width={12} height={12} /></button>
                          <button className="btn btn--ghost btn--icon btn--sm" onClick={() => openEdit(tag)}><Pencil1Icon width={12} height={12} /></button>
                          <button className="btn btn--ghost btn--icon btn--sm" onClick={() => setDeleteTarget(tag)}><Cross2Icon width={12} height={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          );
        })}

      <Modal open={formOpen} title={editTarget ? t('common.edit') : t('tags.add')} onClose={() => setFormOpen(false)}
        footer={<>
          <button className="btn btn--ghost" onClick={() => setFormOpen(false)} disabled={saving}>{t('common.cancel')}</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? '…' : t('common.save')}</button>
        </>}>
        <div className="form">
          {editTarget?.is_default && (
            <p style={{ fontSize: '12px', color: 'var(--toast-warning-text)', background: 'var(--toast-warning-bg)', padding: '8px 12px' }}>
              {t('common.default_warning')}
            </p>
          )}
          <div className="field">
            <label className="field__label">{t('common.name')}</label>
            <input className="field__input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="field">
            <label className="field__label">{t('common.group')}</label>
            <select className="field__select" value={form.tag_group_id} onChange={(e) => setForm((f) => ({ ...f, tag_group_id: e.target.value }))}>
              {sortedGroups.map((g) => <option key={g.id} value={g.id}>{renderGroupName(g)}</option>)}
            </select>
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
        message={t('tags.delete_warning')}
        confirmLabel={t('common.delete')}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
