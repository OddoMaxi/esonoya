// ─── Types eSonoya ────────────────────────────────────────────

export interface Center {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

export interface TimeSlotEntry {
  quota_id: string;
  time_slot: string;           // ex: '08h-10h'
  total_slots: number;
  booked_slots: number;
  available_slots: number;
  is_available: boolean;
  is_suspended: boolean;
  suspension_reason: string | null;
}

export interface Quota {
  quota_id: string | null;   // null si date avec créneaux
  date: string;              // ISO date YYYY-MM-DD
  total_slots: number;
  booked_slots: number;
  available_slots: number;
  is_available: boolean;
  is_suspended: boolean;
  suspension_reason: string | null;
  unavailable_reason: string | null;
  time_slots: TimeSlotEntry[] | null;  // null = ancien mode sans créneau
}

export interface Applicant {
  id: string;
  last_name: string;
  first_name: string;
  birth_date: string;
  birth_place: string;
  nationality: string;
  gender: "M" | "F";
  marital_status: "single" | "married" | "divorced" | "widowed";
  profession: string | null;
  height_cm: number | null;
  eye_color: string | null;
  distinctive_signs: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  father_last_name: string | null;
  father_first_name: string | null;
  mother_last_name: string | null;
  mother_first_name: string | null;
}

export interface Declarant {
  id: string;
  last_name: string;
  first_name: string;
  phone: string;
  email: string | null;
  relationship: "parent" | "sibling" | "spouse" | "other";
}

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "present"
  | "absent"
  | "cancelled";

export type RequestType = "new" | "renewal" | "duplicata";

export interface Appointment {
  id: string;
  reference_number: string;
  receipt_reference: string;
  request_type: RequestType;
  appointment_date: string;
  status: AppointmentStatus;
  qr_token: string;
  qr_scanned_at: string | null;
  pdf_generated_at: string | null;
  center: Center;
  applicant: Applicant;
  declarant: Declarant | null;
  created_at: string;
}

// ─── Formulaire multi-step ────────────────────────────────────

export type BookingFor = "self" | "other";

export interface Step0Data {
  booking_for: BookingFor;
}

export interface Step1Data {
  request_type: RequestType;
}

export interface Step2Data {
  receipt_reference: string;
}

export interface Step3Data {
  last_name: string;
  first_name: string;
  birth_date: string;
  birth_place: string;
  nationality: string;
  gender: "M" | "F";
  phone: string;
  email?: string;
  address?: string;
}

export interface Step4Data {
  marital_status: "single" | "married" | "divorced" | "widowed";
  profession?: string;
}

export interface Step5Data {
  height_cm?: number;
  eye_color?: string;
  distinctive_signs?: string;
}

export interface Step6Data {
  father_last_name?: string;
  father_first_name?: string;
  mother_last_name?: string;
  mother_first_name?: string;
}

export interface Step7Data {
  center_id: string;
  appointment_date: string;
}

export interface DeclarantData {
  last_name: string;
  first_name: string;
  phone: string;
  email?: string;
  relationship: "parent" | "sibling" | "spouse" | "other";
}

export interface ApplicantPayload {
  last_name: string;
  first_name: string;
  birth_date: string;
  birth_place: string;
  nationality: string;
  gender: "M" | "F";
  marital_status: "single" | "married" | "divorced" | "widowed";
  profession?: string;
  height_cm?: number;
  eye_color?: string;
  distinctive_signs?: string;
  phone: string;
  email?: string;
  address?: string;
  father_last_name?: string;
  father_first_name?: string;
  mother_last_name?: string;
  mother_first_name?: string;
}

export interface BookingFormData {
  booking_for: BookingFor;
  request_type: RequestType;
  receipt_reference: string;
  center_id: string;
  quota_id: string;
  appointment_date: string;
  applicant: ApplicantPayload;
  declarant?: DeclarantData;
}

// ─── API Responses ────────────────────────────────────────────

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

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// ─── Auth ─────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  phone: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}
