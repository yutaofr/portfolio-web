import type { PortfolioState } from '../types';
import { calculateTWR } from './performance';

/**
 * Calculate monthly returns for a given year
 */
export function calculateMonthlyReturns(state: PortfolioState, year: number): number[] {
    const returns: number[] = [];

    for (let month = 1; month <= 12; month++) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = new Date(nextYear, nextMonth - 1, 0).toISOString().split('T')[0];

        try {
            const twr = calculateTWR(state, startDate, endDate);
            returns.push(twr);
        } catch {
            returns.push(0);
        }
    }

    return returns;
}

/**
 * Calculate yearly returns from first FULL year to current year
 * Skips partial first year to avoid misleading returns
 */
export function calculateYearlyReturns(state: PortfolioState): { year: number; return: number }[] {
    // Find first transaction date
    let firstDate = new Date().toISOString();

    state.portfolios.forEach(p => {
        p.transactions.forEach(t => {
            if (t.date < firstDate) firstDate = t.date;
        });
    });
    state.accounts.forEach(a => {
        a.transactions.forEach(t => {
            if (t.date < firstDate) firstDate = t.date;
        });
    });

    const firstTxDate = new Date(firstDate);
    const firstTxYear = firstTxDate.getFullYear();
    const firstTxMonth = firstTxDate.getMonth(); // 0-indexed
    const currentYear = new Date().getFullYear();

    // Start from first full year (if first tx is after June, skip that year)
    const startYear = firstTxMonth > 5 ? firstTxYear + 1 : firstTxYear;

    const returns: { year: number; return: number }[] = [];

    for (let year = startYear; year <= currentYear; year++) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        try {
            const twr = calculateTWR(state, startDate, endDate);
            returns.push({ year, return: twr });
        } catch {
            returns.push({ year, return: 0 });
        }
    }

    return returns;
}
