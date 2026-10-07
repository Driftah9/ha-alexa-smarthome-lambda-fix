# Troubleshooting: Alexa stopped controlling Home Assistant

[← README](../README.md) · [Setup step 5](05-linking-and-discovery.md) · [Orphan cleanup →](07-orphan-device-cleanup.md)

Work through these in order. Each step isolates one hop in the chain:

```
Alexa → skill → [trigger] → Lambda → [internet / proxy / Cloudflare] → HA /api/alexa/smart_home
                    ↑                                                  ↑
           account linking (Amazon → HA /auth/authorize, /auth/token)
```

## Step 1: test Lambda directly

Set `DEBUG=1` and `LONG_LIVED_ACCESS_TOKEN` in the Lambda's environment variables ([details](02-aws-lambda.md#set-environment-variables)). Then run the [`discovery.json`](../test-events/discovery.json) test event.

| Response | Meaning | Fix |
| --- | --- | --- |
| JSON with `Alexa.Discovery` and an `endpoints` array | Lambda → HA works | Go to step 2 |
| `INVALID_AUTHORIZATION_CREDENTIAL` with HTML containing **`Just a moment...`** or **`cf_chl`** | Cloudflare is challenging the request | [Cloudflare section](#cloudflare) |
| Timeout, `Max retries exceeded`, `ConnectTimeoutError` | Lambda can't reach your host | Check `BASE_URL`, DNS, tunnel or port-forward status |
| `INVALID_AUTHORIZATION_CREDENTIAL` with an HA 401 message | Token is wrong or revoked | Create a new long-lived token |
| `INTERNAL_ERROR` with 404 / not found | HA isn't loading the `alexa: smart_home:` config | Check `configuration.yaml` and restart HA |
| `Authentication token is required` | `DEBUG` or `LONG_LIVED_ACCESS_TOKEN` isn't set | Set both |

## Step 2: check the Lambda trigger

Open the function → **Configuration → Triggers**.

- **No triggers listed:** this is very likely your whole problem. Without an **Alexa Smart Home** trigger, the function has no permission for Alexa to invoke it, so every real request fails. Console tests still pass because they run with your AWS credentials, not Alexa's. [Add the trigger](04-connect-lambda-and-skill.md#add-the-alexa-smart-home-trigger-to-lambda).
- **Trigger present:** make sure the type is *Alexa Smart Home* (not *Alexa Skills Kit*) and the Skill ID matches your current skill exactly.

## Step 3: check region alignment

The Lambda region, the account-linking Client ID, and the proactive events endpoint must all match your Alexa locale. See the [region table](01-home-assistant.md#prerequisites).

## Step 4: re-link the account

If Lambda works and the trigger is correct, the OAuth link between Alexa and HA has probably broken. For example, the HA refresh token was revoked or expired while things were down.

1. Alexa app → **More → Skills & Games → Your Skills → Dev** → your skill → **Disable**.
2. If you're starting over, [clean up the orphaned devices](07-orphan-device-cleanup.md).
3. **Enable**, log in to HA, and run discovery.

If linking fails with **"Unable to link the skill at this time"**:

- Check the account linking fields ([step 5](05-linking-and-discovery.md#configure-account-linking)). The Client ID needs its trailing slash.
- Check Cloudflare's **Security → Events** for requests to `/auth/token` at that time. The token exchange runs server-to-server from Amazon and gets blocked by bot protection even when the Lambda path works.
- Turn on auth debug logging in HA:

```yaml
logger:
  default: warning
  logs:
    homeassistant.components.auth: debug
    homeassistant.components.alexa: debug
```

## Cloudflare

If HA is published through Cloudflare (proxied DNS or a Zero Trust tunnel):

| Feature | Effect | Fix |
| --- | --- | --- |
| **Bot Fight Mode** | Challenges Lambda and Amazon's token requests | Turn off for the zone. On the Free plan, WAF skip rules can't exempt traffic from it. On Pro and higher, Super Bot Fight Mode can be skipped per rule. |
| **AI Labyrinth** | Same | Turn off |
| **Access** application on the HA hostname | Lambda and Amazon can't complete an Access login | Bypass policy for `/api/alexa/*` and `/auth/*`, or a separate hostname |
| WAF managed or custom challenge rules | Can challenge the same requests | Skip rule for those paths |

The giveaway is a Lambda response containing a Cloudflare HTML challenge page instead of JSON.

## Devices show up but say "Device is unresponsive"

These are usually **ghost devices**: endpoints from an old skill or from entities that were renamed or removed. Discovery adds and updates devices but never deletes them. See [Bulk-deleting orphaned devices](07-orphan-device-cleanup.md). To stop new ones from accumulating, set up [proactive events](05-linking-and-discovery.md#enable-proactive-events-send-alexa-events).

## Too many devices, or discovery fails partway

Alexa caps discovery at about 300 endpoints per skill. Add a `filter:` with `include_domains` or `include_entities` ([step 1](01-home-assistant.md#configure-configurationyaml)).

## Discovered device types you didn't ask for

If `binary_sensor`, `button`, `automation`, or `media_player` devices appear even though your filter only includes `light` and `switch`, they were probably discovered **before the filter was added**. Discovery never removes devices, so they persist until you delete them.

---

[← README](../README.md) · [Orphan cleanup →](07-orphan-device-cleanup.md)
