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

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function lastDayOf(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

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

  const from = toDateStr(year, month, 1);
  const to   = toDateStr(year, month, lastDayOf(year, month));

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, tag, project, event, trend] = await Promise.all([
        analyticsService.getByDimension('category', currency, from, to),
        analyticsService.getByDimension('tag',      currency, from, to),
        analyticsService.getByDimension('project',  currency, from, to),
        analyticsService.getByDimension('event',    currency, from, to),
        analyticsService.getOverTime(currency, from, to),
      ]);
      setDimData({ category: cat, tag, project, event });
      setTrendData(trend);
    } catch {
      toast.error(t('common.error_load'));
    } finally {
      setLoading(false);
    }
  }, [currency, from, to, t]);

  useEffect(() => { load(); }, [load]);

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
