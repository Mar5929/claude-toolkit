# Claude Code documentation, captured

**Source:** https://code.claude.com/docs/en/

**Captured:** 2026-09-04

**Pages:** 161

The official Claude Code documentation, saved here so an agent building a
hook, a skill, a plugin, an agent, a command, or a setting can read how the
thing actually works instead of guessing. The rule
`.claude/rules/claude-code-docs-first.md` says when to open a page.

This is somebody else's writing. It is not this project's truth, and it is
never edited to agree with this project. When a page and this project
disagree, say so out loud rather than quietly picking one.

Every file starts with a header naming the page it came from and the day it
was captured. Links the site writes as `/docs/en/...` were rewritten to full
URLs so they resolve from a local file. Nothing else was changed.

## How to refresh

```
node .claude/tools/capture-claude-code-docs.mjs
```

That script reads the official page list at
`https://code.claude.com/docs/llms.txt`, fetches each page's own Markdown
from the docs site, and rewrites this folder and this index. It needs no API
key and no scraper. Add `--dry-run` to see what it would write without
writing it.

What the script leaves out: the weekly What's New feed, the list of
translated indexes, the Claude apps gateway pages, which are a separate
product, and the adoption kits, which are rollout material rather than
documentation.

## What is here

### Getting started

| Page | File | What it covers |
| --- | --- | --- |
| Overview | `overview.md` | Claude Code is an agentic coding tool that reads your codebase, edits files, runs commands, and integrates with your development tools. Available in your terminal, IDE, desktop app, and browser. |
| Quickstart | `quickstart.md` | Welcome to Claude Code! |
| Claude Code changelog | `changelog.md` | Release notes for Claude Code, including new features, improvements, and bug fixes by version. |

**Core concepts**

| Page | File | What it covers |
| --- | --- | --- |
| How Claude Code works | `how-claude-code-works.md` | Understand the agentic loop, built-in tools, and how Claude Code interacts with your project. |
| Extend Claude Code | `features-overview.md` | Understand when to use CLAUDE.md, Skills, subagents, hooks, MCP, and plugins. |
| Explore the .claude directory | `claude-directory.md` | Where Claude Code reads CLAUDE.md, settings.json, hooks, skills, commands, subagents, workflows, rules, and auto memory. Explore the .claude directory in your project and ~/.claude in your home directory. |
| Explore the context window | `context-window.md` | An interactive simulation of how Claude Code's context window fills during a session. See what loads automatically, what each file read costs, and when rules and hooks fire. |
| How Claude Code uses prompt caching | `prompt-caching.md` | Claude Code manages prompt caching automatically. See why a model switch triggers a slow uncached turn, what `/compact` costs, why CLAUDE.md edits don't apply mid-session, and how to check your cache hit rate. |

**Use Claude Code**

| Page | File | What it covers |
| --- | --- | --- |
| How Claude remembers your project | `memory.md` | Give Claude persistent instructions with CLAUDE.md files, and let Claude accumulate learnings automatically with auto memory. |
| Manage sessions | `sessions.md` | Name, resume, branch, and switch between Claude Code conversations. Covers `--continue`, `--resume`, `--from-pr`, the `/resume` picker, session naming, exporting transcripts, and where transcripts are stored. |
| Common workflows | `common-workflows.md` | Step-by-step guides for exploring codebases, fixing bugs, refactoring, testing, and other everyday tasks with Claude Code. |
| Prompt library | `prompt-library.md` | Copy-paste prompts for Claude Code, tagged by task and role. |
| Best practices for Claude Code | `best-practices.md` | Tips and patterns for getting the most out of Claude Code, from configuring your environment to scaling across parallel sessions. |

**Platforms and integrations**

| Page | File | What it covers |
| --- | --- | --- |
| Platforms and integrations | `platforms.md` | Choose where to run Claude Code and what to connect it to. Compare the CLI, Desktop, VS Code, JetBrains, web, mobile, and integrations like Chrome, Slack, and CI/CD. |
| Continue local sessions from any device with Remote Control | `remote-control.md` | Continue a local Claude Code session from your phone, tablet, or any browser using Remote Control. Works with claude.ai/code and the Claude mobile app. |
| Claude Code on mobile | `mobile.md` | Start, monitor, and steer Claude Code tasks from your phone with the Claude app for iOS and Android. |
| Use Claude Code with Chrome | `chrome.md` | Connect Claude Code to your Chrome browser to test web apps, debug with console logs, automate form filling, and extract data from web pages. |
| Let Claude use your computer from the CLI | `computer-use.md` | Enable computer use in the Claude Code CLI so Claude can open apps, click, type, and see your screen on macOS. Test native apps, debug visual issues, and automate GUI-only tools without leaving your terminal. |
| Use Claude Code in VS Code | `vs-code.md` | Install and configure the Claude Code extension for VS Code. Get AI coding assistance with inline diffs, @-mentions, plan review, and keyboard shortcuts. |
| JetBrains IDEs | `jetbrains.md` | Use Claude Code with JetBrains IDEs including IntelliJ, PyCharm, WebStorm, and more |
| Claude Code in Slack | `slack.md` | Delegate coding tasks directly from your Slack workspace. Anthropic is retiring this earlier version for Team and Enterprise workspaces in favor of Claude Tag; it remains the setup path on Pro and Max plans. |
| Claude Tag | `claude-tag.md` | Bring Claude into your team's Slack channels with Claude Tag and find its setup and usage documentation on claude.com. |

**Claude Code on the web**

| Page | File | What it covers |
| --- | --- | --- |
| Get started with Claude Code on the web | `web-quickstart.md` | Run Claude Code in the cloud from your browser or phone. Connect a GitHub repository, submit a task, and review the PR without local setup. |
| Use Claude Code on the web | `claude-code-on-the-web.md` | Move sessions between web and terminal with `--cloud` and `--teleport`, manage and share sessions, and auto-fix pull requests from the cloud. |
| Automate work with routines | `routines.md` | Put Claude Code on autopilot. Define routines that run on a schedule, trigger on API calls, or react to GitHub events from cloud infrastructure. |
| Find bugs with ultrareview | `ultrareview.md` | Run a deep, multi-agent code review in the cloud with /code-review ultra to find and verify bugs before you merge. |

**Claude Code on desktop**

| Page | File | What it covers |
| --- | --- | --- |
| Get started with the desktop app | `desktop-quickstart.md` | Install Claude Code on desktop and start your first coding session |
| Desktop application | `desktop.md` | Get more out of Claude Code Desktop: parallel sessions with Git isolation, drag-and-drop pane layout, integrated terminal and file editor, side chats, computer use, Dispatch sessions from your phone, visual diff review, app previews, PR monitoring, connectors, and enterprise configuration. |
| Claude Desktop on Linux (beta) | `desktop-linux.md` | Install and update the Claude desktop app on Ubuntu and Debian |
| Claude Code Desktop in WSL | `desktop-wsl.md` | Run Code sessions inside a WSL 2 distribution on Windows |
| Schedule recurring tasks in Claude Code Desktop | `desktop-scheduled-tasks.md` | Set up scheduled tasks in Claude Code Desktop to run Claude automatically on a recurring basis for daily code reviews, dependency audits, or morning briefings. |
| Test iOS apps in the simulator | `desktop-ios-simulator.md` | Claude Code Desktop opens your app in the iOS Simulator pane when Claude builds, runs, or checks it, with a separate simulator for each session. |

**Code review & CI/CD**

| Page | File | What it covers |
| --- | --- | --- |
| Catch security issues as Claude writes code | `security-guidance.md` | Install the security-guidance plugin to have Claude review its own code changes for vulnerabilities and fix them in the same session. |
| Scan your codebase for vulnerabilities | `claude-security.md` | Install the Claude Security plugin to scan your codebase for vulnerabilities in a Claude Code session and turn findings into patches you review and apply. |
| Code Review | `code-review.md` | Set up automated PR reviews that catch logic errors, security vulnerabilities, and regressions using multi-agent analysis of your full codebase |
| Claude Code GitHub Actions | `github-actions.md` | Run Claude Code in GitHub Actions workflows to respond to @claude mentions, automate tasks, and turn issues into pull requests |
| Use Claude Code GitHub Actions with cloud providers | `github-actions-cloud-providers.md` | Run Claude Code GitHub Actions through Amazon Bedrock, Google Cloud's Agent Platform, or Microsoft Foundry instead of the Claude API |
| Claude Code with GitHub Enterprise Server | `github-enterprise-server.md` | Connect Claude Code to your self-hosted GitHub Enterprise Server instance for web sessions, code review, and plugin marketplaces. |
| Claude Code GitLab CI/CD | `gitlab-ci-cd.md` | Learn about integrating Claude Code into your development workflow with GitLab CI/CD |

### Build with Claude Code

**Agents and parallel work**

| Page | File | What it covers |
| --- | --- | --- |
| Run agents in parallel | `agents.md` | Compare the ways Claude Code can take on multiple tasks at once: subagents, agent view, agent teams, and dynamic workflows. |
| Create custom subagents | `sub-agents.md` | Create and use specialized AI subagents in Claude Code for task-specific workflows and improved context management. |
| Manage multiple agents with agent view | `agent-view.md` | Dispatch and manage many Claude Code sessions from one screen. Agent view shows what every session is doing and which ones need your input. |
| Orchestrate teams of Claude Code sessions | `agent-teams.md` | Coordinate multiple Claude Code instances working together as a team, with shared tasks, inter-agent messaging, and centralized management. |
| Message your other Claude Code sessions | `cross-session-messaging.md` | Let Claude list and message your other Claude Code sessions on this machine, and reach your sessions on other machines or on the web. |
| Orchestrate subagents at scale with dynamic workflows | `workflows.md` | Dynamic workflows orchestrate many subagents from a script Claude writes and you can rerun. Use them for codebase audits, large migrations, and cross-checked research. |
| Run parallel sessions with worktrees | `worktrees.md` | Isolate parallel Claude Code sessions in separate git worktrees so changes don't collide. Covers the `--worktree` flag, subagent isolation, `.worktreeinclude`, cleanup, and non-git VCS hooks. |

**MCP**

| Page | File | What it covers |
| --- | --- | --- |
| Connect to MCP servers | `mcp-quickstart.md` | Add an MCP server to Claude Code, verify the connection, and find the configuration on disk. |
| Connect Claude Code to tools via MCP | `mcp.md` | Learn how to connect Claude Code to your tools with the Model Context Protocol. |

**Skills**

| Page | File | What it covers |
| --- | --- | --- |
| Extend Claude with skills | `skills.md` | Create, manage, and share skills to extend Claude's capabilities in Claude Code. Includes custom commands and bundled skills. |

**Plugins**

| Page | File | What it covers |
| --- | --- | --- |
| Discover and install prebuilt plugins through marketplaces | `discover-plugins.md` | Find and install plugins from marketplaces to extend Claude Code with new skills, agents, and capabilities. |
| Create plugins | `plugins.md` | Create custom plugins to extend Claude Code with skills, agents, hooks, and MCP servers. |

**Artifacts**

| Page | File | What it covers |
| --- | --- | --- |
| Share session output as artifacts | `artifacts.md` | Artifacts turn Claude Code's work into live, interactive pages on claude.ai that you can keep private, share with your organization, or publish to a public link. |

**Automation**

| Page | File | What it covers |
| --- | --- | --- |
| Automate actions with hooks | `hooks-guide.md` | Run shell commands automatically when Claude Code edits files, finishes tasks, or needs input. Format code, send notifications, validate commands, and enforce project rules. |
| Push events into a running session with channels | `channels.md` | Use channels to push messages, alerts, and webhooks into your Claude Code session from an MCP server. Forward CI results, chat messages, and monitoring events so Claude can react while you're away. |
| Run prompts on a schedule | `scheduled-tasks.md` | Use /loop and the cron scheduling tools to run prompts repeatedly, poll for status, or set one-time reminders within a Claude Code session. |
| Keep Claude working toward a goal | `goal.md` | Set a completion condition with /goal and Claude keeps working until it's met, a model judges it impossible, or an error you have to fix clears the goal. |
| Run Claude Code programmatically | `headless.md` | Use the Agent SDK to run Claude Code programmatically from the CLI, Python, or TypeScript. |
| Launch sessions from links | `deep-links.md` | Open a Claude Code terminal session from a URL. Embed `claude-cli://` links in runbooks, alerts, and dashboards so a click opens Claude Code in the right repo with the right prompt. |

**Guides**

| Page | File | What it covers |
| --- | --- | --- |
| Set up Claude Code in a monorepo or large codebase | `large-codebases.md` | Configure Claude Code for monorepos and large single-tree codebases with nested CLAUDE.md files, sparse worktrees, code intelligence, and per-package skills so Claude stays focused on the code you're working in. |

**Troubleshooting**

| Page | File | What it covers |
| --- | --- | --- |
| Troubleshoot installation and login | `troubleshoot-install.md` | Fix command not found, PATH, permission, network, and authentication errors when installing or signing in to Claude Code. |
| Troubleshooting | `troubleshooting.md` | Fix high CPU or memory usage, hangs, auto-compact thrashing, and search problems in Claude Code, and find the right page for other issues. |
| Debug your configuration | `debug-your-config.md` | Diagnose why CLAUDE.md, settings, hooks, MCP servers, or skills aren't taking effect. Use /context, /doctor, /hooks, and /mcp to see what actually loaded. |
| Error reference | `errors.md` | Look up Claude Code runtime error messages with what each one means and how to fix it. |

### Administration

**Setup and access**

| Page | File | What it covers |
| --- | --- | --- |
| Set up Claude Code for your organization | `admin-setup.md` | A decision map for administrators deploying Claude Code, covering API providers, managed settings, policy enforcement, usage monitoring, and data handling. |
| Advanced setup | `setup.md` | System requirements, platform-specific installation, version management, and uninstallation for Claude Code. |
| Authentication | `authentication.md` | Log in to Claude Code and configure authentication for individuals, teams, and organizations. |
| Deploy managed settings | `managed-settings.md` | Deploy managed settings to every developer's machine: delivery mechanisms per OS, how Claude Code combines managed sources, and how to verify enforcement. |
| Configure server-managed settings | `server-managed-settings.md` | Centrally configure Claude Code for your organization through server-delivered settings, without requiring device management infrastructure. |
| Control MCP server access for your organization | `managed-mcp.md` | Restrict which MCP servers users can add or connect to with managed configuration files, allowlists, and denylists. |
| Configure auto mode | `auto-mode-config.md` | Tell the auto mode classifier which repos, buckets, and domains your organization trusts. Set environment context, override the default block and allow rules, and inspect your effective config with the auto-mode CLI subcommands. |

**Deployment**

| Page | File | What it covers |
| --- | --- | --- |
| Enterprise deployment overview | `third-party-integrations.md` | Learn how Claude Code can integrate with various third-party services and infrastructure to meet enterprise deployment requirements. |
| Feature availability | `feature-availability.md` | Compare which Claude Code features are available across Anthropic subscription plans, the Anthropic Console, Amazon Bedrock, Claude Platform on AWS, Google Cloud's Agent Platform, and Microsoft Foundry. |
| Claude Code on Amazon Bedrock | `amazon-bedrock.md` | Learn about configuring Claude Code through Amazon Bedrock, including setup, IAM configuration, and troubleshooting. |
| Claude Code on Claude Platform on AWS | `claude-platform-on-aws.md` | Configure Claude Code to use the Anthropic-operated Claude API with AWS authentication, IAM access control, and AWS Marketplace billing. |
| Claude Code on Google Cloud's Agent Platform | `google-vertex-ai.md` | Learn about configuring Claude Code through Google Cloud's Agent Platform, formerly Vertex AI, including setup, IAM configuration, and troubleshooting. |
| Claude Code on Microsoft Foundry | `microsoft-foundry.md` | Learn about configuring Claude Code through Microsoft Foundry, including setup, configuration, and troubleshooting. |
| Enterprise network configuration | `network-config.md` | Configure Claude Code for enterprise environments with proxy servers, custom Certificate Authorities (CA), and mutual Transport Layer Security (mTLS) authentication. |
| Run Claude Code behind a corporate launcher | `corporate-launcher.md` | Route the processes Claude Code starts from its own binary, including the background service and every agent view session, through a required launcher with CLAUDE_CODE_PROCESS_WRAPPER or the processWrapper setting. |
| Development containers | `devcontainer.md` | Run Claude Code inside a dev container for consistent, isolated environments across your team. |

**Gateways**

| Page | File | What it covers |
| --- | --- | --- |
| Run Claude Code through a gateway | `gateways.md` | Route Claude Code through a self-hosted gateway for centralized credentials, usage tracking, and cost controls. Covers the architecture, Anthropic's Claude apps gateway, and using other gateway products. |

**Other gateways**

| Page | File | What it covers |
| --- | --- | --- |
| Other LLM gateways | `llm-gateway.md` | Route Claude Code through an LLM gateway your organization already runs. Covers connecting Claude Code to a gateway, rolling one out for your organization, and what Claude Code sends to a gateway. |
| Connect Claude Code to an LLM gateway | `llm-gateway-connect.md` | Point Claude Code at your organization's LLM gateway. Check whether your admin already configured it, or set the base URL and credential yourself, then verify the connection and fix gateway errors. |
| Roll out an LLM gateway for your organization | `llm-gateway-rollout.md` | Deploy a gateway product for Claude Code: configure it to forward what Claude Code sends, issue developer credentials, distribute the configuration through managed settings, and verify the rollout. |
| Claude Code gateway compatibility guide | `llm-gateway-protocol.md` | Keep an LLM gateway compatible with Claude Code: the endpoints it calls, the headers and body fields to forward, and what breaks when they're stripped. |

**Usage and costs**

| Page | File | What it covers |
| --- | --- | --- |
| Monitoring | `monitoring-usage.md` | Learn how to enable and configure OpenTelemetry for Claude Code. |
| Manage costs effectively | `costs.md` | Track token usage, set team spend limits, and reduce Claude Code costs with context management, model selection, extended thinking settings, and preprocessing hooks. |
| Track team usage with analytics | `analytics.md` | View Claude Code usage metrics, track adoption, and measure engineering velocity in the analytics dashboard. |

**Plugin distribution**

| Page | File | What it covers |
| --- | --- | --- |
| Create and distribute a plugin marketplace | `plugin-marketplaces.md` | Build and host plugin marketplaces to distribute Claude Code extensions across teams and communities. |
| Constrain plugin dependency versions | `plugin-dependencies.md` | Declare version constraints on plugin dependencies, and bundle a curated plugin set behind one install. |
| Recommend your plugin from your CLI | `plugin-hints.md` | Emit a one-line marker from your CLI so Claude Code prompts users to install your official plugin. |
| Recommend plugins for your org | `plugin-relevance.md` | Add a relevance block to marketplace plugin entries so Claude Code suggests them when a user's work matches. |

**Security and data**

| Page | File | What it covers |
| --- | --- | --- |
| Security | `security.md` | Learn about Claude Code's security safeguards and best practices for safe usage. |
| Data usage | `data-usage.md` | Learn about Anthropic's data usage policies for Claude |
| Zero data retention | `zero-data-retention.md` | Learn about Zero Data Retention (ZDR) for Claude Code, available to qualified accounts on Claude for Enterprise, including scope, disabled features, and how to request enablement. |

### Configuration

**Settings**

| Page | File | What it covers |
| --- | --- | --- |
| Claude Code settings | `settings.md` | Change Claude Code settings, pick the scope a key belongs in, verify the change, and learn which value Claude Code uses when a key is set in several places. |
| Claude Code settings reference | `settings-reference.md` | Complete reference for every Claude Code settings.json key: where each one goes, its type and default, and a paste-ready example, with an index of every key. |
| Example settings files | `settings-example.md` | Realistic settings.json files for a developer, a team, and an organization: copy one, keep the keys you want, and change the values. |

**Permissions and sandboxing**

| Page | File | What it covers |
| --- | --- | --- |
| Configure permissions | `permissions.md` | Control what Claude Code can access and do with fine-grained permission rules, modes, and managed policies. |
| Choose a permission mode | `permission-modes.md` | Control whether Claude asks before acting. Switch permission modes with Shift+Tab in the CLI, the mode indicator in VS Code, or the mode selector in Desktop. |
| Configure the sandboxed Bash tool | `sandboxing.md` | Learn how Claude Code's sandboxed Bash tool provides filesystem and network isolation for safer, more autonomous agent execution. |
| Choose a sandbox environment | `sandbox-environments.md` | Compare Claude Code sandbox options: the built-in sandboxed Bash tool, sandbox runtime, dev containers, Docker, and VMs. Choose the right isolation for your threat model. |

**Environments**

| Page | File | What it covers |
| --- | --- | --- |
| Configure cloud environments | `cloud-environments.md` | Configure cloud environments for Claude Code cloud sessions: network access levels, environment variables, setup scripts, and environment caching. |

**Self-hosted environments**

| Page | File | What it covers |
| --- | --- | --- |
| Self-hosted environments | `self-hosted-environments.md` | Run Claude Code cloud sessions on infrastructure you control: set up a self-hosted environment, deploy runners, and route sessions to your own compute. |
| Self-hosted environments quickstart | `self-hosted-environments-quickstart.md` | Set up your first self-hosted environment: install Claude Code, create the environment, start a runner, and route a session to it. |
| Deploy self-hosted environments to production | `self-hosted-environments-deploy.md` | Run self-hosted runners in production: security hardening, network egress control, git credentials, Kubernetes and Compose recipes, and troubleshooting. |
| Customize sessions in self-hosted environments | `self-hosted-environments-configuration.md` | Customize self-hosted environment sessions with wrapper scripts for per-session credentials, lifecycle hooks, and on-demand runner spawning. |
| Test self-hosted environments end to end | `self-hosted-environments-testing.md` | Verify a self-hosted runner image from CI: dispatch a session with the CLI, read Claude's replies through a Stop hook, and script the full loop. |
| Self-hosted environments reference | `self-hosted-environments-reference.md` | Complete reference for the self-hosted runner and orchestrator: CLI flags, environment variables, and Prometheus metrics. |
| Verify session identity in self-hosted environments | `self-hosted-environments-identity.md` | Verify the CLAUDE_CODE_SESSION_ACCESS_TOKEN JWT so services on your network can trust requests from sessions in your self-hosted environment. |

**Model and responses**

| Page | File | What it covers |
| --- | --- | --- |
| Model configuration | `model-config.md` | Configure which model Claude Code uses, effort levels, extended context, and the auto-compact window |
| Speed up responses with fast mode | `fast-mode.md` | Get faster Opus responses in Claude Code by toggling fast mode. |
| Escalate hard decisions with the advisor tool | `advisor.md` | Pair your main model with a stronger advisor model that Claude consults at key moments during a task. |
| Output styles | `output-styles.md` | Adapt Claude Code for uses beyond software engineering |

**Interface**

| Page | File | What it covers |
| --- | --- | --- |
| Configure your terminal for Claude Code | `terminal-config.md` | Fix Shift+Enter for newlines, get a terminal bell when Claude finishes, configure tmux, match the color theme, and enable Vim mode in the Claude Code CLI. |
| Fullscreen rendering | `fullscreen.md` | Enable a smoother, flicker-free rendering mode with mouse support and stable memory usage in long conversations. |
| Use Claude Code with a screen reader | `accessibility.md` | Set up Claude Code for screen readers such as VoiceOver and NVDA, plus settings for screen magnifiers, reduced motion, and colorblind-friendly themes. |
| Voice dictation | `voice-dictation.md` | Speak your prompts in the Claude Code CLI with hold-to-record or tap-to-record voice dictation. |
| Customize your status line | `statusline.md` | Configure a custom status bar to monitor context window usage, costs, and git status in Claude Code |
| Customize keyboard shortcuts | `keybindings.md` | Customize keyboard shortcuts in Claude Code with a keybindings configuration file. |

### Reference

| Page | File | What it covers |
| --- | --- | --- |
| CLI reference | `cli-reference.md` | Complete reference for Claude Code command-line interface, including commands and flags. |
| Commands | `commands.md` | Complete reference for commands available in Claude Code, including built-in commands and bundled skills. |
| Environment variables | `env-vars.md` | Reference for environment variables that control Claude Code behavior. |
| Tools reference | `tools-reference.md` | Complete reference for the tools Claude Code can use, including permission requirements and per-tool behavior. |
| Interactive mode | `interactive-mode.md` | Complete reference for keyboard shortcuts, input modes, and interactive features in Claude Code sessions. |
| Checkpointing | `checkpointing.md` | Track, rewind, and summarize Claude's edits and conversation to manage session state. |
| Hooks reference | `hooks.md` | Reference for Claude Code hook events, configuration schema, JSON input/output formats, exit codes, async hooks, HTTP hooks, prompt hooks, and MCP tool hooks. |
| Plugins reference | `plugins-reference.md` | Complete technical reference for Claude Code plugin system, including schemas, CLI commands, and component specifications. |
| Channels reference | `channels-reference.md` | Build an MCP server that pushes webhooks, alerts, and chat messages into a Claude Code session. Reference for the channel contract: capability declaration, notification events, reply tools, sender gating, and permission relay. |

**Glossary**

| Page | File | What it covers |
| --- | --- | --- |
| Glossary | `glossary.md` | Definitions for Claude Code terminology. Learn what agentic loop, compaction, CLAUDE.md, hooks, subagents, MCP, and other core concepts mean. |

### Agent SDK

| Page | File | What it covers |
| --- | --- | --- |
| Agent SDK overview | `agent-sdk-overview.md` | Build production AI agents with Claude Code as a library |
| Quickstart | `agent-sdk-quickstart.md` | Get started with the Python or TypeScript Agent SDK to build AI agents that work autonomously |
| Migrate to Claude Agent SDK | `agent-sdk-migration-guide.md` | Guide for migrating the Claude Code TypeScript and Python SDKs to the Claude Agent SDK |
| Troubleshoot the Agent SDK | `agent-sdk-troubleshooting.md` | Fix Agent SDK errors by the exact message you see, with the cause and fix for each error in the TypeScript and Python SDKs. |

**Build agents**

| Page | File | What it covers |
| --- | --- | --- |
| Examples | `agent-sdk-examples.md` | Find a complete, runnable Agent SDK project or a guided recipe in the Claude Cookbook that matches what you want to build. |

**Core concepts**

| Page | File | What it covers |
| --- | --- | --- |
| How the agent loop works | `agent-sdk-agent-loop.md` | Understand the message lifecycle, tool execution, context window, and architecture that power your SDK agents. |
| Use Claude Code features in the SDK | `agent-sdk-claude-code-features.md` | Load project instructions, skills, hooks, and other Claude Code features into your SDK agents. |
| Work with sessions | `agent-sdk-sessions.md` | How sessions persist agent conversation history, and when to use continue, resume, and fork to return to a prior run. |
| Persist sessions to external storage | `agent-sdk-session-storage.md` | Mirror session transcripts to S3, Redis, or your own backend so other hosts can resume your sessions. |

**Input and output**

| Page | File | What it covers |
| --- | --- | --- |
| Streaming Input | `agent-sdk-streaming-vs-single-mode.md` | Understanding the two input modes for Claude Agent SDK and when to use each |
| Handle approvals and user input | `agent-sdk-user-input.md` | Surface Claude's approval requests and clarifying questions to users, then return their decisions to the SDK. |
| Stream responses in real-time | `agent-sdk-streaming-output.md` | Get real-time responses from the Agent SDK as text and tool calls stream in |
| Get structured output from agents | `agent-sdk-structured-outputs.md` | Return validated JSON from agent workflows using JSON Schema, Zod, or Pydantic. Get type-safe, structured data after multi-turn tool use. |

**Extend with tools**

| Page | File | What it covers |
| --- | --- | --- |
| Give Claude custom tools | `agent-sdk-custom-tools.md` | Define custom tools with the Claude Agent SDK's in-process MCP server so Claude can call your functions, hit your APIs, and perform domain-specific operations. |
| Connect to external tools with MCP | `agent-sdk-mcp.md` | Configure MCP servers to extend your agent with external tools. Covers transport types, tool search for large tool sets, authentication, and error handling. |
| Scale to many tools with tool search | `agent-sdk-tool-search.md` | Scale your agent to thousands of tools by discovering and loading only what's needed, on demand. |
| Subagents in the SDK | `agent-sdk-subagents.md` | Define and invoke subagents to isolate context, run tasks in parallel, and apply specialized instructions in your Claude Agent SDK applications. |

**Customize behavior**

| Page | File | What it covers |
| --- | --- | --- |
| Modifying system prompts | `agent-sdk-modifying-system-prompts.md` | Choose between the `claude_code` preset and a custom system prompt, and customize behavior with CLAUDE.md, output styles, append, or a fully custom prompt. |
| Extend agents with skills | `agent-sdk-skills.md` | Control which skills Claude can invoke in Claude Agent SDK sessions, dispatch commands by name, and author skills your sessions discover |
| Plugins in the SDK | `agent-sdk-plugins.md` | Load custom plugins to extend Claude Code with skills, agents, hooks, and MCP servers through the Agent SDK |

**Control and observability**

| Page | File | What it covers |
| --- | --- | --- |
| Configure permissions | `agent-sdk-permissions.md` | Control how your agent uses tools with permission modes, hooks, and declarative allow/deny rules. |
| Intercept and control agent behavior with hooks | `agent-sdk-hooks.md` | Intercept and customize agent behavior at key execution points with hooks |
| Rewind file changes with checkpointing | `agent-sdk-file-checkpointing.md` | Track file changes during agent sessions and restore files to any previous state |
| Track cost and usage | `agent-sdk-cost-tracking.md` | Learn how to track token usage, estimate costs, and configure prompt caching with the Claude Agent SDK. |
| Observability with OpenTelemetry | `agent-sdk-observability.md` | Export traces, metrics, and events from the Agent SDK to your observability backend using OpenTelemetry. |
| Track todos | `agent-sdk-todo-tracking.md` | Track todos in Agent SDK sessions and render Claude's progress in your application from structured tool calls |

**Deployment**

| Page | File | What it covers |
| --- | --- | --- |
| Hosting the Agent SDK | `agent-sdk-hosting.md` | Deploy the Agent SDK in production: subprocess architecture, session persistence, scaling, observability, and multi-tenant isolation for Docker, Kubernetes, and sandbox providers. |
| Securely deploying AI agents | `agent-sdk-secure-deployment.md` | A guide to securing Claude Code and Agent SDK deployments with isolation, credential management, and network controls |

**SDK references**

| Page | File | What it covers |
| --- | --- | --- |
| Agent SDK reference - TypeScript | `agent-sdk-typescript.md` | Complete API reference for the TypeScript Agent SDK, including all functions, types, and interfaces. |
| TypeScript SDK V2 session API (removed) | `agent-sdk-typescript-v2-preview.md` | Reference for the removed V2 TypeScript Agent SDK session API, with session-based send/stream patterns for multi-turn conversations. |
| Agent SDK reference - Python | `agent-sdk-python.md` | Complete API reference for the Python Agent SDK, including all functions, types, and classes. |

### Resources

| Page | File | What it covers |
| --- | --- | --- |
| Legal and compliance | `legal-and-compliance.md` | Legal agreements, compliance certifications, and security information for Claude Code. |

