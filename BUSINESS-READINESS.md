# Sasha AI — Business Readiness Audit

**Owner:** ORBITAL X FUTURE  
**Product:** Sasha AI  
**Audit date:** 27 November 2026  
**Status:** Pre-pilot prototype — NOT yet approved for paid business use

## 1. Product description

Sasha AI is a Jamaican-personality AI assistant. The current live prototype supports text chat, streaming responses, optional Fish Audio speech, browser microphone input where supported, and installable PWA behavior.

Live URL: https://sasha-ai-ttk7.onrender.com/

## 2. Verified deployment facts

- Render web service: `SASHA-AI`
- Current live deployment: commit `0c159780ff256b2d874b8e6f51053fac29c89b84`
- Latest observed deployment state: `live`
- Server startup log confirms: `Sasha AI running on port 10000`
- Health endpoint exists at `GET /healthz`.
- Primary model configured in code: `gemini-3.1-flash-lite`.
- Backup model configured in code: `gemini-3.5-flash-lite`.
- Fish Audio is configured through server-side environment variables.
- Render service is on the Free plan, one instance, Oregon region.
- Automatic deployment is disabled; commits do not automatically deploy.

## 3. Findings and risks

### Critical before public business traffic

1. **No visible application-level request throttling:** `/api/chat` and `/api/speech` do not currently have a per-client rate limit. Uncontrolled use could exhaust provider quota or incur charges.
2. **No business-specific knowledge layer:** the current app is a general assistant. It does not have isolated business profiles, a verified FAQ store, tenant separation, or an admin console.
3. **No commercial customer controls:** no business login, usage dashboard, subscription/billing, or customer support workflow is implemented.
4. **Upstream AI availability:** logs show prior Gemini quota (429), model availability (503), and aborted request errors. The configured backup model is not a guarantee of uninterrupted service.
5. **Voice depends on a separate provider:** Fish Audio availability, latency, and account limits must be tested independently.

### Important engineering improvements

- Add request limits and input validation to public API endpoints.
- Establish reproducible dependency versions and a lockfile.
- Configure Render's health check to use the existing `/healthz` endpoint after verifying the endpoint on the live service.
- Add structured request timing and safe error telemetry without logging credentials or private customer content.
- Test mobile PWA behavior, microphone permissions, speech playback, interruption, and reconnect behavior.
- Verify business facts are never guessed. If a business answer is not in the approved knowledge supplied for that pilot, Sasha should say she does not have the information and offer the business's approved contact path.

## 4. What may be demonstrated today

A controlled demonstration of the current general-purpose assistant may be shown, with clear disclosure that it is a prototype and that AI responses and voice may be delayed or unavailable.

Do not currently sell or promise:
- 24/7 guaranteed availability or response times;
- appointment booking, order processing, payment collection, or CRM updates;
- verified answers about a business's products, prices, inventory, opening hours, or policies;
- multiple isolated business accounts;
- guaranteed lead capture or conversion.

## 5. Pilot acceptance tests

The first business pilot should not be accepted until all applicable tests pass:

| Test | Acceptance criterion | Status |
|---|---|---|
| Homepage | Loads on Android Chrome and desktop browser | Not yet manually verified |
| Health endpoint | `/healthz` returns HTTP 200 and valid JSON | Code exists; live HTTP test pending |
| Text response | 10 varied prompts return relevant, complete answers | Pending |
| Context retention | Follow-up questions use previous turns correctly | Pending |
| Error handling | Quota/network errors show a clear, safe message | Code review only; live test pending |
| Voice | Speech starts, plays fully, and can be interrupted | Pending |
| Microphone | Permission and transcript behavior work in supported browser | Pending |
| Abuse protection | Rate limits prevent uncontrolled API usage | Not implemented |
| Business knowledge | Answers only from approved business facts; unknown facts are not invented | Not implemented |
| Privacy | No credentials or sensitive conversation content are exposed in logs | Requires review |
| Mobile usability | Keyboard, scrolling, buttons, and PWA install work on Android | Pending |

## 6. First pilot scope recommendation

Start with one business and one clearly bounded use case: answering a small, approved set of common questions. Before the business test, collect its approved business name, services, service area, opening hours, public contact details, and FAQs. Confirm every answer against that source. Do not connect booking, payment, customer records, or other sensitive workflows in the first pilot.

## 7. Launch decision

**Current decision: NOT READY for paid or unsupervised business deployment.**

The app is live and can support a supervised demonstration. It must not be described as commercially ready until the critical risks are addressed and the acceptance tests are completed. This document records an audit, not a claim that pending tests have passed.
