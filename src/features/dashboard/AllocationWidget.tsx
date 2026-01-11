import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { calculateHoldings } from '../../domain/engine/holdings';
import { PRICE_SCALING_FACTOR } from '../../config/scaling';
import Big from 'big.js';
import { Skeleton } from '../../components/ui/skeleton';

const COLORS = ['#34d399', '#fa8f8e', '#869668', '#897ccc', '#fbbf24', '#60a5fa'];

export function AllocationWidget() {
    const data = usePortfolioStore(s => s.data);

    const [grouping, setGrouping] = React.useState<string>('SECURITY'); // 'SECURITY' or Taxonomy UUID

    const chartData = useMemo(() => {
        if (!data) return [];

        const today = new Date().toISOString().split('T')[0];
        
        // 1. Get Holdings
        const allTxs = data.portfolios.flatMap(p => p.transactions);
        const holdings = calculateHoldings(allTxs, today);
        
        // 2. Calculate Value per Security
        // Map SecurityUUID -> Value
        const securityValues = new Map<string, number>();
        let totalVal = new Big(0);

        for (const [uuid, shareCount] of holdings.entries()) {
            const sec = data.securities.get(uuid);
            if (!sec) continue;

            let price = 0;
            for (let i = sec.prices.length - 1; i >= 0; i--) {
                if (sec.prices[i].t <= today) {
                    price = sec.prices[i].v;
                    break;
                }
            }
            
            const value = new Big(shareCount).times(price).toNumber();
            if (value > 0) {
                securityValues.set(uuid, value);
                totalVal = totalVal.plus(value);
            }
        }
        
        if (grouping === 'SECURITY') {
            const items = [];
            for (const [uuid, val] of securityValues.entries()) {
                const sec = data.securities.get(uuid);
                if (sec) items.push({ name: sec.tickerSymbol || sec.name, value: val });
            }
            return items.sort((a, b) => b.value - a.value);
        } else {
            // Group by Taxonomy
            // Find the selected taxonomy
            const taxonomy = data.taxonomies.find(t => t.id === grouping);
            if (!taxonomy) return [];

            const categoryValues = new Map<string, number>();
            const unclassifiedVal = new Big(totalVal); // Start with total, subtract matches? No, easier to sum matches.
            
            // We need to map Security -> Category in this Taxonomy
            // Utilize securityTaxonomyMap?
            // securityTaxonomyMap gives List of Nodes. match node.id with taxonomy children?
            // Actually, my map builder in XmlParser puts the PARENT category in the map.
            // But we need to check if that category BELONGS to the selected taxonomy.
            
            // Better: Iterate Taxonomy Tree and sum up securities found in leaves.
            // Traverse the selected taxonomy's children (Categories)
            if (taxonomy.children) {
                taxonomy.children.forEach(category => {
                    let catSum = 0;
                    
                    // Recursive sum of all securities under this category
                    const traverse = (node: any) => {
                        if (node.data?.uuid) {
                             const val = securityValues.get(node.data.uuid) || 0;
                             catSum += val;
                        }
                        if (node.children) {
                            node.children.forEach(traverse);
                        }
                    };
                    traverse(category);
                    
                    if (catSum > 0) {
                        categoryValues.set(category.name, catSum);
                    }
                });
            }
            
            const items = Array.from(categoryValues.entries()).map(([name, value]) => ({ name, value }));
            return items.sort((a, b) => b.value - a.value);
        }

    }, [data, grouping]);

    const status = usePortfolioStore(s => s.status);

    if (status === 'LOADING') {
        return (
             <div className="bg-surface rounded-xl p-5 border border-white/5 shadow-sm">
                <Skeleton className="h-4 w-32 mb-4" />
                <div className="h-[250px] w-full flex items-center justify-center">
                    <Skeleton className="h-40 w-40 rounded-full" />
                </div>
            </div>
        )
    }

    if (!chartData.length) return null;

    return (
        <div className="bg-surface rounded-xl p-5 border border-white/5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-gray-200">Allocation</h3>
                {/* Taxonomy Switcher */}
                {data?.taxonomies && data.taxonomies.length > 0 && (
                    <select 
                        className="bg-black/20 text-xs text-gray-300 border border-white/10 rounded px-2 py-1 outline-none"
                        value={grouping}
                        onChange={(e) => setGrouping(e.target.value)}
                    >
                        <option value="SECURITY">By Security</option>
                        {data.taxonomies.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                )}
            </div>
            
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#2d2d2d', borderColor: '#333', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: data?.client.baseCurrency || 'EUR' }).format(value)}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            align="center"
                            iconType="circle"
                            wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#9ca3af' }} 
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
