"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";
import type {
  BookingFor,
  RequestType,
  DeclarantData,
} from "@/types";

// ─── Types ────────────────────────────────────────────────────

export interface BookingState {
  currentStep: number;
  // Étape 0
  booking_for: BookingFor;
  // Étape 1
  request_type: RequestType | "";
  // Étape 2
  receipt_reference: string;
  // Étape 3 — Identité du demandeur
  last_name: string;
  first_name: string;
  birth_date: string;
  birth_place: string;
  nationality: string;
  gender: "M" | "F" | "";
  phone: string;
  email: string;
  address: string;
  // Étape 4 — Situation
  marital_status: "single" | "married" | "divorced" | "widowed" | "";
  profession: string;
  // Étape 5 — Signalement
  height_cm: string;
  eye_color: string;
  distinctive_signs: string;
  // Étape 6 — Parents
  father_last_name: string;
  father_first_name: string;
  mother_last_name: string;
  mother_first_name: string;
  // Étape 7 — Centre et date
  center_id: string;
  center_name: string;
  appointment_date: string;
  quota_id: string;
  // Étape 8 — Déclarant (si booking_for = 'other')
  declarant: DeclarantData | null;
}

type BookingAction =
  | { type: "SET_STEP"; payload: number }
  | { type: "UPDATE"; payload: Partial<BookingState> }
  | { type: "SET_DECLARANT"; payload: DeclarantData | null }
  | { type: "RESET" };

const STORAGE_KEY = "esonoya_booking_draft";
const TOTAL_STEPS = 9; // 0 à 8

// ─── État initial ─────────────────────────────────────────────

const initialState: BookingState = {
  currentStep: 0,
  booking_for: "self",
  request_type: "",
  receipt_reference: "",
  last_name: "",
  first_name: "",
  birth_date: "",
  birth_place: "",
  nationality: "Guinéenne",
  gender: "",
  phone: "",
  email: "",
  address: "",
  marital_status: "",
  profession: "",
  height_cm: "",
  eye_color: "",
  distinctive_signs: "",
  father_last_name: "",
  father_first_name: "",
  mother_last_name: "",
  mother_first_name: "",
  center_id: "",
  center_name: "",
  appointment_date: "",
  quota_id: "",
  declarant: null,
};

function reducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.payload };
    case "UPDATE":
      return { ...state, ...action.payload };
    case "SET_DECLARANT":
      return { ...state, declarant: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────

interface BookingContextValue {
  state: BookingState;
  totalSteps: number;
  goNext: () => void;
  goPrev: () => void;
  goToStep: (step: number) => void;
  update: (data: Partial<BookingState>) => void;
  setDeclarant: (data: DeclarantData | null) => void;
  reset: () => void;
  progress: number;
}

const BookingContext = createContext<BookingContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────

export function BookingProvider({ children }: { children: ReactNode }) {
  // Toujours démarrer avec initialState pour que SSR et client soient identiques.
  // La restauration localStorage se fait dans useEffect, après l'hydratation.
  const [state, dispatch] = useReducer(reducer, initialState);

  // Restaurer le brouillon une seule fois, après le montage côté client
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as BookingState;
        dispatch({
          type: "UPDATE",
          payload: { ...parsed, currentStep: Math.min(parsed.currentStep, 7), quota_id: parsed.quota_id ?? "" },
        });
      }
    } catch {
      // localStorage inaccessible ou données corrompues — ignorer
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save à chaque changement d'état
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage plein ou désactivé — ignorer
    }
  }, [state]);

  // Avertir avant de quitter la page si le formulaire est en cours
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.currentStep > 0 && state.currentStep < 8) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.currentStep]);

  const goNext = useCallback(() => {
    dispatch({ type: "SET_STEP", payload: Math.min(state.currentStep + 1, TOTAL_STEPS - 1) });
  }, [state.currentStep]);

  const goPrev = useCallback(() => {
    dispatch({ type: "SET_STEP", payload: Math.max(state.currentStep - 1, 0) });
  }, [state.currentStep]);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: "SET_STEP", payload: step });
  }, []);

  const update = useCallback((data: Partial<BookingState>) => {
    dispatch({ type: "UPDATE", payload: data });
  }, []);

  const setDeclarant = useCallback((data: DeclarantData | null) => {
    dispatch({ type: "SET_DECLARANT", payload: data });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const progress = Math.round((state.currentStep / (TOTAL_STEPS - 1)) * 100);

  return (
    <BookingContext.Provider
      value={{
        state,
        totalSteps: TOTAL_STEPS,
        goNext,
        goPrev,
        goToStep,
        update,
        setDeclarant,
        reset,
        progress,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking doit être utilisé dans <BookingProvider>");
  return ctx;
}
