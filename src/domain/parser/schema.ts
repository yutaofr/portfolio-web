import { z } from 'zod';

// Helper to handle empty XML tags parsed as empty strings
const emptyString = z.string().length(0).transform(() => undefined);
const withEmptyString = <T extends z.ZodTypeAny>(schema: T) => schema.or(z.string().length(0).transform(() => undefined));

export const XmlPriceSchema = z.object({
  '@_t': z.string(), // Date YYYY-MM-DD
  '@_v': z.string().or(z.number()), // Value
});

export const XmlSecuritySchema = z.object({
  uuid: z.string(),
  name: z.string(),
  currencyCode: z.string().optional(),
  isin: z.string().optional(),
  tickerSymbol: z.string().optional(),
  prices: withEmptyString(z.object({
    price: z.array(XmlPriceSchema).optional(),
  })).optional(),
});

export const XmlTransactionSchema = z.object({
  uuid: z.string(),
  date: z.string(),
  currencyCode: z.string().optional(),
  amount: z.string().or(z.number()),
  shares: z.string().or(z.number()).optional(),
  type: z.string(),
  note: z.string().optional(),
  security: withEmptyString(z.object({ '@_reference': z.string() })).optional(),
  crossEntry: withEmptyString(z.object({
    '@_class': z.string().optional(),
    portfolio: withEmptyString(z.object({ '@_reference': z.string() })).optional(),
    reference: z.string().optional(),
    amount: z.string().or(z.number()).optional(),
    currencyCode: z.string().optional(),
  })).optional(),
  updatedAt: z.string().optional(),
});

export const XmlAccountTransactionSchema = XmlTransactionSchema;

export const XmlPortfolioSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  transactions: withEmptyString(z.object({
    // Make sure to handle single transaction vs array if parser config isn't strict
    'portfolio-transaction': z.array(XmlTransactionSchema).optional().or(XmlTransactionSchema.transform(x => [x])),
  })).optional(),
});

export const XmlAccountSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  transactions: withEmptyString(z.object({
    'account-transaction': z.array(XmlAccountTransactionSchema).optional().or(XmlAccountTransactionSchema.transform(x => [x])),
  })).optional(),
});

export const XmlClientSchema = z.object({
  client: z.object({
    baseCurrency: z.string(),
    securities: z.object({
      security: z.array(XmlSecuritySchema),
    }),
    accounts: withEmptyString(z.object({
      account: z.array(XmlAccountSchema).optional(),
    })).optional(),
    portfolios: withEmptyString(z.object({
      portfolio: z.array(XmlPortfolioSchema).optional(),
    })).optional(),
    taxonomies: withEmptyString(z.object({
      taxonomy: z.any().optional(),
    })).optional(),
  }),
});
