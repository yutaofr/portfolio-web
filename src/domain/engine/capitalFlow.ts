import type { PortfolioState } from '../types';

/**
 * Capital Flow Tracking
 * 
 * Calculates capital invested/withdrawn from the portfolio.
 * Only DEPOSIT, REMOVAL, DELIVERY_INBOUND, DELIVERY_OUTBOUND affect capital.
 */

export interface CapitalFlowResult {
    deposited: number;      // Total deposits
    withdrawn: number;      // Total withdrawals/removals
    netInvested: number;    // Net capital invested (deposited - withdrawn)
}

/**
 * Calculate capital flows for a given period
 * 
 * Per PP documentation:
 * - DEPOSIT: Cash entering portfolio
 * - REMOVAL/WITHDRAWAL: Cash leaving portfolio
 * - DELIVERY_INBOUND: Securities entering portfolio
 * - DELIVERY_OUTBOUND: Securities leaving portfolio
 */
export function calculateCapitalFlow(
    state: PortfolioState,
    startDate: string,
    endDate: string
): CapitalFlowResult {
    let deposited = 0;
    let withdrawn = 0;

    // Process account transactions
    state.accounts.forEach(account => {
        account.transactions.forEach(tx => {
            const txDate = tx.date.split('T')[0];
            if (txDate < startDate || txDate > endDate) return;

            switch (tx.type) {
                case 'DEPOSIT':
                    deposited += tx.amount;
                    break;
                case 'REMOVAL':
                case 'WITHDRAWAL':
                    withdrawn += tx.amount;
                    break;
            }
        });
    });

    // Process portfolio transactions (securities transfers)
    state.portfolios.forEach(portfolio => {
        portfolio.transactions.forEach(tx => {
            const txDate = tx.date.split('T')[0];
            if (txDate < startDate || txDate > endDate) return;

            switch (tx.type) {
                case 'DELIVERY_INBOUND':
                    deposited += tx.amount;
                    break;
                case 'DELIVERY_OUTBOUND':
                    withdrawn += tx.amount;
                    break;
            }
        });
    });

    return {
        deposited,
        withdrawn,
        netInvested: deposited - withdrawn
    };
}
