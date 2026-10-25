// Integration: the meeting join screen's camera/microphone preview (T094).
// livekit-client's track creation is mocked (jsdom has no media devices);
// the component, its device-choice state and its error copy are real.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

const media = vi.hoisted(() => ({ video: vi.fn(), audio: vi.fn() }));
vi.mock("livekit-client", () => ({ createLocalVideoTrack: media.video, createLocalAudioTrack: media.audio }));

import { PrejoinPreview, type DeviceChoice } from "@/components/meetings/prejoin-preview";

const denied = () => Object.assign(new Error("denied"), { name: "NotAllowedError" });
const fakeTrack = () => ({ stop: vi.fn(), attach: vi.fn(), detach: vi.fn(), mediaStreamTrack: {} });

function Harness({ initial }: { initial: DeviceChoice }) {
  const [choice, setChoice] = useState(initial);
  return <PrejoinPreview name="Asha Verma" choice={choice} onChange={setChoice} />;
}

beforeEach(() => {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { enumerateDevices: vi.fn(async () => []), addEventListener: vi.fn(), removeEventListener: vi.fn() } });
});
afterEach(() => vi.clearAllMocks());

describe("PrejoinPreview", () => {
  it("explains a blocked camera and microphone, and says you can still join", async () => {
    media.video.mockRejectedValue(denied());
    media.audio.mockRejectedValue(denied());
    render(<Harness initial={{ camera: true, mic: true, cameraId: "", micId: "" }} />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/blocked the camera/i);
    expect(alert).toHaveTextContent(/blocked the microphone/i);
    expect(alert).toHaveTextContent(/you can still join/i);
  });

  it("shows the initials placeholder with the camera off, and never opens devices that are off", async () => {
    render(<Harness initial={{ camera: false, mic: false, cameraId: "", micId: "" }} />);
    await act(async () => undefined); // let the device list settle
    expect(screen.getByText("AV")).toBeInTheDocument();
    expect(screen.getByText(/others see your initials/i)).toBeInTheDocument();
    expect(media.video).not.toHaveBeenCalled();
    expect(media.audio).not.toHaveBeenCalled();
  });

  it("stops the preview track when the camera is turned off", async () => {
    const track = fakeTrack();
    media.video.mockResolvedValue(track);
    render(<Harness initial={{ camera: true, mic: false, cameraId: "", micId: "" }} />);
    await waitFor(() => expect(track.attach).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: /camera on/i }));
    expect(track.stop).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /camera off/i })).toHaveAttribute("aria-pressed", "false");
  });
});
