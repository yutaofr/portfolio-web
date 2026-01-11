import type { PortfolioState, Transaction } from '../types';
import { calculateValuation } from './valuation';
import Big from 'big.js';

/**
 * Calculates Time-Weighted Return (TWR) over a period.
 * 
 * Matches Portfolio Performance Java implementation (ClientIndex.java):
 * - Iterates DAY BY DAY
 * - Formula: delta = (thisValuation + outbound) / (valuation + inbound) - 1
 * - accumulated = ((accumulated_prev + 1) * (delta + 1)) - 1
 */
export function calculateTWR(state: PortfolioState, startDate: string, endDate: string): number {
    // Build daily transferals maps
    const inboundByDay = new Map<string, number>();
    const outboundByDay = new Map<string, number>();

    const addToMap = (map: Map<string, number>, dateStr: string, amount: number) => {
        const existing = map.get(dateStr) || 0;
        map.set(dateStr, existing + amount);
    };

    // Collect all transferals from accounts
    state.accounts.forEach(a => {
        a.transactions.forEach(t => {
            const dateStr = t.date.split('T')[0];
            if (dateStr < startDate || dateStr > endDate) return;

            if (t.type === 'DEPOSIT') {
                addToMap(inboundByDay, dateStr, t.amount);
            } else if (t.type === 'REMOVAL') {
                addToMap(outboundByDay, dateStr, t.amount);
            }
        });
    });

    // Collect all transferals from portfolios
    state.portfolios.forEach(p => {
        p.transactions.forEach(t => {
            const dateStr = t.date.split('T')[0];
            if (dateStr < startDate || dateStr > endDate) return;

            if (t.type === 'DELIVERY_INBOUND') {
                addToMap(inboundByDay, dateStr, t.amount);
            } else if (t.type === 'DELIVERY_OUTBOUND') {
                addToMap(outboundByDay, dateStr, t.amount);
            }
        });
    });

    // Get initial valuation
    let valuation = calculateValuation(state, startDate).totalValue;
    let accumulated = 0;

    // Iterate day by day (matching Java ClientIndex.java logic)
    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + 1); // Start from day after start
    const endDateObj = new Date(endDate);

    while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split('T')[0];

        const thisValuation = calculateValuation(state, dateStr).totalValue;
        const inbound = inboundByDay.get(dateStr) || 0;
        const outbound = outboundByDay.get(dateStr) || 0;

        const denominator = valuation + inbound;

        let delta = 0;
        if (denominator > 0) {
            // Java formula: delta = (thisValuation + outbound) / (valuation + inbound) - 1
            delta = (thisValuation + outbound) / denominator - 1;
        }

        // Java: accumulated = ((accumulated + 1) * (delta + 1)) - 1
        accumulated = ((accumulated + 1) * (delta + 1)) - 1;

        valuation = thisValuation;
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return accumulated;
}
