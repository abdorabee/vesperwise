import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  ChipMultiSelect,
  RemovableChipInput,
  SegmentedControl,
  SingleSelect,
} from "./controls";
import { SettingsCard, SettingsRow } from "./settings-row";

const noop = vi.fn();

describe("ChipMultiSelect", () => {
  it("marks selected options and renders user-added extras as removable", () => {
    const html = renderToStaticMarkup(
      <ChipMultiSelect
        name="Target industries"
        options={["Technology", "Healthcare"]}
        selected={["Technology"]}
        onToggle={noop}
        extras={["Maritime Logistics"]}
        onRemoveExtra={noop}
      />
    );

    expect(html).toContain('aria-label="Target industries"');
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain("Maritime Logistics");
    expect(html).toContain('aria-label="Remove Maritime Logistics"');
  });

  it("matches a selection case-insensitively so legacy casing still reads as on", () => {
    const html = renderToStaticMarkup(
      <ChipMultiSelect options={["Technology"]} selected={["technology"]} onToggle={noop} />
    );
    expect(html).toContain('aria-checked="true"');
  });
});

describe("SingleSelect", () => {
  it("renders a radiogroup with one checked option", () => {
    const html = renderToStaticMarkup(
      <SingleSelect
        name="Primary buyer"
        options={["C-Suite / Founders", "VP / Director"]}
        value="VP / Director"
        onChange={noop}
      />
    );
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Primary buyer"');
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
  });
});

describe("SegmentedControl", () => {
  it("shows display labels while keeping the stored value selected", () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        name="Ideal company size"
        options={["Startups (1-50)", "SMB (51-200)"]}
        labels={{ "Startups (1-50)": "Startups 1–50" }}
        value="Startups (1-50)"
        onChange={noop}
      />
    );
    expect(html).toContain("Startups 1–50");
    expect(html).toContain("SMB (51-200)");
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
  });
});

describe("RemovableChipInput", () => {
  it("renders each value as a removable token alongside the input", () => {
    const html = renderToStaticMarkup(
      <RemovableChipInput
        name="Preview accounts"
        values={["stripe.com"]}
        onChange={noop}
        placeholder="yourprospect.com"
        maxItems={5}
      />
    );
    expect(html).toContain("stripe.com");
    expect(html).toContain('aria-label="Remove stripe.com"');
    expect(html).toContain('placeholder="yourprospect.com"');
  });

  it("hides the input and says so once the item limit is reached", () => {
    const html = renderToStaticMarkup(
      <RemovableChipInput
        values={["a.com", "b.com"]}
        onChange={noop}
        placeholder="yourprospect.com"
        maxItems={2}
      />
    );
    expect(html).toContain("Limit reached");
    expect(html).not.toContain("<input");
  });
});

describe("SettingsRow", () => {
  it("associates the label with its control and surfaces errors to assistive tech", () => {
    const html = renderToStaticMarkup(
      <SettingsRow
        label="Workspace name"
        help="Usually your company or team name."
        htmlFor="workspace-name"
        error="Give your workspace a name."
      >
        <input id="workspace-name" />
      </SettingsRow>
    );
    expect(html).toContain('for="workspace-name"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("Give your workspace a name.");
  });

  it("renders a plain label when the control is not a single input", () => {
    const html = renderToStaticMarkup(
      <SettingsRow label="Target industries">
        <div />
      </SettingsRow>
    );
    expect(html).not.toContain("<label");
    expect(html).toContain("Target industries");
  });
});

describe("SettingsCard", () => {
  it("renders the house card chrome", () => {
    const html = renderToStaticMarkup(
      <SettingsCard title="Who you target" sub="Sets the universe.">
        <div>body</div>
      </SettingsCard>
    );
    expect(html).toContain('class="card set-card"');
    expect(html).toContain('class="card-head"');
    expect(html).toContain("Who you target");
    expect(html).toContain("Sets the universe.");
  });
});
