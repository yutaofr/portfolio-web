/// <reference lib="webworker" />
import { XmlParser } from '../domain/parser/xmlParser';
import { PortfolioState } from '../domain/types';

// Define Worker Messages
export type WorkerMessage = 
  | { type: 'PARSE_XML'; payload: string };

export type WorkerResponse =
  | { type: 'SUCCESS'; payload: PortfolioState }
  | { type: 'ERROR'; error: string };

const parser = new XmlParser();

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  if (type === 'PARSE_XML') {
    try {
      console.log('Worker: Starting XML Parse...');
      const start = performance.now();
      const result = parser.parse(payload);
      const end = performance.now();
      console.log(`Worker: Parse completed in ${(end - start).toFixed(2)}ms`);

      self.postMessage({ type: 'SUCCESS', payload: result });
    } catch (err: any) {
      console.error('Worker Parse Error:', err);
      self.postMessage({ type: 'ERROR', error: err.message || 'Unknown parsing error' });
    }
  }
};
