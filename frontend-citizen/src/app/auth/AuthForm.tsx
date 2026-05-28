"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/lib/api";

// ─── Schémas de validation ────────────────────────────────────

const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, "Le numéro est obligatoire")
    .regex(
      /^(\+?224)?[6-7]\d{8}$/,
      "Format invalide. Ex : 621234567 ou +224621234567"
    ),
});

const otpSchema = z.object({
  code: z
    .string()
    .length(6, "Le code doit contenir 6 chiffres")
    .regex(/^\d+$/, "Le code ne doit contenir que des chiffres"),
});

type PhoneData = z.infer<typeof phoneSchema>;
type OtpData = z.infer<typeof otpSchema>;
type Step = "phone" | "otp";

// ─── Composant principal ──────────────────────────────────────

export function AuthForm({ redirect = "/tableau-de-bord" }: { redirect?: string }) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [expiresIn, setExpiresIn] = useState(10);
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  // ── Formulaire téléphone ──
  const phoneForm = useForm<PhoneData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const onPhoneSubmit = async (data: PhoneData) => {
    setIsLoading(true);
    setServerError("");
    try {
      const res = await authService.sendOtp(data.phone);
      setPhone(data.phone);
      setExpiresIn(res.expires_in);
      setStep("otp");
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Formulaire OTP ──
  const otpForm = useForm<OtpData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  const onOtpSubmit = async (data: OtpData) => {
    setIsLoading(true);
    setServerError("");
    try {
      await login(phone, data.code);
      router.push(redirect);
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    setIsLoading(true);
    setServerError("");
    try {
      const res = await authService.sendOtp(phone);
      setExpiresIn(res.expires_in);
      otpForm.reset();
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Rendu ────────────────────────────────────────────────────

  if (step === "phone") {
    return (
      <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} noValidate>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Numéro de téléphone
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                +224
              </span>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="621 234 567"
                className="flex-1 block w-full rounded-none rounded-r-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                disabled={isLoading}
                {...phoneForm.register("phone")}
              />
            </div>
            {phoneForm.formState.errors.phone && (
              <p className="mt-1 text-xs text-red-600">
                {phoneForm.formState.errors.phone.message}
              </p>
            )}
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-900 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isLoading ? "Envoi en cours…" : "Recevoir le code SMS"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} noValidate>
      <div className="space-y-4">
        {/* Info numéro */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-3">
          <p className="text-sm text-blue-800">
            Code envoyé au{" "}
            <span className="font-semibold">{phone}</span>
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            Valable {Math.floor(expiresIn / 60)} minutes
          </p>
        </div>

        {/* Saisie OTP */}
        <div>
          <label
            htmlFor="code"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Code de vérification
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            disabled={isLoading}
            {...otpForm.register("code")}
          />
          {otpForm.formState.errors.code && (
            <p className="mt-1 text-xs text-red-600">
              {otpForm.formState.errors.code.message}
            </p>
          )}
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-900 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {isLoading ? "Vérification…" : "Se connecter"}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="text-gray-500 hover:text-gray-700 underline"
          >
            Changer de numéro
          </button>
          <button
            type="button"
            onClick={resendOtp}
            disabled={isLoading}
            className="text-blue-700 hover:text-blue-900 underline disabled:opacity-50"
          >
            Renvoyer le code
          </button>
        </div>
      </div>
    </form>
  );
}
