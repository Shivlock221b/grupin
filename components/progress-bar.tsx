import { progressPercent } from "@/lib/utils";

type ProgressBarProps = {
  current: number;
  minimum: number;
};

export function ProgressBar({ current, minimum }: ProgressBarProps) {
  const percent = progressPercent(current, minimum);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-[rgba(22,38,32,0.72)]">
        <span>{current} people in</span>
        <span>{minimum} needed</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[rgba(22,38,32,0.08)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--terracotta),var(--gold))] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
