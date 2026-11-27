# SASHA AI

**Sasha AI** is a Jamaican-personality AI assistant created by **ORBITAL X FUTURE**, an independent technology venture.

Live application: https://sasha-ai-ttk7.onrender.com/

## Current prototype capabilities

- Text chat powered by the Gemini API through a server-side endpoint.
- Streaming text responses.
- Optional generated speech through Fish Audio; the current `s2.1-pro-free` model has a published free-access end date of 30 November 2026, so recheck availability and terms before 1 December 2026.
- Browser microphone input where supported.
- Mobile-friendly web app with installable PWA support.
- Lightweight service health endpoint at `/healthz`.
- Optional single-business configuration through the server-side `BUSINESS_PROFILE_JSON` environment variable.
- Public-safe business branding endpoint at `/api/config`.
- In-app prototype privacy notice explains the Gemini, browser speech-recognition and Fish Audio data flows; chat history is not persisted by this app.
- Per-IP chat and speech throttling, request-size limits, and clearer upstream error handling.

## Important current limitations

Sasha AI is currently a public general-purpose assistant prototype, not yet a complete multi-business customer-service platform.

- The current business profile is a server-side configuration for one business per deployment; there is no multi-tenant account system or self-service admin dashboard.
- It does not provide appointment booking, payments, CRM integration, human handoff, persistent lead capture, or subscription billing.
- The first request limiter is in-memory and per IP. It is a basic safeguard for the current single-instance prototype, not production-grade distributed abuse protection.
- AI responses can still be delayed or unavailable when upstream model services reach quota limits or experience outages.
- Speech generation depends on the availability and limits of Fish Audio.
- A business profile must be reviewed and approved by the business owner before customer use.

Do not rely on Sasha AI as the sole source for business-critical, financial, legal, medical, or emergency decisions. Business-specific facts such as prices, availability, policies, and opening hours must be supplied and verified before being presented to customers.

## Deployment

The application is hosted on Render. The web service currently uses:

- Build: `npm install --include=dev && npm install express@^5.1.0 && npx vite build`
- Start: `npm start`

The Render service currently has automatic deployment disabled; a GitHub commit does not automatically mean the live service has been updated.

## Configuring one pilot business

Add a server-side Render environment variable named `BUSINESS_PROFILE_JSON`. Its value must be valid JSON and should contain only business-approved information. Example:

```json
{
  "name": "Example Roofing",
  "description": "Residential roof repair and replacement services.",
  "services": ["Roof repairs", "Roof replacement"],
  "serviceArea": "Approved service area",
  "openingHours": "Monday to Friday, 8:00 AM to 5:00 PM",
  "publicPhone": "+1-000-000-0000",
  "publicEmail": "hello@example.com",
  "website": "https://example.com",
  "policies": {
    "warranty": "Use the exact warranty wording approved by the business.",
    "refunds": "Refund requests are reviewed by an authorized manager."
  },
  "faqs": [
    {
      "question": "Do you offer roof inspections?",
      "answer": "Contact the office to confirm the current inspection service and availability."
    }
  ]
}
```

Replace every example value with facts the business owner has verified. Do not use placeholder contact details in a live profile. The profile is included in the model's server-side instructions and is not returned in full to the browser. The public `/api/config` endpoint returns only the business name, description, and explicitly public contact fields.

For this first phase, configure one business per Render deployment. Do not treat this as multi-tenant isolation. The current in-memory rate limits are 12 chat requests and 18 speech requests per IP per minute; use a shared rate-limit store before scaling beyond one server instance.

## Business pilot readiness

See [BUSINESS-READINESS.md](./BUSINESS-READINESS.md) for the audit checklist, pilot scope, known risks, and acceptance tests.

## Ownership

Sasha AI is a product of **ORBITAL X FUTURE**, an independent technology venture founded by Sasha-Lee Nugent.
