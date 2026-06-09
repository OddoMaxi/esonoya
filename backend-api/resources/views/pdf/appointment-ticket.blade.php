<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>Ticket Rendez-vous — {{ $appointment->reference_number }}</title>
<style>
  /* ── Reset ── */
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: "DejaVu Sans", Arial, sans-serif;
    font-size: 11px;
    color: #1e293b;
    background: #f8fafc;
  }

  /* ── Page wrapper ── */
  .page {
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
    background: #ffffff;
  }

  /* ── Bandeau drapeau guinéen (rouge | jaune | vert) ── */
  .flag-stripe {
    width: 100%;
    height: 6px;
    /* DomPDF ne supporte pas les gradients, on utilise une table */
  }
  .flag-table { width: 100%; border-collapse: collapse; height: 6px; }
  .flag-red   { background: #CE1126; width: 33.33%; }
  .flag-yellow{ background: #FCD116; width: 33.33%; }
  .flag-green { background: #009460; width: 33.34%; }

  /* ── Header ── */
  .header {
    background: #1e3a8a;
    padding: 16px 28px 14px;
    color: #ffffff;
  }
  .header-table { width: 100%; border-collapse: collapse; }
  .header-left  { width: 55%; vertical-align: middle; }
  .header-right { width: 45%; vertical-align: middle; text-align: right; }

  /* Logos gauche */
  .logos-table { border-collapse: collapse; }
  .logos-table td { vertical-align: middle; padding-right: 8px; }
  .logo-inst { width: 50px; height: 50px; }
  .logo-esonoya-img { height: 26px; }
  .logo-img { height: 36px; }

  .header-badge {
    display: inline-block;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 4px;
    padding: 3px 10px;
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #bfdbfe;
  }

  .header-title {
    font-size: 22px;
    font-weight: bold;
    letter-spacing: 4px;
    font-family: "DejaVu Sans Mono", "Courier New", monospace;
    color: #ffffff;
    margin-top: 6px;
  }

  /* ── Statut badge ── */
  .status-wrap { text-align: left; margin-top: 8px; }
  .status-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: bold;
  }
  .status-pending   { background: #fef9c3; color: #854d0e; }
  .status-confirmed { background: #dbeafe; color: #1e40af; }
  .status-present   { background: #dcfce7; color: #166534; }
  .status-absent    { background: #fee2e2; color: #991b1b; }
  .status-cancelled { background: #f1f5f9; color: #475569; }

  /* ── Corps principal ── */
  .body-wrap { padding: 24px 28px; }

  /* ── Section QR + Infos ── */
  .main-table { width: 100%; border-collapse: collapse; }
  .col-qr    { width: 200px; vertical-align: top; text-align: center; padding-right: 20px; }
  .col-infos { vertical-align: top; }

  .qr-box {
    border: 3px solid #1e3a8a;
    border-radius: 10px;
    padding: 8px;
    display: inline-block;
    background: #ffffff;
  }
  .qr-img { width: 180px; height: 180px; display: block; }

  .qr-caption {
    font-size: 8px;
    color: #94a3b8;
    margin-top: 6px;
    text-align: center;
  }

  /* ── Bloc info ── */
  .info-section { margin-bottom: 14px; }
  .info-label {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #94a3b8;
    margin-bottom: 2px;
  }
  .info-value {
    font-size: 12px;
    font-weight: bold;
    color: #0f172a;
  }
  .info-sub {
    font-size: 9px;
    color: #64748b;
    margin-top: 1px;
  }

  .divider {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 10px 0;
  }

  /* ── Séparateur perforé (style billet) ── */
  .ticket-tear {
    border-top: 2px dashed #cbd5e1;
    margin: 20px 0;
    position: relative;
  }

  /* ── Section documents ── */
  .docs-box {
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 16px;
  }
  .docs-title {
    font-size: 10px;
    font-weight: bold;
    color: #92400e;
    margin-bottom: 8px;
  }
  .docs-list { list-style: none; padding: 0; }
  .docs-list li {
    font-size: 10px;
    color: #78350f;
    padding: 2px 0;
  }
  .docs-list li::before { content: "• "; color: #f59e0b; }

  /* ── Section demandeur ── */
  .applicant-box {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 16px;
  }
  .applicant-title {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #0369a1;
    margin-bottom: 10px;
    font-weight: bold;
  }
  .applicant-grid { width: 100%; border-collapse: collapse; }
  .applicant-cell { width: 50%; vertical-align: top; padding: 3px 0; }
  .applicant-field-label { font-size: 8px; color: #0284c7; }
  .applicant-field-value { font-size: 10px; font-weight: bold; color: #0c4a6e; }

  /* ── Footer ── */
  .footer {
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    padding: 14px 28px;
    text-align: center;
  }
  .footer-main  { font-size: 9px; color: #64748b; margin-bottom: 4px; }
  .footer-legal { font-size: 8px; color: #94a3b8; }

  /* ── Watermark (sécurité) ── */
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-size: 60px;
    font-weight: bold;
    color: rgba(30, 58, 138, 0.04);
    text-transform: uppercase;
    letter-spacing: 8px;
    pointer-events: none;
    z-index: 0;
  }

  /* ── Numéro de page ── */
  .page-number {
    position: fixed;
    bottom: 8px;
    right: 20px;
    font-size: 8px;
    color: #cbd5e1;
  }
</style>
</head>
<body>

{{-- Filigrane sécurité --}}
<div class="watermark">eSonoya</div>

<div class="page">

  {{-- ── Bandeau drapeau guinéen ── --}}
  <table class="flag-table">
    <tr>
      <td class="flag-red">&nbsp;</td>
      <td class="flag-yellow">&nbsp;</td>
      <td class="flag-green">&nbsp;</td>
    </tr>
  </table>

  {{-- ── Header bleu ── --}}
  <div class="header">
    <table class="header-table">
      <tr>
        <td class="header-left">
          <table class="logos-table">
            <tr>
              @if($mspcDataUri)
                <td><img src="{{ $mspcDataUri }}" class="logo-inst" alt="MSPC"></td>
              @endif
              @if($dcpafDataUri)
                <td><img src="{{ $dcpafDataUri }}" class="logo-inst" alt="PAF"></td>
              @endif
              @if($esonoyaDataUri)
                <td><img src="{{ $esonoyaDataUri }}" class="logo-esonoya-img" alt="eSonoya"></td>
              @endif
            </tr>
          </table>
          <div style="font-size:7px; color:#93c5fd; margin-top:5px; letter-spacing:0.4px;">
            Ministère de la Sécurité et de la Protection Civile · DCPAF · Guinée
          </div>
        </td>
        <td class="header-right">
          <div class="header-badge">Ticket Officiel</div>
          <div class="header-title">{{ $appointment->reference_number }}</div>
          <div class="status-wrap">
            @php
              $statusClasses = [
                'pending'   => 'status-pending',
                'confirmed' => 'status-confirmed',
                'present'   => 'status-present',
                'absent'    => 'status-absent',
                'cancelled' => 'status-cancelled',
              ];
              $statusLabels = [
                'pending'   => 'En attente',
                'confirmed' => 'Confirmé',
                'present'   => 'Présent',
                'absent'    => 'Absent',
                'cancelled' => 'Annulé',
              ];
              $cls   = $statusClasses[$appointment->status] ?? 'status-pending';
              $label = $statusLabels[$appointment->status]  ?? 'En attente';
            @endphp
            <span class="status-badge {{ $cls }}">{{ $label }}</span>
          </div>
        </td>
      </tr>
    </table>
  </div>

  {{-- ── Corps ── --}}
  <div class="body-wrap">

    {{-- QR code + Infos principales --}}
    <table class="main-table">
      <tr>
        {{-- QR Code --}}
        <td class="col-qr">
          <div class="qr-box">
            <img src="{{ $qrDataUri }}" class="qr-img" alt="QR Code">
          </div>
          <div class="qr-caption">
            Présentez ce code à l'accueil<br>
            Valable uniquement le jour du RDV
          </div>
        </td>

        {{-- Informations rendez-vous --}}
        <td class="col-infos">
          <div class="info-section">
            <div class="info-label">Centre d'inscription</div>
            <div class="info-value">{{ $appointment->center->name }}</div>
            <div class="info-sub">{{ $appointment->center->city }}</div>
            @if($appointment->center->address)
              <div class="info-sub">{{ $appointment->center->address }}</div>
            @endif
          </div>

          <hr class="divider">

          <div class="info-section">
            <div class="info-label">Date du rendez-vous</div>
            <div class="info-value" style="font-size:14px;">
              {{ \Carbon\Carbon::parse($appointment->appointment_date)->locale('fr')->isoFormat('dddd D MMMM YYYY') }}
            </div>
            @if($appointment->quota?->time_slot)
              <div class="info-sub" style="font-weight:bold; color:#1e3a8a; margin-top:3px;">
                Créneau : {{ $appointment->quota->time_slot }}
              </div>
            @endif
          </div>

          <hr class="divider">

          <div class="info-section">
            <div class="info-label">Type de demande</div>
            @php
              $typeLabels = [
                'new'     => 'Nouveau passeport',
                'renewal' => 'Renouvellement',
                'duplicata' => 'Duplicata',
              ];
            @endphp
            <div class="info-value">{{ $typeLabels[$appointment->request_type] ?? $appointment->request_type }}</div>
          </div>

          <hr class="divider">

          <div class="info-section">
            <div class="info-label">Référence paiement</div>
            <div class="info-value" style="font-family: 'DejaVu Sans Mono', monospace; font-size:11px;">
              {{ $appointment->receipt_reference }}
            </div>
          </div>

          @if($appointment->qr_scanned_at)
            <div style="background:#dcfce7; border:1px solid #86efac; border-radius:6px; padding:6px 10px; margin-top:10px;">
              <span style="font-size:10px; color:#166534; font-weight:bold;">
                ✓ Présence enregistrée le
                {{ $appointment->qr_scanned_at->locale('fr')->isoFormat('D MMMM YYYY [à] HH:mm') }}
              </span>
            </div>
          @endif
        </td>
      </tr>
    </table>

    {{-- ── Séparateur perforé ── --}}
    <div class="ticket-tear"></div>

    {{-- ── Informations demandeur ── --}}
    @if($appointment->applicant)
    <div class="applicant-box">
      <div class="applicant-title">Informations du demandeur</div>
      <table class="applicant-grid">
        <tr>
          <td class="applicant-cell">
            <div class="applicant-field-label">Nom complet</div>
            <div class="applicant-field-value">
              {{ strtoupper($appointment->applicant->last_name) }}
              {{ $appointment->applicant->first_name }}
            </div>
          </td>
          <td class="applicant-cell">
            <div class="applicant-field-label">Date de naissance</div>
            <div class="applicant-field-value">
              {{ $appointment->applicant->birth_date
                  ? \Carbon\Carbon::parse($appointment->applicant->birth_date)->format('d/m/Y')
                  : '—' }}
            </div>
          </td>
        </tr>
        <tr>
          <td class="applicant-cell" style="padding-top:8px;">
            <div class="applicant-field-label">Lieu de naissance</div>
            <div class="applicant-field-value">{{ $appointment->applicant->birth_place ?? '—' }}</div>
          </td>
          <td class="applicant-cell" style="padding-top:8px;">
            <div class="applicant-field-label">Nationalité</div>
            <div class="applicant-field-value">{{ $appointment->applicant->nationality ?? '—' }}</div>
          </td>
        </tr>
        <tr>
          <td class="applicant-cell" style="padding-top:8px;">
            <div class="applicant-field-label">Téléphone</div>
            <div class="applicant-field-value">{{ $appointment->applicant->phone ?? '—' }}</div>
          </td>
          <td class="applicant-cell" style="padding-top:8px;">
            <div class="applicant-field-label">Genre</div>
            <div class="applicant-field-value">
              {{ $appointment->applicant->gender === 'M' ? 'Masculin' : 'Féminin' }}
            </div>
          </td>
        </tr>
      </table>
    </div>
    @endif

    {{-- ── Documents à apporter ── --}}
    <div class="docs-box">
      <div class="docs-title">⚠ Documents obligatoires à apporter le jour du RDV</div>
      <ul class="docs-list">
        <li>Ce ticket (version papier ou numérique)</li>
        <li>Réçu de paiement original (référence : {{ $appointment->receipt_reference }})</li>
        <li>Pièce d'identité nationale en cours de validité</li>
        <li>Acte de naissance original + photocopie certifiée</li>
        <li>2 photos d'identité récentes (fond blanc, 4×4 cm)</li>
        @if($appointment->request_type === 'renewal')
        <li>Ancien passeport (original)</li>
        @elseif($appointment->request_type === 'duplicata')
        <li>Déclaration de perte / vol délivrée par la police</li>
        @endif
      </ul>
    </div>

  </div>

  {{-- ── Footer ── --}}
  <div class="footer">
    <div class="footer-main">
      Ce ticket est généré automatiquement par la plateforme <strong>eSonoya</strong> · Direction Centrale de la Police aux Frontières (DCPAF) - Guinée
    </div>
    <div class="footer-legal">
      Document officiel — Toute falsification est passible de poursuites judiciaires.
      Généré le {{ now()->locale('fr')->isoFormat('D MMMM YYYY [à] HH:mm') }}
    </div>
  </div>

</div>

<div class="page-number">Ticket RDV — {{ $appointment->reference_number }}</div>

</body>
</html>
