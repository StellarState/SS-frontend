import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteStateCard } from "../RouteStateCard";

describe("RouteStateCard", () => {
  it("renders the title, message, and marketplace link", () => {
    render(
      <RouteStateCard
        title="Page not found"
        message="The page you are looking for does not exist."
      />
    );

    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(
      screen.getByText("The page you are looking for does not exist.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to marketplace/i })).toHaveAttribute(
      "href",
      "/marketplace"
    );
  });
});
