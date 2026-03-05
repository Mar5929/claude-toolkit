# Test Generation Prompt

Use this prompt to ask Claude to generate unit tests, integration tests, or end-to-end tests.

---

## Prompt

```
Generate comprehensive tests for the following code.

**Test framework:** <e.g. Vitest / Jest / Pytest / Go testing>
**Test type:** <Unit | Integration | End-to-end>

**Code under test:**
<code>
PASTE CODE HERE
</code>

**Requirements:**
1. Cover the happy path (expected inputs and outputs).
2. Cover edge cases (empty input, nulls, boundary values, max/min).
3. Cover error paths (invalid inputs, thrown exceptions, rejected promises).
4. Each test should have a clear, descriptive name that states what is being tested and the expected outcome.
5. Tests should be independent — no shared mutable state between tests.
6. Use mocks/stubs for external dependencies (databases, HTTP calls, file system).

**Output:** Provide the complete test file, ready to run.
```

---

## Variations

### Generate tests for a REST endpoint
```
Generate integration tests for the following Express.js route handler using Supertest.
Test all HTTP methods, status codes, and response shapes.
Mock the database layer.

<code>
PASTE ROUTE HANDLER HERE
</code>
```

### Generate property-based tests
```
Generate property-based tests for the following pure function using fast-check.
Identify invariants that should hold for all valid inputs and encode them as properties.

<code>
PASTE FUNCTION HERE
</code>
```

### Add missing test cases
```
Here is an existing test file. Identify and add the missing test cases.
Do not modify existing tests. Only add new `it` / `test` blocks.

<existing tests>
PASTE EXISTING TESTS HERE
</existing tests>

<code under test>
PASTE SOURCE CODE HERE
</code under test>
```
