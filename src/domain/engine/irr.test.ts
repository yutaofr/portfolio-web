import { describe, it, expect } from 'bun:test';
import { calculateIRR } from './irr';
import type { PortfolioState } from '../types';

function createMockState(accountTxs: any[], securities: Map<string, any>): PortfolioState {
    return {
        client: { baseCurrency: 'EUR' },
        securities,
        accounts: [{
            uuid: 'acc-1',
            name: 'Test Account',
            transactions: accountTxs
        }],
        portfolios: [{
            uuid: 'port-1',
            name: 'Test Portfolio',
            accounts: [],
            transactions: []
        }],
        taxonomies: [],
        securityTaxonomyMap: new Map()
    } as any;
}

describe('IRR Calculation', () => {
    it('should return 0 for deposit-only scenario', () => {
        // Deposit 155 EUR, no growth
        const txs = [
            { uuid: '1', date: '2021-01-15', type: 'DEPOSIT', amount: 155, currencyCode: 'EUR' },
        ];

        const state = createMockState(txs, new Map());
        const irr = calculateIRR(state, '2020-06-12', '2023-06-12');

        // Should be close to 0% (deposit account has no growth)
        expect(irr).toBeCloseTo(0, 2);
    });

    it('should calculate positive IRR for profitable investment', () => {
        // Simplified scenario: deposit 100, grows to 110
        const securities = new Map();
        securities.set('sec-1', {
            uuid: 'sec-1',
            name: 'Test Security',
            currencyCode: 'EUR',
            prices: [
                { t: '2026-01-01', v: 100 },
                { t: '2026-01-10', v: 110 }
            ]
        });

        const txs = [
            { uuid: '1', date: '2026-01-01', type: 'DEPOSIT', amount: 100, currencyCode: 'EUR' },
            { uuid: '2', date: '2026-01-01', type: 'BUY', amount: 100, shares: 1, securityUuid: 'sec-1', currencyCode: 'EUR' },
        ];

        const state = createMockState(txs, securities);
        const irr = calculateIRR(state, '2026-01-01', '2026-01-10');

        // Should be positive (around 10% for this period)
        expect(irr).toBeGreaterThan(0);
    });

    it('should handle multiple cash flows', () => {
        const securities = new Map();
        securities.set('sec-1', {
            uuid: 'sec-1',
            name: 'Test Security',
            currencyCode: 'EUR',
            prices: [
                { t: '2026-01-01', v: 100 },
                { t: '2026-01-05', v: 105 },
                { t: '2026-01-10', v: 115 }
            ]
        });

        const txs = [
            { uuid: '1', date: '2026-01-01', type: 'DEPOSIT', amount: 100, currencyCode: 'EUR' },
            { uuid: '2', date: '2026-01-01', type: 'BUY', amount: 100, shares: 1, securityUuid: 'sec-1', currencyCode: 'EUR' },
            { uuid: '3', date: '2026-01-05', type: 'DEPOSIT', amount: 50, currencyCode: 'EUR' },
            { uuid: '4', date: '2026-01-05', type: 'BUY', amount: 50, shares: 0.476, securityUuid: 'sec-1', currencyCode: 'EUR' },
        ];

        const state = createMockState(txs, securities);
        const irr = calculateIRR(state, '2026-01-01', '2026-01-10');

        // Should be positive
        expect(irr).toBeGreaterThan(0);
        // IRR can be very high for short periods with multiple cash flows
    });

    it('should handle withdrawal scenarios', () => {
        const securities = new Map();
        securities.set('sec-1', {
            uuid: 'sec-1',
            name: 'Test Security',
            currencyCode: 'EUR',
            prices: [
                { t: '2026-01-01', v: 100 },
                { t: '2026-01-10', v: 120 }
            ]
        });

        const txs = [
            { uuid: '1', date: '2026-01-01', type: 'DEPOSIT', amount: 200, currencyCode: 'EUR' },
            { uuid: '2', date: '2026-01-01', type: 'BUY', amount: 200, shares: 2, securityUuid: 'sec-1', currencyCode: 'EUR' },
            { uuid: '3', date: '2026-01-05', type: 'SELL', amount: 110, shares: 1, securityUuid: 'sec-1', currencyCode: 'EUR' },
            { uuid: '4', date: '2026-01-05', type: 'REMOVAL', amount: 110, currencyCode: 'EUR' },
        ];

        const state = createMockState(txs, securities);
        const irr = calculateIRR(state, '2026-01-01', '2026-01-10');

        // Should still be positive (remaining share grew)
        expect(irr).toBeGreaterThan(0);
    });
});
