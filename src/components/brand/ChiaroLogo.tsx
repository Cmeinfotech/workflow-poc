import { cn } from "@/lib/utils";

export function ChiaroLogo({
  className,
  iconClassName,
  textClassName,
  stacked = false,
}: {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  stacked?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-2", stacked && "flex-col gap-1", className)}>
      <img
        src="/chiaro-favicon.png"
        alt="Chiaro"
        className={cn("size-9 object-contain", iconClassName)}
      />
      <span className={cn("text-3xl font-bold tracking-tight text-[#16336f]", textClassName)}>
        chiaro
      </span>
    </div>
  );
}
