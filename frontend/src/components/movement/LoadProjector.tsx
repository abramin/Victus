interface LoadProjectorProps {
  totalLoad: number;
  isOverloaded: boolean;
  activeBurn: number;
}

export function LoadProjector({ totalLoad, isOverloaded, activeBurn }: LoadProjectorProps) {
  // Normalize load for ring display (cap visual at ~40 load score)
  const loadRatio = Math.min(totalLoad / 40, 1);
  const strokeColor = isOverloaded ? '#ef4444' : loadRatio > 0.7 ? '#f59e0b' : '#22c55e';

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - loadRatio);

  return (
    <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 flex flex-col items-center justify-center h-full relative overflow-hidden">
      <h2 className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase mb-3">
        Load Projector
      </h2>

      <div className="relative w-40 h-40">
        <svg viewBox="0 0 140 140" className="w-full h-full">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 70 70)"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white font-mono">
            {totalLoad.toFixed(1)}
          </span>
          <span className={`text-[10px] font-medium ${isOverloaded ? 'text-red-400' : 'text-emerald-400'}`}>
            +{activeBurn} kcal
          </span>
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">
            Active Burn
          </span>
        </div>
      </div>

      {/* Overload warning overlay */}
      {isOverloaded && (
        <div className="absolute inset-0 bg-red-500/10 backdrop-blur-[1px] flex items-center justify-center rounded-xl pointer-events-none">
          <div className="text-center">
            <p className="text-red-400 text-[11px] font-bold tracking-wider">CNS OVERLOAD</p>
            <p className="text-red-300/70 text-[9px]">PREDICTED</p>
          </div>
        </div>
      )}
    </div>
  );
}
