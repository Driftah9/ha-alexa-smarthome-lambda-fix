# Bulk-deleting orphaned / ghost devices

[← Troubleshooting](06-troubleshooting.md) · [README](../README.md)

The Alexa app only lets you delete devices one at a time, and the old `alexa.amazon.com` web interface is gone. Every time you rebuild the skill, its old devices stay behind, so you can easily end up with hundreds of orphans.

This uses Amazon's **undocumented** internal API from your logged-in browser session. It's unofficial and could break at any time. Run the dry run first.

## How HA devices are identified

Each skill-provided device has an `applianceId` like this:

```
SKILL_<base64 JSON>_<HA endpointId>
```

Decoded, the base64 part looks like this:

```json
{"skillId":"amzn1.ask.skill.yyyyyyyy-...","stage":"development"}
```

Skills you build yourself have `stage: "development"`. Third-party published skills (Hue, Ring, and so on) have `stage: "live"`. Echo built-in endpoints aren't `SKILL_` IDs at all. That makes it possible to target **only your own skills' devices** without touching anything else.

## Steps

1. **Disable your current skill** in the Alexa app if you're starting fresh, or note its Skill ID if you want to keep its devices.
2. In a desktop browser, sign in to amazon.com.
3. Open:
   `https://alexa.amazon.com/api/behaviors/entities?skillId=amzn1.ask.1p.smarthome`
   You should see JSON. If you don't, try `https://pitangui.amazon.com/...` (US), `https://alexa.amazon.de/...` / `https://layla.amazon.com/...` (EU), or `https://alexa.amazon.co.jp/...` (FE). **Stay on the tab that returns JSON.** The script uses that tab's cookies and origin.
4. Open DevTools (**F12**) → **Console**.
5. Open [`tools/alexa-orphan-cleanup.js`](../tools/alexa-orphan-cleanup.js), check the settings at the top (`DRY_RUN = true`, `KEEP_SKILL_IDS`), then paste the whole file into the console and press Enter.
6. Review the output:
   - A table of device counts per skill.
   - The list of devices that **would** be deleted.
7. If the list is right, set `DRY_RUN = false`, paste it again, and run.
8. **Refresh the tab** and run it once more with `DRY_RUN = true` to verify. You want no `development` rows left, apart from any skills you chose to keep.

### Example run

Before:

| skill | count |
| --- | --- |
| `amzn1.ask.skill.xxxxxxxx-... [development]` | 109 |
| `amzn1.ask.skill.yyyyyyyy-... [development]` | 241 |
| `amzn1.ask.skill.zzzzzzzz-... [development]` | 24 |
| `(non-skill)` | 3 |

After:

| skill | count |
| --- | --- |
| `(non-skill)` | 3 |

## If deletes don't stick

The delete endpoint **returns HTTP 200 whether or not it actually deleted anything**, so always verify with a refresh.

- **Counts went down but some remain:** run it again.
- **Counts unchanged:** the request needs a CSRF token. Set `CSRF` at the top of the script. To get one, open amazon.com in another tab, add any item to the cart, open DevTools → Network, change the quantity, and copy the `csrf` header (or the `csrf=` value from the cookie) from the `ref=ox_sc_update_quantity` request. Details are in [Shereef/Python-Delete-Alexa-Devices#9](https://github.com/Shereef/Python-Delete-Alexa-Devices/issues/9).

## Afterwards

Make sure your HA config has a `filter:` and [proactive events](05-linking-and-discovery.md#enable-proactive-events-send-alexa-events) before you run discovery again. Then link the skill and say **"Alexa, discover devices."**

---

[← Troubleshooting](06-troubleshooting.md) · [README](../README.md)
