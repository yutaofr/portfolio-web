import { useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Wallet, Loader2 } from 'lucide-react';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/utils';

interface MetricCardProps {
    label: string;
    value: string;
    subValue?: string;
    icon?: React.ElementType;
    trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ label, value, subValue, icon: Icon, trend }: MetricCardProps) {
    return (
        <div className="bg-surface rounded-2xl p-5 border border-white/10 shadow-lg hover:border-primary/30 transition-all">
            <div className="flex justify-between items-start mb-2">
                <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">{label}</span>
                {Icon && <Icon className="w-4 h-4 text-primary/60 flex-shrink-0" />}
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold tracking-tight text-white whitespace-nowrap">{value}</span>
                {subValue && (
                    <div className={`flex items-center gap-1 text-xs mt-1 ${trend === 'down' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                        {trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                        <span className="font-medium">{subValue}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export function KPIWidget({ startDate, endDate }: { startDate?: string; endDate?: string }) {
    const data = usePortfolioStore(s => s.data);
    const kpiStatus = usePortfolioStore(s => s.kpiStatus);
    const kpiData = usePortfolioStore(s => s.kpiData);
    const kpiError = usePortfolioStore(s => s.kpiError);
    const kpiStale = usePortfolioStore(s => s.kpiStale);  // NEW: stale data indicator
    const requestKPI = usePortfolioStore(s => s.requestKPI);

    // Trigger KPI calculation when data or dates change
    // Now instant from cache for common periods (ALL_TIME, YTD)
    useEffect(() => {
        if (!data) return;

        const today = new Date().toISOString().split('T')[0];
        const end = endDate || today;

        // Find first transaction date for all-time calculations
        let firstDate = today;
        data.portfolios.forEach(p => {
            p.transactions.forEach(t => {
                if (t.date < firstDate) firstDate = t.date;
            });
        });
        data.accounts.forEach(a => {
            a.transactions.forEach(t => {
                if (t.date < firstDate) firstDate = t.date;
            });
        });

        const start = startDate || firstDate;
        requestKPI(start, end);
    }, [data, startDate, endDate, requestKPI]);

    const status = usePortfolioStore(s => s.status);

    // Loading state - only show skeleton if no data at all
    if (status === 'LOADING' || (!kpiData && kpiStatus === 'CALCULATING')) {
        return (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <div key={i} className="bg-surface rounded-2xl p-5 border border-white/10 shadow-lg space-y-3">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                ))}
            </div>
        );
    }

    // Error state
    if (kpiError) {
        return (
            <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-5">
                <p className="text-red-400">计算错误: {kpiError.message}</p>
                {kpiError.recoverable && (
                    <button
                        onClick={() => requestKPI(kpiData?.startDate || '', kpiData?.endDate || '')}
                        className="mt-2 text-sm text-red-300 underline"
                    >
                        重试
                    </button>
                )}
            </div>
        );
    }

    // Safety check - should not happen due to loading check above
    if (!kpiData) return null;

    // Format helpers
    const fmtCurrency = (val: number) => new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: data?.client.baseCurrency || 'EUR'
    }).format(val);

    const fmtPercent = (val: number) => new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);

    const isPositive = kpiData.twr >= 0;
    const isIrrPositive = kpiData.irr >= 0;

    // Calculate annualized TWR and total change
    const days = Math.max(1, Math.floor((new Date(kpiData.endDate).getTime() - new Date(kpiData.startDate).getTime()) / (1000 * 60 * 60 * 24)));
    const years = days / 365.25;
    const annualizedTWR = years > 0 ? Math.pow(1 + kpiData.twr, 1 / years) - 1 : kpiData.twr;

    return (
        <div className={cn(
            "grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 transition-opacity duration-300 relative",
            kpiStale && "opacity-60"  // Fade out stale data
        )}>
            {/* Loading indicator when recalculating */}
            {kpiStatus === 'CALCULATING' && (
                <div className="absolute -top-2 -right-2 z-10">
                    <div className="bg-primary/10 rounded-full p-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                </div>
            )}
            <MetricCard
                label="净资产"
                value={fmtCurrency(kpiData.nav)}
                icon={DollarSign}
            />
            <MetricCard
                label="资本投入"
                value={fmtCurrency(kpiData.capitalInvested)}
                icon={Wallet}
                subValue="净投资"
            />
            <MetricCard
                label="累计收益率"
                value={fmtPercent(kpiData.twr)}
                icon={TrendingUp}
                trend={isPositive ? 'up' : 'down'}
                subValue="时间加权"
            />
            <MetricCard
                label="内部收益率"
                value={fmtPercent(kpiData.irr)}
                icon={TrendingUp}
                trend={isIrrPositive ? 'up' : 'down'}
                subValue="资金加权"
            />
            <MetricCard
                label="年化收益率"
                value={fmtPercent(annualizedTWR)}
                icon={TrendingUp}
                trend={isPositive ? 'up' : 'down'}
            />
        </div>
    );
}
