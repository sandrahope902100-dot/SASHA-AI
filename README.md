# SASHA AI

**Sasha AI** is a Jamaican-personality AI assistant created by **ORBITAL X FUTURE**, an independent technology venture.

Live application: https://sasha-ai-ttk7.onrender.com/

## Current prototype capabilities

- Text chat powered by the Gemini API through a server-side endpoint.
- Streaming text responses.
- Optional generated speech through Fish Audio.
- Browser microphone input where supported.
- Mobile-friendly web app with installable PWA support.
- Lightweight service health endpoint at `/healthz`.

## Important current limitations

Sasha AI is currently a public general-purpose assistant prototype, not yet a complete multi-business customer-service platform.

- It does not currently provide isolated business accounts or a managed business knowledge base.
- It does not currently provide appointment booking, payments, CRM integration, or guaranteed lead capture.
- AI responses can be delayed or unavailable when upstream model services reach quota limits or experience outages.
- Speech generation depends on the availability and limits of Fish Audio.
- Public API endpoints need stronger abuse protection and operational monitoring before commercial customer traffic is invited.

Do not rely on Sasha AI as the sole source for business-critical, financial, legal, medical, or emergency decisions. Business-specific facts such as prices, availability, policies, and opening hours must be supplied and verified before being presented to customers.

## Deployment

The application is hosted on Render. The web service currently uses:

- Build: `npm install --include=dev && npm install express@^5.1.0 && npx vite build`
- Start: `npm start`

The Render service currently has automatic deployment disabled; a GitHub commit does not automatically mean the live service has been updated.

## Business pilot readiness

See [BUSINESS-READINESS.md](./BUSINESS-READINESS.md) for the audit checklist, pilot scope, known risks, and acceptance tests.

## Ownership

Sasha AI is a product of **ORBITAL X FUTURE**, an independent technology venture founded by Sasha-Lee Nugent.
