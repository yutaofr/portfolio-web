import { create } from 'zustand';
import type { Remote } from 'comlink';
import type { PortfolioState } from '../domain/types';
import type { WorkerResponse } from '../workers/parser.worker';
import type { KPIData } from '../workers/engine.worker';
import type { EngineError } from '../domain/errors';
import { serializeState } from '../domain/serialization';
import { getOrCreateWorker, terminateWorker, markWorkerReady, markWorkerError } from './workerLifecycle';
import { parseEngineError } from '../domain/errors';

interface AppState {
  // === XML Parsing State ===
  status: 'IDLE' | 'LOADING' | 'READY' | 'ERROR';
  data: PortfolioState | null;
  error: string | null;

  // === KPI Calculation State ===
  kpiStatus: 'IDLE' | 'CALCULATING' | 'READY' | 'ERROR';
  kpiData: KPIData | null;
  kpiError: EngineError | null;
  kpiStale: boolean;  // NEW: marks if data is outdated
  kpiTimestamp: number;  // NEW: last update timestamp
  kpiCache: Record<string, KPIData>;  // NEW: cache for precomputed KPIs
  lastRequestId: number;

  // === Actions ===
  loadXml: (fileContent: string) => Promise<void>;
  requestKPI: (startDate: string, endDate: string) => Promise<void>;
  precomputeKPI: () => Promise<void>;  // NEW: precompute common periods
  reset: () => void;
  setPayload: (data: PortfolioState) => void;
}

export const usePortfolioStore = create<AppState>((set, get) => ({
  // === Initial State ===
  status: 'IDLE',
  data: null,
  error: null,
  kpiStatus: 'IDLE',
  kpiData: null,
  kpiError: null,
  kpiStale: false,
  kpiTimestamp: 0,
  kpiCache: {},
  lastRequestId: 0,

  // === Actions ===
  setPayload: (data: PortfolioState) => set({ data, status: 'READY', error: null }),

  loadXml: async (xmlContent: string) => {
    set({ status: 'LOADING', error: null });

    try {
      // 1. Parse XML with parser worker
      const parserWorker = new Worker(
        new URL('../workers/parser.worker.ts', import.meta.url),
        { type: 'module' }
      );

      const result = await new Promise<PortfolioState>((resolve, reject) => {
        parserWorker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.type === 'SUCCESS') {
            resolve(e.data.payload);
          } else {
            reject(new Error(e.data.error));
          }
          parserWorker.terminate();
        };

        parserWorker.onerror = (err) => {
          reject(err);
          parserWorker.terminate();
        };

        parserWorker.postMessage({ type: 'PARSE_XML', payload: xmlContent });
      });

      // 2. Initialize engine worker with parsed data
      const { proxy } = getOrCreateWorker();
      await proxy.init(serializeState(result));
      markWorkerReady();

      set({ status: 'READY', data: result });

      // Pre-compute common KPI periods
      await get().precomputeKPI();

    } catch (err: any) {
      console.error('[Store] Load XML error:', err);
      markWorkerError();
      set({ status: 'ERROR', error: err.message });
    }
  },

  requestKPI: async (startDate: string, endDate: string) => {
    // Check cache first
    const cacheKey = `${startDate}|${endDate}`;
    const cached = get().kpiCache[cacheKey];

    if (cached) {
      // Instant response from cache
      set({
        kpiData: cached,
        kpiStatus: 'READY',
        kpiStale: false,
        kpiTimestamp: Date.now()
      });
      return;
    }

    // Cache miss - calculate on demand
    const currentId = ++get().lastRequestId;
    set({
      kpiStatus: 'CALCULATING',
      kpiStale: get().kpiData !== null,  // Mark as stale if we have old data
      kpiError: null
    });

    try {
      const { proxy } = getOrCreateWorker();
      const result = await proxy.calculateKPI(startDate, endDate);

      // Only update if this request is still the latest
      if (currentId === get().lastRequestId) {
        // Store in cache
        const newCache = { ...get().kpiCache, [cacheKey]: result };

        set({
          kpiData: result,
          kpiStatus: 'READY',
          kpiStale: false,  // Fresh data
          kpiTimestamp: Date.now(),
          kpiCache: newCache
        });
      }
    } catch (err: any) {
      console.error('[Store] KPI calculation error:', err);

      // Only update if this request is still the latest
      if (currentId === get().lastRequestId) {
        set({
          kpiStatus: 'ERROR',
          kpiError: parseEngineError(err)
        });
      }
    }
  },

  precomputeKPI: async () => {
    const data = get().data;
    if (!data) return;

    try {
      // Calculate date ranges
      const today = new Date().toISOString().split('T')[0];
      const ytdStart = `${new Date().getFullYear()}-01-01`;

      // Find first transaction date for all-time calculations
      let firstDate = today;
      data.portfolios.forEach(p => {
        p.transactions.forEach(t => {
          if (t.date < firstDate) firstDate = t.date;
        });
      });
      data.accounts.forEach(a => {
        a.transactions.forEach(t => {
          if (t.date < firstDate) firstDate = t.date;
        });
      });

      const periods = [
        { key: `${firstDate}|${today}`, startDate: firstDate, endDate: today },  // ALL_TIME
        { key: `${ytdStart}|${today}`, startDate: ytdStart, endDate: today },    // YTD
      ];

      console.log('[Store] Pre-computing KPI for periods:', periods.map(p => p.key));

      const { proxy } = getOrCreateWorker();
      const results = await proxy.calculateAllKPI(periods);

      set({ kpiCache: results });
      console.log('[Store] KPI cache populated with', Object.keys(results).length, 'entries');
    } catch (err: any) {
      console.error('[Store] Precompute KPI error:', err);
      // Don't fail the whole load process, just log the error
    }
  },

  reset: () => {
    terminateWorker();
    set({
      status: 'IDLE',
      data: null,
      error: null,
      kpiStatus: 'IDLE',
      kpiData: null,
      kpiError: null,
      kpiCache: {},
      lastRequestId: 0,
    });
  },
}));
