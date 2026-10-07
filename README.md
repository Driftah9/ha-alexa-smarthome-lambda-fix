# Home Assistant ↔ Alexa Smart Home (Self-Hosted Lambda)

Connect Amazon Alexa to a self-hosted Home Assistant instance **without Nabu Casa**, using your own AWS Lambda function and a private Alexa Smart Home skill. This guide also covers how to **recover a setup that stopped working** and how to **bulk-delete orphaned "ghost" devices** that the Alexa app won't let you remove in batches.

Tested end-to-end in October 2026.

## Is this still the way to do it in 2026?

Yes. Amazon renamed "smart home skills" to "smart home add-ons," but existing integrations work unchanged. For a self-hosted Home Assistant, the DIY path is still:

```
Echo → Alexa cloud → your Smart Home skill → AWS Lambda → https://your-ha-host/api/alexa/smart_home
```

The newer **Alexa Devices** integration in Home Assistant goes the *other* direction (HA controlling your Echos). It does not replace this setup.

## What this repo gives you

| Path                                                             | What it is                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [`lambda/lambda_function.py`](lambda/lambda_function.py)         | The Lambda function that relays Alexa directives to Home Assistant        |
| [`test-events/discovery.json`](test-events/discovery.json)       | Test event for verifying Lambda → HA without Alexa involved               |
| [`examples/configuration.yaml`](examples/configuration.yaml)     | Home Assistant `alexa:` config with entity filtering and proactive events |
| [`examples/secrets.example.yaml`](examples/secrets.example.yaml) | Matching `secrets.yaml` entries                                           |
| [`tools/alexa-orphan-cleanup.js`](tools/alexa-orphan-cleanup.js) | Browser-console script to bulk-delete ghost devices from old skills       |

## Setup guide

Follow these in order. Each page links to the next.

1. [Prerequisites and Home Assistant config](docs/01-home-assistant.md)
2. [AWS: create and configure the Lambda function](docs/02-aws-lambda.md)
3. [Alexa Developer Console: create the Smart Home skill](docs/03-alexa-developer-console.md)
4. [Connect the Lambda trigger and the skill endpoint](docs/04-connect-lambda-and-skill.md)
5. [Account linking, proactive events, and discovery](docs/05-linking-and-discovery.md)

## Fixing a broken setup

- [Troubleshooting: Alexa stopped controlling Home Assistant](docs/06-troubleshooting.md)
- [Bulk-deleting orphaned / ghost devices](docs/07-orphan-device-cleanup.md)

### The short version, if Alexa used to work and stopped

1. **Run the Lambda Discovery test** ([how](docs/06-troubleshooting.md#step-1-test-lambda-directly)). If it returns your devices, the Lambda → HA path works.
2. **Check that the Lambda has an "Alexa Smart Home" trigger.** If the trigger is missing, Alexa cannot invoke the function, but **console tests still pass**, which makes this easy to miss.
3. **If HA sits behind Cloudflare**, check Bot Fight Mode, AI Labyrinth, Access policies, and WAF rules. A Cloudflare challenge page in the Lambda response is the giveaway.
4. **Clean up orphaned devices** left behind by old skills before re-linking.
5. **Give HA proactive event credentials** (`client_id` / `client_secret`) so it can tell Alexa when entities change or disappear.

## License

Apache-2.0. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE). How this was produced, including every failure and root cause, is in [`DEVELOPMENT_LOG.md`](DEVELOPMENT_LOG.md).

## Credits

The Lambda function is based on the reference implementation from the Home Assistant documentation (originally by Jason Hu, Apache License 2.0). The orphan cleanup approach builds on work shared in [Shereef/Python-Delete-Alexa-Devices#9](https://github.com/Shereef/Python-Delete-Alexa-Devices/issues/9).

This project is not affiliated with Amazon or Nabu Casa. The cleanup tool uses an undocumented Amazon endpoint that may change without notice.
