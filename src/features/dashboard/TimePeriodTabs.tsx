import { useState } from 'react';

type TimePeriod = 'ALL_TIME' | 'YTD' | 'CUSTOM';

interface TimePeriodTabsProps {
    value: TimePeriod;
    onChange: (period: TimePeriod) => void;
}

export function TimePeriodTabs({ value, onChange }: TimePeriodTabsProps) {
    return (
        <div className="flex gap-2 bg-surface/50 p-1 rounded-lg border border-white/5">
            <button
                onClick={() => onChange('ALL_TIME')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${value === 'ALL_TIME'
                        ? 'bg-primary text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
            >
                全部时间
            </button>
            <button
                onClick={() => onChange('YTD')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${value === 'YTD'
                        ? 'bg-primary text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
            >
                本年至今
            </button>
        </div>
    );
}

export function useTimePeriod() {
    const [period, setPeriod] = useState<TimePeriod>('ALL_TIME');

    const getDateRange = (): { startDate: string; endDate: string } => {
        const today = new Date().toISOString().split('T')[0];

        if (period === 'YTD') {
            const currentYear = new Date().getFullYear();
            return {
                startDate: `${currentYear}-01-01`,
                endDate: today
            };
        }

        // ALL_TIME - will be calculated from first transaction
        return {
            startDate: '1900-01-01', // Placeholder, actual start will be calculated
            endDate: today
        };
    };

    return { period, setPeriod, getDateRange };
}
