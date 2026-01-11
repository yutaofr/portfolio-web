import { usePortfolioStore } from '../../store/usePortfolioStore';
import { Loader2, Shield, Cpu, Database } from 'lucide-react';
import { useEffect, useState } from 'react';

export function LoadingOverlay() {
    const status = usePortfolioStore((s) => s.status);
    const kpiStatus = usePortfolioStore((s) => s.kpiStatus);
    const kpiData = usePortfolioStore((s) => s.kpiData);

    const [isVisible, setIsVisible] = useState(false);
    const [displayText, setDisplayText] = useState('Initializing System...');

    const isLoading = status === 'LOADING' || (kpiStatus === 'CALCULATING' && !kpiData);

    useEffect(() => {
        if (isLoading) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 500); // Fade out delay
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    useEffect(() => {
        if (status === 'LOADING') {
            setDisplayText('Parsing Portfolio XML Data...');
        } else if (kpiStatus === 'CALCULATING') {
            setDisplayText('Calculating Financial Metrics...');
        }
    }, [status, kpiStatus]);

    // Safety timeout to allow manual close if stuck
    const [showForceClose, setShowForceClose] = useState(false);
    useEffect(() => {
        if (isLoading) {
            const timer = setTimeout(() => setShowForceClose(true), 10000); // 10s timeout
            return () => clearTimeout(timer);
        } else {
            setShowForceClose(false);
        }
    }, [isLoading]);

    if (!isVisible && !isLoading) return null;

    return (
        <div
            className={`fixed inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl transition-opacity duration-700 ${isLoading
                    ? 'z-[100] opacity-100 pointer-events-auto'
                    : 'z-[-1] opacity-0 pointer-events-none'
                }`}
        >
            {/* Scanning Line */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="w-full h-[2px] bg-primary shadow-[0_0_15px_#34d399] animate-[scan_4s_linear_infinite]" />
            </div>

            <div className="relative flex items-center justify-center w-80 h-80">
                {/* Outer Ring */}
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-[spin_10s_linear_infinite]" />

                {/* Middle Ring */}
                <div className="absolute inset-4 border-2 border-t-primary/60 border-r-transparent border-b-primary/60 border-l-transparent rounded-full animate-[spin_3s_linear_infinite]" />

                {/* Inner Ring */}
                <div className="absolute inset-10 border border-primary/40 border-dashed rounded-full animate-[spin_6s_linear_infinite_reverse]" />

                {/* Core Icon Pulse */}
                <div className="relative z-10 flex items-center justify-center">
                    {status === 'LOADING' ? (
                        <Database className="w-12 h-12 text-primary animate-pulse" />
                    ) : (
                        <Cpu className="w-12 h-12 text-primary animate-pulse" />
                    )}
                </div>

                {/* Floating Particles (CSS Only) */}
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1.5 h-1.5 bg-primary rounded-full animate-ping"
                        style={{
                            top: `${50 + 40 * Math.sin((i * Math.PI) / 4)}%`,
                            left: `${50 + 40 * Math.cos((i * Math.PI) / 4)}%`,
                            animationDelay: `${i * 0.2}s`,
                            animationDuration: '2s'
                        }}
                    />
                ))}
            </div>

            <div className="mt-12 text-center space-y-4">
                <h2 className="text-2xl font-bold tracking-[0.2em] text-primary uppercase animate-pulse">
                    {displayText}
                </h2>

                <div className="flex gap-2 justify-center">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                </div>

                <div className="max-w-xs text-xs text-gray-400 font-mono uppercase tracking-widest mt-8">
                    <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
                        <span>Memory</span>
                        <span className="text-primary/80">Active</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
                        <span>Worker Thread</span>
                        <span className="text-primary/80">Busy</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
                        <span>Protocol</span>
                        <span className="text-primary/80">v2.1.0-SECURE</span>
                    </div>

                    {/* Real-time looking logs */}
                    <div className="mt-4 text-[10px] lowercase text-primary/40 text-left h-12 overflow-hidden">
                        <div className="animate-[slide-up_2s_linear_infinite]">
                            {`> SEC_FETCH_VALUATION... SUCCESS`}
                            <br />
                            {`> OPTIMIZING_QUERIES... [OK]`}
                            <br />
                            {`> CALC_IRR_ITER... 1284`}
                            <br />
                            {`> MESHING_DATA_POINTS...`}
                        </div>
                    </div>
                </div>
            </div>

            {/* Force Close Button */}
            {showForceClose && (
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute bottom-10 text-xs text-red-500 hover:text-red-400 underline decoration-red-500/50"
                >
                    System Unresponsive? Force Reboot
                </button>
            )}
        </div>
    );
}
