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
- Latest confirmed live deployment: `dep-dc4ut197lnhs739vr1cg` (27 November 2026, 20:57:03 UTC)
- Latest deployment branch-head commit: `49a1ed210d73fe2b0cf153dd1c144988b00f7c7d`; application runtime source commit: `26464cfce26ef2644c151b2b00f9082b0764d36a`.
- The latest deployment refreshes the PWA shell cache version so installed clients can request the updated application shell.
- The preceding application code deployment includes customer-service action-truth safeguards: `6c6412bfb2f2c060c5874cbaf25000fea8a8e892`.
- Render service is configured for manual deployment; GitHub commits do not automatically deploy.
- Server code includes a `GET /healthz` endpoint. Render's service metadata still shows no health-check path configured; live HTTP verification is still pending.
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
5. **Voice provider dependency:** the current code calls Fish Audio `s2.1-pro-free`. Fish Audio currently states that free access runs through 30 November 2026, with no SLA or latency guarantee, possible model-improvement data use, and possible restrictions for some commercial scenarios. Reconfirm terms or choose a supported paid/alternative provider before relying on voice after that date.
6. **Rate-limit scope:** counters are in memory and suitable only for the current single-instance prototype. They are not distributed protection and need replacement before multi-instance or higher-volume use.
7. **Dependency reproducibility:** dependencies in `package.json` include `latest` versions and the repository does not currently have a lockfile. Pin versions and commit a lockfile before a dependable production release.
8. **Observability:** request timing and safe operational telemetry need improvement. Logs must never include credentials or private customer conversations.
9. **Health monitoring:** configure Render's health-check path to `/healthz` only after confirming that endpoint returns HTTP 200 on the live service.
10. **Fresh acceptance testing:** the PWA cache refresh is deployed, but this does not prove every installed Android client refreshed successfully. Repeat mobile, voice, microphone, context and truthfulness tests.
11. **No global usage budget:** per-IP in-memory limits do not cap total daily/monthly Gemini or Fish Audio usage. A distributed attacker or many IPs could exhaust provider quotas or paid credits.
12. **PWA icon completeness:** the manifest currently references only one JPEG icon with `sizes: any`; standard 192×192 and 512×512 install icons are not present. Android installation behavior has not been verified.
13. **Provider data terms:** if the Gemini project is on Google's free tier, Google's pricing documentation says free-tier content may be used to improve products. The account tier is not independently confirmed; do not send confidential or sensitive customer data.
14. **Free hosting availability:** Render Free web services spin down after 15 minutes without inbound traffic and can take about a minute to wake. This is unsuitable for guaranteed customer availability.

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

The application is live and can support a supervised demonstration. The customer-service action-truth safeguards and PWA cache refresh have been deployed, but the acceptance tests above remain open. Do not describe Sasha AI as commercially ready until the critical risks are addressed and the applicable tests pass.

This document records the current engineering assessment; it does not claim that pending tests have passed.


## 9. Recheck — 27 November 2026
The parent venture's public website and directory policy were updated separately. These website changes do not change Sasha AI's technical readiness and do not constitute an application deployment.

Current Render configuration was rechecked:
- Web service remains on the Free plan with one instance in Oregon.
- Auto-deploy remains disabled; manual deployment is required after application commits.
- Render service metadata still reports an empty health-check path. The Render connector available for this audit does not expose a service-settings update operation, so this was not changed.
- The public `/healthz` endpoint has not been independently confirmed to return HTTP 200 in this audit. Do not mark health monitoring complete.
- Latest confirmed live app deployment is `dep-dc4ut197lnhs739vr1cg` from branch-head commit `49a1ed210d73fe2b0cf153dd1c144988b00f7c7d`; runtime source commit is `26464cfce26ef2644c151b2b00f9082b0764d36a`. The latest startup log sample shows the service live on port 10000, but this is not a direct HTTP health-check result.

The previous acceptance-test table remains open. No test is promoted to PASS without a fresh, recorded test result. The launch decision remains **supervised demonstration only; not approved for paid or unsupervised business deployment**.

## 10. Required closure work
1. Verify `/healthz` returns HTTP 200 and configure Render's health-check path to `/healthz` in the service dashboard.
2. Pin runtime dependencies and commit a reproducible lockfile; review security advisories.
3. Repeat Android Chrome, PWA install/update, microphone permission, text, voice, context, timeout, provider-failure and action-truthfulness tests.
4. Test abuse limits and confirm safe logging without credentials or private conversation content.
5. Establish a business-approved knowledge source and test unknown-answer handling.
6. Before any customer pilot, define consent, data retention, deletion, access, escalation, support and incident procedures with the business.
7. Keep the first pilot limited to a supervised FAQ demonstration; do not promise booking, payment, CRM, lead capture or automated human handoff.


## 11. Full source/configuration re-audit — 27 November 2026

The following items were checked against the current GitHub source and Render service configuration. This is a code/configuration review, not a substitute for live acceptance testing.

### Additional verified findings
- The deployed service is a Render Free web service in Oregon, one instance, with manual deployment enabled.
- Render's configured HTTP health-check path is still blank. The code contains `GET /healthz`, but no successful live HTTP response was independently recorded during this audit.
- Latest service startup logs report the configured model defaults `gemini-3.1-flash-lite` and `gemini-3.5-flash-lite`, and report **Business profile: not configured**. This is therefore the general Sasha AI assistant, not a configured business assistant.
- The latest audited source, including the browser speech-recognition privacy disclosure, was deployed successfully as Render deploy `dep-dc4ut197lnhs739vr1cg` from commit `49a1ed210d73fe2b0cf153dd1c144988b00f7c7d` at 20:57:03 UTC on 27 November 2026. Render logs show `Sasha AI running on port 10000`, both configured model names, `Business profile: not configured`, and `Your service is live`. The application source change is in commit `26464cfce26ef2644c151b2b00f9082b0764d36a`; the deployment also includes subsequent documentation updates.
- The latest source now adds `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a restrictive `Permissions-Policy` response header. A `.gitignore` file was added to the repository to exclude `.env` files, dependency directories and build output; no hard-coded API key patterns were found in the reviewed source files and no `.env` file is present in the repository.
- Chat and speech timeout failures now have explicit timeout messages instead of presenting a cancellation as the cause.
- The app now discloses that messages go to Google Gemini, microphone transcription uses the browser/device speech-recognition provider, and reply text is sent to Fish Audio when voice is enabled. It also states that the app does not persist chat history and warns users not to enter sensitive or confidential information.
- The frontend stores chat messages only in in-memory React state; a page refresh clears the visible conversation. The app has no user accounts or database-backed chat history.
- The service worker caches the app shell and same-origin static assets; it deliberately does not cache `/api/` requests. The app is not an offline AI chatbot.
- The manifest currently references one JPEG avatar with `sizes: any`; dedicated 192px and 512px PNG icons are absent. PWA installation/update behavior still requires an Android Chrome test.
- The client uses browser speech recognition with language tag `en-JM`. Support and transcription accuracy on the target Android device remain untested.

### Provider and hosting dependencies that affect readiness
- Google lists `gemini-3.1-flash-lite` in its Gemini Developer API pricing documentation. The model name in the code is therefore not an obsolete model identifier. The actual API key's quota, project access, and account tier were not inspected.
- Google's Gemini API pricing page distinguishes free and paid tiers: the page says free-tier content may be used to improve Google products, while paid-tier content is not. The user's actual API tier is unverified. Do not send customer-confidential data through a free-tier key.
- The code requests Fish Audio model `s2.1-pro-free`. Fish Audio's published free-access notice says that free access is available through **30 November 2026**, with no SLA and possible model-improvement use of requests. Commercial use may have restrictions. Recheck the provider terms before 1 December 2026; do not promise continued free voice service.
- Render documents that Free web services spin down after 15 minutes without inbound traffic and can take about one minute to wake. This can explain a slow first request after inactivity. It is a platform limitation, not necessarily a Gemini response-time defect.

### Remaining engineering and commercial blockers
1. Configure Render's health-check path to `/healthz` and independently verify its HTTP response. The endpoint reports process status and configuration flags; it does not prove Gemini or Fish Audio is reachable.
2. Commit a lockfile and pin all runtime/build dependencies. Current `package.json` uses `latest` for Vite, React, React DOM and the Vite React plugin; the Render build command performs repeated `npm install` operations rather than a reproducible install.
3. Review the Free-tier data handling of Gemini and Fish Audio. For customer use, select provider plans and settings that meet the business's privacy and contractual requirements.
4. Re-test Android Chrome, PWA install/update, keyboard/scrolling, microphone permission and `en-JM` recognition, streamed text, voice playback, interruption, provider failures, timeout, rate limits and action-truthfulness.
5. Confirm the Fish Audio free model's availability after 30 November 2026 or implement and test a clearly disclosed fallback. A browser/device voice fallback would not reproduce the cloned voice.
6. Add a documented customer privacy notice, retention/deletion process, consent, support contact and incident response before collecting customer information. The in-app prototype notice is a minimum disclosure, not a complete legal privacy policy.
7. Keep the current product supervised and demo-only. There is no multi-tenant isolation, customer admin, approved knowledge-base workflow, persistent lead capture, booking, payments, CRM, or human handoff.
8. Do not call the product commercially ready until the above blockers and acceptance tests are closed.

### Current release decision
**Supervised demonstration only. Not approved for paid, confidential-data, or unsupervised customer use.** The latest code changes are not considered live until the manual Render deployment reports `live` and the startup logs are checked.


## 10. Provider and hosting notes — 27 November 2026
- Render health-check path is blank; `/healthz` exists in code but has not been independently verified over HTTP.
- Recent startup logs show the process listening on port 10000 and Render reporting the service live; the retrieved recent log sample contained no application error entries. This does not replace a direct HTTP health check.
- The startup log states that no business profile is configured. Sasha is therefore running as a general assistant, not as an owner-approved customer-service assistant for a particular business.
