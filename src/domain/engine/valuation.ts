import type { PortfolioState, UUID, Security } from '../types';
import { calculateHoldings } from './holdings';
import { PRICE_SCALING_FACTOR, AMOUNT_SCALING_FACTOR } from '../../config/scaling';
import Big from 'big.js';

export interface ValuationResult {
    cashBalance: number;
    securityValue: number;
    totalValue: number;
}

export function calculateValuation(state: PortfolioState, date: string): ValuationResult {
    // 1. Deduplicate Transactions
    // Portfolio Performance XML often mirrors transactions in both Account and Portfolio.
    // Use a Map to ensure unique UUIDs.
    const uniqueTransactions = new Map<string, any>();

    state.accounts.forEach(a => {
        a.transactions.forEach(t => uniqueTransactions.set(t.uuid, t));
    });
    state.portfolios.forEach(p => {
        p.transactions.forEach(t => uniqueTransactions.set(t.uuid, t));
    });

    const allTransactions = Array.from(uniqueTransactions.values());

    // 2. Calculate Cash Balance
    let cash = new Big(0);

    for (const t of allTransactions) {
        // Compare dates only (not timestamps) - extract date part from transaction date
        const txDate = t.date.split('T')[0];
        if (txDate > date) continue;

        const amount = new Big(t.amount || 0);

        switch (t.type) {
            case 'DEPOSIT':
            case 'SELL':
            case 'DIVIDEND':
            case 'INTEREST':
                cash = cash.plus(amount);
                break;
            case 'WITHDRAWAL':
            case 'REMOVAL':
            case 'BUY':
            case 'FEES':
            case 'TAXES':
                cash = cash.minus(amount);
                break;
            // DELIVERY_INBOUND/OUTBOUND are securities transfers, NOT cash transactions
            case 'DELIVERY_INBOUND':
            case 'DELIVERY_OUTBOUND':
                // No cash impact - just securities moving in/out
                break;
            default:
                // Unknown transaction type
                console.warn(`Unknown transaction type: ${t.type} (${t.uuid})`);
                break;
        }
    }

    const cashBalance = cash.toNumber();

    // 3. Calculate Security Value
    const holdings = calculateHoldings(allTransactions, date);
    let securitiesVal = new Big(0);

    // Build a map of implied prices from transactions (amount / shares)
    // Used as fallback when market price is not available
    const impliedPrices = new Map<string, { date: string; price: number }>();
    for (const t of allTransactions) {
        if (!t.securityUuid || !t.shares || t.shares <= 0) continue;
        const txDate = t.date.split('T')[0];
        if (txDate > date) continue;

        // Calculate implied price from this transaction
        const impliedPrice = t.amount / t.shares;

        // Keep the most recent implied price for each security
        const existing = impliedPrices.get(t.securityUuid);
        if (!existing || txDate > existing.date) {
            impliedPrices.set(t.securityUuid, { date: txDate, price: impliedPrice });
        }
    }

    for (const [secUuid, shareCount] of holdings.entries()) {
        const security = state.securities.get(secUuid);
        if (!security) continue;

        let price = getPriceAtDate(security, date);

        // Fallback: use implied price from transactions if no market price
        if (!price) {
            const implied = impliedPrices.get(secUuid);
            if (implied) {
                price = new Big(implied.price);
            }
        }

        if (price) {
            const holdingValue = new Big(shareCount).times(price);
            securitiesVal = securitiesVal.plus(holdingValue);
        }
    }

    const securityValue = securitiesVal.toNumber();

    return {
        cashBalance,
        securityValue,
        totalValue: cashBalance + securityValue
    };
}

/**
 * Returns the price of a security at a specific date.
 * Uses forward-fill logic (last known price).
 * Returns result as a Big number (already divided by scaling factor? NO, keep consistency).
 * Actually, let's look at types.ts: Price.v is "Scaled by 10^8".
 */
function getPriceAtDate(security: Security, date: string): Big | null {
    // Assuming prices are sorted by date asc (standard).
    // Find limits.
    let lastPrice = null;

    for (const p of security.prices) {
        if (p.t > date) break;
        lastPrice = p;
    }

    if (!lastPrice) return null;

    // Convert scaled price to real unit price
    return new Big(lastPrice.v);
}
