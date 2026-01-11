import { useMemo } from 'react';
import { Calendar, TrendingDown, Activity } from 'lucide-react';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { calculateMaxDrawdown, calculateVolatility } from '../../domain/engine/riskMetrics';
import { Skeleton } from '../../components/ui/skeleton';

interface MetricCardProps {
    label: string;
    value: string;
    icon?: React.ElementType;
}

function MetricCard({ label, value, icon: Icon }: MetricCardProps) {
    return (
        <div className="bg-surface rounded-xl p-4 border border-white/5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <span className="text-gray-400 text-xs uppercase tracking-wider font-medium">{label}</span>
                {Icon && <Icon className="w-4 h-4 text-primary/50" />}
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        </div>
    );
}

export function RiskMetricsWidget() {
    const data = usePortfolioStore(s => s.data);
    const status = usePortfolioStore(s => s.status);

    const metrics = useMemo(() => {
        if (!data) return null;

        const today = new Date().toISOString().split('T')[0];
        let firstDate = today;

        data.portfolios.forEach(p => {
            p.transactions.forEach(t => {
                if (t.date < firstDate) firstDate = t.date;
            });
        });

        const { maxDrawdown, longestDrawdownDays } = calculateMaxDrawdown(data, firstDate, today);
        const volatility = calculateVolatility(data, firstDate, today);

        const fmtPercent = (val: number) => new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val);

        return {
            maxDrawdown: fmtPercent(maxDrawdown),
            longestDrawdownDays: longestDrawdownDays.toLocaleString('en-US'),
            volatility: fmtPercent(volatility)
        };
    }, [data]);

    if (status === 'LOADING') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-surface rounded-xl p-6 border border-white/5 shadow-sm space-y-3">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-8 w-20" />
                    </div>
                ))}
            </div>
        );
    }

    if (!metrics) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
                label="最大回撤"
                value={metrics.maxDrawdown}
                icon={TrendingDown}
            />
            <MetricCard
                label="最长回撤"
                value={`${metrics.longestDrawdownDays} 天`}
                icon={Calendar}
            />
            <MetricCard
                label="波动率"
                value={metrics.volatility}
                icon={Activity}
            />
        </div>
    );
}
