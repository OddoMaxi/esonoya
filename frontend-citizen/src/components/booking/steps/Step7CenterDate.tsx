"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { StepWrapper } from "@/components/booking/StepWrapper";
import { useBooking } from "@/contexts/BookingContext";
import { appointmentService } from "@/services/appointment.service";
import type { Center, Quota } from "@/types";

const schema = z.object({
  center_id:        z.string().min(1, "Choisissez un centre"),
  appointment_date: z.string().min(1, "Choisissez une date"),
});

type FormData = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Monday-first weekday index (0 = Mon, 6 = Sun)
function weekdayMon(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// ─── Calendar component ───────────────────────────────────────

interface CalendarProps {
  quotaMap: Map<string, Quota>;
  selected: string;
  onSelect: (date: string) => void;
  minDate: string;
  maxDate: string;
}

function Calendar({ quotaMap, selected, onSelect, minDate, maxDate }: CalendarProps) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const prevMonth = useCallback(() => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }, [month]);

  const nextMonth = useCallback(() => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }, [month]);

  const firstDayOffset = weekdayMon(startOfMonth(year, month));
  const totalDays      = daysInMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const canGoPrev = (() => {
    const min = new Date(minDate);
    return !(year === min.getFullYear() && month <= min.getMonth());
  })();

  const canGoNext = (() => {
    const max = new Date(maxDate);
    return !(year === max.getFullYear() && month >= max.getMonth());
  })();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header navigation */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-full transition-colors text-lg",
            canGoPrev
              ? "hover:bg-gray-100 text-gray-700"
              : "text-gray-300 cursor-not-allowed"
          )}
        >
          ‹
        </button>
        <span className="font-semibold text-gray-900 text-base">
          {MONTHS_FR[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          disabled={!canGoNext}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-full transition-colors text-lg",
            canGoNext
              ? "hover:bg-gray-100 text-gray-700"
              : "text-gray-300 cursor-not-allowed"
          )}
        >
          ›
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              "py-2 text-center text-xs font-semibold uppercase tracking-wide",
              i >= 5 ? "text-gray-400" : "text-gray-500"
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 p-2 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;

          const dateStr  = toDateStr(year, month, day);
          const quota    = quotaMap.get(dateStr);
          const isWeekend = idx % 7 >= 5;
          const isPast   = dateStr < minDate;
          const isBeyond = dateStr > maxDate;
          const isSelected = dateStr === selected;
          const isToday  = dateStr === toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

          // Unavailability reason
          const isHoliday  = quota?.unavailable_reason === "public_holiday";
          const isClosed   = quota?.unavailable_reason === "center_closed";
          const isFull     = quota !== undefined && !quota.is_available && quota.unavailable_reason === "full";
          const isSuspended = quota?.unavailable_reason === "suspended";
          const isAvailable = quota?.is_available === true;

          const disabled = isPast || isBeyond || isWeekend || isHoliday || isClosed
                        || isFull || isSuspended || !quota;

          // Slot count label
          let slotsLabel: string | null = null;
          if (isAvailable && quota) {
            slotsLabel = quota.available_slots <= 9
              ? String(quota.available_slots)
              : "9+";
          }

          // Color logic
          let dayClass = "";
          let dotColor = "";

          if (isPast || isBeyond || !quota) {
            dayClass = "text-gray-300 cursor-not-allowed";
          } else if (isWeekend || isHoliday || isClosed) {
            dayClass = "text-gray-300 bg-gray-50 cursor-not-allowed";
          } else if (isFull || isSuspended) {
            dayClass = "text-red-400 bg-red-50 cursor-not-allowed";
            dotColor = "bg-red-300";
          } else if (isSelected) {
            dayClass = "bg-blue-700 text-white shadow-md cursor-pointer font-bold";
            dotColor = "bg-blue-300";
          } else if (isAvailable) {
            const pct = quota.available_slots / (quota.total_slots || 1);
            if (pct <= 0.2) {
              dayClass = "text-orange-700 bg-orange-50 hover:bg-orange-100 cursor-pointer font-medium";
              dotColor = "bg-orange-400";
            } else {
              dayClass = "text-green-800 bg-green-50 hover:bg-green-100 cursor-pointer font-medium";
              dotColor = "bg-green-500";
            }
          }

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect(dateStr)}
              title={
                isHoliday    ? "Jour férié"
                : isClosed   ? "Centre fermé"
                : isWeekend  ? "Week-end"
                : isFull     ? "Complet"
                : isSuspended ? "Suspendu"
                : isAvailable ? `${quota!.available_slots} place(s)`
                : undefined
              }
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl py-1.5 px-0 text-sm transition-all select-none",
                "min-h-[52px]",
                dayClass
              )}
            >
              <span className={cn("leading-none", isToday && !isSelected && "underline underline-offset-2 decoration-dotted")}>
                {day}
              </span>

              {/* Slot indicator dot + count */}
              {slotsLabel && (
                <span className={cn(
                  "mt-1 text-[10px] leading-none font-semibold px-1.5 py-0.5 rounded-full",
                  isSelected
                    ? "bg-blue-500 text-white"
                    : dotColor === "bg-orange-400"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-green-100 text-green-800"
                )}>
                  {slotsLabel}
                </span>
              )}

              {/* Full badge */}
              {isFull && (
                <span className="mt-1 text-[9px] leading-none font-semibold text-red-400">
                  complet
                </span>
              )}

              {/* Holiday / weekend stripe */}
              {(isHoliday || isWeekend || isClosed) && !isPast && (
                <span className="mt-1 text-[9px] leading-none text-gray-300">
                  {isHoliday ? "férié" : isClosed ? "fermé" : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> Peu de places
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-300 inline-block" /> Complet
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" /> Indisponible
        </span>
      </div>
    </div>
  );
}

// ─── Main step ────────────────────────────────────────────────

export function Step7CenterDate() {
  const { state, update, goNext, goPrev } = useBooking();

  const [centers, setCenters]             = useState<Center[]>([]);
  const [quotaMap, setQuotaMap]           = useState<Map<string, Quota>>(new Map());
  const [loadingCenters, setLoadingCenters] = useState(true);
  const [loadingQuotas, setLoadingQuotas]   = useState(false);
  const [error, setError]                 = useState("");

  const today   = new Date().toISOString().split("T")[0];
  const maxDate = (() => {
    const d = new Date(); d.setDate(d.getDate() + 90);
    return d.toISOString().split("T")[0];
  })();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      center_id:        state.center_id,
      appointment_date: state.appointment_date,
    },
  });

  const selectedCenterId = watch("center_id");
  const selectedDate     = watch("appointment_date");

  useEffect(() => {
    appointmentService
      .getCenters()
      .then(setCenters)
      .catch(() => setError("Impossible de charger les centres."))
      .finally(() => setLoadingCenters(false));
  }, []);

  useEffect(() => {
    if (!selectedCenterId) { setQuotaMap(new Map()); return; }
    setLoadingQuotas(true);
    setValue("appointment_date", "");
    appointmentService
      .getAvailableDates(selectedCenterId)
      .then((quotas) => {
        const map = new Map<string, Quota>();
        quotas.forEach((q) => map.set(q.date, q));
        setQuotaMap(map);
      })
      .catch(() => setError("Impossible de charger les dates disponibles."))
      .finally(() => setLoadingQuotas(false));
  }, [selectedCenterId, setValue]);

  const onSubmit = (data: FormData) => {
    const center = centers.find((c) => c.id === data.center_id);
    update({ center_id: data.center_id, center_name: center?.name ?? "", appointment_date: data.appointment_date });
    goNext();
  };

  const selectedQuota = selectedDate ? quotaMap.get(selectedDate) : undefined;
  const selectedCenter = centers.find((c) => c.id === selectedCenterId);

  return (
    <StepWrapper
      title="Choisissez votre centre et votre date"
      subtitle="Sélectionnez un centre agréé puis une date disponible."
      onNext={handleSubmit(onSubmit)}
      onPrev={goPrev}
      canGoNext={!!selectedCenterId && !!selectedDate}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Centre selection */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Centre de traitement <span className="text-red-500">*</span>
        </p>
        {loadingCenters ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            {centers.map((center) => (
              <label
                key={center.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all",
                  "hover:border-blue-400 hover:bg-blue-50",
                  selectedCenterId === center.id
                    ? "border-blue-700 bg-blue-50"
                    : "border-gray-200 bg-white"
                )}
              >
                <input
                  type="radio"
                  value={center.id}
                  className="accent-blue-900"
                  {...register("center_id")}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    selectedCenterId === center.id ? "text-blue-900" : "text-gray-900"
                  )}>
                    {center.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{center.city} — {center.address}</p>
                </div>
              </label>
            ))}
          </div>
        )}
        {errors.center_id && (
          <p className="mt-1 text-xs text-red-600">{errors.center_id.message}</p>
        )}
      </div>

      {/* Calendar */}
      {selectedCenterId && (
        <div className="pt-2">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Date du rendez-vous <span className="text-red-500">*</span>
          </p>

          {loadingQuotas ? (
            <div className="h-72 bg-gray-100 rounded-2xl animate-pulse" />
          ) : quotaMap.size === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-4 text-sm text-yellow-800">
              Aucune date disponible pour ce centre. Essayez un autre centre.
            </div>
          ) : (
            <Calendar
              quotaMap={quotaMap}
              selected={selectedDate}
              onSelect={(date) => {
                setValue("appointment_date", date, { shouldValidate: true });
                const q = quotaMap.get(date);
                if (q?.quota_id) update({ quota_id: q.quota_id });
              }}
              minDate={today}
              maxDate={maxDate}
            />
          )}

          {errors.appointment_date && (
            <p className="mt-1 text-xs text-red-600">{errors.appointment_date.message}</p>
          )}
        </div>
      )}

      {/* Selected recap */}
      {selectedCenter && selectedDate && selectedQuota && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 flex items-start gap-2">
          <span className="mt-0.5 text-base">✅</span>
          <div>
            <p className="font-semibold">{selectedCenter.name}</p>
            <p>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("fr-GN", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              {selectedQuota.available_slots} place{selectedQuota.available_slots > 1 ? "s" : ""} restante{selectedQuota.available_slots > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}
    </StepWrapper>
  );
}
