import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ExposureMeter } from "../ExposureMeter";

function respond(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 404, json: async () => body };
}

function renderMeter(debtorId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<ExposureMeter debtorId={debtorId} />, { wrapper });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ExposureMeter", () => {
  it("shows outstanding exposure relative to the cap", async () => {
    fetchMock.mockResolvedValueOnce(respond({ cap: 100, outstanding: 80 }));
    renderMeter("debtor-1");

    const meter = await screen.findByTestId("exposure-meter");
    expect(meter).toHaveTextContent("80% of cap");
    expect(screen.getByTestId("exposure-near-cap")).toBeInTheDocument();
  });

  it("warns when the debtor is at the cap", async () => {
    fetchMock.mockResolvedValueOnce(respond({ cap: 100, outstanding: 100 }));
    renderMeter("debtor-2");

    expect(await screen.findByTestId("exposure-at-cap")).toHaveTextContent("at the platform cap");
  });

  it("hides the meter without cap data", async () => {
    fetchMock.mockResolvedValueOnce(respond({}, false));
    renderMeter("debtor-3");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("exposure-meter")).not.toBeInTheDocument();
  });
});
