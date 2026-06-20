import { useTranslation } from 'react-i18next';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { TrendPoint } from '../../types/analytics.types';
import { formatCurrency } from '../../lib/format';
import './TrendChart.scss';

interface Props {
  data: TrendPoint[];
  currency: string;
  language: string;
  loading: boolean;
}

function monthLabel(year: number, month: number, language: string): string {
  return new Intl.DateTimeFormat(language, { month: 'short', year: '2-digit' })
    .format(new Date(year, month - 1, 1));
}

export function TrendChart({ data, currency, language, loading }: Props) {
  const { t } = useTranslation();

  const points = data.map((p) => ({
    ...p,
    label: monthLabel(p.year, p.month, language),
  }));

  return (
    <div className="trend-chart">
      <h3 className="trend-chart__title">{t('analytics.trend_title')}</h3>
      {loading ? (
        <p className="trend-chart__empty">{t('common.loading')}</p>
      ) : points.length === 0 ? (
        <p className="trend-chart__empty">{t('analytics.empty_trend')}</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={points} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="gradSpent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#F94144" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#F94144" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#43AA8B" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#43AA8B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={60}
              tickFormatter={(v: number) => formatCurrency(v, currency, language)} />
            <Tooltip formatter={(v) => formatCurrency(Number(v), currency, language)} />
            <Legend />
            <Area
              type="monotone"
              dataKey="spent"
              name={t('analytics.spent')}
              stroke="#F94144"
              fill="url(#gradSpent)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="income"
              name={t('analytics.income')}
              stroke="#43AA8B"
              fill="url(#gradIncome)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
