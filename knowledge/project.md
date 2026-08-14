# Claude Toolkit

This repository is Mike's single source of truth for reusable Claude and Codex project workflows, packaged as an installable plugin marketplace.

## Why it exists

Useful rules, skills, hooks, tools, and setup flows should be designed once,
kept current in one place, and installed consistently across projects and
machines.

## Current goal and boundaries

- Keep the toolkit's plugins installable from `main`.
- Make project setup, project sync, machine setup, knowledge, work tracking,
  Git workflows, handoffs, and Salesforce guidance reusable without mixing
  their responsibilities.
- Keep project Markdown and Git authoritative. Do not add hidden databases,
  private agent memory, or background writers as a second source of truth.
- Keep retired material under `archive/` as history, never current guidance.

## Main workstreams

- Set up and sync projects and machines with the toolkit.
- Maintain shared project knowledge, work tracking, Git, and handoff workflows.
- Provide guard hooks and plain-language communication tools.
- Carry reusable Salesforce architecture and delivery guidance where a project
  needs it.

## What finished work looks like

A change is complete when its packaged source, this repository's installed
copy, the catalogs that lead to it, and the relevant checks all agree. A merged
change reaches other machines through a marketplace refresh and reaches an
existing project through `project-sync`.

## Who is involved

- **Mike Rihm** owns the toolkit and approves its direction and persistent project
  knowledge.
- **Claude and Codex** build, review, test, and maintain the toolkit under the
  same repository rules.

## Where active work is tracked

The `Claude-Toolkit-Project` board on GitHub owns ticket status, blockers,
assignments, branches, pull requests, and landing proof. Issue bodies hold
functional requirements; issue comments hold implementation progress and
decisions made while building.
