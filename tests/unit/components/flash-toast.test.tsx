import { StrictMode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlashToast } from "@/components/shared/flash-toast";
import { setFlash, takeFlash } from "@/lib/flash";

beforeEach(() => sessionStorage.clear());

// In development React StrictMode runs every effect twice on mount. The flash is read-and-cleared, so the
// second run finds nothing: it must not wipe the message the first run already put on screen.
describe("FlashToast", () => {
  it("shows the message once in StrictMode (development) and consumes it", async () => {
    setFlash("Your password has been updated successfully.");
    render(
      <StrictMode>
        <FlashToast />
      </StrictMode>,
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Your password has been updated successfully.");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(takeFlash()).toBeNull();
  });

  it("shows the message once without StrictMode (production)", async () => {
    setFlash("Your account has been created successfully!");
    render(<FlashToast />);
    expect(await screen.findByRole("status")).toHaveTextContent("Your account has been created successfully!");
    expect(takeFlash()).toBeNull();
  });

  it("shows nothing when there is no message, in either mode", () => {
    const { unmount } = render(
      <StrictMode>
        <FlashToast />
      </StrictMode>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    unmount();
    render(<FlashToast />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not show an old message again on the next screen", async () => {
    setFlash("Saved.");
    const first = render(
      <StrictMode>
        <FlashToast />
      </StrictMode>,
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Saved.");
    first.unmount();
    render(
      <StrictMode>
        <FlashToast />
      </StrictMode>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
