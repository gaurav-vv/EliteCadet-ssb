import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCountdown } from "@/hooks/use-countdown";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCountdown", () => {
  it("starts at the given number of seconds", () => {
    const { result } = renderHook(() => useCountdown(15, () => {}));
    expect(result.current).toBe(15);
  });

  it("ticks down once per second", () => {
    const { result } = renderHook(() => useCountdown(15, () => {}));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(14);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(13);
  });

  it("calls onExpire exactly once when it reaches zero, and stops there", () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useCountdown(2, onExpire));
    for (let i = 0; i < 5; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(result.current).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("uses the latest onExpire callback, not the one from the first render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useCountdown(1, cb), { initialProps: { cb: first } });
    rerender({ cb: second });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
