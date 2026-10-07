---
title: Development log — ha-alexa-smarthome-lambda
date: 2026-10-06
type: project-context
purpose: Full context for how this tutorial was produced, the failures encountered, root causes, and decisions. Intended for humans and LLM agents picking up the repo.
repo: ha-alexa-smarthome-lambda
status: recovered and verified by owner 2026-10-06 (restart, skill link, discovery: 104 devices). CloudWatch / token-revocation checks not recorded
---

# Development log: ha-alexa-smarthome-lambda

## 1. Origin

- Trigger: an existing self-hosted Alexa → Home Assistant integration (AWS Lambda + private Alexa Smart Home skill, no Nabu Casa) had been broken for an extended period.
- Initial question: whether Amazon or Home Assistant introduced a new 2026 connection method that replaced Lambda.
- The tutorial was written **after** recovering a real broken setup in one session. Every step in `docs/` corresponds to something that was actually executed or failed.

## 2. Environment (as recovered)

| Component | Value |
| --- | --- |
| Home Assistant | Self-hosted on a private LAN address, YAML `alexa: smart_home:` config |
| Public access | Cloudflare tunnel → HA |
| Lambda | Python, `us-east-1`, function name `HomeAssistant-SmartHome` |
| Alexa locale | en-US |
| Skill | Private Smart Home skill, development stage, "Provision your own" |
| Lambda code | Upstream HA reference implementation (Jason Hu, Apache-2.0), lightly modernized (type hints, try/except wrapper) |

## 3. Research findings (2026-10)

- No new official connection method. Lambda + Smart Home skill is still the DIY path; Nabu Casa is the paid alternative.
- Amazon renamed "smart home skills" to "smart home add-ons." This is cosmetic and existing integrations are unaffected.
- Amazon "Smart Home AI Toolkit" (July 2026, developer preview) is for device makers and is not a replacement.
- HA "Alexa Devices" integration (2025.6+, improved through 2026.7) is the **reverse** direction: HA controls Echos. Not relevant to Alexa → HA.
- A January 2026 HA community thread documented the same failure mode behind Cloudflare: Bot Fight Mode and AI Labyrinth returned a challenge page to Lambda.
- Bulk-delete of Alexa devices: no official method. A community workaround uses internal endpoints (`/nexus/v1/graphql`, `DELETE /api/phoenix/appliance/{id}`) from a logged-in browser tab (Shereef/Python-Delete-Alexa-Devices issue #9; openHAB forum; Alexa Device Manager Chrome extension).
- Not documented anywhere found: the missing-trigger failure mode as a diagnosis, and filtering orphan deletion by decoding the `SKILL_<base64>` applianceId.

## 4. Chronological sequence

| # | Action | Result |
| --- | --- | --- |
| 1 | Researched 2026 integration options | Confirmed Lambda path unchanged |
| 2 | Reviewed user's `lambda_function.py` | Functionally identical to upstream; ruled out as the cause |
| 3 | Set Lambda env vars `DEBUG=1`, `LONG_LIVED_ACCESS_TOKEN` | User initially asked whether to hardcode `_debug = 1`. Answer: no, use env vars |
| 4 | Ran Lambda console Discovery test (`test-events/discovery.json`) | **Success**: ~6,895 lines of discovery JSON. Lambda → Cloudflare → HA path is healthy. Cloudflare ruled out for `/api/alexa/smart_home` |
| 5 | Shifted focus to skill side and account linking | — |
| 6 | User asked whether re-linking removes old devices | No. Discovery adds/updates only. Disable may remove some, but unreliably |
| 7 | User created a **new** skill; saving the Lambda ARN as the default endpoint failed | Error: `Please make sure that "Alexa Smart Home" is selected for the event source type, for provided arn [Invalid value]` |
| 8 | Checked Lambda triggers | **Lambda had zero triggers.** Likely root cause of the original outage |
| 9 | Added Alexa Smart Home trigger with the new Skill ID | ARN save succeeded |
| 10 | Listed Alexa endpoints via console script | 377 total: 374 orphans across 3 old dev skills, 3 non-skill Echo built-ins |
| 11 | Ran filtered bulk delete (development-stage only) | 374 DELETE calls, all HTTP 200 |
| 12 | Re-listed endpoints after refresh | Only `(non-skill)` × 3 remained. Cleanup verified |
| 13 | Reviewed existing HA `configuration.yaml` | Had `endpoint:` but **no** `client_id`/`client_secret`. Proactive events were non-functional |
| 14 | Enabled Send Alexa Events in skill Permissions; added creds to `secrets.yaml` | — |
| 15 | HA Check Configuration | Error: `mapping values are not allowed here in "/config/secrets.yaml", line 11, column 17` |
| 16 | Quoted secret values, keys at column 1 | Config valid |
| 17 | Restart HA, re-run Discovery test, link skill, discover | **Pending at time of writing** |
| 18 | Produced repo: README, docs 01–07, Lambda, cleanup tool, examples, test event | Done |

## 5. Problems and root causes

### P1: Alexa control broken for an extended period
- **Root cause (most likely):** the Lambda had no Alexa Smart Home trigger, so it had no resource-based permission for Alexa to invoke it.
- **Why it was hidden:** Lambda console tests run under the user's IAM credentials and bypass the trigger permission, so tests passed while real invocations failed.
- **How the trigger was lost:** unknown. Candidates: function recreated, resource policy edited, or skill rebuilt with a new ID (three old skill IDs were found, so rebuilds definitely happened).
- **Fix:** add the Alexa Smart Home trigger with Skill ID verification.

### P2: Skill endpoint ARN rejected
- **Cause:** a new skill ID with no matching Lambda trigger. The console validates the trigger before saving.
- **Trap:** choosing the "Alexa Skills Kit" trigger type instead of "Alexa Smart Home" produces the same error.
- **Ordering rule:** add the trigger first, then save the endpoint.

### P3: 374 ghost devices
- **Cause:** three successive development skills (`skill A` = 109, `skill B` = 241, `skill C` = 24), each discovered without an effective filter, with duplicate entity IDs (`_2` suffixes) from HA entity re-creation.
- Discovery never deletes. Proactive events were not working (P4), so HA never sent DeleteReports.
- The Alexa app has no batch delete, Amazon support was not helpful, and the web UI is retired.
- **Fix:** browser-console script against internal API, filtered by decoded `stage: "development"`.

### P4: Proactive events silently disabled
- **Cause:** `endpoint:` present in config, `client_id` / `client_secret` absent.
- **Effect:** no state push, no add/delete reports, so orphans accumulated.
- **Fix:** skill → Build → Permissions → Send Alexa Events, then put the credentials in `secrets.yaml`.

### P5: Filter vs. discovered domains mismatch
- **Observation:** config filter was `light` + `switch` only, yet orphans included `binary_sensor`, `button`, `automation`, `media_player`, and `script`.
- **Explanation (inferred, not confirmed):** the filter was added after those skills had already discovered entities, and discovery never removes.
- **Unresolved:** the 6,895-line Discovery output came from the filtered config. Re-run after restart to confirm only `light#` / `switch#` endpointIds.

### P6: `secrets.yaml` YAML parse error
- **Cause:** unquoted value or indentation/line-join issue at line 11 col 17 (exact original content not captured).
- **Fix:** quote values, keys at column 1.

## 6. Key technical details

### applianceId format (Alexa internal, skill-provided devices)
```
SKILL_<base64(JSON{"skillId":"amzn1.ask.skill.<uuid>","stage":"development"|"live"})>_<HA endpointId>
```
- HA endpointId = entity_id with `.` replaced by `#` (e.g. `light#kitchen`).
- `development` = self-built skills. `live` = published third-party. Non-`SKILL_` IDs = Echo built-ins.
- This is the basis of the safe filter in `tools/alexa-orphan-cleanup.js`.

### Internal endpoints used (undocumented, may break)
- `POST /nexus/v1/graphql` with `query { endpoints { items { friendlyName legacyAppliance { applianceId } } } }`
- `DELETE /api/phoenix/appliance/{encodeURIComponent(applianceId)}`
- Must run from a tab on `alexa.amazon.com` (or regional equivalent) showing `/api/behaviors/entities?skillId=amzn1.ask.1p.smarthome`. Uses that origin's cookies.
- DELETE returns 200 regardless of outcome, so verify by re-listing.
- CSRF header was **not** required in this session (2026-10-06, alexa.amazon.com, US account).

### Lambda behavior notes
- `DEBUG` is truthy for any non-empty string; `0` and `false` still enable it. Disable by deleting the variable.
- With `DEBUG` set and no token in the request, the function falls back to `LONG_LIVED_ACCESS_TOKEN`. That is a security exposure if left in place, so remove it after testing.
- Token location by directive: `endpoint.scope` (control), `payload.grantee` (AcceptGrant), `payload.scope` (Discovery).

### Region alignment (must match)
| Region | Lambda | Linking Client ID | Events endpoint |
| --- | --- | --- | --- |
| NA | us-east-1 | `https://pitangui.amazon.com/` | `https://api.amazonalexa.com/v3/events` |
| EU/IN | eu-west-1 | `https://layla.amazon.com/` | `https://api.eu.amazonalexa.com/v3/events` |
| FE | us-west-2 | `https://alexa.amazon.co.jp/` | `https://api.fe.amazonalexa.com/v3/events` |

### Cloudflare
- Not the cause in this session (Discovery test passed through the tunnel).
- Still documented because it caused identical symptoms for others in 2026: Bot Fight Mode, AI Labyrinth, Access policies, WAF challenges.
- Account linking hits `/auth/authorize` and `/auth/token`. These paths were **not** exercised by the Lambda test and remain a possible failure point during linking.

## 7. Diagnostic order (the core value of the tutorial)

1. Lambda console Discovery test: isolates Lambda → network → HA.
2. Read the response type (JSON / Cloudflare HTML / timeout / 401 / 404).
3. Check Lambda triggers: isolates skill → Lambda permission.
4. Check region alignment.
5. Clean orphans before re-linking.
6. Fix proactive events credentials.
7. Re-link and discover.
8. Verify live invocations in CloudWatch (console tests cannot prove step 3).

## 8. Decisions

- Kept the user's Lambda logic unchanged. Added only a docstring with the Apache-2.0 attribution and three debug/error log lines.
- Cleanup tool defaults to `DRY_RUN = true` and only targets `development` stage. The published community script deletes **all** endpoints, which was judged too destructive.
- Added a 150 ms delay between deletes to avoid throttling. No throttling was observed.
- Repo license: Apache-2.0 (required by the upstream Lambda derivation). Select it in GitHub's UI at repo creation.
- All personal identifiers replaced with placeholders (`ha.example.com`, `123456789012`, dummy skill IDs). The real AWS account ID and real skill IDs are intentionally excluded from the repo.

## 9. Open items

Updated after the owner's follow-up on 2026-10-06.

- [x] Full HA restart after `secrets.yaml` fix (owner-confirmed)
- [x] Enable and link new skill in Alexa app (owner-confirmed)
- [x] "Alexa, discover devices": **104 devices** discovered (owner-confirmed)
- [x] Removed `LONG_LIVED_ACCESS_TOKEN` from Lambda env vars (owner-confirmed)
- [ ] Re-run Discovery test; confirm only `light#` / `switch#` endpointIds (not recorded; 104 devices may include other domains)
- [ ] Re-list endpoints; expect one development-stage skill row (not recorded)
- [ ] Confirm live invocation in CloudWatch (`Forwarding Alexa.Discovery.Discover`) (not recorded)
- [ ] Remove `DEBUG` from Lambda; revoke the diagnostic token in HA (revocation not recorded)
- [ ] Remove the old skill's trigger from Lambda if still present (not recorded)

## 10. Repo map

```
LICENSE / NOTICE                   Apache-2.0 and attribution
README.md                          landing page, quick-fix summary, nav
docs/01-home-assistant.md          prerequisites, region table, Cloudflare, config
docs/02-aws-lambda.md              create function, env vars, console test
docs/03-alexa-developer-console.md create skill, Skill ID
docs/04-connect-lambda-and-skill.md trigger first, then endpoint
docs/05-linking-and-discovery.md   account linking, proactive events, discovery, cleanup
docs/06-troubleshooting.md         response decoding, trigger, Cloudflare, linking
docs/07-orphan-device-cleanup.md   applianceId format, bulk delete procedure
lambda/lambda_function.py          relay function
tools/alexa-orphan-cleanup.js      console script (DRY_RUN, KEEP_SKILL_IDS, CSRF)
test-events/discovery.json         Lambda console test event
examples/configuration.yaml        HA alexa config with filter + proactive events
examples/secrets.example.yaml      quoted secrets template
DEVELOPMENT_LOG.md                 this file
```
