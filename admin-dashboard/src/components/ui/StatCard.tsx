import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string | null | undefined;
  sub?: string;
  icon?: string;
  trend?: { value: number; label: string };
  color?: "blue" | "green" | "red" | "orange" | "purple" | "gray";
  loading?: boolean;
}

const colorMap = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-600",   icon: "bg-blue-100" },
  green:  { bg: "bg-green-50",  text: "text-green-600",  icon: "bg-green-100" },
  red:    { bg: "bg-red-50",    text: "text-red-600",    icon: "bg-red-100" },
  orange: { bg: "bg-orange-50", text: "text-orange-600", icon: "bg-orange-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", icon: "bg-purple-100" },
  gray:   { bg: "bg-gray-50",   text: "text-gray-600",   icon: "bg-gray-100" },
};

export function StatCard({ label, value, sub, icon, color = "blue", loading }: StatCardProps) {
  const c = colorMap[color];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      {icon && (
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0", c.icon)}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm text-gray-500 truncate">{label}</p>
        {loading ? (
          <div className="h-8 w-20 bg-gray-100 rounded animate-pulse mt-1" />
        ) : (
          <p className={cn("text-3xl font-bold mt-0.5", c.text)}>
            {value ?? "—"}
          </p>
        )}
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
