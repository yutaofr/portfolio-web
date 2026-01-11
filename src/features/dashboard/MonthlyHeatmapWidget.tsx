import { useMemo } from 'react';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { calculateMonthlyReturns } from '../../domain/engine/periodicReturns';
import { Skeleton } from '../../components/ui/skeleton';

const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function getColorForReturn(ret: number): string {
    if (ret > 0.05) return 'bg-green-600';
    if (ret > 0.02) return 'bg-green-500';
    if (ret > 0) return 'bg-green-400';
    if (ret === 0) return 'bg-gray-600';
    if (ret > -0.02) return 'bg-red-400';
    if (ret > -0.05) return 'bg-red-500';
    return 'bg-red-600';
}

export function MonthlyHeatmapWidget() {
    const data = usePortfolioStore(s => s.data);
    const status = usePortfolioStore(s => s.status);

    const heatmapData = useMemo(() => {
        if (!data) return null;

        // Get years range
        let firstDate = new Date().toISOString();
        data.portfolios.forEach(p => {
            p.transactions.forEach(t => {
                if (t.date < firstDate) firstDate = t.date;
            });
        });

        const firstYear = new Date(firstDate).getFullYear();
        const currentYear = new Date().getFullYear();

        const yearlyData: { year: number; returns: number[] }[] = [];

        for (let year = firstYear; year <= currentYear; year++) {
            const returns = calculateMonthlyReturns(data, year);
            yearlyData.push({ year, returns });
        }

        return yearlyData;
    }, [data]);

    if (status === 'LOADING') {
        return (
            <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-sm">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!heatmapData) return null;

    return (
        <div className="bg-surface rounded-2xl p-6 border border-white/10 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-6">每月回报率</h3>

            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr>
                            <th className="text-gray-400 text-left pr-3 pb-3 font-semibold">年</th>
                            {MONTHS.map(m => (
                                <th key={m} className="text-gray-400 text-center px-1.5 pb-3 font-semibold">{m}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {heatmapData.map(({ year, returns }) => (
                            <tr key={year}>
                                <td className="text-gray-300 pr-3 py-1.5 font-medium">{year}</td>
                                {returns.map((ret, idx) => (
                                    <td key={idx} className="px-1.5 py-1.5">
                                        <div
                                            className={`${getColorForReturn(ret)} rounded-md text-white text-center py-2 px-1 font-mono font-semibold shadow-sm`}
                                            title={`${(ret * 100).toFixed(2)}%`}
                                        >
                                            {ret !== 0 ? (ret * 100).toFixed(1) : '—'}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
