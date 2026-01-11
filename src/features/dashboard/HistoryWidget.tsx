import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { Skeleton } from '../../components/ui/skeleton';
import { getOrCreateWorker } from '../../store/workerLifecycle';

interface HistoryDataPoint {
    date: string;
    value: number;
}

export function HistoryWidget() {
    const data = usePortfolioStore(s => s.data);
    const [historyData, setHistoryData] = useState<HistoryDataPoint[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!data) return;

        const loadHistory = async () => {
            setLoading(true);
            try {
                const { proxy } = getOrCreateWorker();

                // Generate date range (last 30 days)
                const now = new Date();
                const dates: string[] = [];
                for (let i = 30; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(now.getDate() - i);
                    dates.push(d.toISOString().split('T')[0]);
                }

                // Request valuation series from Worker
                const results = await proxy.calculateValuationSeries(dates);

                setHistoryData(results.map(r => ({
                    date: r.date,
                    value: r.totalValue
                })));
            } catch (err) {
                console.error('[HistoryWidget] Failed to load history:', err);
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [data]);

    const status = usePortfolioStore(s => s.status);

    if (status === 'LOADING' || loading) {
        return (
            <div className="bg-surface rounded-xl p-5 border border-white/5 shadow-sm">
                <Skeleton className="h-4 w-32 mb-4" />
                <Skeleton className="h-[200px] w-full" />
            </div>
        );
    }

    if (!historyData.length) return null;

    return (
        <div className="bg-surface rounded-xl p-5 border border-white/5 shadow-sm">
            <h3 className="text-sm font-medium text-gray-200 mb-4">History (30 Days)</h3>

            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: '#9ca3af', fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(str) => {
                                const d = new Date(str);
                                return `${d.getDate()}/${d.getMonth() + 1}`;
                            }}
                            minTickGap={30}
                        />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#2d2d2d', borderColor: '#333', color: '#fff' }}
                            itemStyle={{ color: '#34d399' }}
                            formatter={(value: number) => [
                                new Intl.NumberFormat('de-DE', { style: 'currency', currency: data?.client.baseCurrency || 'EUR' }).format(value),
                                'Value'
                            ]}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#34d399"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
