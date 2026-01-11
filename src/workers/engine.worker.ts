/// <reference lib="webworker" />
import { expose } from 'comlink';
import { deserializeState, type SerializedPortfolioState } from '../domain/serialization';
import { EngineException, EngineErrorCode } from '../domain/errors';
import { calculateValuation } from '../domain/engine/valuation';
import { buildValuationIndex, calculateValuationFast, type ValuationIndex } from '../domain/engine/valuationIndex';
import { calculateTWR } from '../domain/engine/performance';
import { calculateIRR } from '../domain/engine/irr';
import { calculateCapitalFlow } from '../domain/engine/capitalFlow';
import type { PortfolioState } from '../domain/types';

/**
 * KPI calculation result with performance metrics
 */
export interface KPIData {
    nav: number;
    twr: number;
    irr: number;
    capitalInvested: number;
    startDate: string;
    endDate: string;
    duration: number; // calculation time in ms
}

/**
 * Valuation result for a specific date
 */
export interface ValuationData {
    date: string;
    cashBalance: number;
    securityValue: number;
    totalValue: number;
}

let state: PortfolioState | null = null;
let valuationIndex: ValuationIndex | null = null;
const valuationCache = new Map<string, ValuationData>();

/**
 * Engine API exposed to main thread via Comlink
 */
const engineAPI = {
    /**
     * Initialize the worker with portfolio state
     */
    async init(serializedState: SerializedPortfolioState): Promise<void> {
        const initStart = performance.now();

        state = deserializeState(serializedState);

        // Build valuation index for fast lookups
        valuationIndex = buildValuationIndex(state);
        valuationCache.clear();

        const initDuration = performance.now() - initStart;
        console.log(`[Engine Worker] State initialized and index built in ${initDuration.toFixed(0)}ms`);
    },

    /**
     * Calculate all KPI metrics for a date range
     */
    async calculateKPI(startDate: string, endDate: string): Promise<KPIData> {
        if (!state || !valuationIndex) {
            throw new EngineException(
                EngineErrorCode.STATE_NOT_INITIALIZED,
                'Worker state not initialized. Call init() first.',
                false
            );
        }

        const start = performance.now();

        try {
            // Use cached/fast valuation
            const nav = await this.calculateValuationCached(endDate);
            const twr = calculateTWR(state, startDate, endDate);
            const irr = calculateIRR(state, startDate, endDate);
            const capital = calculateCapitalFlow(state, startDate, endDate);

            const duration = performance.now() - start;

            if (import.meta.env.DEV) {
                console.log(`[Engine Worker] KPI calculated in ${duration.toFixed(0)}ms`);
            }

            return {
                nav: nav.totalValue,
                twr,
                irr,
                capitalInvested: capital.netInvested,
                startDate,
                endDate,
                duration,
            };
        } catch (err) {
            console.error('[Engine Worker] KPI calculation error:', err);
            throw new EngineException(
                EngineErrorCode.CALCULATION_OVERFLOW,
                err instanceof Error ? err.message : String(err),
                true
            );
        }
    },

    /**
     * Calculate valuation for a specific date (with caching)
     */
    async calculateValuationCached(date: string): Promise<ValuationData> {
        if (!state || !valuationIndex) {
            throw new EngineException(
                EngineErrorCode.STATE_NOT_INITIALIZED,
                'Worker state not initialized',
                false
            );
        }

        // Check cache
        if (valuationCache.has(date)) {
            return valuationCache.get(date)!;
        }

        // Use fast path with index
        const result = calculateValuationFast(valuationIndex, date, state.securities);
        const valuationData = { date, ...result };

        // Cache result (LRU-like: clear if too large)
        if (valuationCache.size > 1000) {
            // Simple eviction: clear oldest half
            const entries = Array.from(valuationCache.entries());
            valuationCache.clear();
            entries.slice(entries.length / 2).forEach(([k, v]) => valuationCache.set(k, v));
        }

        valuationCache.set(date, valuationData);
        return valuationData;
    },

    /**
     * Calculate valuation for a specific date (public API)
     */
    async calculateValuation(date: string): Promise<ValuationData> {
        return this.calculateValuationCached(date);
    },

    /**
     * Calculate valuation series for multiple dates (for charts)
     */
    async calculateValuationSeries(dates: string[]): Promise<ValuationData[]> {
        if (!state || !valuationIndex) {
            throw new EngineException(
                EngineErrorCode.STATE_NOT_INITIALIZED,
                'Worker state not initialized',
                false
            );
        }

        // Use cached fast path for each date
        return Promise.all(dates.map(date => this.calculateValuationCached(date)));
    },

    /**
     * Pre-calculate KPI for multiple date ranges (batch operation)
     * Used for pre-computing common time periods on file load
     */
    async calculateAllKPI(periods: Array<{ key: string; startDate: string; endDate: string }>): Promise<Record<string, KPIData>> {
        if (!state || !valuationIndex) {
            throw new EngineException(
                EngineErrorCode.STATE_NOT_INITIALIZED,
                'Worker state not initialized',
                false
            );
        }

        const results: Record<string, KPIData> = {};
        const batchStart = performance.now();

        for (const { key, startDate, endDate } of periods) {
            results[key] = await this.calculateKPI(startDate, endDate);
        }

        const batchDuration = performance.now() - batchStart;
        console.log(`[Engine Worker] Batch KPI calculated ${periods.length} periods in ${batchDuration.toFixed(0)}ms`);

        return results;
    },
};

// Expose API via Comlink
expose(engineAPI);

export type EngineAPI = typeof engineAPI;
