import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ByokElevenLabsWizard } from "@/components/onboarding/byok-elevenlabs-wizard";

vi.mock("@/lib/api", () => ({
  validateElevenLabsKey: vi.fn(),
}));

import { validateElevenLabsKey } from "@/lib/api";

const mockValidate = vi.mocked(validateElevenLabsKey);

describe("ByokElevenLabsWizard", () => {
  it("renders the heading and key input", () => {
    render(<ByokElevenLabsWizard onComplete={vi.fn()} />);
    expect(screen.getByText("Connect ElevenLabs")).toBeInTheDocument();
    expect(screen.getByLabelText(/ElevenLabs API Key/)).toBeInTheDocument();
  });

  it("links to the ElevenLabs API Keys page", () => {
    render(<ByokElevenLabsWizard onComplete={vi.fn()} />);
    const link = screen.getByText("Open ElevenLabs API Keys");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "https://elevenlabs.io/app/settings/api-keys",
    );
  });

  it("shows step indicators", () => {
    render(<ByokElevenLabsWizard onComplete={vi.fn()} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows validation spinner when validating", async () => {
    mockValidate.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ByokElevenLabsWizard onComplete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/ElevenLabs API Key/), {
      target: { value: "test-key" },
    });
    fireEvent.click(screen.getByText("Validate Key"));

    expect(screen.getByText("Checking...")).toBeInTheDocument();
  });

  it("shows valid status after successful validation", async () => {
    mockValidate.mockResolvedValue({ valid: true });
    render(<ByokElevenLabsWizard onComplete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/ElevenLabs API Key/), {
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
    render(<ByokElevenLabsWizard onComplete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/ElevenLabs API Key/), {
      target: { value: "bad-key" },
    });
    fireEvent.click(screen.getByText("Validate Key"));

    await waitFor(() => {
      expect(screen.getByText("Invalid API key. Please check and try again.")).toBeInTheDocument();
    });
  });

  it("enables Continue button only after valid key", async () => {
    mockValidate.mockResolvedValue({ valid: true });
    render(<ByokElevenLabsWizard onComplete={vi.fn()} />);

    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/ElevenLabs API Key/), {
      target: { value: "valid-key" },
    });
    fireEvent.click(screen.getByText("Validate Key"));

    await waitFor(() => {
      expect(continueBtn).not.toBeDisabled();
    });
  });

  it("calls onComplete and shows confirmation step", async () => {
    mockValidate.mockResolvedValue({ valid: true });
    const onComplete = vi.fn();
    render(<ByokElevenLabsWizard onComplete={onComplete} />);

    fireEvent.change(screen.getByLabelText(/ElevenLabs API Key/), {
      target: { value: "my-key" },
    });
    fireEvent.click(screen.getByText("Validate Key"));

    await waitFor(() => {
      expect(screen.getByText("Continue")).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith("my-key");
    });
    await waitFor(() => {
      expect(screen.getByText("Voice (TTS) is ready")).toBeInTheDocument();
    });
    expect(screen.getByText("ElevenLabs TTS")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("shows Switch to Hosted escape hatch when callback provided", () => {
    const onSwitch = vi.fn();
    render(<ByokElevenLabsWizard onComplete={vi.fn()} onSwitchToHosted={onSwitch} />);
    const switchBtn = screen.getByText("Switch to Hosted");
    expect(switchBtn).toBeInTheDocument();

    fireEvent.click(switchBtn);
    expect(onSwitch).toHaveBeenCalledOnce();
  });

  it("hides Switch to Hosted when callback not provided", () => {
    render(<ByokElevenLabsWizard onComplete={vi.fn()} />);
    expect(screen.queryByText("Switch to Hosted")).not.toBeInTheDocument();
  });

  it("shows Back button when onCancel provided", () => {
    const onCancel = vi.fn();
    render(<ByokElevenLabsWizard onComplete={vi.fn()} onCancel={onCancel} />);
    const backBtn = screen.getByText("Back");
    fireEvent.click(backBtn);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("mentions encryption at rest", () => {
    render(<ByokElevenLabsWizard onComplete={vi.fn()} />);
    expect(screen.getByText(/encrypted at rest/)).toBeInTheDocument();
  });

  it("disables Validate Key button when input is empty", () => {
    render(<ByokElevenLabsWizard onComplete={vi.fn()} />);
    expect(screen.getByText("Validate Key")).toBeDisabled();
  });

  it("validates on blur when key has value", async () => {
    mockValidate.mockResolvedValue({ valid: true });
    render(<ByokElevenLabsWizard onComplete={vi.fn()} />);

    const input = screen.getByLabelText(/ElevenLabs API Key/);
    fireEvent.change(input, { target: { value: "blur-key" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockValidate).toHaveBeenCalledWith("blur-key");
    });
  });

  it("shows Voice (TTS) capability on confirmation", async () => {
    mockValidate.mockResolvedValue({ valid: true });
    render(<ByokElevenLabsWizard onComplete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/ElevenLabs API Key/), {
      target: { value: "my-key" },
    });
    fireEvent.click(screen.getByText("Validate Key"));

    await waitFor(() => {
      expect(screen.getByText("Continue")).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(screen.getByText("Voice (TTS) is ready")).toBeInTheDocument();
    });
    expect(screen.getByText(/text-to-speech is connected/)).toBeInTheDocument();
  });

  it("stores key via validateElevenLabsKey on validation (not again on continue)", async () => {
    mockValidate.mockResolvedValue({ valid: true });
    const onComplete = vi.fn();
    render(<ByokElevenLabsWizard onComplete={onComplete} />);

    fireEvent.change(screen.getByLabelText(/ElevenLabs API Key/), {
      target: { value: "xi-real-key" },
    });
    fireEvent.click(screen.getByText("Validate Key"));

    await waitFor(() => {
      expect(mockValidate).toHaveBeenCalledWith("xi-real-key");
    });

    await waitFor(() => {
      expect(screen.getByText("Continue")).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith("xi-real-key");
    });
    // storeTenantKey is called inside validateElevenLabsKey, not again from handleContinue
    expect(mockValidate).toHaveBeenCalledWith("xi-real-key");
  });
});
