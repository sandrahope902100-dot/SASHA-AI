# Sasha AI — Business Readiness Audit

**Owner:** ORBITAL X FUTURE  
**Product:** Sasha AI  
**Audit date:** 27 November 2026  
**Status:** Live supervised-demo prototype — NOT approved for paid or unsupervised business use

## 1. Product description

Sasha AI is a Jamaican-personality AI assistant. The current prototype supports text chat with streamed responses, optional Fish Audio speech, browser microphone input where supported, and installable PWA behavior.

Live URL: https://sasha-ai-ttk7.onrender.com/

## 2. Verified deployment facts

- Render service: `SASHA-AI`
- Latest confirmed live deployment: `dep-dc4th58u01pc73fbdvn0`
- Live commit: `6c6412bfb2f2c060c5874cbaf25000fea8a8e892`
- Latest deployed server update strengthens action-truth safeguards for customer-service conversations.
- Render service is configured for manual deployment; GitHub commits do not automatically deploy.
- Server code includes a `GET /healthz` endpoint. Render's service metadata currently shows no health-check path configured; live HTTP verification is still pending.
- Primary model default in code: `gemini-3.1-flash-lite`.
- Backup model default in code: `gemini-3.5-flash-lite`.
- Fish Audio speech is configured through server-side environment variables.
- Render service is on the Free plan, one instance, Oregon region.

## 3. Current safeguards

- Chat requests are limited to 12 per IP per minute; speech requests are limited to 18 per IP per minute.
- Request bodies, message counts, message lengths, and total conversation size have bounds.
- Server-side API keys are read from environment variables and are not returned by public configuration endpoints.
- Customer-service instructions prohibit invented employees, internal teams, case numbers, records, reviews, bookings, callbacks, notifications, photo reviews, or completed actions.
- Sasha is instructed to distinguish what a customer reports from what the configured business profile or a connected tool actually confirms.
- Business-specific answers are restricted to an owner-provided business profile when one is configured; missing facts should not be guessed.
- Home-repair guidance prioritizes personal safety and avoids unsafe roof, ladder, electrical, and structural repair instructions.

## 4. Remaining risks and limitations

1. **No multi-business platform:** one optional business profile can be configured per deployment. There is no multi-tenant isolation, business admin console, or database-backed knowledge base.
2. **No commercial customer controls:** no business login, usage dashboard, subscription/billing, CRM, or customer handoff workflow is implemented.
3. **No operational actions:** Sasha cannot book appointments, process orders, collect payments, issue refunds, create CRM records, or notify a human team.
4. **AI provider availability:** Gemini quota, model availability, latency, and upstream errors can interrupt responses. A backup model does not guarantee uninterrupted service.
5. **Voice provider dependency:** Fish Audio latency, availability, and account limits need independent testing.
6. **Rate-limit scope:** counters are in memory and suitable only for the current single-instance prototype. They are not distributed protection and need replacement before multi-instance or higher-volume use.
7. **Dependency reproducibility:** dependencies in `package.json` include `latest` versions and the repository does not currently have a lockfile. Pin versions and commit a lockfile before a dependable production release.
8. **Observability:** request timing and safe operational telemetry need improvement. Logs must never include credentials or private customer conversations.
9. **Health monitoring:** configure Render's health-check path to `/healthz` only after confirming that endpoint returns HTTP 200 on the live service.

## 5. What may be demonstrated today

A supervised demonstration of the general assistant may be shown, with clear disclosure that it is a prototype and that AI responses or voice may be delayed or unavailable.

Do not currently sell or promise:
- 24/7 guaranteed availability or response times;
- appointment booking, order processing, payment collection, or CRM updates;
- verified answers about a business's products, prices, inventory, hours, or policies unless those facts have been approved and configured;
- multiple isolated business accounts;
- guaranteed lead capture or conversion.

## 6. Pilot acceptance tests

A first business pilot should remain supervised and narrowly scoped until these tests pass:

| Test | Acceptance criterion | Status |
|---|---|---|
| Homepage | Loads on Android Chrome and desktop browser | Pending fresh verification |
| Health endpoint | `/healthz` returns HTTP 200 and valid JSON | Endpoint exists; live HTTP test pending |
| Text quality | Ten varied prompts produce relevant, complete answers | Pending |
| Context retention | Follow-ups correctly use prior turns | Earlier spot test positive; repeat after latest deployment |
| Action truthfulness | No invented receipt, review, booking, handoff, or follow-up | Safeguard deployed; repeat live test pending |
| Error handling | Quota/network errors show a clear, safe message | Code review only; live test pending |
| Voice | Speech starts, completes, and can be interrupted | Pending |
| Microphone | Permission and transcript behavior work in supported browser | Pending |
| Abuse protection | Configured limits return HTTP 429; load behavior reviewed | Code deployed; threshold/load test pending |
| Business knowledge | Approved profile facts are used; unknown facts are not invented | Profile and live content test pending |
| Privacy | No credentials or sensitive conversation content appear in logs | Review pending |
| Mobile usability | Keyboard, scrolling, buttons, and PWA install work on Android | Pending |

## 7. First pilot recommendation

Start with one business and one bounded use case: answering a small set of common questions from owner-approved information. Confirm the business name, services, service area, opening hours, public contact details, and FAQs before configuration. Verify every answer against that approved source. Do not connect booking, payments, customer records, or other sensitive workflows in the first pilot.

## 8. Launch decision

**Current decision: NOT READY for paid or unsupervised business deployment.**

The application is live and can support a supervised demonstration. The customer-service action-truth safeguards have been deployed, but the acceptance tests above remain open. Do not describe Sasha AI as commercially ready until the critical risks are addressed and the applicable tests pass.

This document records the current engineering assessment; it does not claim that pending tests have passed.
