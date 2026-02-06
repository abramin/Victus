import { useState } from 'react';
import { Lock } from 'lucide-react';
import type { Movement, MovementCategory } from '../../api/types';
import { zoneColorFor, hasJointConflict } from './useSessionBuilder';

const CATEGORIES: MovementCategory[] = ['locomotion', 'push', 'pull', 'legs', 'core', 'skill', 'power'];

interface MovementArmoryProps {
  movements: Movement[];
  ceiling: number | null;
  jointStressMap: Map<string, number>;
  onAdd: (id: string) => void;
}

export function MovementArmory({ movements, ceiling, jointStressMap, onAdd }: MovementArmoryProps) {
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
                const blocked = '_blocked' in m && (m as Movement & { _blocked?: boolean })._blocked === true;
                const locked = hasJointConflict(m, jointStressMap);
                const isDisabled = dimmed || blocked || locked;
                const zc = zoneColorFor(m.category);
                return (
                  <button
                    key={m.id}
                    onClick={() => !isDisabled && onAdd(m.id)}
                    disabled={isDisabled}
                    className={`text-left text-[11px] font-medium text-white px-2.5 py-1.5 rounded transition-all truncate flex items-center gap-1
                      ${zc.base} ${zc.hover}
                      ${locked ? 'opacity-50 cursor-not-allowed' : dimmed || blocked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                  >
                    {locked && <Lock className="w-3 h-3 shrink-0" />}
                    <span className="truncate">{m.name}</span>
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
