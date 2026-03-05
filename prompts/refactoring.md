# Refactoring Prompt

Use this prompt to improve code structure, readability, or maintainability without changing behaviour.

---

## Prompt

```
Please refactor the following code. The external behaviour must remain identical.

**Goals for this refactor (select the ones that apply):**
- [ ] Improve readability and naming
- [ ] Reduce duplication (DRY)
- [ ] Simplify complex conditionals
- [ ] Break large functions into smaller ones
- [ ] Improve separation of concerns
- [ ] Make the code easier to test
- [ ] Improve error handling
- [ ] Other: <DESCRIBE>

**Constraints:**
- Do NOT change the public API / function signatures unless discussed.
- Do NOT upgrade dependency versions.
- Keep changes minimal — do not refactor unrelated code.

**Code to refactor:**
<code>
PASTE CODE HERE
</code>

**Please provide:**
1. The refactored code.
2. A brief explanation of each change made and why.
3. Any risks or trade-offs introduced by the refactor.
```

---

## Variations

### Extract function
```
Extract the logic between the comments `// START` and `// END` into a well-named helper function.
Keep the original call site working identically.

<code>
PASTE CODE HERE
</code>
```

### Simplify conditionals
```
Simplify the conditional logic in this function. Use early returns, guard clauses, or
lookup tables where appropriate. Do not change the output for any input.

<code>
PASTE CODE HERE
</code>
```

### Improve naming
```
Improve variable, function, and class names in this code to better express intent.
Follow the project's naming conventions (camelCase for variables, PascalCase for classes).
Do not change any logic.

<code>
PASTE CODE HERE
</code>
```
