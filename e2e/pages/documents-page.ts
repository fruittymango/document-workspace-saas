import type { Page, Locator } from "@playwright/test";

export type DocumentStatus = "draft" | "awaiting_signature" | "signed";

export class DocumentsPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly createTitleInput: Locator;
  readonly createTitleButton: Locator;
  readonly createSubmitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByTestId("documents-search");
    this.createTitleButton = page.getByTestId("create-document");
    this.createTitleInput = page.getByTestId("create-document-title");
    this.createSubmitButton = page.getByTestId("create-document-submit");
  }

  async goto() {
    await this.page.goto("/documents");
  }

  /** All document rows currently rendered in the table/list. */
  rows(): Locator {
    return this.page.getByTestId("document-row");
  }

  /** A specific row by its visible title text. */
  rowByTitle(title: string): Locator {
    return this.rows().filter({ hasText: title });
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForResponse(
      (res) =>
        res.url().includes("/api/protected/documents") &&
        res.request().method() === "GET",
    );
  }

  async createDocument(title: string) {
    await this.createTitleButton.click();
    await this.createTitleInput.fill(title);
    await this.createSubmitButton.click();
  }

  /** Changes a row's status via its per-row control (dropdown/button — adjust to match your UI). */
  async setStatus(title: string, status: DocumentStatus) {
    const row = this.rowByTitle(title);
    const statusControl = row.getByTestId("status-control");

    // Adjust to your actual control. Two common shapes:
    //
    // (a) <select>:
    await statusControl.selectOption(status);
    //
    // (b) a button that opens a menu, then a menu item — comment out (a)
    //     and use this instead if that's what you built:
    // await statusControl.click();
    // await this.page.getByTestId(`status-option-${status}`).click();
  }

  statusBadge(title: string): Locator {
    return this.rowByTitle(title).getByTestId("status-badge");
  }
}
