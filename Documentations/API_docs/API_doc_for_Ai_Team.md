# CareerGPS × AI Team — API Contract
 
**Version:** 1.1.0  
**Last Updated:** 2026-06-18  
**Status:** Draft — pending AI Team confirmation
 
---

# Table of Contents

* [CV Parsing Contranct](#cv-parsing-contranct)

---

# CV Parsing Contranct

## Overview
 
CareerGPS sends a CV file URL to the AI Team for parsing.  
The AI Team processes the file asynchronously and POSTs the structured result back to CareerGPS via a webhook.
 
```
CareerGPS Backend  →  POST /parse        →  AI Team
AI Team            →  downloads CV from URL
AI Team            →  parses CV
AI Team            →  POST /cv/webhook   →  CareerGPS Backend
```
 
---
 
## Authentication
 
All requests between both sides must include a shared secret in the header:
 
```
X-Api-Secret: <shared-secret-min-32-chars>
```
 
- CareerGPS includes this header when calling the AI Team endpoint
- AI Team includes this header when calling the CareerGPS webhook
- If the header is missing or wrong → return `401` immediately, no processing
> **Key exchange:** secrets are shared out-of-band (not in this document).  
> Rotate every 90 days or immediately after any suspected leak.
 
---
 
## Part 1 — CareerGPS → AI Team
 
### Trigger Parsing
 
```
POST https://ai-team-domain.com/parse
Content-Type: application/json
X-Api-Secret: <shared-secret>
```
 
#### Request Body
 
```json
{
  "cvId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "fileUrl": "https://res.cloudinary.com/careergps/raw/upload/careergps/cvs/cv_123.pdf",
  "mimeType": "application/pdf",
  "callbackUrl": "https://api.careergps.com/cv/webhook"
}
```
 
| Field | Type | Required | Description |
|---|---|---|---|
| `cvId` | `string (uuid)` | ✅ | CareerGPS internal CV record ID |
| `fileUrl` | `string (url)` | ✅ | Cloudinary URL — file is publicly accessible |
| `mimeType` | `string (enum)` | ✅ | `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `callbackUrl` | `string (url)` | ✅ | The webhook URL to POST the result to |
 
#### Expected Response (Acknowledgement Only)
 
```
HTTP 202 Accepted
```
 
```json
{
  "message": "Job received",
  "cvId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```
 
> **202, not 200** — means "received and queued", not "done".  
> CareerGPS does not wait for parsing here. Result comes via webhook.
 
#### Error Responses
 
| Status | Meaning |
|---|---|
| `401` | Invalid or missing `X-Api-Secret` |
| `400` | Missing required fields or invalid `mimeType` |
| `415` | Unsupported file type |
| `429` | Rate limited — CareerGPS should retry after `Retry-After` header value |
| `500` | AI Team internal error |
 
---
 
## Part 2 — AI Team → CareerGPS (Webhook)
 
### Send Parsed Result
 
```
POST <callbackUrl>
Content-Type: application/json
X-Api-Secret: <shared-secret>
```
 
#### Request Body — Success
 
```json
{
  "cvId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "completed",
  "parsedData": {
    "fullName": "Ahmed Mohamed",
    "email": "ahmed@email.com",
    "phone": "+20 100 000 0000",
    "location": "Cairo, Egypt",
    "summary": "Frontend developer with 3 years of experience...",
    "skills": {
      "technical": [
        { "name": "React", "level": "Advanced" },
        { "name": "TypeScript", "level": "Advanced" }
      ],
      "nonTechnical": [
        { "name": "Teamwork", "level": "Advanced" }
      ]
    },

    "experience": [
      {
        "company": "TechNova",
        "title": "Frontend Developer",
        "startDate": "2022-01",
        "endDate": "2023-08",
        "description": "Worked on user-facing React applications..."
      }
    ],

    "projects": [
      {
        "name": "CareerGPS",
        "description": "Platform to help job-seekers map skills to roles.",
        "technologies": ["React","Node.js"],
        "url": "https://example.com",
        "startDate": "2025-01",
        "endDate": "Present"
      }
    ],

    "education": [
      {
        "institution": "Cairo University",
        "degree": "Bachelor's Degree",
        "field": "Computer Science",
        "major": "Data Science",
        "startDate": "2020",
        "endDate": "2024"
      }
    ],

    "certifications": [
      {
        "name": "AWS Certified Cloud Practitioner",
        "issuer": "Amazon",
        "date": "2024-07"
      }
    ],

    "languages": ["Arabic","English"],

    "links": {
      "github": "https://github.com/example",
      "linkedin": "https://linkedin.com/in/example",
      "portfolio": "https://example.dev"
    }
  }
}
```
 
#### Request Body — Failure
 
```json
{
  "cvId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "failed",
  "errorMessage": "Could not extract text from file — file appears to be scanned image without OCR"
}
```
 
#### Field Reference — `parsedData`
 
| Field | Type | Required | Notes |
|---|---|---|---|
| `fullName` | `string \| null` | ✅ | |
| `email` | `string \| null` | ✅ | |
| `phone` | `string \| null` | ✅ | |
| `location` | `string \| null` | ✅ | City, Country preferred |
| `summary` | `string \| null` | ✅ | Professional summary if present |
| `skills` | `{ technical:[] , nonTechnical:[] }` | ✅ | Must not be omitted — send `[]` if none found |
| `experience` | `Experience[]` | ✅ | Sort by most recent first |
| `education` | `Education[]` | ✅ | Sort by most recent first |
| `languages` | `string[]` | ✅ | Send `[]` if none found |
|`projects`|projects[]|✅|send `[]`if not found|
|`certifications`|certifications[]|✅|send `[]`if not found|
|`links`|`{github:"url" , linkedIn:"url" , portfolio:"url"}`|✅|if any key not found send null NOT Omit any key|
 
#### Field Reference — `Skill`
 
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | ✅ | e.g. `"React"`, `"Figma"`, `"Communication"` |
#### Field Reference — `Experience`
 
| Field | Type | Required | Notes |
|---|---|---|---|
| `company` | `string` | ✅ | |
| `title` | `string` | ✅ | Job title |
| `startDate` | `string \| null` | ✅ | Format: `YYYY-MM` or `YYYY` |
| `endDate` | `string \| null` | ✅ | `null` = current job |
| `description` | `string \| null` | ❌ | |
 
#### Field Reference — `Education`
 
| Field | Type | Required | Notes |
|---|---|---|---|
| `institution` | `string` | ✅ | |
| `degree` | `string \| null` | ❌ | e.g. `"Bachelor"`, `"Master"` |
| `field` | `string \| null` | ❌ | e.g. `"Computer Science"` |
| `startDate` | `string \| null` | ❌ | Format: `YYYY` |
| `endDate` | `string \| null` | ❌ | Format: `YYYY` |
 
---
 
 
Key rules derived from this schema:
- `skills`, `experience`, `projects`, `education`, `certifications`, `languages` → send `[]` not `null` and never omit them
- `level` in Skill send `null` if unknown, never send empty string `""`
- All scalar fields (`fullName`, `email`, etc.) are nullable — send `null` if not found, never omit required top-level fields
- `parsedData` is only expected when `status = "completed"`
- `error` is only expected when `status = "failed"`
---
 
#### Expected Response from CareerGPS Webhook
 
```
HTTP 200 OK
```
 
```json
{ "received": true }
```
 
> **Retry trigger:** any response other than `200` means CareerGPS did not process your payload — retry according to the retry policy below.
 
> **Idempotency:** a `200` always means we received and processed it successfully. If you already received a `200` for a `cvId`, do not send it again — we will silently ignore duplicate webhooks for records already in `parsed` or `failed` state.
 
---
 
## Idempotency Rules
 
### AI Team side
- If CareerGPS sends the same `cvId` twice to your `/parse` endpoint → process it once, send the webhook result once
- Recommended: store processed `cvId` values and skip duplicates
### CareerGPS side
- If we receive a webhook for a `cvId` that is already `parsed` or `failed` → we silently return `200` and ignore it
- This means retries are safe — you will not cause double-writes or data corruption
- We log all duplicate webhook calls for debugging
---
 
## Retry Policy
 
### AI Team retrying the webhook (if CareerGPS returns non-200)
 
retry each 50 sec for 5 times
| Give up | After 5 retries — log as failed on your side |
 
### CareerGPS safety net (if webhook never arrives)
 
CareerGPS runs a cron job every 1 minutes:
- Any CV stuck in `status = "parsing"` for more than 5 minutes → marked as `"failed"`
- CareerGPS may re-trigger parsing after that — AI Team must handle duplicate `cvId` requests gracefully
---
 
## Constraints & Rules
 
| Rule | Detail |
|---|---|
| Max file size | 5MB |
| Supported formats | PDF only |
| Max parsing time | 5 minutes — after that CareerGPS marks as failed |
| `cvId` is idempotent | If AI Team receives same `cvId` twice, process once and send result once |
| Array fields | Never omit — send `[]` instead of `null` or omitting |
| Dates | Always use `YYYY-MM` or `YYYY` format — no full ISO timestamps |
| Null vs omit | Use `null` for missing scalar values, never omit required fields |
| Empty string | Never send `""` for optional fields — use `null` instead |
 
---
 
## Environments
 
| Environment | CareerGPS Webhook | Notes |
|---|---|---|
| Development | `http://localhost:3000/cv/webhook` | Use ngrok to expose locally |
| Staging | `https://staging-api.careergps.com/cv/webhook` | |
| Production | `https://api.careergps.com/cv/webhook` | |
 
> AI Team endpoint URLs to be provided by AI Team.
 
---
 