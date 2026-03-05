# Documentation Prompt

Use this prompt to write or improve inline comments, JSDoc/docstrings, README sections, or
API reference documentation.

---

## Prompt

```
Write documentation for the following code.

**Documentation type (select one):**
- [ ] Inline comments (explain the why, not the what)
- [ ] JSDoc / docstring (parameters, return value, throws, examples)
- [ ] README section (usage guide for end users)
- [ ] API reference (endpoint description, request/response schema)

**Audience:** <e.g. junior developers on the team | external API consumers>

**Code to document:**
<code>
PASTE CODE HERE
</code>

**Requirements:**
- Be concise and accurate.
- Explain non-obvious logic and design decisions, not self-evident code.
- Include at least one usage example where appropriate.
- Use present tense ("Returns the user…", not "Will return the user…").
```

---

## Variations

### Add JSDoc to a function
```
Add JSDoc comments to the following TypeScript function.
Include: @param (with type and description), @returns, @throws (if applicable), and @example.

<code>
PASTE FUNCTION HERE
</code>
```

### Write a README usage section
```
Write a "Getting Started" section for a README.
The section should include: prerequisites, installation steps, a minimal working example,
and a link to further documentation.

Context about the project:
<context>
DESCRIBE THE PROJECT
</context>
```

### Improve existing documentation
```
The following documentation is unclear or outdated. Rewrite it to be accurate, concise,
and easy to understand. Do not change the code itself.

<docs>
PASTE EXISTING DOCS HERE
</docs>

<code>
PASTE CURRENT CODE HERE
</code>
```
