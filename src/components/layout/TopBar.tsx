import { Menu, FilePieChart } from "lucide-react"

export function TopBar() {
    return (
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
            {/* Branding / Menu */}
            <div className="flex items-center gap-3">
                <button className="p-1 hover:bg-white/10 rounded-md">
                     <Menu className="w-5 h-5 text-gray-400" />
                </button>
                <div className="flex items-center gap-2">
                    <FilePieChart className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-sm tracking-tight">Portfolio Performance</span>
                </div>
            </div>

            {/* Actions (Mock) */}
            <div className="flex items-center gap-2">
                 {/* Placeholder for future Global Filter or User Profile */}
                 <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium">
                    YS
                 </div>
            </div>
        </div>
    )
}
