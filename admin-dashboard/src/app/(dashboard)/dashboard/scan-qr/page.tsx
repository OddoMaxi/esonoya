"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Badge, STATUS_LABEL, STATUS_VARIANT } from "@/components/ui/Badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Appointment } from "@/types";

// ─── Types ────────────────────────────────────────────────────

interface ScanResult {
  valid: boolean;
  already_scanned?: boolean;
  result_code?: string;
  message: string;
  appointment?: Appointment;
}

interface ScanLog {
  id: string;
  scan_result: string;
  scan_mode: string;
  scanned_at: string;
  passport_request?: {
    reference_number: string;
    appointment_date: string;
    center?: { name: string };
    applicant?: { last_name: string; first_name: string };
  };
  scanned_by_user?: { name: string };
}

interface TodayStats {
  total: number;
  success: number;
  already_scanned: number;
  invalid: number;
}

type Tab  = "scanner" | "history";
type Mode = "hid" | "camera" | "file" | "reference";

const RESULT_CONFIG: Record<string, { label: string; color: string }> = {
  success:           { label: "Succès",          color: "bg-green-100 text-green-700" },
  already_scanned:   { label: "Déjà scanné",     color: "bg-yellow-100 text-yellow-700" },
  invalid_signature: { label: "Signature invalide", color: "bg-red-100 text-red-700" },
  not_found:         { label: "Introuvable",     color: "bg-red-100 text-red-700" },
  wrong_date:        { label: "Mauvaise date",   color: "bg-orange-100 text-orange-700" },
  cancelled:         { label: "Annulé",          color: "bg-gray-100 text-gray-600" },
};

// ─── Composant principal ──────────────────────────────────────

export default function ScanQrPage() {
  const [tab, setTab] = useState<Tab>("scanner");

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scan QR Code</h1>
        <p className="text-sm text-gray-500 mt-0.5">Enregistrement des présences par QR code</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(["scanner", "history"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "scanner" ? "📷 Scanner" : "📋 Historique"}
            </button>
          ))}
        </nav>
      </div>

      {tab === "scanner" && <ScannerTab />}
      {tab === "history" && <HistoryTab />}
    </div>
  );
}

// ─── Onglet Scanner ───────────────────────────────────────────

function ScannerTab() {
  const [mode, setMode]         = useState<Mode>("hid");
  const [result, setResult]     = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [sound, setSound]       = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/scan-history", { params: { per_page: 5 } });
      setTodayStats(data.today_stats);
    } catch {}
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const submit = useCallback(async (rawToken: string, scanMode: string) => {
    if (!rawToken.trim()) return;
    setScanning(true);
    setResult(null);
    try {
      const { data } = await api.post<ScanResult>("/admin/scan-qr", {
        token:     rawToken.trim(),
        scan_mode: scanMode,
      });
      setResult(data);
      loadStats();
      if (sound) playSound(data.valid && !data.already_scanned ? "success" : "error");
    } catch {
      setResult({ valid: false, message: "Erreur de connexion." });
    } finally {
      setScanning(false);
    }
  }, [loadStats, sound]);

  const submitByReference = useCallback(async (reference: string) => {
    if (!reference.trim()) return;
    setScanning(true);
    setResult(null);
    try {
      const { data } = await api.post<ScanResult>("/admin/scan-by-reference", {
        reference: reference.trim().toUpperCase(),
      });
      setResult(data);
      loadStats();
      if (sound) playSound(data.valid && !data.already_scanned ? "success" : "error");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Erreur de connexion.";
      setResult({ valid: false, message: msg });
    } finally {
      setScanning(false);
    }
  }, [loadStats, sound]);

  return (
    <div className="space-y-5">
      {/* Stats du jour */}
      {todayStats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Scans totaux",  value: todayStats.total,           color: "text-blue-600" },
            { label: "Présences",     value: todayStats.success,         color: "text-green-600" },
            { label: "Déjà scannés",  value: todayStats.already_scanned, color: "text-yellow-600" },
            { label: "Invalides",     value: todayStats.invalid,         color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sélecteur mode */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 grid grid-cols-2 sm:grid-cols-4 gap-1">
        {([
          { id: "hid",       label: "⌨️ Lecteur HID",   desc: "Scanner USB" },
          { id: "camera",    label: "📷 Caméra",         desc: "Webcam / Mobile" },
          { id: "file",      label: "🖼️ Photo",          desc: "Fichier image" },
          { id: "reference", label: "✏️ Code manuel",    desc: "Ex : GN0RW2JX" },
        ] as const).map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setResult(null); }}
            className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-colors text-center ${
              mode === m.id
                ? "bg-blue-900 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span>{m.label}</span>
            <span className="block text-xs opacity-60 mt-0.5">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Interface de scan selon le mode */}
      {mode === "hid"       && <HidInput        onScan={(t) => submit(t, "manual")}    scanning={scanning} />}
      {mode === "camera"    && <CameraScanner   onScan={(t) => submit(t, "camera")}    scanning={scanning} />}
      {mode === "file"      && <FileScanner     onScan={(t) => submit(t, "file")}      scanning={scanning} />}
      {mode === "reference" && <ReferenceInput  onScan={submitByReference}             scanning={scanning} />}

      {/* Son */}
      <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
        <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} className="rounded" />
        Retour sonore à la validation
      </label>

      {/* Résultat */}
      {result && <ScanResultCard result={result} />}
    </div>
  );
}

// ─── Mode HID (lecteur USB) ───────────────────────────────────

function HidInput({ onScan, scanning }: { onScan: (token: string) => void; scanning: boolean }) {
  const [token, setToken] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Refocus après chaque scan
  useEffect(() => {
    if (!scanning) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [scanning]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && token.trim()) {
      onScan(token);
      setToken("");
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (pasted) {
      onScan(pasted);
      setToken("");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <span className="text-3xl">⌨️</span>
        <div>
          <p className="font-semibold text-blue-900 text-sm">Lecteur QR USB (HID)</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Le lecteur envoie le contenu comme saisie clavier. Appuyez Entrée ou laissez le lecteur envoyer automatiquement.
          </p>
        </div>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Pointez le lecteur QR ici, ou collez le token..."
          className="input font-mono pr-24"
          autoFocus
          disabled={scanning}
        />
        <button
          onClick={() => { if (token.trim()) { onScan(token); setToken(""); } }}
          disabled={!token.trim() || scanning}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-900 text-white text-xs rounded-lg disabled:opacity-40"
        >
          {scanning ? "..." : "Valider"}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Raccourci : le lecteur envoie automatiquement Entrée après le scan
      </p>
    </div>
  );
}

// ─── Mode Saisie manuelle (référence) ────────────────────────

function ReferenceInput({ onScan, scanning }: { onScan: (reference: string) => void; scanning: boolean }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!scanning) inputRef.current?.focus();
  }, [scanning]);

  const handleSubmit = () => {
    const ref = value.trim().toUpperCase();
    if (ref.length < 3) return;
    onScan(ref);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <span className="text-3xl">✏️</span>
        <div>
          <p className="font-semibold text-blue-900 text-sm">Saisie manuelle du code ticket</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Entrez le numéro de référence figurant sur le ticket du citoyen.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Numéro de référence
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="GN0RW2JX"
            maxLength={12}
            className="input flex-1 font-mono text-lg tracking-widest text-center uppercase"
            autoFocus
            disabled={scanning}
          />
          <button
            onClick={handleSubmit}
            disabled={value.trim().length < 3 || scanning}
            className="px-5 py-2.5 bg-blue-900 text-white font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {scanning ? "Vérification…" : "✓ Valider"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Le code est imprimé en haut du ticket (ex : <span className="font-mono">GN0RW2JX</span>)
        </p>
      </div>
    </div>
  );
}

// ─── Mode Caméra ──────────────────────────────────────────────

function CameraScanner({ onScan, scanning }: { onScan: (token: string) => void; scanning: boolean }) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const rafRef     = useRef<number>(0);

  const [active, setActive]   = useState(false);
  const [error, setError]     = useState("");
  const [lastScan, setLastScan] = useState(0);

  const startCamera = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setActive(true);
      }
    } catch {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    cancelAnimationFrame(rafRef.current);
    setActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Décodage frame par frame avec jsQR
  useEffect(() => {
    if (!active || !videoRef.current || !canvasRef.current) return;

    const tick = async () => {
      if (!videoRef.current || !canvasRef.current || !active) return;

      const video  = videoRef.current;
      const canvas = canvasRef.current;
      const ctx    = canvas.getContext("2d");
      if (!ctx || video.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }

      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // Anti-doublon : minimum 3s entre deux scans
      if (Date.now() - lastScan > 3000 && !scanning) {
        try {
          const jsQR = (await import("jsqr")).default;
          const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
          if (code?.data) {
            setLastScan(Date.now());
            onScan(code.data);
          }
        } catch {}
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, scanning, lastScan, onScan]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {!active ? (
        <div className="p-6 text-center space-y-4">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
            <span className="text-4xl">📷</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Scanner par caméra</p>
            <p className="text-sm text-gray-500 mt-1">
              Pointe la caméra vers le QR code du citoyen — détection automatique.
            </p>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-blue-900 text-white rounded-xl font-medium hover:bg-blue-800 transition-colors"
          >
            Activer la caméra
          </button>
        </div>
      ) : (
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full aspect-video object-cover bg-black"
            muted
            playsInline
          />
          {/* Cadre viseur */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-52 relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
              {/* Barre de scan animée */}
              <div className="absolute inset-x-0 h-0.5 bg-blue-400 opacity-80 animate-[scanline_2s_ease-in-out_infinite]" />
            </div>
          </div>
          {/* Status */}
          <div className="absolute top-3 left-3 right-3 flex justify-between">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              scanning ? "bg-yellow-400 text-yellow-900" : "bg-green-400 text-green-900"
            }`}>
              {scanning ? "Vérification..." : "● Caméra active"}
            </span>
            <button
              onClick={stopCamera}
              className="px-2 py-1 bg-black/50 text-white text-xs rounded-full"
            >
              Arrêter
            </button>
          </div>
          <p className="absolute bottom-3 inset-x-0 text-center text-white/80 text-xs">
            Placez le QR code dans le cadre
          </p>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// ─── Mode Fichier / Photo ─────────────────────────────────────

function FileScanner({ onScan, scanning }: { onScan: (token: string) => void; scanning: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [fileError, setFileError] = useState("");

  const handleFile = async (file: File) => {
    setFileError("");
    setPreview(URL.createObjectURL(file));
    setDecoding(true);

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width  = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const jsQR = (await import("jsqr")).default;
      const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: "attemptBoth" });

      if (code?.data) {
        onScan(code.data);
        setPreview(null);
      } else {
        setFileError("Aucun QR code détecté dans cette image.");
      }
    } catch {
      setFileError("Erreur lors de la lecture de l'image.");
    } finally {
      setDecoding(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <label className="flex flex-col items-center gap-3 cursor-pointer">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          disabled={scanning || decoding}
        />
        {preview ? (
          <div className="relative">
            <img src={preview} alt="QR à scanner" className="max-h-48 rounded-xl object-contain" />
            {decoding && (
              <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <span className="text-4xl mb-3 block">🖼️</span>
            <p className="font-medium text-gray-700">Sélectionner une photo</p>
            <p className="text-sm text-gray-400 mt-1">
              Sur mobile : prendre une photo du QR code<br/>
              Sur desktop : charger un fichier image
            </p>
          </div>
        )}
      </label>

      {fileError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          <span>❌</span> {fileError}
        </div>
      )}

      {preview && !decoding && (
        <button
          onClick={() => setPreview(null)}
          className="w-full py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Choisir une autre image
        </button>
      )}
    </div>
  );
}

// ─── Carte résultat ───────────────────────────────────────────

function ScanResultCard({ result }: { result: ScanResult }) {
  const a = result.appointment;

  const bg = result.valid
    ? result.already_scanned ? "bg-yellow-50 border-yellow-300" : "bg-green-50 border-green-300"
    : "bg-red-50 border-red-300";

  const icon = result.valid
    ? result.already_scanned ? "⚠️" : "✅"
    : "❌";

  const textColor = result.valid
    ? result.already_scanned ? "text-yellow-900" : "text-green-900"
    : "text-red-900";

  return (
    <div className={`rounded-xl border-2 p-5 ${bg} animate-in fade-in duration-200`}>
      <div className="flex items-start gap-4">
        <span className="text-3xl shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-lg leading-tight ${textColor}`}>{result.message}</p>

          {a && (
            <div className="mt-4 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {/* Référence */}
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Référence</span>
                <span className="font-mono font-bold text-blue-700">{a.reference_number}</span>
              </div>
              {/* Infos */}
              <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Demandeur</p>
                  <p className="font-semibold">{a.applicant?.last_name} {a.applicant?.first_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Téléphone</p>
                  <p>{a.applicant?.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Centre</p>
                  <p>{a.center?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Date RDV</p>
                  <p className="font-medium">{formatDate(a.appointment_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Type</p>
                  <p>{a.request_type === "new" ? "Nouveau" : a.request_type === "renewal" ? "Renouvellement" : "Perdu"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Statut</p>
                  <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                </div>
              </div>
              {/* Scan précédent */}
              {a.qr_scanned_at && (
                <div className="px-4 py-2 bg-yellow-50 text-xs text-yellow-700">
                  Scanné le {formatDateTime(a.qr_scanned_at)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Onglet Historique ────────────────────────────────────────

function HistoryTab() {
  const [logs, setLogs]       = useState<ScanLog[]>([]);
  const [meta, setMeta]       = useState({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState("");
  const [dateFilter, setDateFilter]     = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage]                 = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 50 };
      if (resultFilter) params.result = resultFilter;
      if (dateFilter)   params.date   = dateFilter;

      const { data } = await api.get("/admin/scan-history", { params });
      setLogs(data.data);
      setMeta(data.meta);
      setTodayStats(data.today_stats);
    } finally {
      setLoading(false);
    }
  }, [page, resultFilter, dateFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      {/* Stats du jour */}
      {todayStats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total",     value: todayStats.total,           color: "text-blue-600" },
            { label: "Présences", value: todayStats.success,         color: "text-green-600" },
            { label: "Doublons",  value: todayStats.already_scanned, color: "text-yellow-600" },
            { label: "Invalides", value: todayStats.invalid,         color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
          className="input w-auto"
        />
        <select
          value={resultFilter}
          onChange={(e) => { setResultFilter(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">Tous les résultats</option>
          {Object.entries(RESULT_CONFIG).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Actualiser
        </button>
        <span className="ml-auto self-center text-sm text-gray-400">{meta.total} entrée{meta.total > 1 ? "s" : ""}</span>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Heure", "Référence / Demandeur", "Résultat", "Mode", "Agent"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : logs.length === 0
              ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    Aucun scan enregistré.
                  </td>
                </tr>
              )
              : logs.map((log) => {
                  const cfg = RESULT_CONFIG[log.scan_result] ?? { label: log.scan_result, color: "bg-gray-100 text-gray-600" };
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.scanned_at).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        {log.passport_request ? (
                          <div>
                            <p className="font-mono text-xs text-blue-700 font-semibold">
                              {log.passport_request.reference_number}
                            </p>
                            <p className="text-xs text-gray-500">
                              {log.passport_request.applicant?.last_name} {log.passport_request.applicant?.first_name}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Token inconnu</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 capitalize">
                        {log.scan_mode}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {log.scanned_by_user?.name ?? "—"}
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>

        {/* Pagination simple */}
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">Page {meta.current_page} / {meta.last_page}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                ←
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === meta.last_page}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Son de feedback ──────────────────────────────────────────

function playSound(type: "success" | "error") {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {}
}
