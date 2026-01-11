import type { Transaction, UUID } from '../types';
// import { Big } from '../../config/scaling'; // Removed
import Big from 'big.js';

/**
 * Calculates the number of shares held for each security at a specific date.
 * Replays all transactions of type BUY, SELL, DELIVERY_INBOUND, DELIVERY_OUTBOUND.
 */
export function calculateHoldings(transactions: Transaction[], date: string): Map<UUID, number> {
    const holdings = new Map<UUID, Big>();

    // Sort transactions by date asc (though strict replay order matters less for simple sum, it's good practice)
    const sortedDetails = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    for (const t of sortedDetails) {
        const txDate = t.date.split('T')[0];
        if (txDate > date) continue;
        if (!t.securityUuid) continue;
        if (!t.shares) continue;

        const current = holdings.get(t.securityUuid) || new Big(0);
        const shareAmount = new Big(t.shares);

        switch (t.type) {
            case 'BUY':
            case 'DELIVERY_INBOUND':
                holdings.set(t.securityUuid, current.plus(shareAmount));
                break;
            case 'SELL':
            case 'DELIVERY_OUTBOUND':
                holdings.set(t.securityUuid, current.minus(shareAmount));
                break;
            default:
                // Other types like DIVIDEND don't affect share count
                break;
        }
    }

    // Convert Big to number for View Layer compatibility
    const result = new Map<UUID, number>();
    for (const [uuid, amount] of holdings.entries()) {
        if (!amount.eq(0)) {
            result.set(uuid, amount.toNumber());
        }
    }

    return result;
}
