// ─── Types Admin eSonoya ──────────────────────────────────────

export interface TimeSlotTemplate {
  id: string;
  label: string;
  sort_order: number;
}

export interface AdminUser {
  id: string;
  center_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  roles: string[];
  permissions: string[];
  center?: Center;
  last_login_at: string | null;
}

export interface Center {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

export interface Quota {
  id: string;
  center_id: string;
  date: string;
  time_slot: string | null;
  total_slots: number;
  booked_slots: number;
  available_slots: number;
  is_suspended: boolean;
  suspension_reason: string | null;
}

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "present"
  | "absent"
  | "cancelled";

export interface Appointment {
  id: string;
  reference_number: string;
  receipt_reference: string;
  request_type: "new" | "renewal" | "lost";
  appointment_date: string;
  status: AppointmentStatus;
  qr_token: string;
  qr_scanned_at: string | null;
  center: Center;
  applicant: Applicant;
  declarant: Declarant | null;
  created_at: string;
}

export interface Applicant {
  id: string;
  last_name: string;
  first_name: string;
  birth_date: string;
  birth_place: string;
  nationality: string;
  gender: "M" | "F";
  marital_status: string;
  profession: string | null;
  phone: string;
  email: string | null;
}

export interface Declarant {
  id: string;
  last_name: string;
  first_name: string;
  phone: string;
  email: string | null;
  relationship: string;
}

export interface CenterClosure {
  id: string;
  center_id: string;
  date_from: string;
  date_to: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PublicHoliday {
  id: string;
  name: string;
  date: string;
  year: number | null;
  is_recurring: boolean;
  description: string | null;
}

// ─── Stats ────────────────────────────────────────────────────

export interface DashboardStats {
  counters: {
    total: number;
    today: number;
    today_present: number;
    today_absent: number;
    this_month: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    attendance_rate: number | null;
  };
  by_status: Array<{ status: AppointmentStatus; total: number }>;
  by_type: Array<{ type: string; total: number }>;
  by_center: Array<{ center_id: string; center_name: string; city: string; total: number }>;
  by_day: Array<{ date: string; total: number; present: number; absent: number }>;
}

// ─── QR Scan ──────────────────────────────────────────────────

export interface QrScanResult {
  valid: boolean;
  appointment?: Appointment;
  message: string;
}

// ─── API ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface AppointmentFilters {
  search?: string;
  status?: AppointmentStatus;
  center_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}
