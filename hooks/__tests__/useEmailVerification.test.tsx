import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useEmailVerification } from "@/hooks/useEmailVerification";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ jwt: "test-token", address: null, isConnecting: false, loginWithWallet: vi.fn(), logout: vi.fn() }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useEmailVerification (#653)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes("/send") || String(url).includes("/confirm") || String(url).includes("/change")) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ email: "a@example.com", verified: false }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("starts a 60 second cooldown after resending and counts down", async () => {
    const { result } = renderHook(() => useEmailVerification(), { wrapper });

    await waitFor(() => expect(result.current.status?.email).toBe("a@example.com"));

    await act(async () => {
      await result.current.resend("a@example.com");
    });
    expect(result.current.cooldownSeconds).toBe(60);
    expect(result.current.isResending).toBe(false);

    await waitFor(() => expect(result.current.cooldownSeconds).toBe(59), {
      timeout: 2500,
    });
  });

  it("sends verification to the new address on a change", async () => {
    const { result } = renderHook(() => useEmailVerification(), { wrapper });

    await act(async () => {
      await result.current.updateEmail("new@example.com", "secret");
    });

    const changeCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/email/change"));
    expect(changeCall).toBeDefined();
    expect(JSON.parse(changeCall![1].body)).toEqual({
      email: "new@example.com",
      password: "secret",
    });
    expect(result.current.cooldownSeconds).toBe(60);
  });
});
