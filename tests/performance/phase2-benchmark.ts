/**
 * Performance benchmark test for Phase 2 optimization
 * Compares old calculateValuation vs new ValuationIndex approach
 */

import { XmlParser } from '../../src/domain/parser/xmlParser';
import { calculateValuation } from '../../src/domain/engine/valuation';
import { buildValuationIndex, calculateValuationFast } from '../../src/domain/engine/valuationIndex';
import { readFileSync } from 'fs';


// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    red: '\x1b[31m',
};

function log(color: string, message: string) {
    console.log(`${color}${message}${colors.reset}`);
}

async function runBenchmark() {
    log(colors.blue, '\n=== Phase 2 Performance Benchmark ===\n');

    // 1. Load test data (use fixture only)
    log(colors.yellow, '📂 Loading test fixture...');
    const xmlPath = './tests/fixtures/golden.xml';

    let xmlContent: string;
    try {
        xmlContent = readFileSync(xmlPath, 'utf-8');
        log(colors.green, `✓ Loaded test fixture: ${xmlPath}`);
    } catch (err) {
        log(colors.red, `❌ Failed to load test fixture: ${xmlPath}`);
        log(colors.red, 'Please ensure test fixtures exist');
        process.exit(1);
    }

    const parser = new XmlParser();
    const state = parser.parse(xmlContent);

    log(colors.green, `✓ Loaded portfolio with ${state.securities.size} securities`);

    // 2. Generate test dates
    const testDates: string[] = [];
    const endDate = new Date();
    for (let i = 365; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(endDate.getDate() - i);
        testDates.push(d.toISOString().split('T')[0]);
    }

    log(colors.green, `✓ Generated ${testDates.length} test dates (1 year)\n`);

    // 3. Benchmark: Old approach (no index)
    log(colors.yellow, '⏱️  Benchmark 1: Old approach (calculateValuation)');
    const oldStart = performance.now();

    const oldResults = testDates.map(date => calculateValuation(state, date));

    const oldDuration = performance.now() - oldStart;
    log(colors.green, `   Completed in ${oldDuration.toFixed(0)}ms`);
    log(colors.blue, `   Average per date: ${(oldDuration / testDates.length).toFixed(2)}ms\n`);

    // 4. Benchmark: New approach (with index)
    log(colors.yellow, '⏱️  Benchmark 2: New approach (ValuationIndex)');

    // Build index
    const indexStart = performance.now();
    const index = buildValuationIndex(state);
    const indexDuration = performance.now() - indexStart;
    log(colors.blue, `   Index built in ${indexDuration.toFixed(0)}ms`);

    // Calculate with index
    const newStart = performance.now();
    const newResults = testDates.map(date =>
        calculateValuationFast(index, date, state.securities)
    );
    const newDuration = performance.now() - newStart;

    log(colors.green, `   Completed in ${newDuration.toFixed(0)}ms`);
    log(colors.blue, `   Average per date: ${(newDuration / testDates.length).toFixed(2)}ms\n`);

    // 5. Results comparison
    log(colors.blue, '📊 Performance Summary:\n');

    const totalOld = oldDuration;
    const totalNew = indexDuration + newDuration;
    const speedup = totalOld / totalNew;

    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│ Metric                    │ Old      │ New      │');
    console.log('├─────────────────────────────────────────────────┤');
    console.log(`│ Index build time          │ N/A      │ ${indexDuration.toFixed(0).padStart(6)}ms │`);
    console.log(`│ Calculation time (365d)   │ ${oldDuration.toFixed(0).padStart(6)}ms │ ${newDuration.toFixed(0).padStart(6)}ms │`);
    console.log(`│ Total time                │ ${totalOld.toFixed(0).padStart(6)}ms │ ${totalNew.toFixed(0).padStart(6)}ms │`);
    console.log(`│ Avg per date              │ ${(oldDuration / testDates.length).toFixed(2).padStart(6)}ms │ ${(newDuration / testDates.length).toFixed(2).padStart(6)}ms │`);
    console.log('└─────────────────────────────────────────────────┘\n');

    if (speedup >= 10) {
        log(colors.green, `🎉 SPEEDUP: ${speedup.toFixed(1)}x faster! Target achieved! ✓`);
    } else if (speedup >= 5) {
        log(colors.yellow, `⚡ SPEEDUP: ${speedup.toFixed(1)}x faster (target: 10x)`);
    } else {
        log(colors.red, `⚠️  SPEEDUP: ${speedup.toFixed(1)}x faster (below target)`);
    }

    // 6. Correctness validation
    log(colors.yellow, '\n🔍 Validating correctness...');

    let maxDiff = 0;
    let diffCount = 0;

    for (let i = 0; i < testDates.length; i++) {
        const diff = Math.abs(oldResults[i].totalValue - newResults[i].totalValue);
        if (diff > maxDiff) maxDiff = diff;
        if (diff > 0.01) diffCount++;
    }

    if (maxDiff < 0.01) {
        log(colors.green, `✓ Results match perfectly (max diff: ${maxDiff.toFixed(4)})`);
    } else if (maxDiff < 1.0) {
        log(colors.yellow, `⚠️  Small differences detected (max diff: ${maxDiff.toFixed(2)}, count: ${diffCount})`);
    } else {
        log(colors.red, `❌ Significant differences detected (max diff: ${maxDiff.toFixed(2)}, count: ${diffCount})`);
    }

    // 7. Memory estimation
    log(colors.yellow, '\n💾 Memory estimation:');
    const cashTimelineSize = index.cashTimeline.length * 20;
    const holdingsSize = Array.from(index.holdingsTimeline.values())
        .reduce((sum, arr) => sum + arr.length * 20, 0);
    const priceSize = Array.from(index.priceIndex.values())
        .reduce((sum, arr) => sum + arr.length * 20, 0);
    const totalSize = cashTimelineSize + holdingsSize + priceSize;

    log(colors.blue, `   Cash timeline: ${(cashTimelineSize / 1024).toFixed(1)} KB`);
    log(colors.blue, `   Holdings timeline: ${(holdingsSize / 1024).toFixed(1)} KB`);
    log(colors.blue, `   Price index: ${(priceSize / 1024).toFixed(1)} KB`);
    log(colors.green, `   Total index size: ${(totalSize / 1024).toFixed(1)} KB`);

    log(colors.blue, '\n=== Benchmark Complete ===\n');
}

// Run benchmark
runBenchmark().catch(err => {
    log(colors.red, `\n❌ Benchmark failed: ${err.message}`);
    console.error(err);
    process.exit(1);
});
