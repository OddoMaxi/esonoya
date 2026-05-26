<?php

namespace App\Http\Requests\Appointments;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'center_id'          => ['required', 'uuid', 'exists:centers,id'],
            'quota_id'           => ['required', 'uuid', 'exists:quotas,id'],
            'request_type'       => ['required', 'in:new,renewal,duplicata'],
            'receipt_reference'  => ['required', 'string', 'max:100', 'regex:/^[A-Z0-9\-\/]+$/i'],

            // Demandeur
            'applicant.last_name'    => ['required', 'string', 'min:2', 'max:100', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'applicant.first_name'   => ['required', 'string', 'min:2', 'max:100', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'applicant.birth_date'   => ['required', 'date', 'before:today', 'after:1900-01-01'],
            'applicant.birth_place'  => ['required', 'string', 'min:2', 'max:150'],
            'applicant.nationality'  => ['required', 'string', 'max:100'],
            'applicant.gender'       => ['required', 'in:M,F'],
            'applicant.phone'        => ['required', 'string', 'regex:/^(\+?224)?[6-7]\d{8}$/'],
            'applicant.email'        => ['nullable', 'email:rfc', 'max:150'],
            'applicant.address'      => ['nullable', 'string', 'max:500'],
            'applicant.marital_status' => ['nullable', 'in:single,married,divorced,widowed'],
            'applicant.profession'   => ['nullable', 'string', 'max:100'],
            'applicant.height_cm'    => ['nullable', 'integer', 'between:50,250'],
            'applicant.eye_color'    => ['nullable', 'string', 'max:30'],
            'applicant.distinctive_signs' => ['nullable', 'string', 'max:500'],

            // Parents (optionnels)
            'applicant.father_last_name'  => ['nullable', 'string', 'max:100', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'applicant.father_first_name' => ['nullable', 'string', 'max:100', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'applicant.mother_last_name'  => ['nullable', 'string', 'max:100', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'applicant.mother_first_name' => ['nullable', 'string', 'max:100', 'regex:/^[\p{L}\s\-\'\.]+$/u'],

            // Déclarant (optionnel, si différent du demandeur)
            'declarant.last_name'    => ['nullable', 'required_with:declarant.phone', 'string', 'max:100'],
            'declarant.first_name'   => ['nullable', 'required_with:declarant.phone', 'string', 'max:100'],
            'declarant.phone'        => ['nullable', 'string', 'regex:/^(\+?224)?[6-7]\d{8}$/'],
            'declarant.email'        => ['nullable', 'email:rfc', 'max:150'],
            'declarant.relationship' => ['nullable', 'in:parent,sibling,spouse,other'],
        ];
    }

    public function messages(): array
    {
        return [
            'receipt_reference.regex'        => 'La référence de paiement contient des caractères invalides.',
            'applicant.last_name.regex'      => 'Le nom ne peut contenir que des lettres.',
            'applicant.first_name.regex'     => 'Le prénom ne peut contenir que des lettres.',
            'applicant.birth_date.before'    => 'La date de naissance doit être dans le passé.',
            'applicant.birth_date.after'     => 'La date de naissance ne peut pas être avant 1900.',
            'applicant.phone.regex'          => 'Numéro de téléphone guinéen invalide.',
            'applicant.height_cm.between'    => 'La taille doit être entre 50 et 250 cm.',
        ];
    }
}
