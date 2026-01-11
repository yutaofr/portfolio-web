import { XmlParser } from './parser/xmlParser';
import { readFileSync } from 'fs';

/**
 * Debug script to inspect parsed portfolio data
 * Usage: bun run src/domain/debug-parse.ts
 * 
 * Note: This uses test fixtures. To debug real data, pass the file path as an argument:
 * bun run src/domain/debug-parse.ts /path/to/your/portfolio.xml
 */

const parser = new XmlParser();

// Use test fixture by default, or accept file path from command line
const xmlPath = process.argv[2] || './tests/fixtures/golden.xml';

let xml: string;
try {
    xml = readFileSync(xmlPath, 'utf-8');
    console.log(`📂 Loaded: ${xmlPath}\n`);
} catch (err) {
    console.error(`❌ Failed to load file: ${xmlPath}`);
    console.error('Usage: bun run src/domain/debug-parse.ts [path/to/portfolio.xml]');
    process.exit(1);
}

const state = parser.parse(xml);

console.log('=== Portfolio Summary ===\n');
console.log(`Securities: ${state.securities.size}`);
console.log(`Accounts: ${state.accounts.length}`);
console.log(`Portfolios: ${state.portfolios.length}`);
console.log(`Base Currency: ${state.client.baseCurrency}`);

console.log('\n=== Check Transaction Types ===\n');

// Get sample transactions by type
const txTypes = new Set<string>();
state.portfolios.forEach(p => {
    p.transactions.forEach(t => txTypes.add(t.type));
});

console.log(`Found transaction types: ${Array.from(txTypes).join(', ')}`);

// Show sample DELIVERY_INBOUND if exists
state.portfolios.forEach(p => {
    const tx = p.transactions.find(t => t.type === 'DELIVERY_INBOUND');
    if (tx) {
        console.log('\nSample DELIVERY_INBOUND transaction:');
        console.log(JSON.stringify(tx, null, 2));
        return;
    }
});

// Show sample BUY transaction
state.portfolios.forEach(p => {
    const tx = p.transactions.find(t => t.type === 'BUY');
    if (tx) {
        console.log('\nSample BUY transaction:');
        console.log(JSON.stringify(tx, null, 2));
        return;
    }
});

console.log('\n=== Raw XML Sample ===');
console.log(xml.substring(0, 500) + '...\n');
