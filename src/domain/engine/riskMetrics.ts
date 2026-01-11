import type { PortfolioState } from '../types';
import { calculateValuation } from './valuation';

/**
 * Calculate Maximum Drawdown - largest peak-to-trough decline
 */
export function calculateMaxDrawdown(state: PortfolioState, startDate: string, endDate: string): {
    maxDrawdown: number;
    longestDrawdownDays: number;
} {
    // Get all transaction dates to build timeline
    const dates = new Set<string>();
    state.portfolios.forEach(p => p.transactions.forEach(t => {
        if (t.date >= startDate && t.date <= endDate) dates.add(t.date);
    }));
    state.accounts.forEach(a => a.transactions.forEach(t => {
        if (t.date >= startDate && t.date <= endDate) dates.add(t.date);
    }));

    // Add price dates
    state.securities.forEach(sec => {
        sec.prices.forEach(p => {
            if (p.t >= startDate && p.t <= endDate) dates.add(p.t);
        });
    });

    dates.add(startDate);
    dates.add(endDate);

    const sortedDates = Array.from(dates).sort();

    let maxDrawdown = 0;
    let peak = 0;
    let longestDrawdownDays = 0;
    let currentDrawdownStart: string | null = null;

    for (const date of sortedDates) {
        const val = calculateValuation(state, date).totalValue;

        if (val > peak) {
            peak = val;
            // Drawdown ended
            if (currentDrawdownStart) {
                const days = daysBetween(currentDrawdownStart, date);
                longestDrawdownDays = Math.max(longestDrawdownDays, days);
                currentDrawdownStart = null;
            }
        } else if (peak > 0) {
            const drawdown = (peak - val) / peak;
            maxDrawdown = Math.max(maxDrawdown, drawdown);

            if (!currentDrawdownStart) {
                currentDrawdownStart = date;
            }
        }
    }

    // Check if still in drawdown at end
    if (currentDrawdownStart) {
        const days = daysBetween(currentDrawdownStart, endDate);
        longestDrawdownDays = Math.max(longestDrawdownDays, days);
    }

    return { maxDrawdown, longestDrawdownDays };
}

/**
 * Calculate annualized volatility (standard deviation of returns)
 */
export function calculateVolatility(state: PortfolioState, startDate: string, endDate: string): number {
    // Calculate daily returns
    const dates = new Set<string>();
    state.securities.forEach(sec => {
        sec.prices.forEach(p => {
            if (p.t >= startDate && p.t <= endDate) dates.add(p.t);
        });
    });

    const sortedDates = Array.from(dates).sort();
    if (sortedDates.length < 2) return 0;

    const returns: number[] = [];
    let prevVal = calculateValuation(state, sortedDates[0]).totalValue;

    for (let i = 1; i < sortedDates.length; i++) {
        const val = calculateValuation(state, sortedDates[i]).totalValue;
        if (prevVal > 0) {
            const dailyReturn = (val - prevVal) / prevVal;
            returns.push(dailyReturn);
        }
        prevVal = val;
    }

    if (returns.length === 0) return 0;

    // Calculate standard deviation
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Annualize (assuming ~252 trading days)
    return stdDev * Math.sqrt(252);
}

/**
 * Annualize a TWR given the number of days
 */
export function annualizeTWR(twr: number, days: number): number {
    if (days <= 0) return 0;
    const years = days / 365.25;
    return Math.pow(1 + twr, 1 / years) - 1;
}

/**
 * Helper: Calculate days between two ISO dates
 */
function daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}
