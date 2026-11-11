# Clinical AI gateway

Dependency-free Node server that proxies the Doctor Portal's AI requests to an
OpenAI-compatible provider. Its only job is to keep the provider API key out of
the browser bundle.

```bash
# 1. Configure (server-side only — never a VITE_* variable)
export AI_API_KEY=sk-...
export AI_BASE_URL=https://api.openai.com/v1     # optional
export AI_CHAT_MODEL=gpt-4.1                     # vision-capable
export AI_TRANSCRIBE_MODEL=gpt-transcribe        # multilingual speech-to-text
export AI_PORT=8787                              # optional

# 2. Run it next to the frontend
npm run dev:ai    # terminal 1
npm run dev       # terminal 2
```

Vite proxies `/api` to `http://127.0.0.1:8787`, so the browser only ever talks
to its own origin.

## Endpoints

| Method | Path                 | Purpose                                            |
| ------ | -------------------- | -------------------------------------------------- |
| GET    | `/api/ai/status`     | Whether a key is configured, models, languages     |
| POST   | `/api/ai/clinical`   | Patient-context clinical reasoning (JSON in/out)   |
| POST   | `/api/ai/transcribe` | Voice message → text (raw audio body, webm/m4a…)   |

### `/api/ai/clinical`

```jsonc
{
  "task": "PATIENT_HISTORY_SUMMARY | CLINICAL_ANALYSIS | IMAGE_ASSISTANCE | DOCUMENT_SUMMARY | CLINICAL_NOTE_ASSISTANCE | RESULT_COMPARISON | GENERAL_QUESTION",
  "message": "Summarize this patient's history",
  "language": "en",                 // or "am"
  "patient": { "id": "pat-001", "fullName": "…", "dateOfBirth": "1989-04-12" },
  "records": [{ "id": "rec-001", "recordedAt": "…", "diagnosis": "…", "prescription": [] }],
  "appointments": [{ "date": "2026-11-20", "status": "BOOKED" }],
  "attachments": [{ "kind": "image", "name": "lesion.png", "mimeType": "image/png", "dataUrl": "data:image/png;base64,…" }]
}
```

Returns `message`, `generatedSummary`, `observations`, `clinicalConsiderations`,
`redFlags`, `recommendedNextSteps`, `urgency`, `followUpQuestions`,
`limitations`, `sourceRecordIds`, `requiresDoctorReview`, `isDemo: false`.

### `/api/ai/transcribe`

Send the recorded audio as the raw request body with its real `Content-Type`,
and an optional `X-Audio-Language: en|am` header. Returns `{ text, language, model }`.

## Safety behaviour

- The system prompt forbids confirmed diagnoses, prescriptions and dosage
  orders, and requires documented facts to be separated from unconfirmed
  considerations.
- Anything the model returns is normalised so `requiresDoctorReview` is always
  true and limitations always include the review requirement.
- Documents (PDF/text) are **not** parsed: the model is told explicitly that it
  has not read them, and a limitation is added to the response.
- Images are passed as vision inputs, but the prompt forbids treating the output
  as a radiology report or a diagnosis.
- Request bodies are never logged; only method, path, status and latency.

## Before production

This gateway deliberately trusts the caller's record payload so the demo works
without the hospital backend. In production the backend must resolve
`patientId` itself, enforce the doctor's access rights, and ignore any records
sent by the browser. Do not deploy this proxy as the authorisation boundary.
