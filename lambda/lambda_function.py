"""
Home Assistant Alexa Smart Home relay for AWS Lambda.

Forwards Alexa Smart Home (payload v3) directives to Home Assistant's
/api/alexa/smart_home endpoint and returns HA's response to Alexa.

Based on the reference implementation in the Home Assistant documentation.
Copyright 2019 Jason Hu <awaregit at gmail.com>
Licensed under the Apache License, Version 2.0
http://www.apache.org/licenses/LICENSE-2.0

Environment variables:
  BASE_URL                  Required. Public HTTPS URL of Home Assistant, e.g. https://ha.example.com
  DEBUG                     Optional. Any non-empty value enables debug logging and the
                            LONG_LIVED_ACCESS_TOKEN fallback. Delete the variable to disable.
  LONG_LIVED_ACCESS_TOKEN   Optional, testing only. Used when DEBUG is set and the request
                            carries no token (e.g. Lambda console test events).
  NOT_VERIFY_SSL            Optional. Any non-empty value disables TLS verification.
                            Only for testing with self-signed certificates.
"""
import json
import logging
import os
from typing import Any

import urllib3

_debug = bool(os.environ.get('DEBUG'))
_logger = logging.getLogger('HomeAssistant-SmartHome')
_logger.setLevel(logging.DEBUG if _debug else logging.INFO)
logging.getLogger('urllib3').setLevel(logging.INFO)


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Handle an incoming Alexa directive."""
    try:
        base_url = os.environ.get('BASE_URL')
        if base_url is None:
            raise ValueError('BASE_URL environment variable must be set')
        base_url = base_url.rstrip('/')

        directive = event.get('directive')
        if directive is None:
            raise ValueError('Request missing required directive field')

        if directive.get('header', {}).get('payloadVersion') != '3':
            raise ValueError('Only payloadVersion 3 is supported')

        # Token location varies by directive type
        scope = directive.get('endpoint', {}).get('scope')
        if scope is None:
            # AcceptGrant (account linking) puts it in payload.grantee
            scope = directive.get('payload', {}).get('grantee')
        if scope is None:
            # Discovery puts it in payload.scope
            scope = directive.get('payload', {}).get('scope')
        if scope is None:
            raise ValueError('Request missing scope in endpoint or payload')

        if scope.get('type') != 'BearerToken':
            raise ValueError('Only BearerToken scope is supported')

        token = scope.get('token')
        if token is None and _debug:
            # Testing only: console test events carry no token
            token = os.environ.get('LONG_LIVED_ACCESS_TOKEN')
        if token is None:
            raise ValueError('Authentication token is required')

        http = urllib3.PoolManager(
            cert_reqs='CERT_REQUIRED' if not bool(os.environ.get('NOT_VERIFY_SSL')) else 'CERT_NONE',
            timeout=urllib3.Timeout(connect=2.0, read=10.0),
        )

        _logger.debug('Forwarding %s.%s to %s',
                      directive.get('header', {}).get('namespace'),
                      directive.get('header', {}).get('name'),
                      base_url)

        response = http.request(
            'POST',
            f'{base_url}/api/alexa/smart_home',
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
            },
            body=json.dumps(event).encode('utf-8'),
        )

        if response.status >= 400:
            response_text = response.data.decode('utf-8')
            _logger.error('HA returned HTTP %s: %s', response.status, response_text[:500])
            error_type = 'INVALID_AUTHORIZATION_CREDENTIAL' if response.status in (401, 403) else 'INTERNAL_ERROR'
            return {'event': {'payload': {'type': error_type, 'message': response_text}}}

        _logger.debug('HA response: %s', response.data.decode('utf-8')[:2000])
        return json.loads(response.data.decode('utf-8'))

    except Exception as e:
        _logger.exception('Error: %s', str(e))
        return {'event': {'payload': {'type': 'INTERNAL_ERROR', 'message': str(e)}}}
