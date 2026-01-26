import { getZone, PROTEIN_ZONES, FAT_ZONES, MIN_PROTEIN_G_PER_KG, MIN_FAT_G_PER_KG } from '../../constants';

type ZoneArray = typeof PROTEIN_ZONES | typeof FAT_ZONES;

interface GuardrailIndicatorProps {
  /** Current value in g/kg */
  value: number;
  /** Zone definitions to use */
  zones: ZoneArray;
  /** Label for the macro (e.g., "Protein", "Fat") */
  label: string;
  /** Floor value in g/kg (for warning icon) */
  floor: number;
  /** Optional: show description text */
  showDescription?: boolean;
}

/**
 * GuardrailIndicator displays a color-coded zone indicator for macro intake.
 * Shows the current g/kg value, zone label, and optional warning icon.
 */
export function GuardrailIndicator({
  value,
  zones,
  label,
  floor,
  showDescription = false,
}: GuardrailIndicatorProps) {
  const zone = getZone(value, zones);
  const isBelowFloor = value < floor;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">{label} target:</span>
      <span className={`text-xs font-medium ${zone.color}`}>
        {value.toFixed(1)} g/kg - {zone.label}
        {!isBelowFloor && zone.label === 'Optimal Growth' && ' \u2713'}
        {!isBelowFloor && zone.label === 'Athlete Baseline' && ' \u2713'}
        {!isBelowFloor && zone.label === 'Optimal' && ' \u2713'}
      </span>
      {isBelowFloor && (
        <span className="text-xs text-amber-400" title={`Below ${floor} g/kg minimum`}>
          \u26A0\uFE0F
        </span>
      )}
      {showDescription && (
        <span className="text-xs text-slate-600">({zone.description})</span>
      )}
    </div>
  );
}

// Pre-configured variants for common use cases
export function ProteinGuardrailIndicator({
  value,
  showDescription = false,
}: {
  value: number;
  showDescription?: boolean;
}) {
  return (
    <GuardrailIndicator
      value={value}
      zones={PROTEIN_ZONES}
      label="Protein"
      floor={MIN_PROTEIN_G_PER_KG}
      showDescription={showDescription}
    />
  );
}

export function FatGuardrailIndicator({
  value,
  showDescription = false,
}: {
  value: number;
  showDescription?: boolean;
}) {
  return (
    <GuardrailIndicator
      value={value}
      zones={FAT_ZONES}
      label="Fat"
      floor={MIN_FAT_G_PER_KG}
      showDescription={showDescription}
    />
  );
}
