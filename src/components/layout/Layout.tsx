import { TopBar } from "./TopBar"
import { Dashboard } from "../../features/dashboard/Dashboard"
import { usePortfolioStore } from "../../store/usePortfolioStore"
import { EmptyState } from "../../features/dashboard/EmptyState"
import { ErrorBoundary } from "../../components/ErrorBoundary"

export function Layout() {
    const status = usePortfolioStore(s => s.status);

    return (
        <div className="min-h-screen bg-background text-white flex flex-col font-sans">
             {/* Sticky Top Bar */}
             <div className="sticky top-0 z-50 bg-surface/95 backdrop-blur border-b border-white/10">
                 {/* <TopBar /> */}
                 <div style={{color: 'lime'}}>TopBar Placeholder</div>
             </div>

             {/* Main Scrollable Content */}
             <main className="flex-1 p-4 w-full max-w-md mx-auto">
                 <ErrorBoundary>
                    {status === 'IDLE' || status === 'ERROR' ? (
                        <EmptyState />
                    ) : (
                        <Dashboard />
                    )}
                 </ErrorBoundary>
             </main>
        </div>
    )
}
