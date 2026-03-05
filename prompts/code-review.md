# Code Review Prompt

Use this prompt to ask Claude to review a diff, a file, or a pull request.

---

## Prompt

```
Please review the following code and provide structured feedback.

**Focus areas (check each):**
1. **Correctness** – Does the logic do what is intended? Are there off-by-one errors, null-pointer risks, or incorrect assumptions?
2. **Security** – Are there injection vulnerabilities, improper input validation, exposed secrets, or insecure defaults?
3. **Performance** – Are there obvious bottlenecks, N+1 queries, unnecessary allocations, or blocking calls?
4. **Readability** – Is the code easy to understand? Are names clear? Are comments accurate and necessary?
5. **Test coverage** – Are edge cases and error paths tested? Are existing tests likely to catch regressions?
6. **Style / conventions** – Does the code follow the project's coding standards?

**Output format:**
- Use the headings above.
- For each issue found, include: the line or function, a description of the problem, and a suggested fix.
- Rate overall quality: Approved / Approved with minor comments / Changes requested.

<code>
PASTE CODE OR DIFF HERE
</code>
```

---

## Variations

### Quick review (style + correctness only)
```
Review this code for correctness and style. List issues as bullet points with line numbers.
Keep feedback concise — no more than one sentence per issue.

<code>
PASTE CODE HERE
</code>
```

### Security-focused review
```
Perform a security-focused review of the following code.
Identify any vulnerabilities using the OWASP Top 10 as a guide.
For each finding: describe the vulnerability, explain the risk, and suggest a fix.

<code>
PASTE CODE HERE
</code>
```
