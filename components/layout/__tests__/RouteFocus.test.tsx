import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RouteFocus } from "@/components/layout/RouteFocus";
import { MAIN_CONTENT_ID } from "@/components/layout/SkipLinks";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

import { usePathname } from "next/navigation";

const pathnameMock = vi.mocked(usePathname);

describe("RouteFocus (#652)", () => {
  beforeEach(() => pathnameMock.mockReturnValue("/first"));

  it("marks the main landmark as a skip target on the initial render", () => {
    const { container } = render(
      <>
        <RouteFocus />
        <main><h1>First page</h1></main>
      </>,
    );
    const main = container.querySelector("main")!;
    expect(main.id).toBe(MAIN_CONTENT_ID);
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("moves focus to the new heading and announces the route on navigation", async () => {
    const { rerender } = render(
      <>
        <RouteFocus />
        <main><h1>First page</h1></main>
      </>,
    );

    pathnameMock.mockReturnValue("/second");
    rerender(
      <>
        <RouteFocus />
        <main><h1>Second page</h1></main>
      </>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Second page" })).toHaveFocus());
    expect(screen.getByTestId("route-announcement")).toHaveTextContent("Navigated to");
  });
});
