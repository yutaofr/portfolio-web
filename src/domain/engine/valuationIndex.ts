import type { PortfolioState, UUID, Security, Transaction } from '../types';
import Big from 'big.js';

/**
 * Valuation Index for fast O(log n) lookups
 */
export interface ValuationIndex {
    cashTimeline: CashPoint[];
    holdingsTimeline: Map<UUID, HoldingsPoint[]>;
    priceIndex: Map<UUID, PricePoint[]>;
    firstDate: string;
    lastDate: string;
}

interface CashPoint {
    date: string;
    cumulative: number; // Cumulative cash balance
}

interface HoldingsPoint {
    date: string;
    shares: number; // Cumulative shares held
}

interface PricePoint {
    date: string;
    price: number;
}

export interface ValuationResult {
    cashBalance: number;
    securityValue: number;
    totalValue: number;
}

/**
 * Binary search for the last element <= target date
 * Returns index, or -1 if all elements are > target
 */
function binarySearchLE<T extends { date: string }>(arr: T[], targetDate: string): number {
    if (arr.length === 0 || arr[0].date > targetDate) return -1;

    let left = 0;
    let right = arr.length - 1;
    let result = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (arr[mid].date <= targetDate) {
            result = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return result;
}

/**
 * Build valuation index from portfolio state
 * Complexity: O(T + S×P) where T=transactions, S=securities, P=prices
 */
export function buildValuationIndex(state: PortfolioState): ValuationIndex {
    // 1. Deduplicate and collect all transactions
    const uniqueTransactions = new Map<string, Transaction>();

    state.accounts.forEach(a => {
        a.transactions.forEach(t => uniqueTransactions.set(t.uuid, t));
    });
    state.portfolios.forEach(p => {
        p.transactions.forEach(t => uniqueTransactions.set(t.uuid, t));
    });

    const allTransactions = Array.from(uniqueTransactions.values());

    // 2. Sort transactions by date
    allTransactions.sort((a, b) => a.date.localeCompare(b.date));

    // 3. Build cash timeline
    const cashTimeline: CashPoint[] = [];
    let cumulativeCash = 0;

    for (const t of allTransactions) {
        const txDate = t.date.split('T')[0];
        const amount = t.amount || 0;

        switch (t.type) {
            case 'DEPOSIT':
            case 'SELL':
            case 'DIVIDEND':
            case 'INTEREST':
                cumulativeCash += amount;
                break;
            case 'WITHDRAWAL':
            case 'REMOVAL':
            case 'BUY':
            case 'FEES':
            case 'TAXES':
                cumulativeCash -= amount;
                break;
            case 'DELIVERY_INBOUND':
            case 'DELIVERY_OUTBOUND':
                // No cash impact
                break;
        }

        // Only add if date changed or it's the first transaction
        if (cashTimeline.length === 0 || cashTimeline[cashTimeline.length - 1].date !== txDate) {
            cashTimeline.push({ date: txDate, cumulative: cumulativeCash });
        } else {
            // Update the last entry for the same date
            cashTimeline[cashTimeline.length - 1].cumulative = cumulativeCash;
        }
    }

    // 4. Build holdings timeline
    const holdingsTimeline = new Map<UUID, HoldingsPoint[]>();
    const cumulativeHoldings = new Map<UUID, number>();

    for (const t of allTransactions) {
        if (!t.securityUuid || !t.shares) continue;

        const txDate = t.date.split('T')[0];
        const secUuid = t.securityUuid;
        const currentShares = cumulativeHoldings.get(secUuid) || 0;

        let newShares = currentShares;
        switch (t.type) {
            case 'BUY':
            case 'DELIVERY_INBOUND':
                newShares = currentShares + t.shares;
                break;
            case 'SELL':
            case 'DELIVERY_OUTBOUND':
                newShares = currentShares - t.shares;
                break;
        }

        cumulativeHoldings.set(secUuid, newShares);

        if (!holdingsTimeline.has(secUuid)) {
            holdingsTimeline.set(secUuid, []);
        }

        const timeline = holdingsTimeline.get(secUuid)!;
        if (timeline.length === 0 || timeline[timeline.length - 1].date !== txDate) {
            timeline.push({ date: txDate, shares: newShares });
        } else {
            timeline[timeline.length - 1].shares = newShares;
        }
    }

    // 5. Build price index (already sorted in Security.prices)
    const priceIndex = new Map<UUID, PricePoint[]>();
    state.securities.forEach((security, uuid) => {
        priceIndex.set(uuid, security.prices.map(p => ({
            date: p.t,
            price: p.v
        })));
    });

    // 6. Determine date range
    const firstDate = allTransactions.length > 0 ? allTransactions[0].date.split('T')[0] : '';
    const lastDate = allTransactions.length > 0 ? allTransactions[allTransactions.length - 1].date.split('T')[0] : '';

    return {
        cashTimeline,
        holdingsTimeline,
        priceIndex,
        firstDate,
        lastDate
    };
}

/**
 * Fast valuation calculation using index
 * Complexity: O(log T + S×log P) where T=transactions, S=securities, P=prices
 */
export function calculateValuationFast(
    index: ValuationIndex,
    date: string,
    securities: Map<UUID, Security>
): ValuationResult {
    // 1. Get cash balance using binary search
    const cashIdx = binarySearchLE(index.cashTimeline, date);
    const cashBalance = cashIdx >= 0 ? index.cashTimeline[cashIdx].cumulative : 0;

    // 2. Calculate security value
    let securitiesVal = new Big(0);

    // Build implied prices map (fallback when no market price)
    const impliedPrices = new Map<UUID, number>();

    for (const [secUuid, holdingsPoints] of index.holdingsTimeline.entries()) {
        const holdingsIdx = binarySearchLE(holdingsPoints, date);
        if (holdingsIdx < 0) continue;

        const shares = holdingsPoints[holdingsIdx].shares;
        if (shares <= 0) continue;

        const security = securities.get(secUuid);
        if (!security) continue;

        // Get price using binary search
        const pricePoints = index.priceIndex.get(secUuid);
        let price: number | null = null;

        if (pricePoints && pricePoints.length > 0) {
            const priceIdx = binarySearchLE(pricePoints, date);
            if (priceIdx >= 0) {
                price = pricePoints[priceIdx].price;
            }
        }

        // Fallback: use implied price from transaction
        if (!price) {
            // Find the transaction that created this holding
            const holdingPoint = holdingsPoints[holdingsIdx];
            // For simplicity, we'll skip implied price calculation in fast path
            // This is a known limitation - can be improved later
            continue;
        }

        const holdingValue = new Big(shares).times(price);
        securitiesVal = securitiesVal.plus(holdingValue);
    }

    const securityValue = securitiesVal.toNumber();

    return {
        cashBalance,
        securityValue,
        totalValue: cashBalance + securityValue
    };
}
