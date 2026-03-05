# Debugging Prompt

Use this prompt to methodically diagnose and fix a bug with Claude's help.

---

## Prompt

```
I have a bug I need help debugging. Please follow a methodical approach.

**Bug report:**
- What is the expected behaviour?
  <expected>
  DESCRIBE EXPECTED BEHAVIOUR
  </expected>
- What is the actual behaviour?
  <actual>
  DESCRIBE ACTUAL BEHAVIOUR
  </actual>
- Steps to reproduce:
  <steps>
  1. STEP ONE
  2. STEP TWO
  </steps>
- Error message or stack trace (if any):
  <error>
  PASTE ERROR HERE
  </error>

**Relevant code:**
<code>
PASTE RELEVANT CODE HERE
</code>

**Please:**
1. Hypothesise the most likely root causes (rank them by likelihood).
2. For the top hypothesis, explain what evidence would confirm or rule it out.
3. Suggest the minimal fix once the root cause is confirmed.
4. Identify any related areas that could be affected by the same bug.
```

---

## Variations

### Quick fix (small isolated bug)
```
This code is producing the wrong output. Find the bug and fix it.
Expected: <EXPECTED>
Actual: <ACTUAL>

<code>
PASTE CODE HERE
</code>
```

### Intermittent / race condition bug
```
I have an intermittent bug that is hard to reproduce. It may be a race condition or
timing issue. Please analyse the code and identify any non-deterministic behaviour,
shared state issues, or missing synchronisation.

<code>
PASTE CODE HERE
</code>
```
