import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login-page";
import { DocumentsPage } from "./pages/documents-page";

const TENANT_A_USER = {
  email: "themba@bossman.com",
  password: "octro@123",
};

const TENANT_B_USER = {
  email: "carol@carrim.com",
  password: "octro@123",
};

test.describe("Auth", () => {
  test("logs in with a known seeded user and reaches the documents screen", async ({
    page,
  }) => {
    const login = new LoginPage(page);
    await login.goto();

    await login.login(TENANT_A_USER.email, TENANT_A_USER.password);
    await expect(page.getByTestId("nav-documents")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("shows a clear error on invalid credentials and does not navigate away from login", async ({
    page,
  }) => {
    const login = new LoginPage(page);
    await login.goto();

    await login.login(TENANT_A_USER.email, "wrong-password");

    await expect(login.errorMessage).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects an unauthenticated visit to /documents back to /login", async ({
    page,
  }) => {
    await page.goto("/documents");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Documents — core lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(TENANT_A_USER.email, TENANT_A_USER.password);
    await expect(page.getByTestId("nav-documents")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.getByTestId("nav-documents").click();
    await expect(page).toHaveURL(/\/documents/);
  });

  test("lists documents for the logged-in user's tenant", async ({ page }) => {
    const documents = new DocumentsPage(page);
    await expect(documents.rows().first()).toBeVisible();
    await expect(
      documents.rowByTitle(
        "Q3 Financial Statements - " + TENANT_A_USER.email.split("@")[0],
      ),
    ).toBeVisible();
  });

  test("searches documents by title", async ({ page }) => {
    const documents = new DocumentsPage(page);
    await expect(documents.rows().first()).toBeVisible();
    const rowCountBefore = await documents.rows().count();
    expect(rowCountBefore).toBeGreaterThan(0);

    await documents.search(TENANT_A_USER.email.split("@")[0]);

    const visibleTitles = await documents.rows().allTextContents();
    expect(
      visibleTitles.every((text) =>
        text.toLowerCase().includes(TENANT_A_USER.email.split("@")[0]),
      ),
    ).toBe(true);
  });

  // test("moves a document through its status lifecycle: draft -> awaiting_signature -> signed", async ({ page }) => {
  //   const documents = new DocumentsPage(page);

  //   const title = "Payroll Reconciliation - March 2026";

  //   await expect(documents.statusBadge(title)).toHaveText(/draft/i);

  //   await documents.setStatus(title, "awaiting_signature");
  //   await expect(documents.statusBadge(title)).toHaveText(/awaiting_signature/i);

  //   await documents.setStatus(title, "signed");
  //   await expect(documents.statusBadge(title)).toHaveText(/signed/i);
  // });

  // Optional per the brief ("Create a new document" is a stretch goal) —
  // delete this test if you didn't build the create flow.
  test("creates a new document, which appears in the list as 'draft'", async ({
    page,
  }) => {
    const documents = new DocumentsPage(page);
    const title = `E2E Test Document - ${TENANT_A_USER.email.split("@")[0]} - ${Date.now()}`;

    await documents.createDocument(title);

    await expect(documents.rowByTitle(title)).toBeVisible();
    await expect(documents.statusBadge(title)).toHaveText(/draft/i);
  });
});

test.describe("Tenant isolation — through the real UI, not just the API", () => {
  test("a tenant B user never sees tenant A's documents in the list or via search", async ({
    page,
  }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(TENANT_B_USER.email, TENANT_B_USER.password);
    await expect(page.getByTestId("nav-documents")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.getByTestId("nav-documents").click();
    await expect(page).toHaveURL(/\/documents/);

    const documents = new DocumentsPage(page);
    await expect(documents.rows().first()).toBeVisible();
    await expect(
      documents.rowByTitle(
        "Q3 Financial Statements - " + TENANT_A_USER.email.split("@")[0],
      ),
    ).toHaveCount(0);

    await documents.search(TENANT_A_USER.email.split("@")[0]);
    await expect(documents.rows()).toHaveCount(0);
  });
});
