"""
Authorize a Composio toolkit (e.g. gmail, slack, github) for your user.

Usage:
    python authorize.py gmail
    python authorize.py slack
    python authorize.py github
"""

import os
import sys

from composio import Composio
from composio_claude_agent_sdk import ClaudeAgentSDKProvider

COMPOSIO_API_KEY = os.environ.get("COMPOSIO_API_KEY", "")  # Set via env var
COMPOSIO_USER_ID = os.environ.get("COMPOSIO_USER_ID", "")  # Set via env var


def authorize_toolkit(toolkit: str):
    composio = Composio(
        api_key=COMPOSIO_API_KEY,
        provider=ClaudeAgentSDKProvider(),
    )
    session = composio.create(
        user_id=COMPOSIO_USER_ID,
        manage_connections=False,
    )

    connection_request = session.authorize(
        toolkit=toolkit,
        callback_url="https://composio.dev/callback",
    )

    print(f"\nAuthorize {toolkit} by visiting this URL:\n")
    print(f"  {connection_request.redirect_url}\n")

    print("Waiting for authorization...")
    connected_account = connection_request.wait_for_connection()
    print(f"Connected! Account ID: {connected_account.id}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python authorize.py <toolkit>")
        print("Examples: gmail, slack, github, google-calendar")
        sys.exit(1)

    authorize_toolkit(sys.argv[1])
