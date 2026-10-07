# 3. Alexa Developer Console: create the Smart Home skill

[← Step 2: AWS Lambda](02-aws-lambda.md) · **Step 3 of 5** · [Next: Connect Lambda and skill →](04-connect-lambda-and-skill.md)

## Log in

1. Go to <https://developer.amazon.com/alexa/console/ask>.
2. Sign in with the **same Amazon account your Echo devices are registered to**. A skill under a different account won't show up in your Alexa app.

## Create the skill

1. Click **Create Skill**.
2. **Name:** anything, for example `Home Assistant`. This name appears in the Alexa app's skill list.
3. **Primary locale:** match your HA `locale` (for example *English (US)*).
4. **Experience / type:** **Smart Home**.
5. **Hosting:** **Provision your own**.
6. Create the skill.

## Copy the Skill ID

On the skill's **Smart Home** page, copy the **Skill ID**:

```
amzn1.ask.skill.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Leave this tab open. In the next step you'll add this ID to the Lambda, then come back here to paste the Lambda ARN.

> **Don't save the endpoint yet.** If you paste the Lambda ARN before the Lambda has a trigger for *this* skill ID, saving fails with:
>
> `Please make sure that "Alexa Smart Home" is selected for the event source type, for provided arn`

---

[← Step 2: AWS Lambda](02-aws-lambda.md) · [Next: Connect Lambda and skill →](04-connect-lambda-and-skill.md)
