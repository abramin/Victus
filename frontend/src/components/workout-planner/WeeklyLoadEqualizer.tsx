import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { LOAD_ZONE_COLORS, getLoadZone } from './loadCalculations';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface DayLoad {
  date: string;
  load: number;
  projected?: number; // Additional load if session is dropped
}

interface WeeklyLoadEqualizerProps {
  weekLoads: DayLoad[];
  chronicLoad: number;
  hoveredDate?: string | null;
  projectedLoad?: number;
}

/**
 * A 7-bar chart showing weekly load distribution.
 * Uses Recharts for smooth animations and responsive sizing.
 */
export function WeeklyLoadEqualizer({
  weekLoads,
  chronicLoad,
  hoveredDate,
  projectedLoad = 0,
}: WeeklyLoadEqualizerProps) {
  // Calculate max for scaling
  const overloadThreshold = chronicLoad > 0 ? chronicLoad * 1.5 : 15;
  const maxInData = Math.max(
    ...weekLoads.map((d) => d.load + (d.date === hoveredDate ? projectedLoad : 0))
  );
  const maxValue = Math.max(maxInData, overloadThreshold, 10) * 1.1; // Add 10% headroom

  // Prepare chart data
  const chartData = weekLoads.map((day, index) => {
    const isHovered = day.date === hoveredDate;
    const totalLoad = day.load + (isHovered ? projectedLoad : 0);
    const acr = chronicLoad > 0 ? totalLoad / chronicLoad : 1;
    const zone = totalLoad === 0 ? 'empty' : getLoadZone(acr);

    return {
      name: DAY_LABELS[index],
      load: totalLoad,
      color: LOAD_ZONE_COLORS[zone as keyof typeof LOAD_ZONE_COLORS],
      isHovered,
    };
  });

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Weekly Load</h3>
        <div className="flex items-center gap-4 text-[10px]">
          <LegendItem color={LOAD_ZONE_COLORS.optimal} label="Optimal" />
          <LegendItem color={LOAD_ZONE_COLORS.high} label="High" />
          <LegendItem color={LOAD_ZONE_COLORS.overload} label="Overload" />
        </div>
      </div>

      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
            />
            <YAxis
              domain={[0, maxValue]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 9 }}
              tickCount={3}
            />
            <ReferenceLine
              y={overloadThreshold}
              stroke={LOAD_ZONE_COLORS.overload}
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <Bar
              dataKey="load"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={entry.isHovered ? 1 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {chronicLoad > 0 && (
        <div className="mt-2 text-[10px] text-gray-500 text-center">
          Overload threshold: {overloadThreshold.toFixed(1)} (1.5× chronic)
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-400">{label}</span>
    </div>
  );
}
