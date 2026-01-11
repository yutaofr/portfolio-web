/**
 * Web Vitals Performance Monitoring
 * Tracks core web vitals and custom performance metrics
 */

import { onLCP, onCLS, onTTFB, onINP, type Metric } from 'web-vitals';

export interface PerformanceMetric {
    name: string;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    delta: number;
    id: string;
}

type MetricHandler = (metric: PerformanceMetric) => void;

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals(onMetric?: MetricHandler) {
    const handler = (metric: Metric) => {
        const perfMetric: PerformanceMetric = {
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
        };

        // Default: log to console in dev mode
        if (import.meta.env.DEV) {
            const color = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
            console.log(`[Web Vitals] ${color} ${metric.name}: ${metric.value.toFixed(0)}ms (${metric.rating})`);
        }

        // Custom handler
        onMetric?.(perfMetric);
    };

    // Core Web Vitals
    onLCP(handler);
    onCLS(handler);
    onTTFB(handler);
    onINP(handler);
}

/**
 * Custom performance marker for application-specific metrics
 */
export function markPerformance(name: string, startTime: number): number {
    const duration = performance.now() - startTime;

    if (import.meta.env.DEV) {
        console.log(`[Perf] ${name}: ${duration.toFixed(0)}ms`);
    }

    // Can be extended to send to analytics platform
    // Example: sendToAnalytics({ name, duration, timestamp: Date.now() });

    return duration;
}

/**
 * Start a performance measurement
 */
export function startMeasure(): number {
    return performance.now();
}
