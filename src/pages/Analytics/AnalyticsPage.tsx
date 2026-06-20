import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { analyticsService } from '../../services/supabase/analytics.service';
import type { DimensionSlice, TrendPoint, AnalyticsDimension } from '../../types/analytics.types';
import { DimensionChart } from './DimensionChart';
import { TrendChart } from './TrendChart';
import { toast } from '../../store/toast.store';
import './AnalyticsPage.scss';

const DIMENSIONS: AnalyticsDimension[] = ['category', 'tag', 'project', 'event'];

function thisYear() { return new Date().getFullYear(); }
function thisMonth() { return new Date().getMonth() + 1; }

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function lastDayOf(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function AnalyticsPage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();

  const currency = profile?.currency ?? 'EUR';
  const language = profile?.language ?? 'en';

  const [fromYear, setFromYear] = useState(thisYear());
  const [fromMonth, setFromMonth] = useState(1);
  const [toYear, setToYear] = useState(thisYear());
  const [toMonth, setToMonth] = useState(thisMonth());
  const [selectedCurrency, setSelectedCurrency] = useState(currency);

  const [dimData, setDimData] = useState<Record<AnalyticsDimension, DimensionSlice[]>>({
    category: [], tag: [], project: [], event: [],
  });
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const from = toDateStr(fromYear, fromMonth, 1);
  const to   = toDateStr(toYear, toMonth, lastDayOf(toYear, toMonth));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, tag, project, event, trend] = await Promise.all([
        analyticsService.getByDimension('category', selectedCurrency, from, to),
        analyticsService.getByDimension('tag',      selectedCurrency, from, to),
        analyticsService.getByDimension('project',  selectedCurrency, from, to),
        analyticsService.getByDimension('event',    selectedCurrency, from, to),
        analyticsService.getOverTime(selectedCurrency, from, to),
      ]);
      setDimData({ category: cat, tag, project, event });
      setTrendData(trend);
    } catch {
      toast.error(t('common.error_load'));
    } finally {
      setLoading(false);
    }
  }, [selectedCurrency, from, to, t]);

  useEffect(() => { load(); }, [load]);

  const years = Array.from({ length: 5 }, (_, i) => thisYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="analytics-page">
      <header className="analytics-page__header">
        <h1 className="analytics-page__title">{t('analytics.title')}</h1>
      </header>

      <section className="analytics-page__filters">
        <div className="analytics-filter">
          <label className="analytics-filter__label">{t('analytics.from')}</label>
          <div className="analytics-filter__row">
            <select value={fromMonth} onChange={(e) => setFromMonth(+e.target.value)}>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={fromYear} onChange={(e) => setFromYear(+e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="analytics-filter">
          <label className="analytics-filter__label">{t('analytics.to')}</label>
          <div className="analytics-filter__row">
            <select value={toMonth} onChange={(e) => setToMonth(+e.target.value)}>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={toYear} onChange={(e) => setToYear(+e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="analytics-filter">
          <label className="analytics-filter__label">{t('analytics.currency')}</label>
          <input
            className="analytics-filter__input"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value.toUpperCase())}
            maxLength={3}
            placeholder="EUR"
          />
        </div>
      </section>

      <section className="analytics-page__grid">
        {DIMENSIONS.map((dim) => (
          <DimensionChart
            key={dim}
            title={t(`analytics.dim_${dim}`)}
            data={dimData[dim]}
            currency={selectedCurrency}
            language={language}
            loading={loading}
            emptyKey={`analytics.empty_${dim}`}
          />
        ))}
      </section>

      <section className="analytics-page__trend">
        <TrendChart
          data={trendData}
          currency={selectedCurrency}
          language={language}
          loading={loading}
        />
      </section>
    </div>
  );
}
