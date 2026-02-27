/**
 * WOPR Bot Brand Bible
 *
 * The rulebook. Every pixel, every word, every interaction on wopr.bot
 * references this file. Nothing ships without it.
 *
 * READ THIS FIRST. Then build.
 */

// ===========================================================================
// THE VISION
// ===========================================================================

/**
 * A WOPR Bot is a $5/month supercomputer that manages your business.
 *
 * Not "a bot." Not "an AI assistant." Not "an automation tool."
 * A supercomputer. Yours. Five dollars.
 *
 * The gap between what it costs and what it does — that IS the brand.
 * Every piece of copy, every UI decision, every interaction should widen
 * that gap. Make the user feel like they're getting away with something.
 *
 * We sell world domination at pocket-money prices.
 */
export const vision = {
  /** One sentence. If you can't explain it in one sentence, you don't understand it. */
  oneLiner: "A $5/month supercomputer that manages your business.",

  /** The question that sells itself. */
  question: "What would you do with your own WOPR Bot?",

  /** What we actually sell. Not features. Outcomes. */
  sells: [
    "Run a company while you sleep.",
    "Replace yourself at your job. Keep the paycheck.",
    "Build something that makes money without you.",
    "Have an employee that never quits, never sleeps, never asks for a raise.",
    "A supercomputer in your pocket for less than a coffee.",
  ],

  /** What we do NOT sell. */
  doesNotSell: [
    "AI capabilities",
    "Automation workflows",
    "Agent orchestration",
    "LLM integration",
    "Cloud infrastructure",
  ],

  /** The absurdity gap. This is the core brand mechanic. */
  absurdityGap: {
    what: "A supercomputer that runs your business",
    cost: "$5/month",
    emotion: "How is this even legal?",
    mechanic:
      "Every piece of marketing widens the gap between power and price. " +
      "Show something massive. Then reveal the price. The contrast does the selling.",
  },

  /** The world we're building. */
  world:
    "A world where anyone with $5 and an idea can have an army of AI workers " +
    "running their business 24/7. No code. No infrastructure. No employees. " +
    "Just a WOPR Bot and a credit card.",

  /** The competitive reality. This is WHY the absurdity gap works. */
  competitiveReality: {
    them: {
      setup: "$10,000 Mac Mini build",
      gets: "5 agents running in parallel",
      requires: "Hardware, electricity, maintenance, config, babysitting",
      audience: "Rich hobbyists and AI Twitter influencers",
    },
    us: {
      setup: "$50/month (5 bots at $5 + ~$25 LLM compute)",
      gets: "5 WOPR Bots running in parallel. Same thing.",
      requires: "A credit card",
      audience: "Everyone else",
    },
    math: {
      theirCost: 10_000,
      ourMonthlyCost: 50,
      monthsToBreakEven: 200,
      yearsToBreakEven: 16.7,
      costRatio: "200x cheaper to start",
      punchline: "Their hardware depreciates. Ours gets better every month.",
    },
    /** How to use this in marketing. */
    usage:
      "Never name-drop Mac Mini or specific competitors in official copy. " +
      "Instead, make the audience do the math themselves. " +
      "Show what 5 WOPR Bots can do. Show the price. " +
      "They'll screenshot it and send it to the group chat where " +
      "their friend just posted their $10K build. That's the play.",
  },
} as const;

// ===========================================================================
// WHAT IS A WOPR BOT?
// ===========================================================================

export const product = {
  /** What it IS. Use these words. */
  is: [
    "A supercomputer",
    "Your 24/7 employee",
    "A business in a box",
    "An army of AI workers",
    "Your unfair advantage",
  ],

  /** What it is NOT. Never use these. */
  isNot: [
    "A chatbot",
    "An AI assistant",
    "An automation tool",
    "A platform",
    "A SaaS product",
    "An agent framework",
  ],

  /** What it does. Always outcomes, never features. */
  does: [
    "Manages your Discord community",
    "Answers your customers",
    "Ships your code",
    "Runs your social media",
    "Handles your support tickets",
    "Makes you money while you sleep",
  ],

  /** The metaphors that work. */
  metaphors: [
    "It's like hiring a genius intern for $5/month. Except it never sleeps.",
    "Think iPhone, not smartphone. Personal, not enterprise.",
    "The nuclear launch button is the deploy button. You're in command.",
  ],
} as const;

// ===========================================================================
// PRODUCT NAME
// ===========================================================================

export const PRODUCT_NAME = "WOPR Bot" as const;
export const BRAND_NAME = "WOPR" as const;
export const DOMAIN = "wopr.bot" as const;
export const TAGLINE = "What would you do with your own WOPR Bot?" as const;
export const PRICE = "$5/month" as const;

export const nameRules = {
  correct: ["WOPR Bot", "your WOPR Bot", "Get your WOPR Bot", "a WOPR Bot", "wopr.bot"],
  incorrect: [
    "WOPR",
    "the WOPR platform",
    "WOPR AI",
    "WOPR service",
    "WOPR tool",
    "Wopr Bot",
    "wopr bot",
  ],
} as const;

// ===========================================================================
// TARGET AUDIENCE
// ===========================================================================

export const audience = {
  /** The person we're talking to. */
  primary:
    "23-year-old with a credit card, 14 half-finished repos, and a graveyard of Discord bots. " +
    "They don't need to be sold. They need to be told it exists.",

  /** The adjacent audience we capture. */
  secondary:
    "The kid who just saw someone's $10,000 Mac Mini AI build on Twitter " +
    "and thought 'I wish I could afford that.' We're the answer. " +
    "Same power, pocket-money price. They find us in the replies.",

  /** What motivates them. */
  wants: [
    "To build something that makes money",
    "To feel like a founder without the risk",
    "To automate the boring parts of their life",
    "To have something running while they sleep",
    "To flex on their friends",
    "To have what the rich kids have, without the rich kid budget",
  ],

  /** What they fear. */
  fears: [
    "Wasting money on something that doesn't work",
    "Being too dumb to set it up",
    "It being a scam / too good to be true",
  ],

  /** How we neutralize those fears. */
  neutralizers: {
    price: "$5. Less than a coffee. No risk.",
    complexity: "Onboarding is a nuclear launch sequence. Fun, not scary.",
    trust: "Show real things real people built. Screenshots, not promises.",
  },
} as const;

// ===========================================================================
// EMOTIONAL ARC (what users should FEEL at each stage)
// ===========================================================================

export const emotionalArc = {
  /** Landing page. First impression. */
  landing: {
    feel: "Holy shit, $5?",
    job: "Widen the absurdity gap. Show power. Reveal price.",
    tone: "Confident. Almost cocky. Like we know something you don't.",
  },

  /** Onboarding wizard. Signing up. */
  onboarding: {
    feel: "I'm launching a supercomputer.",
    job: "Make it feel momentous. Nuclear launch codes. Mission briefing.",
    tone: "Military command terminal. You're the operator.",
  },

  /** Dashboard. Daily driver. */
  dashboard: {
    feel: "It's actually running my business.",
    job: "Show activity. Show things happening. The bot is ALIVE.",
    tone: "Mission control. Calm competence. Everything is handled.",
  },

  /** Marketplace. Expanding capabilities. */
  marketplace: {
    feel: "I can make it do THAT too?",
    job: "Show the possibilities. Make them want more. Candy store energy.",
    tone: "Arsenal. Every plugin is a new superpower.",
  },

  /** Billing. Paying for it. */
  billing: {
    feel: "This costs nothing for what I'm getting.",
    job: "Reinforce the absurdity gap. Show value vs cost.",
    tone: "Transparent. Trustworthy. The numbers speak for themselves.",
  },

  /** Settings. Configuring. */
  settings: {
    feel: "I'm in control of a powerful machine.",
    job: "Make configuration feel like tuning a race car, not filling forms.",
    tone: "Control panel. Precise. Every toggle matters.",
  },

  /** Fleet health. Monitoring. */
  fleet: {
    feel: "My army is operational.",
    job: "NORAD situation room. All systems nominal.",
    tone: "Calm surveillance. Green means good. You're the general.",
  },
} as const;

// ===========================================================================
// COLOR PALETTE
// ===========================================================================

export const colors = {
  /** Pure black. The void. Default background. */
  black: "#000000",
  /** Terminal green. The primary brand color. Use for text, borders, accents. */
  green: "#00FF41",
  /** Dimmed green for secondary/muted elements. */
  greenDim: "#00CC33",
  /** Faint green for hover states and subtle backgrounds. */
  greenFaint: "#00FF4110",
  /** Green at 20% opacity for borders and dividers. */
  greenBorder: "#00FF4133",
  /** Pure white. Body text on dark backgrounds. */
  white: "#FFFFFF",
  /** Muted white for secondary text. */
  gray: "#A0A0A0",
  /** Dark gray for disabled/placeholder text. */
  grayDim: "#666666",
  /** Near-black for card/surface backgrounds. */
  surface: "#0A0A0A",
  /** Slightly lighter surface for elevated cards. */
  surfaceElevated: "#111111",
  /** Error/destructive red. Terminal-style. */
  red: "#FF3333",
  /** Warning amber. */
  amber: "#FFAA00",
} as const;

// ===========================================================================
// TYPOGRAPHY
// ===========================================================================

export const typography = {
  fontFamily: "'JetBrains Mono', monospace",
  scale: {
    /** Hero headline. One per viewport. */
    hero: { size: "3rem", lineHeight: "1.1", weight: "700", tracking: "-0.02em" },
    /** Page title. */
    h1: { size: "2.25rem", lineHeight: "1.2", weight: "700", tracking: "-0.02em" },
    /** Section heading. */
    h2: { size: "1.5rem", lineHeight: "1.3", weight: "600", tracking: "-0.01em" },
    /** Card heading. */
    h3: { size: "1.125rem", lineHeight: "1.4", weight: "600", tracking: "0" },
    /** Body text. */
    body: { size: "1rem", lineHeight: "1.6", weight: "400", tracking: "0" },
    /** Secondary/label text. */
    small: { size: "0.875rem", lineHeight: "1.5", weight: "400", tracking: "0" },
    /** Tiny text, badges, metadata. */
    xs: { size: "0.75rem", lineHeight: "1.4", weight: "500", tracking: "0.02em" },
    /** Code/terminal output. Same font, just used for semantic distinction. */
    mono: { size: "0.875rem", lineHeight: "1.6", weight: "400", tracking: "0" },
  },
} as const;

// ===========================================================================
// SPACING & LAYOUT
// ===========================================================================

export const layout = {
  /** Maximum content width for marketing pages. */
  maxWidth: "64rem",
  /** One idea per viewport. Generous vertical rhythm. */
  sectionPadding: "8rem",
  /** Border radius: sharp, not rounded. Terminal aesthetic. */
  radius: "0.25rem",
  /** No radius at all. For inputs and terminal elements. */
  radiusNone: "0",
} as const;

// ===========================================================================
// VOICE GUIDE
// ===========================================================================

export const voice = {
  rules: [
    "Short sentences. If it needs a comma, it needs two sentences.",
    "No corporate language. Ever.",
    "Confident, not humble.",
    "The price is the punchline.",
    "Show, don't list.",
    "Internet-native. Write for screenshots and group chats.",
    "Sell the outcome, not the tool.",
  ],
  bannedWords: [
    "leverage",
    "empower",
    "solution",
    "unlock",
    "seamless",
    "robust",
    "platform",
    "synergy",
    "paradigm",
    "ecosystem",
    "holistic",
    "scalable",
    "disrupt",
    "innovate",
    "democratize",
    "next-gen",
    "cutting-edge",
    "game-changer",
  ],
  notAllowed: [
    "We're thrilled to announce...",
    "We're excited to share...",
    "Our powerful platform...",
    "Seamless integration...",
    "Leverage the power of...",
    "Unlock your potential...",
    "Empowering developers...",
    "Robust and scalable...",
  ],
} as const;

// ===========================================================================
// DO / DON'T COPY EXAMPLES
// ===========================================================================

export const copyExamples = [
  // --- The supercomputer angle ---
  {
    do: "A supercomputer for $5/month.",
    dont: "An affordable AI automation solution.",
    rule: "Absurdity gap. Power vs price.",
  },
  {
    do: "Your WOPR Bot runs your business. You run your life.",
    dont: "Streamline your business operations with AI.",
    rule: "Sell the outcome.",
  },
  {
    do: "Hire an army. Five dollars.",
    dont: "Access our multi-agent orchestration system.",
    rule: "Absurdity gap. The price is the punchline.",
  },
  // --- The $10K Mac Mini killer angle ---
  {
    do: "5 bots. $50/month. Do the math.",
    dont: "Our cost-effective alternative to local hardware.",
    rule: "Let them do the math. The contrast sells itself.",
  },
  {
    do: "Skip the hardware. Keep the power.",
    dont: "No expensive infrastructure required.",
    rule: "Sell the outcome. Never say 'no X required.'",
  },
  // --- Original examples, refined ---
  {
    do: "Get your WOPR Bot.",
    dont: "Try our AI platform today.",
    rule: "Confident, not humble.",
  },
  {
    do: "Your WOPR Bot runs while you sleep.",
    dont: "Our always-on solution ensures 24/7 uptime.",
    rule: "Short sentences. No corporate language.",
  },
  {
    do: "Build a company. $5/month.",
    dont: "Leverage our powerful tools to unlock business potential.",
    rule: "Sell the outcome. Price is the punchline.",
  },
  {
    do: "WOPR Bot writes your code. Ships your product. Answers your DMs.",
    dont: "WOPR enables seamless automation across multiple workflows.",
    rule: "Show, don't list.",
  },
  {
    do: "What would you do with your own WOPR Bot?",
    dont: "Discover the possibilities of AI-powered automation.",
    rule: "Sell the outcome, not the tool.",
  },
  {
    do: "Your WOPR Bot. Everything handled.",
    dont: "Our comprehensive solution covers all your needs.",
    rule: "Short sentences.",
  },
  {
    do: "Your WOPR Bot doesn't take lunch breaks.",
    dont: "Benefit from continuous AI processing capabilities.",
    rule: "Internet-native.",
  },
  {
    do: "Replace yourself at your job. Keep the paycheck.",
    dont: "Optimize your workflow with intelligent automation.",
    rule: "Sell the outcome.",
  },
  {
    do: "WOPR Bot. Not WOPR. Not the WOPR platform.",
    dont: "Powered by the WOPR platform.",
    rule: "Product name is WOPR Bot.",
  },
  {
    do: "Five bucks. Unlimited bots.",
    dont: "Starting at just $5 per month with our flexible pricing.",
    rule: "The price is the punchline.",
  },
  {
    do: "Ship it. Your WOPR Bot already did.",
    dont: "Accelerate your deployment pipeline with our robust tooling.",
    rule: "Confident. No corporate language.",
  },
  {
    do: "wopr.bot",
    dont: "Visit us at wopr.bot to learn more about our offerings.",
    rule: "Internet-native. The URL is the noun.",
  },
] as const;

// ===========================================================================
// ANIMATION — TWO CONTEXTS
// ===========================================================================

/**
 * Animation rules differ between MARKETING pages and PRODUCT UI.
 *
 * Marketing: Extreme restraint. Let the copy do the work.
 * Product UI: Functional motion. The supercomputer is alive.
 */
export const animation = {
  /** Terminal typing effect speed in ms per character. */
  typingSpeed: 50,
  /** Cursor blink interval in ms. */
  cursorBlink: 530,

  /**
   * MARKETING pages (landing, pricing, about).
   * Restraint is what makes it feel expensive.
   */
  marketing: {
    allowed: ["typing-effect", "cursor-blink", "fade-in-on-scroll"],
    banned: [
      "parallax",
      "floating-elements",
      "scroll-jacking",
      "hover-bounce",
      "auto-playing-video",
    ],
    philosophy: "Let the words land. One animation per viewport. The restraint IS the brand.",
  },

  /**
   * PRODUCT UI (dashboard, settings, fleet, marketplace, onboarding).
   * The supercomputer is alive. Motion = feedback. The UI breathes.
   */
  productUI: {
    allowed: [
      "stagger-enter",
      "fade-transition",
      "status-pulse",
      "count-up",
      "skeleton-loading",
      "hover-glow",
      "selection-spring",
      "page-fade",
      "card-hover-lift",
      "progress-fill",
      "validation-shake",
      "success-flash",
      "slide-drawer",
    ],
    banned: ["parallax", "scroll-jacking", "auto-playing-video", "bouncing-logos", "confetti"],
    philosophy:
      "Every animation is functional. Status pulses = alive. " +
      "Stagger loads = data arriving. Hover glow = interactive. " +
      "Nothing moves just to move. Motion is information.",
  },

  /** Backwards compat: the combined allowed/banned (union of both contexts). */
  allowed: ["typing-effect", "cursor-blink"],
  banned: ["parallax", "floating-elements", "scroll-jacking", "hover-bounce"],
} as const;

// ===========================================================================
// IMAGERY
// ===========================================================================

export const imagery = {
  allowed: ["screenshots of real things people built", "terminal output", "code"],
  banned: [
    "stock photos",
    "illustrations of diverse teams collaborating",
    "abstract gradient blobs",
    "generic tech imagery",
    "AI-generated art",
  ],
} as const;

// ===========================================================================
// PAGE-LEVEL COPY FRAMEWORKS
// ===========================================================================

/**
 * Every page type has a copy framework. Use these to write headlines,
 * subheads, and CTAs. Always reference emotionalArc for the target feeling.
 */
export const copyFrameworks = {
  landing: {
    headline: "Ask the question. Let imagination do the work.",
    structure: "Question → Scenarios → Price reveal → CTA",
    cta: "Get your WOPR Bot",
    antiPattern: "Never list features. Show outcomes.",
    example: {
      headline: "What would you do with your own WOPR Bot?",
      scenarios: [
        "Run a company from your phone.",
        "Ship code while you sleep.",
        "Never answer a support ticket again.",
      ],
      reveal: "$5/month. Not a typo.",
      cta: "Get your WOPR Bot",
    },
  },

  onboarding: {
    headline: "Mission briefing. You're the commander.",
    structure: "Step label → Terminal-style instruction → Action",
    cta: "Continue / Launch",
    antiPattern: "Never say 'step 1 of 6.' Say 'STEP 01 // DESIGNATION.'",
    tone: "Military command terminal. Every step is a mission phase.",
  },

  dashboard: {
    headline: "Status report. Everything your WOPR Bot did today.",
    structure: "Stats → Activity feed → Quick actions",
    cta: "Launch another WOPR Bot",
    antiPattern: "Never show an empty dashboard. Always show something happening.",
    tone: "Mission control. Calm authority.",
  },

  marketplace: {
    headline: "Make your WOPR Bot do more.",
    structure: "Categories → Cards → Detail → Install",
    cta: "Install / Add to your WOPR Bot",
    antiPattern: "Never say 'browse our catalog.' This is an arsenal, not a library.",
    tone: "Candy store meets armory.",
  },

  billing: {
    headline: "What you're getting for $5.",
    structure: "Balance → Usage breakdown → Top up",
    cta: "Add credits",
    antiPattern: "Never hide the price. Never make billing scary. Reinforce the deal.",
    tone: "Transparent. The numbers are your friend.",
  },

  settings: {
    headline: "Configure your supercomputer.",
    structure: "Section → Form → Save confirmation",
    cta: "Save",
    antiPattern: "Never make settings feel like a chore. This is a control panel.",
    tone: "Precise. Every toggle does something real.",
  },

  empty: {
    headline: "Your WOPR Bot could do more.",
    structure: "Terminal-style message → Suggestion → CTA",
    antiPattern: "Never say 'nothing here yet.' Always suggest the next action.",
    examples: [
      "> NO CHANNELS LINKED. YOUR WOPR BOT IS ISOLATED.",
      "> FLEET EMPTY. AWAITING LAUNCH ORDERS.",
      "> NO PLUGINS INSTALLED. YOUR WOPR BOT IS RUNNING STOCK.",
    ],
  },
} as const;
