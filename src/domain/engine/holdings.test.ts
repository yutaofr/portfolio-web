import { describe, it, expect, beforeAll } from 'bun:test';
import { calculateHoldings } from './holdings';
import { XmlParser } from '../parser/xmlParser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Holdings Engine', () => {
    let transactions: any[];
    let securityUuid: string;

    beforeAll(() => {
        const parser = new XmlParser();
        const xml = readFileSync(join(process.cwd(), 'tests/fixtures/golden.xml'), 'utf-8');
        const state = parser.parse(xml);
        
        // Flatten all transactions from all portfolios
        transactions = state.portfolios.flatMap(p => p.transactions);
        
        // Check if parser resolved the uuid
        const security = Array.from(state.securities.values()).find(s => s.name === 'ISH NSDAQ 100');
        if (!security) throw new Error("Security not found in golden dataset");
        securityUuid = security.uuid;
        
        // Ensure transactions have this uuid
        const securityTxs = transactions.filter(t => t.securityUuid === securityUuid);
        if (securityTxs.length === 0) throw new Error("Parser failed to resolve security reference for transactions");
    });

    it('should calculate correct holdings (10 Buy - 5 Sell = 5)', () => {
        const holdings = calculateHoldings(transactions, '2023-12-31');
        const quantity = holdings.get(securityUuid);
        expect(quantity).toBe(5.0);
    });

    it('should handle date filtering', () => {
        // Before the SELL date (2023-01-03)
        const holdings = calculateHoldings(transactions, '2023-01-02');
        const quantity = holdings.get(securityUuid);
        expect(quantity).toBe(10.0);
    });
});
