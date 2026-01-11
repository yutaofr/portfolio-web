import type { PortfolioState, Security, Account, Portfolio, TaxonomyNode, UUID, ISIN } from './types';

/**
 * Serialized version of PortfolioState that can be transferred via postMessage.
 * Maps are converted to arrays of tuples.
 */
export interface SerializedPortfolioState {
    client: {
        baseCurrency: string;
    };
    securities: [UUID, Security][];
    accounts: Account[];
    portfolios: Portfolio[];
    taxonomies: TaxonomyNode[];
    securityTaxonomyMap: [ISIN, TaxonomyNode[]][];
}

/**
 * Serialize PortfolioState for Worker transfer.
 * Optimized: only includes fields needed for calculations.
 */
export function serializeState(state: PortfolioState): SerializedPortfolioState {
    return {
        client: state.client,
        securities: Array.from(state.securities.entries()),
        accounts: state.accounts,
        portfolios: state.portfolios,
        taxonomies: state.taxonomies,
        securityTaxonomyMap: Array.from(state.securityTaxonomyMap.entries()),
    };
}

/**
 * Deserialize back to PortfolioState in Worker.
 */
export function deserializeState(raw: SerializedPortfolioState): PortfolioState {
    return {
        client: raw.client,
        securities: new Map(raw.securities),
        accounts: raw.accounts,
        portfolios: raw.portfolios,
        taxonomies: raw.taxonomies,
        securityTaxonomyMap: new Map(raw.securityTaxonomyMap),
    };
}
