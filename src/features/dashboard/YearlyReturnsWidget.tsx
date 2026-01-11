import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { calculateYearlyReturns } from '../../domain/engine/periodicReturns';
import { Skeleton } from '../../components/ui/skeleton';

export function YearlyReturnsWidget() {
    const data = usePortfolioStore(s => s.data);
    const status = usePortfolioStore(s => s.status);

    const chartData = useMemo(() => {
        if (!data) return null;

        const yearlyReturns = calculateYearlyReturns(data);

        return yearlyReturns.map(({ year, return: ret }) => ({
            year: year.toString(),
            return: ret * 100, // Convert to percentage
            fill: ret >= 0 ? '#34d399' : '#f87171'
        }));
    }, [data]);

    if (status === 'LOADING') {
        return (
            <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-sm">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!chartData) return null;

    return (
        <div className="bg-surface rounded-2xl p-6 border border-white/10 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-6">年度回报率</h3>

            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis
                        type="number"
                        stroke="#9ca3af"
                        tickFormatter={(value) => `${value.toFixed(1)}%`}
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        type="category"
                        dataKey="year"
                        stroke="#9ca3af"
                        style={{ fontSize: '12px', fontWeight: 600 }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '12px',
                            padding: '12px'
                        }}
                        formatter={(value: number) => [`${value.toFixed(2)}%`, '回报率']}
                        labelStyle={{ fontWeight: 600 }}
                    />
                    <Bar dataKey="return" radius={[0, 6, 6, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
