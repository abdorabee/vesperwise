import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Field, FieldDescription, FieldLabel } from "./field";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "./pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

describe("shared data and form primitives", () => {
  it("renders alerts with a clear title and description", () => {
    const html = renderToStaticMarkup(
      <Alert role="alert" variant="destructive">
        <AlertTitle>Unable to load</AlertTitle>
        <AlertDescription>Try again in a moment.</AlertDescription>
      </Alert>
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Unable to load");
    expect(html).toContain("Try again in a moment.");
  });

  it("renders a semantic table inside its responsive container", () => {
    const html = renderToStaticMarkup(
      <Table>
        <TableHeader><TableRow><TableHead>Account</TableHead></TableRow></TableHeader>
        <TableBody><TableRow><TableCell>Stripe</TableCell></TableRow></TableBody>
      </Table>
    );

    expect(html).toContain('data-slot="table-container"');
    expect(html).toContain("<table");
    expect(html).toContain("<th");
  });

  it("labels pagination and exposes the current page", () => {
    const html = renderToStaticMarkup(
      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationLink href="#" isActive>1</PaginationLink></PaginationItem>
        </PaginationContent>
      </Pagination>
    );

    expect(html).toContain('aria-label="pagination"');
    expect(html).toContain('aria-current="page"');
  });

  it("groups labels and helper text for structured forms", () => {
    const html = renderToStaticMarkup(
      <Field>
        <FieldLabel htmlFor="company-domain">Company domain</FieldLabel>
        <input id="company-domain" />
        <FieldDescription>Use the apex domain.</FieldDescription>
      </Field>
    );

    expect(html).toContain('for="company-domain"');
    expect(html).toContain("Use the apex domain.");
  });
});
