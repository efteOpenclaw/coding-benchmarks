---
name: test-writing
description: How to write API route tests, component tests, database tests, and validation tests. Use when writing actual test files. Covers assertion patterns, testing categories per endpoint, React Testing Library usage, error path coverage, and mocking strategy.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Test Writing — API Routes, Components, Database, Validators

How to write each type of test. Read `test-infrastructure` skill first for setup.

---

## 1. The AAA Pattern

Every test follows **Arrange → Act → Assert**, separated by blank lines:

```typescript
it("rejects duplicate email registration", async () => {
  // Arrange
  const user = await createUser({ email: "taken@test.com" });

  // Act
  const response = await POST(
    createRequest("/api/auth/register", {
      method: "POST",
      body: { email: "taken@test.com", password: "password123" },
    })
  );
  const body = await response.json();

  // Assert
  expect(response.status).toBe(409);
  expect(body).toEqual({
    success: false,
    error: { code: "CONFLICT", message: expect.any(String) },
  });
});
```

---

## 2. Assertion Quality Rules

**DO: Assert on behavior and contracts**
```typescript
expect(body).toEqual({
  success: true,
  data: { id: expect.any(String), email: "test@test.com", createdAt: expect.any(String) },
});
expect(body.data).not.toHaveProperty("passwordHash");
```

**DON'T: Assert on implementation details**
```typescript
expect(component.state.isLoading).toBe(true);  // BAD — internal state
expect(result).toBeTruthy();                     // BAD — proves nothing
expect(mockFn).toHaveBeenCalledTimes(1);         // BAD unless call count IS the behavior
```

**Use precise matchers:**
```typescript
expect(button).toBeDisabled();              // not: expect(button.disabled).toBe(true)
expect(input).toHaveValue("hello");         // not: expect(input.value).toBe("hello")
```

**Use `expect.objectContaining` for partial matching:**
```typescript
expect(task).toEqual(
  expect.objectContaining({ title: "My Task", status: "todo" })
);
```

---

## 3. Testing API Routes

### Checklist per endpoint

```
□ Happy path — correct status code, response shape, DB state
□ Authentication — 401 when unauthenticated
□ Authorization — 404 when accessing another user's resource
□ Validation — 400 for each invalid field (test individually)
□ Not found — 404 for non-existent resource
□ Conflict — 409 for duplicate creation
□ Error shape — every error returns { success: false, error: { code, message } }
□ Security — response doesn't leak sensitive fields (password_hash)
```

### Example: Complete route test

```typescript
describe("POST /api/auth/register", () => {
  beforeEach(() => resetDb());

  it("creates user and returns 201", async () => {
    const res = await POST(createRequest("/api/auth/register", {
      method: "POST", body: { email: "new@test.com", password: "password123" },
    }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).not.toHaveProperty("passwordHash");
  });

  it("returns 409 for duplicate email", async () => {
    await createUser({ email: "taken@test.com" });
    const res = await POST(createRequest("/api/auth/register", {
      method: "POST", body: { email: "taken@test.com", password: "password123" },
    }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("CONFLICT");
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(createRequest("/api/auth/register", {
      method: "POST", body: { email: "not-an-email", password: "password123" },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
```

---

## 4. Testing Components

### React Testing Library query priority

1. `getByRole` — accessible to everyone
2. `getByLabelText` — for form fields
3. `getByText` — for non-interactive content
4. `getByTestId` — **last resort only**

### Use `userEvent` over `fireEvent`

```typescript
import userEvent from "@testing-library/user-event";

it("submits form with entered data", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<TaskForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText("Title"), "My Task");
  await user.click(screen.getByRole("button", { name: /create/i }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ title: "My Task" })
  );
});
```

### Component test checklist

```
□ Renders expected content with given props
□ User interactions trigger correct callbacks
□ Loading states, error states, empty states
□ Conditional rendering
□ Form validation feedback
□ Accessibility (labels linked to inputs, buttons have names)
```

### Accessibility check (add to every component test file)

```typescript
import { axe } from "vitest-axe";

it("has no accessibility violations", async () => {
  const { container } = render(<TaskForm />);
  expect(await axe(container)).toHaveNoViolations();
});
```

---

## 5. Testing Database Operations

### What to test

```
□ CRUD operations return correct shapes
□ Constraints enforced (unique, not null, foreign key)
□ Queries filter correctly (by user, by status)
□ Sort orders work
□ Cascade deletes work
□ Edge cases (empty result, non-existent ID)
□ Parameterized queries (no SQL injection)
```

### Example

```typescript
it("only returns tasks belonging to the requesting user", () => {
  const user1 = createUser();
  const user2 = createUser();
  createTask({ userId: user1.id, title: "User 1 task" });
  createTask({ userId: user2.id, title: "User 2 task" });

  const tasks = getTasksByUserId(user1.id);

  expect(tasks).toHaveLength(1);
  expect(tasks[0].title).toBe("User 1 task");
});
```

---

## 6. Error Path Coverage

Use `it.each` for boundary value testing:

```typescript
it.each([
  ["", false, "empty string"],
  ["a", true, "minimum valid"],
  ["a".repeat(200), true, "at maximum"],
  ["a".repeat(201), false, "exceeds maximum"],
])("title '%s' valid=%s (%s)", (title, shouldBeValid) => {
  const result = createTaskSchema.safeParse({ title });
  expect(result.success).toBe(shouldBeValid);
});
```

### Error path checklist per endpoint

```
□ Missing each required field (test individually)
□ Wrong type for each field
□ Empty values (empty string, null, undefined)
□ Boundary values (0, -1, MAX, very long strings)
□ Invalid enum values
□ Invalid date formats
□ Unauthenticated request
□ Wrong user's resource
□ Non-existent resource ID
□ Duplicate creation (conflict)
```

---

## 7. Mocking Strategy

**Always real:** Pure functions, validators, Zod schemas, DB queries (integration tests)

**Mock these:** External HTTP (use MSW), time (`vi.useFakeTimers`), non-deterministic values, auth sessions

**Never mock what you're testing:**
```typescript
// BAD — proves nothing
vi.mock("@/lib/db");
vi.mocked(db.createUser).mockReturnValue(fakeUser);
expect(createUser(input)).toEqual(fakeUser);

// GOOD — real DB, real behavior
const user = createUser({ email: "test@test.com" });
expect(user.email).toBe("test@test.com");
```

---

## 8. Test Naming

Tests read as behavior specifications:

```typescript
// GOOD
it("creates a task with default status 'todo'")
it("returns 404 when task belongs to different user")

// BAD
it("works correctly")
it("should call the function")
```

Structure with describe blocks by auth state:

```typescript
describe("POST /api/tasks", () => {
  describe("when authenticated", () => {
    it("creates task with required fields only", async () => {});
    it("returns 400 for empty title", async () => {});
  });
  describe("when not authenticated", () => {
    it("returns 401", async () => {});
  });
});
```
