export type ISODate = string; // YYYY-MM-DD
export type UUID = string;
export type ISIN = string;

export interface Price {
  t: ISODate;
  v: number; // Scaled by 10^8 (Big.js compatible number)
}

export interface Security {
  uuid: UUID;
  name: string;
  isin: ISIN;
  tickerSymbol?: string;
  currencyCode: string;
  prices: Price[];
}

export interface Transaction {
  uuid: UUID;
  date: ISODate;
  type: 'BUY' | 'SELL' | 'DEPOSIT' | 'REMOVAL' | 'DIVIDEND' | 'FEES' | 'TAXES' | string;
  amount: number; // Scaled by 10^2
  currencyCode: string;
  securityUuid?: UUID;
  shares?: number; // Scaled by 10^8
  note?: string;
  crossEntry?: {
    portfolioUuid: UUID;
    reference: UUID; // Transaction UUID
    amount: number;
    currencyCode: string; // The target currency
  }
}

export interface Account {
  uuid: UUID;
  name: string;
  transactions: Transaction[];
}

export interface Portfolio {
  uuid: UUID;
  name: string;
  accounts: Account[];
  transactions: Transaction[]; // Portfolio-level transactions (Buy/Sell)
}

export interface TaxonomyNode {
  id: string; // often UUID or random
  name: string;
  color?: string;
  children: TaxonomyNode[];
  data?: {
    uuid: UUID; // Security UUID reference
    weight?: number;
  };
}

export interface PortfolioState {
    client: {
        baseCurrency: string;
    };
    securities: Map<UUID, Security>; // For fast lookup
    accounts: Account[]; // Top-level accounts
    portfolios: Portfolio[];
    taxonomies: TaxonomyNode[]; // The tree structure
    securityTaxonomyMap: Map<ISIN, TaxonomyNode[]>; // Fast lookup for visualization
}
