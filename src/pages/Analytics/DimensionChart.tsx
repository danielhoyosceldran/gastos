import { useTranslation } from 'react-i18next';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS } from '../../lib/chartColors';
import type { DimensionSlice } from '../../types/analytics.types';
import { formatCurrency } from '../../lib/format';
import './DimensionChart.scss';

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
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={labeled}
              dataKey="total"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={90}
              innerRadius={48}
            >
              {labeled.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                formatCurrency(Number(value), currency, language)
              }
            />
            <Legend formatter={(value) => value} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
