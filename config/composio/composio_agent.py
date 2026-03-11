"""
Composio + Claude Agent SDK — reusable agent runner.

Usage:
    python composio_agent.py "Send an email to bob@example.com with subject 'Hi'"

Env vars (or edit defaults below):
    COMPOSIO_API_KEY   — your Composio API key
    COMPOSIO_USER_ID   — your Composio external user ID
"""

import asyncio
import os
import sys

from composio import Composio
from composio_claude_agent_sdk import ClaudeAgentSDKProvider
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions, create_sdk_mcp_server

# ── Configuration ──────────────────────────────────────────────────────────
COMPOSIO_API_KEY = os.environ.get("COMPOSIO_API_KEY", "")  # Set via env var
COMPOSIO_USER_ID = os.environ.get("COMPOSIO_USER_ID", "")  # Set via env var


def build_composio_mcp_server():
    """Create a Composio MCP server with all available tools."""
    composio = Composio(
        api_key=COMPOSIO_API_KEY,
        provider=ClaudeAgentSDKProvider(),
    )
    session = composio.create(user_id=COMPOSIO_USER_ID)
    tools = session.tools()
    return create_sdk_mcp_server(name="composio", version="1.0.0", tools=tools)


async def run_agent(prompt: str, system_prompt: str = "You are a helpful assistant."):
    """Run a one-shot Claude agent with Composio tools."""
    server = build_composio_mcp_server()

    options = ClaudeAgentOptions(
        system_prompt=system_prompt,
        permission_mode="bypassPermissions",
        mcp_servers={"composio": server},
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(prompt)
        async for msg in client.receive_response():
            print(msg)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python composio_agent.py \"<prompt>\"")
        sys.exit(1)

    asyncio.run(run_agent(" ".join(sys.argv[1:])))
