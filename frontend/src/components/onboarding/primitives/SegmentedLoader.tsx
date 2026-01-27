interface SegmentedLoaderProps {
  progress: number; // 0-100
  segmentCount?: number;
}

export function SegmentedLoader({ progress, segmentCount = 20 }: SegmentedLoaderProps) {
  const filledSegments = Math.floor((progress / 100) * segmentCount);

  return (
    <div
      className="flex gap-2 w-full h-2"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Setup progress"
    >
      {Array.from({ length: segmentCount }).map((_, index) => {
        const isFilled = index < filledSegments;
        const isTrailing = index === filledSegments - 1;

        return (
          <div
            key={index}
            className={`flex-1 rounded-full transition-all duration-300 ease-out ${
              isFilled ? 'bg-emerald-500' : 'bg-gray-800'
            }`}
            style={
              isTrailing && isFilled
                ? {
                    boxShadow: '0 0 10px rgba(16, 185, 129, 0.6), 0 0 20px rgba(16, 185, 129, 0.3)',
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
