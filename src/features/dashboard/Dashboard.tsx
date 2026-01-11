import { AllocationWidget } from "./AllocationWidget";
import { KPIWidget } from "./KPIWidget";
import { HistoryWidget } from "./HistoryWidget";
import { RiskMetricsWidget } from "./RiskMetricsWidget";
import { MonthlyHeatmapWidget } from "./MonthlyHeatmapWidget";
import { YearlyReturnsWidget } from "./YearlyReturnsWidget";
import { TimePeriodTabs, useTimePeriod } from "./TimePeriodTabs";

export function Dashboard() {
    const { period, setPeriod, getDateRange } = useTimePeriod();
    const { startDate, endDate } = getDateRange();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">投资组合概览</h2>
                <TimePeriodTabs value={period} onChange={setPeriod} />
            </div>

            {/* KPI Metrics */}
            <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">关键指标</h3>
                <KPIWidget startDate={startDate} endDate={endDate} />
            </div>

            {/* Risk Metrics */}
            <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">风险指标</h3>
                <RiskMetricsWidget />
            </div>

            {/* History Chart */}
            <HistoryWidget />

            {/* Allocation Chart - Full Width */}
            <AllocationWidget />

            {/* Performance Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MonthlyHeatmapWidget />
                <YearlyReturnsWidget />
            </div>
        </div>
    )
}
