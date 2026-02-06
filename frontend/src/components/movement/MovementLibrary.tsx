import { useCallback, useEffect, useState } from 'react';
import type { Movement, NeuralBattery, UserMovementProgress } from '../../api/types';
import { listMovements, getFilteredMovements, getMovementProgress } from '../../api/client';
import { useSessionBuilder } from './useSessionBuilder';
import type { BuilderEntry } from './useSessionBuilder';
import { NeuralBatteryPanel } from './NeuralBatteryPanel';
import { SessionCanvas } from './SessionCanvas';
import { LoadProjector } from './LoadProjector';
import { JointIntegrity } from './JointIntegrity';
import { MovementArmory } from './MovementArmory';
import { ChipPopover } from './ChipPopover';
import { SessionCompleteModal } from './SessionCompleteModal';

export function MovementLibrary() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, UserMovementProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ceiling, setCeiling] = useState<number | null>(null);
  const [batteryPct, setBatteryPct] = useState(50);
  const [activeMovement, setActiveMovement] = useState<Movement | null>(null);
  const [sessionQueue, setSessionQueue] = useState<Movement[]>([]);

  // Popover state
  const [popoverEntry, setPopoverEntry] = useState<BuilderEntry | null>(null);
  const [popoverRect, setPopoverRect] = useState<DOMRect | null>(null);

  const builder = useSessionBuilder(movements);

  const isOverloaded = builder.projectedDrain > batteryPct;

  const handleBatteryLoad = useCallback((b: NeuralBattery) => {
    setBatteryPct(b.percentage);
  }, []);

  const fetchMovements = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const data = ceiling != null
        ? await getFilteredMovements(ceiling, signal)
        : await listMovements(signal);
      setMovements(data);

      const results = await Promise.allSettled(
        data.map((m) => getMovementProgress(m.id, signal))
      );
      const map = new Map<string, UserMovementProgress>();
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) {
          map.set(data[i].id, r.value);
        }
      });
      setProgressMap(map);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Failed to load movements');
      }
    } finally {
      setLoading(false);
    }
  }, [ceiling]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMovements(controller.signal);
    return () => controller.abort();
  }, [fetchMovements]);

  function handleChipClick(entryId: string, rect: DOMRect) {
    const entry = builder.allEntries.find((e) => e.id === entryId) ?? null;
    setPopoverEntry(entry);
    setPopoverRect(rect);
  }

  function handleStartSession() {
    const queue = builder.allEntries.map((e) => e.movement);
    if (queue.length === 0) return;
    setSessionQueue(queue.slice(1));
    setActiveMovement(queue[0]);
  }

  function handleComplete(result: UserMovementProgress) {
    setProgressMap((prev) => {
      const next = new Map(prev);
      next.set(result.movementId, result);
      return next;
    });
    if (sessionQueue.length > 0) {
      setActiveMovement(sessionQueue[0]);
      setSessionQueue((prev) => prev.slice(1));
    }
  }

  function handleSessionClose() {
    setActiveMovement(null);
    setSessionQueue([]);
    if (sessionQueue.length === 0 && activeMovement) {
      builder.clear();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => fetchMovements(new AbortController().signal)}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 gap-3 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
            Victus
          </span>
          <span className="text-[10px] tracking-widest text-slate-600 uppercase">
            Adaptive Movement Engine
          </span>
        </div>

        {/* Smart Fill */}
        <button
          onClick={() => builder.smartFill(ceiling, batteryPct)}
          className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11px] font-semibold rounded-lg transition-all shadow-lg active:scale-95"
        >
          ⚡ SMART FILL
        </button>
      </div>

      {/* Dashboard grid */}
      <div className="flex-1 grid grid-cols-[200px_1fr_1fr] grid-rows-[1fr_1fr] gap-3 min-h-0">
        {/* Left top: Neural Battery */}
        <div className="row-span-1">
          <NeuralBatteryPanel
            onCeilingChange={setCeiling}
            onBatteryLoad={handleBatteryLoad}
            projectedDrain={builder.projectedDrain}
          />
        </div>

        {/* Center: Session Canvas spans both rows */}
        <div className="row-span-2">
          <SessionCanvas
            zones={builder.zones}
            onRemove={builder.removeEntry}
            onChipClick={handleChipClick}
          />
        </div>

        {/* Right: Movement Armory spans both rows */}
        <div className="row-span-2">
          <MovementArmory
            movements={movements}
            ceiling={ceiling}
            onAdd={builder.addMovement}
          />
        </div>

        {/* Left bottom: split between Joint Integrity and Load Projector */}
        <div className="row-span-1 grid grid-rows-2 gap-3">
          <JointIntegrity movements={movements} entries={builder.allEntries} />
          <LoadProjector
            totalLoad={builder.totalLoad}
            isOverloaded={isOverloaded}
            activeBurn={builder.activeBurn}
          />
        </div>
      </div>

      {/* Action Bar */}
      {builder.allEntries.length > 0 && (
        <div className="flex items-center justify-between bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 font-mono">
              {builder.allEntries.length} movements · Load {builder.totalLoad.toFixed(1)}
            </span>
            <button
              onClick={builder.clear}
              className="text-[10px] text-slate-500 hover:text-slate-300 underline"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs transition-colors"
            >
              💾 Save to Library
            </button>
            <button
              onClick={handleStartSession}
              disabled={isOverloaded}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ▶ START SESSION
            </button>
          </div>
        </div>
      )}

      {/* Chip Popover */}
      {popoverEntry && popoverRect && (
        <ChipPopover
          entry={popoverEntry}
          anchorRect={popoverRect}
          onUpdate={(patch) => builder.updateEntry(popoverEntry.id, patch)}
          onClose={() => { setPopoverEntry(null); setPopoverRect(null); }}
        />
      )}

      {/* Session Complete modal */}
      {activeMovement && (
        <SessionCompleteModal
          movement={activeMovement}
          currentProgress={progressMap.get(activeMovement.id) ?? null}
          onClose={handleSessionClose}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
