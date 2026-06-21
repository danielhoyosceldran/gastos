import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import type { DimensionSlice } from '../../types/analytics.types';
import './DimensionChart.scss';

const DimensionChartPie = lazy(() => import('./DimensionChartPie'));

interface Props {
  title: string;
  data: DimensionSlice[];
  currency: string;
  language: string;
  loading: boolean;
  emptyKey: string;
}

export function DimensionChart({ title, data, currency, language, loading, emptyKey }: Props) {
  const { t } = useTranslation();

  const labeled = data.map((s) => ({
    ...s,
    label: s.name.includes('.') ? t(s.name) : s.name,
  }));

  return (
    <div className="dimension-chart">
      <h3 className="dimension-chart__title">{title}</h3>
      {loading ? (
        <p className="dimension-chart__empty">{t('common.loading')}</p>
      ) : labeled.length === 0 ? (
        <p className="dimension-chart__empty">{t(emptyKey)}</p>
      ) : (
        <Suspense fallback={<p className="dimension-chart__empty">{t('common.loading')}</p>}>
          <DimensionChartPie labeled={labeled} currency={currency} language={language} />
        </Suspense>
      )}
    </div>
  );
}
