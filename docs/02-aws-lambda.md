# 2. AWS: create and configure the Lambda function

[← Step 1: Home Assistant](01-home-assistant.md) · **Step 2 of 5** · [Next: Alexa Developer Console →](03-alexa-developer-console.md)

## Create the function

1. Sign in to the AWS console and **switch to the correct region** (top-right) from the [region table](01-home-assistant.md#prerequisites). For North America, that's **US East (N. Virginia) `us-east-1`**. A function in the wrong region will not work with the skill.
2. Open **Lambda → Create function**.
3. Choose **Author from scratch**:
   - **Function name:** `HomeAssistant-SmartHome` (any name works)
   - **Runtime:** Python 3.12 or 3.13
   - **Architecture:** either works
   - **Permissions:** *Create a new role with basic Lambda permissions*
4. Click **Create function**.

## Add the code

1. Under **Code**, open `lambda_function.py`.
2. Replace its contents with [`lambda/lambda_function.py`](../lambda/lambda_function.py) from this repo.
3. Click **Deploy**.

## Set environment variables

Go to **Configuration → Environment variables → Edit**:

| Key | Value | Notes |
| --- | --- | --- |
| `BASE_URL` | `https://ha.example.com` | Your public HA URL. No trailing path. |
| `DEBUG` | `1` | Temporary. Enables debug logging and the token fallback. |
| `LONG_LIVED_ACCESS_TOKEN` | *(token from step 1)* | Temporary. Used only when `DEBUG` is set. |
| `NOT_VERIFY_SSL` | *(leave unset)* | Only set this if you're testing with a self-signed certificate. |

> **`DEBUG` gotcha:** the function treats any non-empty value as "on," so `0` and `false` still enable debug. To turn debug off, **delete** the variable.

Do not edit the code to hardcode these values. Environment variables let you turn debugging off without redeploying.

## Test Lambda → Home Assistant

This checks the full Lambda → internet → proxy → HA path with Alexa out of the loop.

1. Click **Test → Create new event**.
2. **Event name:** `Discovery`.
3. Paste the contents of [`test-events/discovery.json`](../test-events/discovery.json).
4. **Save**, then **Test**.

The test event has no token, so the function falls back to `LONG_LIVED_ACCESS_TOKEN`.

**Expected result:** a JSON response with `"namespace": "Alexa.Discovery"` and an `endpoints` array listing your exposed entities. Each `endpointId` should look like `light#kitchen` or `switch#porch`.

Anything else? Go to [Troubleshooting](06-troubleshooting.md#step-1-test-lambda-directly) to decode the response.

> **Important:** a passing console test **does not** prove Alexa can invoke the function. Console tests run with your AWS credentials and skip the trigger permission check. You'll add the trigger in [step 4](04-connect-lambda-and-skill.md).

## Copy the function ARN

At the top right of the function page, copy the **Function ARN**. It looks like this:

```
arn:aws:lambda:us-east-1:123456789012:function:HomeAssistant-SmartHome
```

You'll need it in step 4.

---

[← Step 1: Home Assistant](01-home-assistant.md) · [Next: Alexa Developer Console →](03-alexa-developer-console.md)
