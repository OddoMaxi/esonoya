import { cn } from "@/lib/utils";

const variants = {
  default:   "bg-gray-100 text-gray-700",
  blue:      "bg-blue-100 text-blue-700",
  green:     "bg-green-100 text-green-700",
  red:       "bg-red-100 text-red-700",
  orange:    "bg-orange-100 text-orange-700",
  purple:    "bg-purple-100 text-purple-700",
  yellow:    "bg-yellow-100 text-yellow-800",
  pending:   "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-700",
  present:   "bg-green-100 text-green-700",
  absent:    "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
} as const;

type Variant = keyof typeof variants;

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      variants[variant],
      className,
    )}>
      {children}
    </span>
  );
}

export const STATUS_VARIANT: Record<string, Variant> = {
  pending:   "pending",
  confirmed: "confirmed",
  present:   "present",
  absent:    "absent",
  cancelled: "cancelled",
};

export const STATUS_LABEL: Record<string, string> = {
  pending:   "En attente",
  confirmed: "Confirmé",
  present:   "Présent",
  absent:    "Absent",
  cancelled: "Annulé",
};
