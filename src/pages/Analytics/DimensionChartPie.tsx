import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '../../lib/chartColors';
import { formatCurrency } from '../../lib/format';

interface Props {
  labeled: { label: string; total: number }[];
  currency: string;
  language: string;
}

export default function DimensionChartPie({ labeled, currency, language }: Props) {
  return (
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
        <Tooltip formatter={(value) => formatCurrency(Number(value), currency, language)} />
        <Legend formatter={(value) => value} />
      </PieChart>
    </ResponsiveContainer>
  );
}
