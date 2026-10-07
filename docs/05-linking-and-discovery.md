# 5. Account linking, proactive events, and discovery

[← Step 4: Connect Lambda and skill](04-connect-lambda-and-skill.md) · **Step 5 of 5** · [Troubleshooting →](06-troubleshooting.md)

## Configure account linking

In the Alexa Developer Console → your skill → **Account Linking** (under *Build*):

| Field | Value |
| --- | --- |
| Authorization grant type | Auth Code Grant |
| Your Web Authorization URI | `https://ha.example.com/auth/authorize` |
| Access Token URI | `https://ha.example.com/auth/token` |
| Your Client ID | `https://pitangui.amazon.com/` (US). See the [region table](01-home-assistant.md#prerequisites). **Include the trailing slash.** |
| Your Secret | Anything. Home Assistant ignores it. |
| Your Authentication Scheme | Credentials in request body |
| Scope | `smart_home` |

Click **Save**.

## Enable proactive events (Send Alexa Events)

Proactive events let Home Assistant push changes to Alexa: state updates, newly added entities, and **deleted entities**.

Without proactive events, Alexa only learns about changes when you run discovery, and **it never removes anything**. Every renamed or removed entity leaves a ghost device behind. Having `endpoint:` in your config without `client_id` / `client_secret` gives you this broken state.

1. In the skill, go to **Build → Permissions**.
2. Enable **Send Alexa Events**.
3. Copy the **Alexa Client Id** and **Alexa Client Secret** shown there.
4. Add them to HA's `secrets.yaml`. **Quote the values**, and make sure each key starts at column 1:

```yaml
alexa_client_id: "amzn1.application-oa2-client.xxxxxxxxxxxxxxxx"
alexa_client_secret: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

> If HA reports `mapping values are not allowed here in "/config/secrets.yaml"`, a value is unquoted, a key is indented, or two entries ended up on one line.

5. In HA, go to **Developer Tools → YAML → Check Configuration**.
6. Do a **full restart** of HA (**Settings → System → Restart**). A YAML reload is not enough.

## Verify what HA will expose

Run the Lambda **Discovery** test again (step 2). Search the output for `"endpointId"`. Every ID should belong to a domain in your filter. If you see `binary_sensor#`, `button#`, `automation#`, and so on that you didn't include, the filter isn't being applied.

## Clean up old devices first (if re-linking)

If you had an earlier version of this skill, delete its leftover devices **before** you enable the new one. Otherwise you'll end up with duplicates. See [Bulk-deleting orphaned devices](07-orphan-device-cleanup.md).

## Enable and link the skill

1. Open the Alexa app → **More → Skills & Games → Your Skills → Dev**.
2. Open your skill → **Enable to use**.
3. Log in to Home Assistant on the page that opens.
4. When linking succeeds, let Alexa discover devices, or say **"Alexa, discover devices."**

## Clean up Lambda

Once everything works:

- **Delete** `LONG_LIVED_ACCESS_TOKEN` from the Lambda environment variables. Real requests carry their own OAuth token, so the fallback is only an exposure risk.
- **Delete** `DEBUG` when you no longer need verbose CloudWatch logs.
- Revoke the long-lived token in HA (**Profile → Security**).

---

[← Step 4: Connect Lambda and skill](04-connect-lambda-and-skill.md) · [Troubleshooting →](06-troubleshooting.md)
