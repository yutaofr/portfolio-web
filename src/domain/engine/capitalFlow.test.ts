import { describe, it, expect } from 'bun:test';
import { calculateCapitalFlow } from './capitalFlow';
import type { PortfolioState } from '../types';

function createMockState(accountTxs: any[], portfolioTxs: any[]): PortfolioState {
    return {
        client: { baseCurrency: 'EUR' },
        securities: new Map(),
        accounts: [{
            uuid: 'acc-1',
            name: 'Test Account',
            transactions: accountTxs
        }],
        portfolios: [{
            uuid: 'port-1',
            name: 'Test Portfolio',
            accounts: [],
            transactions: portfolioTxs
        }],
        taxonomies: [],
        securityTaxonomyMap: new Map()
    } as any;
}

describe('Capital Flow', () => {
    it('should calculate deposits correctly', () => {
        const txs = [
            { uuid: '1', date: '2026-01-02', type: 'DEPOSIT', amount: 1000, currencyCode: 'EUR' },
            { uuid: '2', date: '2026-01-05', type: 'DEPOSIT', amount: 500, currencyCode: 'EUR' },
        ];

        const state = createMockState(txs, []);
        const result = calculateCapitalFlow(state, '2026-01-01', '2026-01-10');

        expect(result.deposited).toBe(1500);
        expect(result.withdrawn).toBe(0);
        expect(result.netInvested).toBe(1500);
    });

    it('should calculate withdrawals correctly', () => {
        const txs = [
            { uuid: '1', date: '2026-01-02', type: 'DEPOSIT', amount: 1000, currencyCode: 'EUR' },
            { uuid: '2', date: '2026-01-05', type: 'REMOVAL', amount: 300, currencyCode: 'EUR' },
        ];

        const state = createMockState(txs, []);
        const result = calculateCapitalFlow(state, '2026-01-01', '2026-01-10');

        expect(result.deposited).toBe(1000);
        expect(result.withdrawn).toBe(300);
        expect(result.netInvested).toBe(700);
    });

    it('should handle delivery transactions', () => {
        const portfolioTxs = [
            { uuid: '1', date: '2026-01-03', type: 'DELIVERY_INBOUND', amount: 5000, currencyCode: 'EUR', shares: 10, securityUuid: 'sec-1' },
            { uuid: '2', date: '2026-01-07', type: 'DELIVERY_OUTBOUND', amount: 2000, currencyCode: 'EUR', shares: 4, securityUuid: 'sec-1' },
        ];

        const state = createMockState([], portfolioTxs);
        const result = calculateCapitalFlow(state, '2026-01-01', '2026-01-10');

        expect(result.deposited).toBe(5000);
        expect(result.withdrawn).toBe(2000);
        expect(result.netInvested).toBe(3000);
    });

    it('should respect date range', () => {
        const txs = [
            { uuid: '1', date: '2025-12-31', type: 'DEPOSIT', amount: 100, currencyCode: 'EUR' },
            { uuid: '2', date: '2026-01-02', type: 'DEPOSIT', amount: 200, currencyCode: 'EUR' },
            { uuid: '3', date: '2026-01-15', type: 'DEPOSIT', amount: 300, currencyCode: 'EUR' },
        ];

        const state = createMockState(txs, []);
        const result = calculateCapitalFlow(state, '2026-01-01', '2026-01-10');

        expect(result.deposited).toBe(200); // Only tx on 2026-01-02
        expect(result.netInvested).toBe(200);
    });

    it('should ignore non-capital transactions', () => {
        const txs = [
            { uuid: '1', date: '2026-01-02', type: 'DEPOSIT', amount: 1000, currencyCode: 'EUR' },
            { uuid: '2', date: '2026-01-03', type: 'BUY', amount: 500, currencyCode: 'EUR', shares: 10, securityUuid: 'sec-1' },
            { uuid: '3', date: '2026-01-04', type: 'DIVIDEND', amount: 50, currencyCode: 'EUR', securityUuid: 'sec-1' },
        ];

        const state = createMockState(txs, []);
        const result = calculateCapitalFlow(state, '2026-01-01', '2026-01-10');

        expect(result.deposited).toBe(1000); // Only DEPOSIT counts
        expect(result.netInvested).toBe(1000);
    });
});
