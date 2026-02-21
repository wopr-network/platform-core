import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ provider: "github" }),
}));

// Mock better-auth/react
vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    useSession: () => ({ data: null, isPending: false, error: null }),
    signIn: {
      email: vi.fn(),
      social: vi.fn(),
    },
    signUp: {
      email: vi.fn(),
    },
    signOut: vi.fn(),
    forgetPassword: vi.fn(),
    resetPassword: vi.fn(),
    sendVerificationEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
  }),
}));

// Mock framer-motion to prevent animation issues in JSDOM
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <p {...props}>{children}</p>
    ),
  },
}));

describe("Login page", () => {
  it("renders email and password fields", async () => {
    const { default: LoginPage } = await import("../app/(auth)/login/page");
    render(<LoginPage />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders sign in button", async () => {
    const { default: LoginPage } = await import("../app/(auth)/login/page");
    render(<LoginPage />);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("renders OAuth buttons", async () => {
    const { default: LoginPage } = await import("../app/(auth)/login/page");
    render(<LoginPage />);

    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Discord" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
  });

  it("renders forgot password and signup links", async () => {
    const { default: LoginPage } = await import("../app/(auth)/login/page");
    render(<LoginPage />);

    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
    expect(screen.getByText("Sign up")).toBeInTheDocument();
  });
});

describe("Signup page", () => {
  it("renders name, email, password, and confirm password fields", async () => {
    const { default: SignupPage } = await import("../app/(auth)/signup/page");
    render(<SignupPage />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });

  it("renders create account button", async () => {
    const { default: SignupPage } = await import("../app/(auth)/signup/page");
    render(<SignupPage />);

    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("renders terms checkbox", async () => {
    const { default: SignupPage } = await import("../app/(auth)/signup/page");
    render(<SignupPage />);

    expect(screen.getByText(/Terms of Service/)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Policy/)).toBeInTheDocument();
  });

  it("renders sign in link", async () => {
    const { default: SignupPage } = await import("../app/(auth)/signup/page");
    render(<SignupPage />);

    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });
});

describe("Forgot password page", () => {
  it("renders email field and submit button", async () => {
    const { default: ForgotPasswordPage } = await import("../app/(auth)/forgot-password/page");
    render(<ForgotPasswordPage />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument();
  });

  it("renders back to sign in link", async () => {
    const { default: ForgotPasswordPage } = await import("../app/(auth)/forgot-password/page");
    render(<ForgotPasswordPage />);

    expect(screen.getByText("Back to sign in")).toBeInTheDocument();
  });
});

describe("Reset password page", () => {
  it("shows access denied when no token is present", async () => {
    const { default: ResetPasswordPage } = await import("../app/(auth)/reset-password/page");
    render(<ResetPasswordPage />);

    expect(screen.getByText("Access denied")).toBeInTheDocument();
    expect(screen.getByText("Request a new reset link")).toBeInTheDocument();
  });
});

describe("OAuth callback page", () => {
  it("renders loading state when no error", async () => {
    const { default: OAuthCallbackPage } = await import("../app/auth/callback/[provider]/page");
    render(<OAuthCallbackPage />);

    expect(screen.getByText(/Completing sign in with github/)).toBeInTheDocument();
  });
});
