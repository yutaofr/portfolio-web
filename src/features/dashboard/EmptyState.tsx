import { UploadCloud } from "lucide-react"
import { usePortfolioStore } from "../../store/usePortfolioStore"
import { useState } from "react"

export function EmptyState() {
    const loadXml = usePortfolioStore(s => s.loadXml);
    const status = usePortfolioStore(s => s.status);
    const error = usePortfolioStore(s => s.error);
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = async (file: File) => {
        const text = await file.text();
        loadXml(text);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
             <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mb-2">
                <UploadCloud className="w-8 h-8 text-primary/80" />
             </div>
             
             <div className="space-y-2">
                <h2 className="text-xl font-semibold">Load Portfolio</h2>
                <p className="text-sm text-gray-400 max-w-[260px] mx-auto leading-relaxed">
                    Select your <code>.xml</code> file exported from Portfolio Performance.
                </p>
             </div>

             {/* File Input (Hidden but Triggerable) */}
             <div className="relative group cursor-pointer">
                <input 
                    type="file" 
                    accept=".xml"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <button className="bg-primary text-background font-semibold py-3 px-6 rounded-lg text-sm transition group-hover:bg-primary/90">
                    {status === 'LOADING' ? 'Parsing...' : 'Select File'}
                </button>
             </div>

             {error && (
                 <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-destructive text-xs max-w-xs break-words">
                     {error}
                 </div>
             )}

             <div className="text-xs text-gray-600 pt-8">
                 v3.1 • Powered by Bun & React
             </div>
        </div>
    )
}
