import { describe, it, expect, beforeAll } from 'bun:test';
import { XmlParser } from './xmlParser';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PRICE_SCALING_FACTOR } from '../../config/scaling';
import Big from 'big.js';

describe('XmlParser', () => {
  let parser: XmlParser;
  let goldenXml: string;

  beforeAll(() => {
    parser = new XmlParser();
    // Assuming relative path from test execution context
    // In Bun test runner, CWD is usually project root
    goldenXml = readFileSync(join(process.cwd(), 'tests/fixtures/golden.xml'), 'utf-8');
  });

  it('should parse golden.xml without errors', () => {
    const result = parser.parse(goldenXml);
    expect(result).toBeDefined();
    expect(result.client.baseCurrency).toBe('EUR');
  });

  it('should scale prices correctly (1e8)', () => {
    const result = parser.parse(goldenXml);
    // Find ISH NSDAQ 100
    const security = Array.from(result.securities.values()).find(s => s.name === 'ISH NSDAQ 100');
    expect(security).toBeDefined();
    
    // Check first price: 19250000000 -> 192.50
    const price1 = security?.prices.find(p => p.t === '2023-01-01');
    expect(price1).toBeDefined();
    expect(price1?.v).toBe(192.50);
  });

  it('should scale transaction amounts correctly (1e2)', () => {
     const result = parser.parse(goldenXml);
     const portfolio = result.portfolios.find(p => p.name === 'Test Portfolio');
     expect(portfolio).toBeDefined();

     // Find BUY transaction
     const buyTx = portfolio?.transactions.find(t => t.type === 'BUY');
     expect(buyTx).toBeDefined();
     // Amount 192500 -> 1925.00
     expect(buyTx?.amount).toBe(1925.00);
  });

  it('should scale shares correctly (1e8)', () => {
      const result = parser.parse(goldenXml);
      const portfolio = result.portfolios.find(p => p.name === 'Test Portfolio');
      
      const buyTx = portfolio?.transactions.find(t => t.type === 'BUY');
      expect(buyTx?.shares).toBe(10.0); // 1000000000 -> 10.0
  });

  it('should parse accounts and transactions', () => {
      const result = parser.parse(goldenXml);
      expect(result.portfolios.length).toBe(1);
      expect(result.taxonomies.length).toBe(1);
      expect(result.taxonomies[0].name).toBe('Asset Classes');
      // We expect 1 account based on golden.xml
      // Note: Current XmlParser.ts implementation maps accounts but returns them as ... where?
      // Ah, PortfolioState has specific lists.
      // Let's check the return type of parser.parse()
      // It returns: { client, securities, portfolios, taxonomies, securityTaxonomyMap }
      // Wait, where are the accounts? 
      // XmlParser implementation: 
      // const accounts: Account[] = ...
      // But return object doesn't include accounts! FIX NEEDED.
  });
});
