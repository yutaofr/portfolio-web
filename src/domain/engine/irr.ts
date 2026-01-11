import type { PortfolioState } from '../types';
import { calculateValuation } from './valuation';

/**
 * IRR (Internal Rate of Return) - Money-Weighted Rate of Return
 * 
 * Reference: https://help.portfolio-performance.info/en/concepts/performance/money-weighted/
 * 
 * Formula:
 * MVB * (1+IRR)^(RD/365) + Σ CFi * (1+IRR)^(RDi/365) = MVE
 * 
 * Where:
 * - MVB: Market Value at Beginning
 * - MVE: Market Value at End
 * - CFi: Cash Flow i
 * - RD: Reporting Days (start to end)
 * - RDi: Remaining Days for cash flow i (cf date to end)
 */

interface CashFlow {
    date: string;
    amount: number;  // Positive for inflows, negative for outflows
}

/**
 * Calculate IRR using Newton-Raphson method
 */
export function calculateIRR(
    state: PortfolioState,
    startDate: string,
    endDate: string,
    maxIterations = 100,
    tolerance = 1e-7
): number {
    // Get MVB and MVE
    const mvb = calculateValuation(state, startDate).totalValue;
    const mve = calculateValuation(state, endDate).totalValue;

    // Collect cash flows (portfolio level)
    const cashFlows: CashFlow[] = [];

    state.accounts.forEach(account => {
        account.transactions.forEach(tx => {
            const txDate = tx.date.split('T')[0];
            if (txDate <= startDate || txDate > endDate) return;

            let amount = 0;
            switch (tx.type) {
                case 'DEPOSIT':
                    amount = tx.amount;  // Positive inflow
                    break;
                case 'REMOVAL':
                case 'WITHDRAWAL':
                    amount = -tx.amount; // Negative outflow
                    break;
            }

            if (amount !== 0) {
                cashFlows.push({ date: txDate, amount });
            }
        });
    });

    state.portfolios.forEach(portfolio => {
        portfolio.transactions.forEach(tx => {
            const txDate = tx.date.split('T')[0];
            if (txDate <= startDate || txDate > endDate) return;

            let amount = 0;
            switch (tx.type) {
                case 'DELIVERY_INBOUND':
                    amount = tx.amount;
                    break;
                case 'DELIVERY_OUTBOUND':
                    amount = -tx.amount;
                    break;
            }

            if (amount !== 0) {
                cashFlows.push({ date: txDate, amount });
            }
        });
    });

    // Calculate RD (reporting days)
    const RD = daysBetween(startDate, endDate);

    // NPV function: should equal zero when IRR is correct
    const npv = (irr: number): number => {
        let result = mvb * Math.pow(1 + irr, RD / 365);

        for (const cf of cashFlows) {
            const rd = daysBetween(cf.date, endDate);
            result += cf.amount * Math.pow(1 + irr, rd / 365);
        }

        return result - mve;
    };

    // Derivative of NPV (for Newton-Raphson)
    const npvDerivative = (irr: number): number => {
        let result = mvb * (RD / 365) * Math.pow(1 + irr, RD / 365 - 1);

        for (const cf of cashFlows) {
            const rd = daysBetween(cf.date, endDate);
            result += cf.amount * (rd / 365) * Math.pow(1 + irr, rd / 365 - 1);
        }

        return result;
    };

    // Newton-Raphson iteration
    let irr = 0.1; // Initial guess: 10%

    for (let i = 0; i < maxIterations; i++) {
        const f = npv(irr);
        const df = npvDerivative(irr);

        if (Math.abs(df) < 1e-10) {
            // Derivative too small, avoid division by zero
            break;
        }

        const newIrr = irr - f / df;

        if (Math.abs(newIrr - irr) < tolerance) {
            return newIrr;
        }

        irr = newIrr;

        // Prevent extreme values
        if (Math.abs(irr) > 10) {
            // IRR > 1000% or < -1000% is unrealistic
            break;
        }
    }

    return irr;
}

/**
 * Helper: Calculate days between two ISO dates
 */
function daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}
