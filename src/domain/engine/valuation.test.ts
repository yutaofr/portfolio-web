import { describe, it, expect, beforeAll } from 'bun:test';
import { calculateValuation } from './valuation';
import { XmlParser } from '../parser/xmlParser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Valuation Engine', () => {
    let state: any;

    beforeAll(() => {
        const parser = new XmlParser();
        const xml = readFileSync(join(process.cwd(), 'tests/fixtures/golden.xml'), 'utf-8');
        state = parser.parse(xml);
    });

    it('should calculate correct NAV at T3 (2023-01-03)', () => {
        // Timeline:
        // T1 (Jan 1): Deposit 2000. Buy 10 @ 192.50 (Cost 1925).
        // Cash = 2000 - 1925 = 75. 
        // Shares = 10. Value = 10 * 192.50 = 1925. 
        // NAV = 75 + 1925 = 2000.
        
        // T2 (Jan 2): Price drops to 192.44.
        // Cash = 75.
        // Shares = 10. Value = 10 * 192.44 = 1924.40.
        // NAV = 75 + 1924.40 = 1999.40.

        // T3 (Jan 3): Sell 5 @ 190.60 (Proceeds 953). Price is 190.60.
        // Cash = 75 + 953 = 1028.
        // Shares = 5. Value = 5 * 190.60 = 953.
        // NAV = 1028 + 953 = 1981.

        const valT3 = calculateValuation(state, '2023-01-03');
        
        expect(valT3.cashBalance).toBe(1028.00);
        expect(valT3.securityValue).toBe(953.00);
        expect(valT3.totalValue).toBe(1981.00);
    });

    it('should handle Forward Fill pricing', () => {
        // T4 (Jan 4): No price in XML. Should use T3 price (190.60).
        const valT4 = calculateValuation(state, '2023-01-04');
        expect(valT4.securityValue).toBe(953.00);
    });
});
