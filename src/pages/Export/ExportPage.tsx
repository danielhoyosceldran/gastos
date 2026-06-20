import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { expensesService } from '../../services/supabase/expenses.service';
import { categoriesService } from '../../services/supabase/categories.service';
import { tagsService } from '../../services/supabase/tags.service';
import { paymentMethodsService } from '../../services/supabase/payment-methods.service';
import { eventsService } from '../../services/supabase/events.service';
import { projectsService } from '../../services/supabase/projects.service';
import type { Expense, ExpenseType } from '../../types/expense.types';
import { toast } from '../../store/toast.store';
import { useAuthStore } from '../../store/auth.store';
import { formatDate } from '../../lib/format';
import './ExportPage.scss';

function toMonthStr(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function currentMonthStr() {
  const now = new Date();
  return toMonthStr(now.getFullYear(), now.getMonth() + 1);
}

function firstDayOf(monthStr: string) { return `${monthStr}-01`; }
function lastDayOf(monthStr: string) {
  const [y, m] = monthStr.split('-').map(Number);
  return toMonthStr(y, m) + '-' + new Date(y, m, 0).getDate();
}

type Row = string[];

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportPage() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuthStore();
  const lang = profile?.language ?? i18n.language ?? 'en';

  const [fromMonth, setFromMonth] = useState(currentMonthStr());
  const [toMonth, setToMonth] = useState(currentMonthStr());
  const [typeFilter, setTypeFilter] = useState<ExpenseType | ''>('');
  const [generating, setGenerating] = useState<'csv' | 'pdf' | null>(null);

  async function loadData(): Promise<{ rows: Row[]; headers: string[]; expenses: Expense[] } | null> {
    const all = await expensesService.getAll();

    const from = firstDayOf(fromMonth <= toMonth ? fromMonth : toMonth);
    const to = lastDayOf(fromMonth <= toMonth ? toMonth : fromMonth);

    let filtered = all.filter((e) => e.date >= from && e.date <= to);
    if (typeFilter) filtered = filtered.filter((e) => e.type === typeFilter);

    if (filtered.length === 0) return null;

    // Load reference data in parallel
    const [categories, tags, payments, events, projects] = await Promise.all([
      categoriesService.getAll(),
      tagsService.getAll(),
      paymentMethodsService.getAll(),
      eventsService.getAll(),
      projectsService.getAll(),
    ]);

    function resolveCategory(id: string | null): string {
      if (!id) return '';
      const cat = categories.find((c) => c.id === id);
      if (!cat) return '';
      const name = cat.is_default ? t(cat.name) : cat.name;
      if (cat.parent_id) {
        const parent = categories.find((c) => c.id === cat.parent_id);
        if (parent) {
          const pname = parent.is_default ? t(parent.name) : parent.name;
          return `${pname} > ${name}`;
        }
      }
      return name;
    }

    function resolveTagNames(ids: string[]): string {
      return ids.map((id) => {
        const tag = tags.find((tg) => tg.id === id);
        if (!tag) return '';
        return tag.is_default ? t(tag.name) : tag.name;
      }).filter(Boolean).join(', ');
    }

    function resolvePayment(id: string | null): string {
      if (!id) return '';
      const pm = payments.find((p) => p.id === id);
      if (!pm) return '';
      return pm.is_default ? t(pm.name) : pm.name;
    }

    function resolveName(id: string | null, list: { id: string; name: string }[]): string {
      if (!id) return '';
      return list.find((x) => x.id === id)?.name ?? '';
    }

    const headers = [
      t('export.col_date'), t('export.col_type'), t('export.col_amount'),
      t('export.col_currency'), t('export.col_description'), t('export.col_category'),
      t('export.col_payment'), t('export.col_event'), t('export.col_project'), t('export.col_tags'),
    ];

    const rows: Row[] = filtered.map((e) => [
      formatDate(e.date, lang),
      t(`expenses.type_${e.type}`),
      e.amount.toFixed(2),
      e.currency,
      e.description ?? '',
      resolveCategory(e.category_id),
      resolvePayment(e.payment_method_id),
      resolveName(e.event_id, events),
      resolveName(e.project_id, projects),
      resolveTagNames(e.tag_ids),
    ]);

    return { rows, headers, expenses: filtered };
  }

  async function exportCsv() {
    setGenerating('csv');
    try {
      const result = await loadData();
      if (!result) { toast.warning(t('export.no_data')); return; }
      const { rows, headers } = result;
      const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const range = `${fromMonth}_${toMonth}`;
      downloadBlob(blob, `${t('export.filename_csv')}_${range}.csv`);
    } catch { toast.error(t('common.error_save')); }
    finally { setGenerating(null); }
  }

  async function exportPdf() {
    setGenerating('pdf');
    try {
      const result = await loadData();
      if (!result) { toast.warning(t('export.no_data')); return; }
      const { rows, headers } = result;

      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(14);
      doc.text(t('export.title'), 14, 16);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`${fromMonth} → ${toMonth}`, 14, 23);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 28,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [50, 50, 50] },
      });

      const range = `${fromMonth}_${toMonth}`;
      doc.save(`${t('export.filename_pdf')}_${range}.pdf`);
    } catch { toast.error(t('common.error_save')); }
    finally { setGenerating(null); }
  }

  const busy = generating !== null;

  return (
    <div className="export-page">
      <h1 className="export-page__title">{t('export.title')}</h1>

      <div className="export-page__form">
        <div className="field">
          <label className="field__label">{t('export.date_from')}</label>
          <input
            className="field__input"
            type="month"
            value={fromMonth}
            onChange={(e) => setFromMonth(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="field">
          <label className="field__label">{t('export.date_to')}</label>
          <input
            className="field__input"
            type="month"
            value={toMonth}
            onChange={(e) => setToMonth(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="field">
          <label className="field__label">{t('export.type_filter')}</label>
          <select
            className="field__select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ExpenseType | '')}
            disabled={busy}
          >
            <option value="">{t('export.all_types')}</option>
            <option value="expense">{t('expenses.type_expense')}</option>
            <option value="income">{t('expenses.type_income')}</option>
            <option value="refund">{t('expenses.type_refund')}</option>
          </select>
        </div>

        <div className="export-page__actions">
          <button className="btn btn--primary" onClick={exportCsv} disabled={busy}>
            {generating === 'csv' ? t('export.generating') : t('export.export_csv')}
          </button>
          <button className="btn btn--ghost" onClick={exportPdf} disabled={busy}>
            {generating === 'pdf' ? t('export.generating') : t('export.export_pdf')}
          </button>
        </div>
      </div>
    </div>
  );
}
