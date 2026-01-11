import type { Remote } from 'comlink';
import { wrap } from 'comlink';
import type { EngineAPI } from '../workers/engine.worker';

export type WorkerLifecycle =
    | 'UNINITIALIZED'
    | 'INITIALIZING'
    | 'READY'
    | 'ERROR'
    | 'TERMINATED';

let engineWorker: Worker | null = null;
let engineProxy: Remote<EngineAPI> | null = null;
let workerLifecycle: WorkerLifecycle = 'UNINITIALIZED';

/**
 * Get or create the engine worker singleton.
 * Automatically terminates old worker if exists.
 */
export function getOrCreateWorker(): { worker: Worker; proxy: Remote<EngineAPI> } {
    if (engineWorker && engineProxy && workerLifecycle === 'READY') {
        return { worker: engineWorker, proxy: engineProxy };
    }

    // Clean up old worker
    terminateWorker();

    // Create new worker
    engineWorker = new Worker(
        new URL('../workers/engine.worker.ts', import.meta.url),
        { type: 'module' }
    );
    engineProxy = wrap<EngineAPI>(engineWorker);
    workerLifecycle = 'INITIALIZING';

    return { worker: engineWorker, proxy: engineProxy };
}

/**
 * Terminate the worker and clean up resources
 */
export function terminateWorker(): void {
    if (engineWorker) {
        engineWorker.terminate();
        engineWorker = null;
        engineProxy = null;
        workerLifecycle = 'TERMINATED';
    }
}

/**
 * Get current worker lifecycle state
 */
export function getWorkerLifecycle(): WorkerLifecycle {
    return workerLifecycle;
}

/**
 * Mark worker as ready
 */
export function markWorkerReady(): void {
    workerLifecycle = 'READY';
}

/**
 * Mark worker as error
 */
export function markWorkerError(): void {
    workerLifecycle = 'ERROR';
}
