#!/usr/bin/env node
// UserPromptSubmit hook: reads the hook input JSON on stdin and prints the engine's JSON output.
import { runHookFromStdin } from '../engine/hooks.mjs';

await runHookFromStdin('UserPromptSubmit');
