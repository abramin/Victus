import { useState } from 'react';
import type { Movement, MovementCategory } from '../../api/types';

const CATEGORIES: MovementCategory[] = ['locomotion', 'push', 'pull', 'legs', 'core', 'skill', 'power'];

const CATEGORY_COLORS: Record<string, string> = {
  locomotion: 'bg-emerald-700 hover:bg-emerald-600',
  push: 'bg-red-700 hover:bg-red-600',
  pull: 'bg-blue-700 hover:bg-blue-600',
  legs: 'bg-amber-700 hover:bg-amber-600',
  core: 'bg-purple-700 hover:bg-purple-600',
  skill: 'bg-cyan-700 hover:bg-cyan-600',
  power: 'bg-orange-700 hover:bg-orange-600',
};

interface MovementArmoryProps {
  movements: Movement[];
  ceiling: number | null;
  onAdd: (id: string) => void;
}

export function MovementArmory({ movements, ceiling, onAdd }: MovementArmoryProps) {
  const [search, setSearch] = useState('');

  const filtered = movements.filter(
    (m) => !search || m.name.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = new Map<MovementCategory, Movement[]>();
  for (const cat of CATEGORIES) {
    const items = filtered.filter((m) => m.category === cat);
    if (items.length > 0) grouped.set(cat, items);
  }

  return (
    <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
          Movement Armory
        </h2>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[11px] text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {[...grouped.entries()].map(([cat, items]) => (
          <div key={cat}>
            <h3 className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-2">
              {cat}
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((m) => {
                const dimmed = ceiling != null && m.difficulty > ceiling;
                return (
                  <button
                    key={m.id}
                    onClick={() => !dimmed && onAdd(m.id)}
                    disabled={dimmed}
                    className={`text-left text-[11px] font-medium text-white px-2.5 py-1.5 rounded transition-all truncate
                      ${CATEGORY_COLORS[m.category] ?? 'bg-slate-700 hover:bg-slate-600'}
                      ${dimmed ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
