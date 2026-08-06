# Product and system specifications

This folder defines current approved product and system behavior.

## Areas

The list below is built by `node .claude/tools/memory-index-build.mjs` from the
documents in this folder, so it cannot fall out of step with them. Do not
hand-edit it. The prose around it is written by hand and is left alone.

This repository fills specifications as work happens rather than up front. A
capability gets its specification the first time an issue changes what that
capability does. Nine specifications were deliberately not written for the nine
plugins at setup: each plugin's `README.md` stays the description a person
reads, and it links to the capability specification once one exists.

## How to use these specifications

- Read the relevant current specification before changing behavior.
- Keep approved behavior, implementation, and tests aligned.
- Follow links to discovery, decisions, knowledge, domain material, planning,
  and operations when they matter.

## Documents

- [How the memory system works](memory-system.md): The design for saving and
  reading persistent information in a project: the folders, what goes in each,
  who may write to them, what every file looks like, how files link to each
  other, and what every session knows at startup.
