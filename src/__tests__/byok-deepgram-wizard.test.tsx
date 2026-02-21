import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ByokDeepgramWizard } from "@/components/onboarding/byok-deepgram-wizard";

vi.mock("@/lib/api", () => ({
  validateDeepgramKey: vi.fn(),
  storeTenantKey: vi.fn(),
}));

import { storeTenantKey, validateDeepgramKey } from "@/lib/api";

const mockValidate = vi.mocked(validateDeepgramKey);
const mockStore = vi.mocked(storeTenantKey);

describe("ByokDeepgramWizard", () => {
  it("renders the heading and key input", () => {
    render(<ByokDeepgramWizard onComplete={vi.fn()} />);
    expect(screen.getByText("Connect Deepgram")).toBeInTheDocument();
    expect(screen.getByLabelText(/Deepgram API Key/)).toBeInTheDocument();
  });

  it("links to the Deepgram Console", () => {
    render(<ByokDeepgramWizard onComplete={vi.fn()} />);
    const link = screen.getByText("Open Deepgram Console");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "https://console.deepgram.com/api-keys");
  });

  it("shows step indicators", () => {
    render(<ByokDeepgramWizard onComplete={vi.fn()} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows validation spinner when validating", async () => {
    mockValidate.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ByokDeepgramWizard onComplete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Deepgram API Key/), {
      target: { value: "test-key" },
    });
    fireEvent.click(screen.getByText("Validate Key"));

    expect(screen.getByText("Checking...")).toBeInTheDocument();
  });

  it("shows valid status after successful validation", async () => {
    mockValidate.mockResolvedValue({ valid: true });
    render(<ByokDeepgramWizard onComplete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Deepgram API Key/), {
      target: { value: "valid-key" },
    });
    fireEvent.click(screen.getByText("Validate Key"));

    await waitFor(() => {
      expect(screen.getByText("Valid")).toBeInTheDocument();
    });
  });

  it("shows error message after failed validation", async () => {
    mockValidate.mockResolvedValue({
      valid: false,
      message: "Invalid API key. Please check and try again.",
    });
    render(<ByokDeepgramWizard onComplete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Deepgram API Key/), {
      target: { value: "bad-key" },
    });
    fireEvent.click(screen.getByText("Validate Key"));

    await waitFor(() => {
      expect(screen.getByText("Invalid API key. Please check and try again.")).toBeInTheDocument();
    });
  });

  it("enables Continue button only after valid key", async () => {
    mockValidate.mockResolvedValue({ valid: true });
    render(<ByokDeepgramWizard onComplete={vi.fn()} />);

    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Deepgram API Key/), {
      target: { value: "valid-key" },
    });
    fireEvent.click(screen.getByText("Validate Key"));

    await waitFor(() => {
      expect(continueBtn).not.toBeDisabled();
    });
  });

  it("calls onComplete and shows confirmation step", async () => {
    mockValidate.mockResolvedValue({ valid: true });
    mockStore.mockResolvedValue({
      provider: "deepgram",
      hasKey: true,
      maskedKey: "dg-...xy",
      createdAt: null,
      updatedAt: null,
    });
    const onComplete = vi.fn();
    render(<ByokDeepgramWizard onComplete={onComplete} />);

    fireEvent.change(screen.getByLabelText(/Deepgram API Key/), {
      target: { value: "my-key" },
    });
    fireEvent.click(screen.getByText("Validate Key"));

    await waitFor(() => {
      expect(screen.getByText("Continue")).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(screen.getByText("Voice (STT) is ready")).toBeInTheDocument();
    });
    expect(screen.getByText("Deepgram STT")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith("my-key");
    });
  });

  it("shows Switch to Hosted escape hatch when callback provided", () => {
    const onSwitch = vi.fn();
    render(<ByokDeepgramWizard onComplete={vi.fn()} onSwitchToHosted={onSwitch} />);
    const switchBtn = screen.getByText("Switch to Hosted");
    expect(switchBtn).toBeInTheDocument();

    fireEvent.click(switchBtn);
    expect(onSwitch).toHaveBeenCalledOnce();
  });

  it("hides Switch to Hosted when callback not provided", () => {
    render(<ByokDeepgramWizard onComplete={vi.fn()} />);
    expect(screen.queryByText("Switch to Hosted")).not.toBeInTheDocument();
  });

  it("shows Back button when onCancel provided", () => {
    const onCancel = vi.fn();
    render(<ByokDeepgramWizard onComplete={vi.fn()} onCancel={onCancel} />);
    const backBtn = screen.getByText("Back");
    fireEvent.click(backBtn);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("mentions encryption at rest", () => {
    render(<ByokDeepgramWizard onComplete={vi.fn()} />);
    expect(screen.getByText(/encrypted at rest/)).toBeInTheDocument();
  });

  it("stores key to tenant-key store after validation and continue", async () => {
    mockValidate.mockResolvedValue({ valid: true });
    mockStore.mockResolvedValue({
      provider: "deepgram",
      hasKey: true,
      maskedKey: "dg-...xy",
      createdAt: null,
      updatedAt: null,
    });
    const onComplete = vi.fn();
    render(<ByokDeepgramWizard onComplete={onComplete} />);

    fireEvent.change(screen.getByLabelText(/Deepgram API Key/), {
      target: { value: "dg-real-key" },
    });
    fireEvent.click(screen.getByText("Validate Key"));

    await waitFor(() => {
      expect(screen.getByText("Continue")).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(mockStore).toHaveBeenCalledWith("deepgram", "dg-real-key");
    });
  });

  it("disables Validate Key button when input is empty", () => {
    render(<ByokDeepgramWizard onComplete={vi.fn()} />);
    expect(screen.getByText("Validate Key")).toBeDisabled();
  });

  it("validates on blur when key has value", async () => {
    mockValidate.mockResolvedValue({ valid: true });
    render(<ByokDeepgramWizard onComplete={vi.fn()} />);

    const input = screen.getByLabelText(/Deepgram API Key/);
    fireEvent.change(input, { target: { value: "blur-key" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockValidate).toHaveBeenCalledWith("blur-key");
    });
  });
});
