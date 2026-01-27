import { useCallback, useRef, useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useGarminImport } from '../../hooks/useGarminImport';
import type { GarminImportResult } from '../../api/types';

export function GarminImportZone() {
  const { isUploading, result, error, upload, reset } = useGarminImport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const handleFileSelect = useCallback(
    async (file: File) => {
      await upload(file, selectedYear);
    },
    [upload, selectedYear]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <Card title="Import Garmin Data">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Import historical data from Garmin Connect. Export your data from the Garmin Connect app
          and upload CSV files (Sleep, Weight, HRV, Activities).
        </p>

        {/* Year selector for date parsing */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-300">Year for dates without year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {!result && (
          <>
            {/* Drop zone */}
            <div
              onClick={handleClick}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500'}
                ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.zip"
                onChange={handleInputChange}
                className="hidden"
                disabled={isUploading}
              />

              {isUploading ? (
                <div className="space-y-2">
                  <div className="w-8 h-8 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto" />
                  <div className="text-slate-300">Processing...</div>
                </div>
              ) : isDragOver ? (
                <div className="text-blue-400">Drop file here...</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-3xl">📁</div>
                  <div className="text-slate-300">
                    Drag and drop a CSV or ZIP file, or click to browse
                  </div>
                  <div className="text-xs text-slate-500">
                    Supports: Sleep (Sueño), Weight (Peso), HRV, RHR, Activities
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-900/50 border border-red-700 rounded-md">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Result display */}
        {result && <ImportSummary result={result} onReset={reset} />}
      </div>
    </Card>
  );
}

interface ImportSummaryProps {
  result: GarminImportResult;
  onReset: () => void;
}

function ImportSummary({ result, onReset }: ImportSummaryProps) {
  const totalImported =
    result.sleepRecordsImported +
    result.weightRecordsImported +
    result.hrvRecordsImported +
    result.rhrRecordsImported +
    result.monthlySummariesCreated;

  const totalSkipped =
    result.sleepRecordsSkipped +
    result.weightRecordsSkipped +
    result.hrvRecordsSkipped +
    result.rhrRecordsSkipped;

  const hasWarnings = result.warnings && result.warnings.length > 0;
  const hasErrors = result.errors && result.errors.length > 0;

  return (
    <div className="space-y-4">
      {/* Success summary */}
      <div className="p-4 bg-green-900/30 border border-green-700 rounded-md">
        <h4 className="font-medium text-green-300 mb-2">Import Complete</h4>
        <div className="text-sm text-slate-300 space-y-1">
          {result.sleepRecordsImported > 0 && (
            <div>
              Sleep: {result.sleepRecordsImported} imported
              {result.sleepRecordsSkipped > 0 && `, ${result.sleepRecordsSkipped} skipped`}
            </div>
          )}
          {result.weightRecordsImported > 0 && (
            <div>
              Weight: {result.weightRecordsImported} imported
              {result.weightRecordsSkipped > 0 && `, ${result.weightRecordsSkipped} skipped`}
            </div>
          )}
          {result.hrvRecordsImported > 0 && (
            <div>
              HRV: {result.hrvRecordsImported} imported
              {result.hrvRecordsSkipped > 0 && `, ${result.hrvRecordsSkipped} skipped`}
            </div>
          )}
          {result.rhrRecordsImported > 0 && (
            <div>
              RHR: {result.rhrRecordsImported} imported
              {result.rhrRecordsSkipped > 0 && `, ${result.rhrRecordsSkipped} skipped`}
            </div>
          )}
          {result.monthlySummariesCreated > 0 && (
            <div>Monthly Summaries: {result.monthlySummariesCreated} created</div>
          )}
          {totalImported === 0 && totalSkipped > 0 && (
            <div className="text-amber-400">
              No records imported. {totalSkipped} records skipped (no matching daily logs).
            </div>
          )}
          {totalImported === 0 && totalSkipped === 0 && (
            <div className="text-slate-400">No data found in file.</div>
          )}
        </div>
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <div className="p-4 bg-amber-900/30 border border-amber-700 rounded-md">
          <h4 className="font-medium text-amber-300 mb-2">
            Warnings ({result.warnings!.length})
          </h4>
          <ul className="text-sm text-slate-300 list-disc list-inside max-h-32 overflow-y-auto">
            {result.warnings!.slice(0, 10).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {result.warnings!.length > 10 && (
              <li className="text-slate-400">...and {result.warnings!.length - 10} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Errors */}
      {hasErrors && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-md">
          <h4 className="font-medium text-red-300 mb-2">Errors ({result.errors!.length})</h4>
          <ul className="text-sm text-slate-300 list-disc list-inside max-h-32 overflow-y-auto">
            {result.errors!.slice(0, 10).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {result.errors!.length > 10 && (
              <li className="text-slate-400">...and {result.errors!.length - 10} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Reset button */}
      <Button onClick={onReset} variant="secondary">
        Import Another File
      </Button>
    </div>
  );
}
