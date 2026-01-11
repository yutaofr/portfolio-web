import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import { XmlClientSchema } from './schema';
import type { PortfolioState, Security, Transaction, Account, Portfolio } from '../types';
import { PRICE_SCALING_FACTOR, SHARE_SCALING_FACTOR, AMOUNT_SCALING_FACTOR } from '../../config/scaling';
import Big from 'big.js';

const PARSER_OPTIONS = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    isArray: (name: string, jpath: string) => {
        // Always arrays
        const alwaysArray = [
            'price',
            'account',
            'portfolio',
            'accountTransaction',
            'portfolioTransaction',
            'account-transaction',   // Fix: Add hyphenated tag
            'portfolio-transaction'  // Fix: Add hyphenated tag
        ];
        if (alwaysArray.includes(name)) return true;

        // Conditional: 'security' is array only in definition list, not as reference
        if (name === 'security' && jpath.split('.').includes('securities')) {
            return true;
        }
        return false;
    }
};

export class XmlParser {
    private parser: XMLParser;

    constructor() {
        this.parser = new XMLParser(PARSER_OPTIONS);
    }

    public parse(xmlContent: string): PortfolioState {
        // 1. Raw Parse
        const raw = this.parser.parse(xmlContent);

        // 2. Validate Structure (Zod)
        // Basic validation of top-level to ensure it's a PP file
        const validationResult = XmlClientSchema.safeParse(raw);
        if (!validationResult.success) {
            console.error("XML Validation Error", validationResult.error);
            throw new Error(`Invalid Portfolio Performance XML: ${validationResult.error.message}`);
        }
        const data = validationResult.data.client;

        // 3. Transform to Domain
        const securities = new Map<string, Security>();

        // Create Index Map for Reference Resolution
        const securityIndexMap = new Map<number, string>(); // index -> uuid
        data.securities.security.forEach((s: any, index: number) => {
            const prices = (s.prices?.price || []).map((p: any) => ({
                t: p['@_t'],
                v: new Big(p['@_v']).div(PRICE_SCALING_FACTOR).toNumber()
            }));

            const sec: Security = {
                uuid: s.uuid,
                name: s.name,
                isin: s.isin || '',
                tickerSymbol: s.tickerSymbol,
                currencyCode: s.currencyCode || 'EUR',
                prices,
            };
            securities.set(s.uuid, sec);
            securityIndexMap.set(index, s.uuid);
        });

        // Helper to resolve transaction references
        const resolveSecurityUuid = (ref: string): string | undefined => {
            // Format 1: "../../../../../securities/security[1]" (XPath 1-based)
            // Format 2: "../../../../../securities/security" (no index = first security)
            const matchWithIndex = ref.match(/security\[(\d+)\]/);
            if (matchWithIndex) {
                const xpathIndex = parseInt(matchWithIndex[1]);
                // Convert 1-based XPath index to 0-based array index
                const arrayIndex = xpathIndex - 1;
                return securityIndexMap.get(arrayIndex);
            }

            // Handle reference without index (points to first security)
            if (ref.endsWith('/security')) {
                return securityIndexMap.get(0);
            }

            return undefined;
        };

        // Process Accounts
        const accounts: Account[] = (data.accounts?.account || []).map((a: any) => ({
            uuid: a.uuid,
            name: a.name,
            transactions: (a.transactions?.['account-transaction'] || []).map((t: any) =>
                this.mapTransaction(t, resolveSecurityUuid, data.baseCurrency)
            )
        }));

        // Process Portfolios
        const portfolios: Portfolio[] = (data.portfolios?.portfolio || []).map((p: any) => ({
            uuid: p.uuid,
            name: p.name,
            accounts: [],
            transactions: (p.transactions?.['portfolio-transaction'] || []).map((t: any) =>
                this.mapTransaction(t, resolveSecurityUuid, data.baseCurrency)
            )
        }));

        const result: PortfolioState = {
            client: { baseCurrency: data.baseCurrency },
            securities,
            accounts,
            portfolios,
            taxonomies: [],
            securityTaxonomyMap: new Map(),
        };

        // 4. Parse Taxonomies
        if (data.taxonomies?.taxonomy) {
            const rawTaxonomies = Array.isArray(data.taxonomies.taxonomy)
                ? data.taxonomies.taxonomy
                : [data.taxonomies.taxonomy];

            const parsedTaxonomies = rawTaxonomies.map((t: any) => this.parseTaxonomy(t, resolveSecurityUuid, securityIndexMap));

            result.taxonomies = parsedTaxonomies;

            // Build Index Map (Security -> TaxonomyNode[])
            // We want to know for each Security, which Taxonomies it belongs to.
            // Actually, usually we categorize by ONE main Dimension (Asset Class).
            // But here we build the map ISIN -> Node[] (one node per Dimension).

            // Helper to traverse and map
            const traverse = (node: any, rootId: string) => {
                if (node.data?.uuid) {
                    // It's a security assignment
                    // Find security by UUID
                    const sec = securities.get(node.data.uuid);
                    if (sec && sec.isin) {
                        if (!result.securityTaxonomyMap.has(sec.isin)) {
                            result.securityTaxonomyMap.set(sec.isin, []);
                        }
                        // Push the PARENT node (the category), not the leaf itself?
                        // Actually usually we want the Category Name (e.g. "Stocks", "Europe").
                        // The 'node' here IS the assignment node (leaf). 
                        // We need the parent. 
                        // My recursive structure below returns the NODE.
                    }
                }
                if (node.children) {
                    node.children.forEach((c: any) => traverse(c, rootId));
                }
            };
            // This extraction is complex because we need the parent context.
            // Let's defer map building to the Widget or specialized selector for now, 
            // OR build a simple map: SecurityUUID -> Map<TaxonomyName, CategoryName>
            // But `securityTaxonomyMap` in types is Map<ISIN, TaxonomyNode[]>

            // Let's implement a simpler map builder based on the resolved tree.
            parsedTaxonomies.forEach((root: any) => {
                const processNode = (node: any, path: any[]) => {
                    if (node.data?.uuid) {
                        const sec = securities.get(node.data.uuid);
                        if (sec && sec.isin) {
                            // The category is the immediate parent (last in path)
                            const category = path[path.length - 1];
                            if (category) {
                                if (!result.securityTaxonomyMap.has(sec.isin)) {
                                    result.securityTaxonomyMap.set(sec.isin, []);
                                }
                                const list = result.securityTaxonomyMap.get(sec.isin)!;
                                // Avoid duplicates
                                if (!list.find((n: any) => n.id === category.id)) {
                                    list.push(category);
                                }
                            }
                        }
                    }

                    if (node.children) {
                        node.children.forEach((c: any) => processNode(c, [...path, node]));
                    }
                };

                // Start traversal from root's children (Dimensions)
                if (root.children) {
                    root.children.forEach((c: any) => processNode(c, [root]));
                }
            });
        }

        return result;
    }

    private parseTaxonomy(t: any, resolver: (ref: string) => string | undefined, indexMap: Map<number, string>): any {
        // t is <taxonomy> root usually containing <root>
        const root = t.root;

        const parseNode = (n: any): any => {
            const node: any = {
                id: n.id || crypto.randomUUID(),
                name: n.name,
                children: [],
                data: undefined
            };

            // Children (Sub-Categories)
            if (n.children && n.children.classification) {
                const children = Array.isArray(n.children.classification)
                    ? n.children.classification
                    : [n.children.classification];
                node.children = children.map(parseNode);
            }

            // Assignments (Securities)
            if (n.assignments && n.assignments.assignment) {
                const assignments = Array.isArray(n.assignments.assignment)
                    ? n.assignments.assignment
                    : [n.assignments.assignment];

                assignments.forEach((a: any) => {
                    let uuid: string | undefined;
                    if (a.investmentVehicle && a.investmentVehicle['@_reference']) {
                        // Resolve reference (XPath or UUID?)
                        // Usually it's like "../../../securities/security[1]"
                        uuid = resolver(a.investmentVehicle['@_reference']);
                    } else if (a.investmentVehicle && a.investmentVehicle['@_uuid']) {
                        // Direct UUID (sometimes used)
                        uuid = a.investmentVehicle['@_uuid'];
                    }

                    if (uuid) {
                        node.children.push({
                            id: `assignment-${Math.random()}`, // Virtual Node
                            name: 'Security Assignment',
                            children: [],
                            data: { uuid, weight: a.weight }
                        });
                    }
                });
            }

            return node;
        };

        const parsedRoot = parseNode(root);
        parsedRoot.name = t.name; // Override root name with Taxonomy name? Usually they allow different names.
        return parsedRoot;
    }

    private mapTransaction(t: any, resolver: (ref: string) => string | undefined, baseCurrency: string): Transaction {
        const type = t.type;

        let securityUuid: string | undefined;
        if (t.security && t.security['@_reference']) {
            securityUuid = resolver(t.security['@_reference']);
        }

        // Scaling
        // Amount is 10^2
        const amount = new Big(t.amount).div(AMOUNT_SCALING_FACTOR).toNumber();

        // Shares 10^8
        const shares = t.shares ? new Big(t.shares).div(SHARE_SCALING_FACTOR).toNumber() : undefined;

        return {
            uuid: t.uuid,
            date: t.date,
            type,
            amount,
            currencyCode: t.currencyCode || baseCurrency,
            shares,
            note: t.note,
            securityUuid,
        };
    }
}
