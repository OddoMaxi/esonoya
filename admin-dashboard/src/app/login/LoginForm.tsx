"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { adminAuthService } from "@/services/admin-auth.service";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import axios from "axios";

// ─── Schémas ──────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email("Email invalide").min(1, "Email requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

const otpSchema = z.object({
  code: z.string().length(6, "Le code doit contenir 6 chiffres").regex(/^\d+$/),
});

type LoginData = z.infer<typeof loginSchema>;
type OtpData = z.infer<typeof otpSchema>;
type Step = "credentials" | "otp";

// ─── Composant ────────────────────────────────────────────────

export function LoginForm() {
  const [step, setStep] = useState<Step>("credentials");
  const [tempToken, setTempToken] = useState("");
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { setAdmin } = useAdminAuth();
  const router = useRouter();

  // ── Étape 1 — Email + mot de passe ──
  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onLoginSubmit = async (data: LoginData) => {
    setIsLoading(true);
    setServerError("");
    try {
      const res = await adminAuthService.login(data.email, data.password);
      setTempToken(res.temp_token);
      setStep("otp");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setServerError(
          err.response?.data?.message ?? "Identifiants incorrects."
        );
      } else {
        setServerError("Une erreur est survenue.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Étape 2 — Vérification OTP 2FA ──
  const otpForm = useForm<OtpData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  const onOtpSubmit = async (data: OtpData) => {
    setIsLoading(true);
    setServerError("");
    try {
      const res = await adminAuthService.verifyOtp(tempToken, data.code);
      setAdmin(res.user);
      router.push("/dashboard");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setServerError(
          err.response?.data?.message ?? "Code OTP invalide ou expiré."
        );
      } else {
        setServerError("Une erreur est survenue.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Rendu ────────────────────────────────────────────────────

  if (step === "credentials") {
    return (
      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} noValidate>
        <div className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@esonoya.gov.gn"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              disabled={isLoading}
              {...loginForm.register("email")}
            />
            {loginForm.formState.errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {loginForm.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Mot de passe */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              disabled={isLoading}
              {...loginForm.register("password")}
            />
            {loginForm.formState.errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {loginForm.formState.errors.password.message}
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
            className="w-full bg-blue-900 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors text-sm"
          >
            {isLoading ? "Connexion…" : "Continuer"}
          </button>
        </div>
      </form>
    );
  }

  // Étape OTP 2FA
  return (
    <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} noValidate>
      <div className="space-y-4">
        {/* Badge sécurité */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 flex items-start gap-2">
          <span className="text-amber-500 mt-0.5">🔐</span>
          <div>
            <p className="text-sm font-medium text-amber-800">
              Vérification en deux étapes
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Un code a été envoyé à votre téléphone enregistré.
            </p>
          </div>
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
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            disabled={isLoading}
            autoFocus
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
          className="w-full bg-blue-900 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors text-sm"
        >
          {isLoading ? "Vérification…" : "Accéder au tableau de bord"}
        </button>

        <button
          type="button"
          onClick={() => {
            setStep("credentials");
            setServerError("");
          }}
          className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
        >
          ← Retour à la connexion
        </button>
      </div>
    </form>
  );
}
