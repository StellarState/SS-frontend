import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExperimentProvider, Variant, useTrackConversion } from "../ExperimentContext";
import { assignVariant, type ExperimentConfig } from "@/lib/experiments";

const checkout: ExperimentConfig = {
  name: "checkout-cta",
  variants: [
    { name: "control", weight: 50 },
    { name: "green", weight: 50 },
  ],
};

function setup(consent: boolean, subjectId = "user-1") {
  const onEvent = vi.fn();
  function Convert() {
    const track = useTrackConversion();
    return <button onClick={() => track("checkout-cta", "invest")}>go</button>;
  }
  const ui = (
    <ExperimentProvider experiments={[checkout]} subjectId={subjectId} consent={consent} onEvent={onEvent}>
      <Variant experiment="checkout-cta" variants={{ control: <p>control</p>, green: <p>green</p> }} />
      <Convert />
    </ExperimentProvider>
  );
  return { onEvent, ...render(ui), ui };
}

describe("assignVariant", () => {
  it("is stable for the same subject", () => {
    const first = assignVariant(checkout, "user-42");
    for (let i = 0; i < 5; i++) expect(assignVariant(checkout, "user-42")).toBe(first);
  });

  it("respects weights over a large sample", () => {
    const config: ExperimentConfig = {
      name: "weights",
      variants: [
        { name: "control", weight: 80 },
        { name: "b", weight: 20 },
      ],
    };
    const n = 20_000;
    let b = 0;
    for (let i = 0; i < n; i++) if (assignVariant(config, `anon-${i}`) === "b") b++;
    expect(b / n).toBeGreaterThan(0.18);
    expect(b / n).toBeLessThan(0.22);
  });

  it("returns control for unknown or zero-weight experiments", () => {
    expect(assignVariant(undefined, "u")).toBe("control");
    expect(assignVariant({ name: "x", variants: [{ name: "only", weight: 0 }] }, "u")).toBe("only");
  });
});

describe("ExperimentProvider", () => {
  beforeEach(() => sessionStorage.clear());

  it("renders the assigned variant and records exposure once per session", () => {
    const { onEvent, rerender, ui } = setup(true);
    const expected = assignVariant(checkout, "user-1");
    expect(screen.getByText(expected)).toBeInTheDocument();
    rerender(ui);
    const exposures = onEvent.mock.calls.filter(([e]) => e.type === "exposure");
    expect(exposures).toEqual([[{ type: "exposure", experiment: "checkout-cta", variant: expected }]]);
  });

  it("attaches the variant to conversions", () => {
    const { onEvent } = setup(true);
    screen.getByText("go").click();
    expect(onEvent).toHaveBeenCalledWith({
      type: "conversion",
      experiment: "checkout-cta",
      variant: assignVariant(checkout, "user-1"),
      event: "invest",
    });
  });

  it("shows control and sends nothing without consent", () => {
    const { onEvent } = setup(false);
    expect(screen.getByText("control")).toBeInTheDocument();
    screen.getByText("go").click();
    expect(onEvent).not.toHaveBeenCalled();
  });
});
