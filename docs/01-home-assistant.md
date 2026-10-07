# 1. Prerequisites and Home Assistant config

[← README](../README.md) · **Step 1 of 5** · [Next: AWS Lambda →](02-aws-lambda.md)

## Prerequisites

- Home Assistant reachable from the internet over **HTTPS with a valid certificate**, for example `https://ha.example.com`. Port 443 is the safe choice.
- An AWS account.
- An Amazon Developer account at <https://developer.amazon.com>. Sign in with the **same Amazon account your Echo devices use**.
- Know your region. These three values must line up:

| Alexa language / region | Lambda region | Account linking Client ID | Proactive events endpoint |
| --- | --- | --- | --- |
| North America (en-US, en-CA, es-US, pt-BR) | `us-east-1` (N. Virginia) | `https://pitangui.amazon.com/` | `https://api.amazonalexa.com/v3/events` |
| Europe / India (en-GB, de-DE, fr-FR, en-IN, ...) | `eu-west-1` (Ireland) | `https://layla.amazon.com/` | `https://api.eu.amazonalexa.com/v3/events` |
| Far East (ja-JP, en-AU) | `us-west-2` (Oregon) | `https://alexa.amazon.co.jp/` | `https://api.fe.amazonalexa.com/v3/events` |

The rest of this guide uses North America values. Substitute yours where needed.

## If Home Assistant is behind a reverse proxy or Cloudflare

Amazon's servers and your Lambda must reach these paths **without any challenge, login page, or bot check**:

- `/api/alexa/smart_home` (called by Lambda)
- `/auth/authorize` (loaded in the Alexa app during account linking)
- `/auth/token` (called by Amazon during account linking and token refresh)

On Cloudflare:

- **Bot Fight Mode** and **AI Labyrinth** will break this. On the Free plan, WAF skip rules cannot exempt traffic from Bot Fight Mode, so turn it off for this zone.
- If a **Cloudflare Access** application covers your HA hostname, add **Bypass** policies for `/api/alexa/*` and `/auth/*`, or use a separate hostname for Alexa.
- If you use WAF managed rules or challenge rules, add a skip rule for those paths.

## Configure `configuration.yaml`

Add the following. You'll fill in the secrets in [step 5](05-linking-and-discovery.md); the skeleton can go in now.

```yaml
alexa:
  smart_home:
    locale: en-US
    endpoint: https://api.amazonalexa.com/v3/events
    client_id: !secret alexa_client_id
    client_secret: !secret alexa_client_secret
    filter:
      include_domains:
        - light
        - switch
```

**Always use a filter.** Without one, HA exposes every entity Alexa can represent, including buttons, binary sensors, automations, and media players. That can easily mean hundreds of devices, and Alexa caps discovery at roughly 300 endpoints per skill. Add only the domains you actually want to control by voice (`script`, `scene`, `fan`, `lock`, `cover`, `climate`, ...), or list specific entities with `include_entities:`.

See [`examples/configuration.yaml`](../examples/configuration.yaml) for a fuller example.

## Create a long-lived access token (for testing only)

In Home Assistant, go to **your profile → Security → Long-lived access tokens → Create token**. Copy it somewhere safe. You'll use it to test the Lambda in step 2, then delete it from Lambda when you're done.

---

[← README](../README.md) · [Next: AWS Lambda →](02-aws-lambda.md)
