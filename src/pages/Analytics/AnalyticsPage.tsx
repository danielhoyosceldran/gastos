import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { useAuthStore } from '../../store/auth.store';
import { analyticsService } from '../../services/supabase/analytics.service';
import type { DimensionSlice, TrendPoint, AnalyticsDimension } from '../../types/analytics.types';
import { DimensionChart } from './DimensionChart';
import { TrendChart } from './TrendChart';
import { toast } from '../../store/toast.store';
import './AnalyticsPage.scss';

const DIMENSIONS: AnalyticsDimension[] = ['category', 'tag', 'project', 'event'];


function getMonthLabel(year: number, month: number, language: string): string {
  return new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

export function AnalyticsPage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();

  const currency = profile?.currency ?? 'EUR';
  const language = profile?.language ?? 'en';

  const touchStartX = useRef(0);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [dimData, setDimData] = useState<Record<AnalyticsDimension, DimensionSlice[]>>({
    category: [], tag: [], project: [], event: [],
  });
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  type AnalyticsCache = {
    dimData: Record<AnalyticsDimension, DimensionSlice[]>;
    trendData: TrendPoint[];
  };
  const analyticsCache = useRef<Map<string, AnalyticsCache>>(new Map());

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { if (dx < 0) nextMonth(); else prevMonth(); }
  }

  function monthKey(y: number, m: number) { return `${y}-${m}`; }
  function adjMonths(y: number, m: number) {
    const prev = m === 1  ? [y - 1, 12] : [y, m - 1];
    const next = m === 12 ? [y + 1,  1] : [y, m + 1];
    return [prev, next] as [number, number][];
  }
  function toRange(y: number, m: number) {
    const last = new Date(y, m, 0).getDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${last}` };
  }

  const fetchAnalytics = useCallback(async (y: number, m: number, show: boolean) => {
    const key = monthKey(y, m);
    if (analyticsCache.current.has(key)) {
      if (show) {
        const cached = analyticsCache.current.get(key)!;
        setDimData(cached.dimData);
        setTrendData(cached.trendData);
        setLoading(false);
      }
      return;
    }
    if (show) setLoading(true);
    const { from: f, to: t2 } = toRange(y, m);
    try {
      const [cat, tag, project, event, trend] = await Promise.all([
        analyticsService.getByDimension('category', currency, f, t2),
        analyticsService.getByDimension('tag',      currency, f, t2),
        analyticsService.getByDimension('project',  currency, f, t2),
        analyticsService.getByDimension('event',    currency, f, t2),
        analyticsService.getOverTime(currency, f, t2),
      ]);
      const result: AnalyticsCache = { dimData: { category: cat, tag, project, event }, trendData: trend };
      analyticsCache.current.set(key, result);
      if (show) { setDimData(result.dimData); setTrendData(result.trendData); }
    } catch { if (show) toast.error(t('common.error_load')); }
    finally { if (show) setLoading(false); }
  }, [currency, t]);

  useEffect(() => {
    fetchAnalytics(year, month, true);
    for (const [y, m] of adjMonths(year, month)) fetchAnalytics(y, m, false);
  }, [year, month, fetchAnalytics]);

  return (
    <div className="analytics-wrapper">
      <div className="analytics-page__month-nav">
        <button className="btn btn--ghost btn--icon" onClick={prevMonth} aria-label={t('dashboard.prev_month')}><ChevronLeftIcon /></button>
        <span className="analytics-page__month-label">{getMonthLabel(year, month, language)}</span>
        <button className="btn btn--ghost btn--icon" onClick={nextMonth} aria-label={t('dashboard.next_month')}><ChevronRightIcon /></button>
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ width: '100%', flex: 1, minHeight: 0, overflowY: 'auto' }}
      >
        <div className="analytics-page">
          <header className="analytics-page__header">
            <h1 className="analytics-page__title">{t('analytics.title')}</h1>
          </header>

          <section className="analytics-page__grid">
            {DIMENSIONS.map((dim) => (
              <DimensionChart
                key={dim}
                title={t(`analytics.dim_${dim}`)}
                data={dimData[dim]}
                currency={currency}
                language={language}
                loading={loading}
                emptyKey={`analytics.empty_${dim}`}
              />
            ))}
          </section>

          <section className="analytics-page__trend">
            <TrendChart
              data={trendData}
              currency={currency}
              language={language}
              loading={loading}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
