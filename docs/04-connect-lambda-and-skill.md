# 4. Connect the Lambda trigger and the skill endpoint

[← Step 3: Alexa Developer Console](03-alexa-developer-console.md) · **Step 4 of 5** · [Next: Linking and discovery →](05-linking-and-discovery.md)

The skill and the Lambda each need to point at the other:

- The **Lambda trigger** allows the skill to invoke the function.
- The **skill endpoint** tells Alexa which function to call.

**Add the trigger first.**

## Add the Alexa Smart Home trigger to Lambda

1. In the AWS console, open your function and go to **Configuration → Triggers** (or click **+ Add trigger** in the function overview diagram).
2. Click **Add trigger**.
3. Source: **Alexa**.
4. Choose **Alexa Smart Home**. Do **not** choose *Alexa Skills Kit*. That trigger type has the same ID field, but it's the wrong event source and the skill console will reject the ARN.
5. **Skill ID verification:** enabled. Paste the Skill ID from step 3.
6. Click **Add**.

> **This is the step most broken setups are missing.** If the trigger is gone (function recreated, resource policy edited, skill rebuilt with a new ID), Alexa silently fails every request while console tests keep passing.
>
> Each skill ID needs its own trigger. If you create a new skill, add a new trigger with the new ID. Remove the old one once the old skill is deleted.

## Set the skill's default endpoint

1. Go back to the Alexa Developer Console → your skill → **Smart Home**.
2. **Payload version:** v3.
3. **Default endpoint:** paste the Lambda **Function ARN** from step 2.
4. Click **Save**.

If it still rejects the ARN, check these:

- The trigger type is **Alexa Smart Home**, not Alexa Skills Kit.
- The trigger's Skill ID exactly matches this skill.
- The Lambda is in the correct region for your locale.
- If you use a version or alias suffix on the ARN, the trigger must be on that same version or alias.

---

[← Step 3: Alexa Developer Console](03-alexa-developer-console.md) · [Next: Linking and discovery →](05-linking-and-discovery.md)
