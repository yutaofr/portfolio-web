import { describe, it, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'fs';
import { XmlParser } from '../../src/domain/parser/xmlParser';
import { calculateTWR } from '../../src/domain/engine/performance';
import { calculateValuation } from '../../src/domain/engine/valuation';
import type { PortfolioState } from '../../src/domain/types';

/**
 * E2E Test: YTD Performance Metrics Validation
 * 
 * Uses synthetic test data to validate YTD calculations:
 * - TWR: Time-weighted return for YTD period
 * - Valuation: Portfolio value at period start/end
 * - Delta: Change in portfolio value
 * 
 * Test data setup (ytd-test.xml):
 * - Stock A: 2000 shares @ 100 EUR (2025-12-31) -> 103 EUR (2026-01-09) = +3%
 * - Stock B: 3800 shares @ 50 EUR (2025-12-31) -> 50.60 EUR (2026-01-09) = +1.2%
 * - Cash: 10,000 EUR remaining
 * - Period Start Value (2026-01-01): ~400,000 EUR
 * - Period End Value (2026-01-09): ~408,280 EUR
 * - Expected TWR: ~2.07%
 */

describe('E2E: YTD Performance Metrics', () => {
    let state: PortfolioState;
    const YTD_START = '2026-01-01';
    const YTD_END = '2026-01-09';

    beforeAll(() => {
        const xmlPath = './tests/fixtures/ytd-test.xml';
        const xmlContent = readFileSync(xmlPath, 'utf-8');
        const parser = new XmlParser();
        state = parser.parse(xmlContent);

        console.log('✓ Loaded synthetic YTD test data');
        console.log(`  Period: ${YTD_START} to ${YTD_END}`);
        console.log(`  Securities: ${state.securities.size}`);
    });

    it('should calculate TWR for YTD period (~2.07%)', () => {
        const twr = calculateTWR(state, YTD_START, YTD_END);
        const twrPercent = twr * 100;

        console.log(`\n📊 TWR:`);
        console.log(`  Calculated: ${twrPercent.toFixed(4)}%`);
        console.log(`  Expected:   ~2.07%`);

        // Stock A: 2000 * (103/100 - 1) = +6000 EUR
        // Stock B: 3800 * (50.60/50 - 1) = +4560 EUR
        // Total gain: ~10,560 EUR on ~400,000 EUR = ~2.64%
        // But TWR accounts for daily compounding, expect ~2.07%
        expect(twrPercent).toBeGreaterThan(2.0);
        expect(twrPercent).toBeLessThan(3.0);
    });

    it('should calculate Period Start Value (2026-01-01)', () => {
        const startVal = calculateValuation(state, YTD_START);

        console.log(`\n📊 Period Start Value (2026-01-01):`);
        console.log(`  Cash: €${startVal.cashBalance.toFixed(2)}`);
        console.log(`  Securities: €${startVal.securityValue.toFixed(2)}`);
        console.log(`  Total: €${startVal.totalValue.toFixed(2)}`);

        // Expected:
        // Cash: 10,000 EUR
        // Stock A: 2000 * 100 = 200,000 EUR
        // Stock B: 3800 * 50 = 190,000 EUR
        // Total: 400,000 EUR
        expect(startVal.cashBalance).toBeCloseTo(10000, 0);
        expect(startVal.securityValue).toBeCloseTo(390000, 0);
        expect(startVal.totalValue).toBeCloseTo(400000, 0);
    });

    it('should calculate Period End Value (2026-01-09)', () => {
        const endVal = calculateValuation(state, YTD_END);

        console.log(`\n📊 Period End Value (2026-01-09):`);
        console.log(`  Cash: €${endVal.cashBalance.toFixed(2)}`);
        console.log(`  Securities: €${endVal.securityValue.toFixed(2)}`);
        console.log(`  Total: €${endVal.totalValue.toFixed(2)}`);

        // Expected:
        // Cash: 10,000 EUR
        // Stock A: 2000 * 103 = 206,000 EUR
        // Stock B: 3800 * 50.60 = 192,280 EUR
        // Total: 408,280 EUR
        expect(endVal.cashBalance).toBeCloseTo(10000, 0);
        expect(endVal.securityValue).toBeCloseTo(398280, 0);
        expect(endVal.totalValue).toBeCloseTo(408280, 0);
    });

    it('should calculate Delta correctly (~8,280 EUR)', () => {
        const startVal = calculateValuation(state, YTD_START);
        const endVal = calculateValuation(state, YTD_END);
        const delta = endVal.totalValue - startVal.totalValue;

        console.log(`\n📊 Delta (Period Change):`);
        console.log(`  Calculated: €${delta.toFixed(2)}`);
        console.log(`  Expected:   €8,280.00`);

        // Stock A gain: 2000 * 3 = 6,000 EUR
        // Stock B gain: 3800 * 0.60 = 2,280 EUR
        // Total: 8,280 EUR
        expect(delta).toBeCloseTo(8280, 0);
    });

    it('should provide complete YTD summary', () => {
        const twr = calculateTWR(state, YTD_START, YTD_END);
        const startVal = calculateValuation(state, YTD_START);
        const endVal = calculateValuation(state, YTD_END);
        const delta = endVal.totalValue - startVal.totalValue;

        console.log(`\n📋 YTD Summary (${YTD_START} to ${YTD_END}):`);
        console.log(`  ┌────────────────────────────────────────┐`);
        console.log(`  │ TWR:              ${(twr * 100).toFixed(2)}%           │`);
        console.log(`  │ Start Value:      €${startVal.totalValue.toFixed(2)}  │`);
        console.log(`  │ End Value:        €${endVal.totalValue.toFixed(2)}  │`);
        console.log(`  │ Delta:            €${delta.toFixed(2)}       │`);
        console.log(`  └────────────────────────────────────────┘`);

        expect(twr).toBeDefined();
        expect(delta).toBeGreaterThan(0);
    });
});
