import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { usePortfolioStore } from './usePortfolioStore';

// Mock Worker class
const originalWorker = global.Worker;

describe('usePortfolioStore', () => {
    let mockPostMessage: any;
    let mockTerminate: any;

    beforeEach(() => {
        // Reset store
        usePortfolioStore.getState().reset();

        // Mock Worker
        mockPostMessage = mock(() => {});
        mockTerminate = mock(() => {});

        global.Worker = class MockWorker {
            onmessage: ((e: any) => void) | null = null;
            onerror: ((e: any) => void) | null = null;
            postMessage = mockPostMessage;
            terminate = mockTerminate;
            
            constructor() {
                // Simulate async response after a delay
                setTimeout(() => {
                    if (this.onmessage) {
                        this.onmessage({
                            data: { 
                                type: 'SUCCESS', 
                                payload: { client: { baseCurrency: 'EUR' } } // Minimal Mock State
                            } 
                        });
                    }
                }, 10);
            }
        } as any;
    });

    afterEach(() => {
        global.Worker = originalWorker;
    });

    it('should start in IDLE state', () => {
        expect(usePortfolioStore.getState().status).toBe('IDLE');
    });

    it('should transition to LOADING then READY on success', async () => {
        const promise = usePortfolioStore.getState().loadXml('<xml>test</xml>');
        
        // Immediate check: Should be loading
        expect(usePortfolioStore.getState().status).toBe('LOADING');
        
        await promise;
        
        // Final check: Should be ready
        expect(usePortfolioStore.getState().status).toBe('READY');
        expect(usePortfolioStore.getState().data).toBeDefined();
        // @ts-ignore
        expect(usePortfolioStore.getState().data.client.baseCurrency).toBe('EUR');
    });
});
