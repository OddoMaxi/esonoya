<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>Fiche de Demande de Passeport — {{ $appointment->reference_number }}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "DejaVu Sans", Arial, sans-serif;
    font-size: 10px;
    color: #111827;
    background: #fff;
  }
  .page { width: 100%; max-width: 700px; margin: 0 auto; background: #fff; }

  /* Drapeau */
  .flag-table { width: 100%; border-collapse: collapse; height: 6px; }
  .flag-red    { background: #CE1126; width: 33.33%; }
  .flag-yellow { background: #FCD116; width: 33.33%; }
  .flag-green  { background: #009460; width: 33.34%; }

  /* Header */
  .header { background: #374151; padding: 10px 18px; color: #fff; }
  .header-title { font-size: 15px; font-weight: bold; text-align: center; letter-spacing: 2px; text-transform: uppercase; color: #fff; }
  .header-sub   { font-size: 8px; color: #d1d5db; text-align: center; margin-top: 2px; }

  /* Form layout */
  .section-header {
    background: #f3f4f6; font-weight: bold; font-size: 9px; letter-spacing: 0.5px;
    padding: 4px 8px; border: 1px solid #9ca3af; border-bottom: none; margin-top: 7px;
  }
  .section-header-blue {
    background: #eff6ff; color: #1e40af; font-weight: bold; font-size: 9px;
    padding: 4px 8px; border: 1px solid #9ca3af; border-bottom: none; margin-top: 7px;
  }
  .form-table { width: 100%; border-collapse: collapse; }
  .form-table td { border: 1px solid #9ca3af; padding: 4px 7px; vertical-align: middle; }
  .lbl { background: #f9fafb; color: #6b7280; white-space: nowrap; width: 150px; font-size: 9px; }
  .val { font-size: 10px; font-weight: 600; color: #111827; }

  /* Checkboxes */
  .cb {
    display: inline-block; width: 10px; height: 10px;
    border: 1px solid #6b7280; vertical-align: middle;
    text-align: center; font-size: 7px; line-height: 10px; margin-right: 2px;
  }
  .cb-on { background: #374151; color: #fff; }
  .cb-lbl { font-size: 10px; margin-right: 8px; vertical-align: middle; }

  /* Photo placeholder */
  .photo-box {
    width: 72px; min-height: 90px; border: 1px solid #9ca3af;
    text-align: center; vertical-align: middle;
    color: #9ca3af; font-size: 9px; padding: 4px;
  }

  /* Footer */
  .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 10px 18px; text-align: center; margin-top: 10px; }
  .footer-text { font-size: 8px; color: #64748b; line-height: 1.6; }

  .watermark {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-size: 60px; font-weight: bold;
    color: rgba(30, 58, 138, 0.04);
    text-transform: uppercase; letter-spacing: 8px;
    pointer-events: none; z-index: 0;
  }
  .note { font-size: 8px; color: #9ca3af; font-style: italic; padding: 5px 8px; }
</style>
</head>
<body>
<div class="watermark">eSonoya</div>
<div class="page">

  {{-- Drapeau --}}
  <table class="flag-table"><tr>
    <td class="flag-red">&nbsp;</td>
    <td class="flag-yellow">&nbsp;</td>
    <td class="flag-green">&nbsp;</td>
  </tr></table>

  {{-- Header --}}
  <div class="header">
    <table style="width:100%; border-collapse:collapse;">
      <tr>
        <td style="vertical-align:middle; width:180px;">
          <table style="border-collapse:collapse;"><tr>
            @if($mspcDataUri)
              <td style="padding-right:6px;"><img src="{{ $mspcDataUri }}" style="height:38px;width:38px;object-fit:contain;" alt="MSPC"></td>
            @endif
            @if($dcpafDataUri)
              <td style="padding-right:6px;"><img src="{{ $dcpafDataUri }}" style="height:38px;width:38px;object-fit:contain;" alt="DCPAF"></td>
            @endif
            @if($esonoyaDataUri)
              <td><img src="{{ $esonoyaDataUri }}" style="height:20px;object-fit:contain;" alt="eSonoya"></td>
            @endif
          </tr></table>
          <div style="font-size:7px; color:#9ca3af; margin-top:4px;">Ministère de la Sécurité et de la Protection Civile · DCPAF</div>
        </td>
        <td style="text-align:center; vertical-align:middle;">
          <div class="header-title">Demande de Passeport</div>
          <div class="header-sub">République de Guinée · Réf. {{ $appointment->reference_number }}</div>
        </td>
        <td style="width:80px; text-align:center; vertical-align:top; padding-left:8px;">
          <div class="photo-box">PHOTO</div>
        </td>
      </tr>
    </table>
  </div>

  {{-- Corps --}}
  <div style="padding: 10px 16px 16px;">

    {{-- Éléments de la demande --}}
    <div class="section-header">Éléments de la demande</div>
    <table class="form-table">
      <tr>
        <td class="lbl">Type de la demande*</td>
        <td class="val">
          @php $rt = $appointment->request_type; @endphp
          <span class="cb-lbl"><span class="cb {{ $rt==='new' ? 'cb-on' : '' }}">{{ $rt==='new' ? '✓' : '' }}</span>Première demande</span>
          <span class="cb-lbl"><span class="cb {{ $rt==='renewal' ? 'cb-on' : '' }}">{{ $rt==='renewal' ? '✓' : '' }}</span>Renouvellement</span>
          <span class="cb-lbl"><span class="cb {{ $rt==='duplicata' ? 'cb-on' : '' }}">{{ $rt==='duplicata' ? '✓' : '' }}</span>Duplicata</span>
        </td>
      </tr>
      <tr>
        <td class="lbl">Numéro de Récépissé*</td>
        <td class="val" style="font-family:'DejaVu Sans Mono',monospace;">{{ $appointment->receipt_reference }}</td>
      </tr>
    </table>

    {{-- Informations personnelles --}}
    <div class="section-header">Informations personnelles <span style="font-weight:normal;color:#9ca3af;">(en lettres capitales)</span></div>
    <table class="form-table">
      <tr>
        <td class="lbl">b) Prénoms*</td>
        <td class="val">{{ strtoupper($appointment->applicant->first_name ?? '') }}</td>
      </tr>
      <tr>
        <td class="lbl">c) Nom*</td>
        <td class="val">{{ strtoupper($appointment->applicant->last_name ?? '') }}</td>
      </tr>
      <tr>
        <td class="lbl">d) Date de naissance*</td>
        <td class="val">
          {{ $appointment->applicant->birth_date
            ? $appointment->applicant->birth_date->locale('fr')->isoFormat('D MMMM YYYY')
            : '' }}
        </td>
      </tr>
      <tr>
        <td class="lbl">e) Lieu de naissance*</td>
        <td class="val">{{ strtoupper($appointment->applicant->birth_place ?? '') }}</td>
      </tr>
      <tr>
        <td class="lbl">f) Nationalité / k) Sexe*</td>
        <td class="val">
          @php $isMale = ($appointment->applicant->gender ?? '') === 'M'; @endphp
          {{ $appointment->applicant->nationality ?? '' }}
          &nbsp;&nbsp;
          <span style="font-size:9px;color:#374151;">Sexe :</span>
          <span class="cb-lbl" style="margin-left:6px;"><span class="cb {{ $isMale ? 'cb-on' : '' }}">{{ $isMale ? '✓' : '' }}</span>Masculin</span>
          <span class="cb-lbl"><span class="cb {{ !$isMale ? 'cb-on' : '' }}">{{ !$isMale ? '✓' : '' }}</span>Féminin</span>
        </td>
      </tr>
      <tr>
        <td class="lbl">h) Profession*</td>
        <td class="val">{{ $appointment->applicant->profession ?? '' }}</td>
      </tr>
      <tr>
        <td class="lbl">i) Domicile*</td>
        <td class="val">{{ $appointment->applicant->address ?? '' }}</td>
      </tr>
      <tr>
        <td class="lbl">j) Situation Matrimoniale*</td>
        <td class="val">
          @php $ms = $appointment->applicant->marital_status ?? ''; @endphp
          <span class="cb-lbl"><span class="cb {{ $ms==='single'   ? 'cb-on':'' }}">{{ $ms==='single'   ? '✓':'' }}</span>Célibataire</span>
          <span class="cb-lbl"><span class="cb {{ $ms==='married'  ? 'cb-on':'' }}">{{ $ms==='married'  ? '✓':'' }}</span>Marié(e)</span>
          <span class="cb-lbl"><span class="cb {{ $ms==='widowed'  ? 'cb-on':'' }}">{{ $ms==='widowed'  ? '✓':'' }}</span>Veuf(ve)</span>
          <span class="cb-lbl"><span class="cb {{ $ms==='divorced' ? 'cb-on':'' }}">{{ $ms==='divorced' ? '✓':'' }}</span>Divorcé(e)</span>
        </td>
      </tr>
      <tr>
        <td class="lbl">Téléphone</td>
        <td class="val">{{ $appointment->applicant->phone ?? '' }}</td>
      </tr>
      @if($appointment->applicant->email)
      <tr>
        <td class="lbl">Email</td>
        <td class="val">{{ $appointment->applicant->email }}</td>
      </tr>
      @endif
    </table>

    {{-- Signalement --}}
    <div class="section-header">Signalement</div>
    <table class="form-table">
      <tr>
        <td class="lbl">a) Taille (cm)</td>
        <td class="val">{{ $appointment->applicant->height_cm ?? '' }}</td>
      </tr>
      <tr>
        <td class="lbl">b) Signes particuliers</td>
        <td class="val">{{ $appointment->applicant->distinctive_signs ?? '' }}</td>
      </tr>
      <tr>
        <td class="lbl">e) Couleur des yeux</td>
        <td class="val">{{ $appointment->applicant->eye_color ?? '' }}</td>
      </tr>
    </table>

    {{-- Ascendants --}}
    <div class="section-header">Informations ascendants</div>
    <table class="form-table">
      <tr>
        <td class="lbl">PÈRE — Prénoms</td>
        <td class="val">{{ $appointment->applicant->father_first_name ?? '' }}</td>
      </tr>
      <tr>
        <td class="lbl">PÈRE — Nom</td>
        <td class="val">{{ $appointment->applicant->father_last_name ?? '' }}</td>
      </tr>
      <tr>
        <td class="lbl">MÈRE — Prénoms</td>
        <td class="val">{{ $appointment->applicant->mother_first_name ?? '' }}</td>
      </tr>
      <tr>
        <td class="lbl">MÈRE — Nom</td>
        <td class="val">{{ $appointment->applicant->mother_last_name ?? '' }}</td>
      </tr>
    </table>

    {{-- Rendez-vous --}}
    <div class="section-header-blue">Rendez-vous</div>
    <table class="form-table">
      <tr>
        <td class="lbl">Centre</td>
        <td class="val">{{ $appointment->center->name ?? '' }}</td>
      </tr>
      <tr>
        <td class="lbl">Date du RDV</td>
        <td class="val">
          {{ $appointment->appointment_date
            ? \Carbon\Carbon::parse($appointment->appointment_date)->locale('fr')->isoFormat('dddd D MMMM YYYY')
            : '' }}
        </td>
      </tr>
      @if($appointment->quota?->time_slot)
      <tr>
        <td class="lbl">Créneau horaire</td>
        <td class="val">{{ $appointment->quota->time_slot }}</td>
      </tr>
      @endif
    </table>

    <div class="note">* Champs obligatoires — Document officiel eSonoya</div>
  </div>

  {{-- Footer --}}
  <div class="footer">
    <div class="footer-text">
      Fiche générée par <strong>eSonoya</strong> · Direction Centrale de la Police aux Frontières (DCPAF) · République de Guinée<br>
      Généré le {{ now()->locale('fr')->isoFormat('D MMMM YYYY [à] HH:mm') }} · Réf. {{ $appointment->reference_number }}
    </div>
  </div>

</div>
</body>
</html>
