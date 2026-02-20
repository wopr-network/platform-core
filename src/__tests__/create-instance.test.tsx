import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CreateInstanceClient } from "../app/instances/new/create-instance-client";

vi.mock("@/lib/api", () => ({
  createInstance: vi.fn().mockResolvedValue({
    id: "inst-new",
    name: "my-new-instance",
    template: "Custom",
    status: "stopped",
    provider: "anthropic",
    channels: [],
    plugins: [],
    uptime: null,
    createdAt: new Date().toISOString(),
  }),
}));

describe("CreateInstanceClient", () => {
  it("renders the create form heading", () => {
    render(<CreateInstanceClient />);
    expect(screen.getByRole("heading", { name: "Create Instance" })).toBeInTheDocument();
  });

  it("renders preset cards", () => {
    render(<CreateInstanceClient />);
    expect(screen.getByText("Discord AI Bot")).toBeInTheDocument();
    expect(screen.getByText("Slack AI Assistant")).toBeInTheDocument();
    expect(screen.getByText("Multi-Channel")).toBeInTheDocument();
  });

  it("disables submit button without name", () => {
    render(<CreateInstanceClient />);
    const submitBtn = screen.getByRole("button", { name: "Create Instance" });
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit button when name is entered without preset", async () => {
    const user = userEvent.setup();
    render(<CreateInstanceClient />);
    const nameInput = screen.getByPlaceholderText("my-instance");
    await user.type(nameInput, "my-bot");
    const submitBtn = screen.getByRole("button", { name: "Create Instance" });
    expect(submitBtn).toBeEnabled();
  });

  it("shows confirmation after creating", async () => {
    const user = userEvent.setup();
    render(<CreateInstanceClient />);

    // Select preset
    await user.click(screen.getByText("Discord AI Bot"));

    // Enter name
    const nameInput = screen.getByPlaceholderText("my-instance");
    await user.type(nameInput, "my-new-instance");

    // Submit
    await user.click(screen.getByRole("button", { name: "Create Instance" }));

    await waitFor(() => {
      expect(screen.getByText("Instance created")).toBeInTheDocument();
    });
  });
});
