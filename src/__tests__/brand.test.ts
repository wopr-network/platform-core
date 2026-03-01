import { describe, expect, it } from "vitest";
import {
  animation,
  audience,
  BRAND_NAME,
  colors,
  copyExamples,
  copyFrameworks,
  DOMAIN,
  emotionalArc,
  imagery,
  layout,
  nameRules,
  PRICE,
  PRODUCT_NAME,
  product,
  TAGLINE,
  typography,
  vision,
  voice,
} from "../lib/brand";

describe("Brand Bible", () => {
  describe("Vision", () => {
    it("defines what we sell in one sentence", () => {
      expect(vision.oneLiner).toContain("$5");
      expect(vision.oneLiner).toContain("supercomputer");
    });

    it("sells outcomes, not features", () => {
      for (const outcome of vision.sells) {
        expect(outcome).not.toMatch(/\bAI\b|\bLLM\b|\bagent\b|\bworkflow\b|\bintegration\b/i);
      }
    });

    it("explicitly rejects feature-speak", () => {
      expect(vision.doesNotSell).toContain("AI capabilities");
      expect(vision.doesNotSell).toContain("Agent orchestration");
    });

    it("defines the absurdity gap mechanic", () => {
      expect(vision.absurdityGap.what).toBe("A supercomputer that runs your business");
      expect(vision.absurdityGap.cost).toBe("$5/month");
      expect(vision.absurdityGap.emotion).toBe("How is this even legal?");
    });
  });

  describe("Product definition", () => {
    it("defines what a WOPR Bot IS", () => {
      expect(product.is).toContain("A supercomputer");
    });

    it("defines what a WOPR Bot is NOT", () => {
      expect(product.isNot).toContain("A chatbot");
      expect(product.isNot).toContain("A platform");
    });

    it("describes outcomes, not features", () => {
      for (const outcome of product.does) {
        expect(outcome).not.toMatch(/orchestrat|integrat|leverag/i);
      }
    });
  });

  describe("Audience", () => {
    it("knows who we are talking to", () => {
      expect(audience.primary).toContain("23-year-old");
    });

    it("knows what they want", () => {
      expect(audience.wants.length).toBeGreaterThan(0);
    });

    it("has neutralizers for every fear", () => {
      expect(Object.keys(audience.neutralizers).length).toBe(audience.fears.length);
    });
  });

  describe("Emotional arc", () => {
    it("defines feelings for all major page types", () => {
      const pages = [
        "landing",
        "onboarding",
        "dashboard",
        "marketplace",
        "billing",
        "settings",
        "fleet",
      ] as const;
      for (const page of pages) {
        expect(typeof emotionalArc[page].feel).toBe("string");
        expect(typeof emotionalArc[page].job).toBe("string");
        expect(typeof emotionalArc[page].tone).toBe("string");
      }
    });

    it("landing page feel includes the price shock", () => {
      expect(emotionalArc.landing.feel).toContain("$5");
    });

    it("onboarding feels like launching a supercomputer", () => {
      expect(emotionalArc.onboarding.feel).toMatch(/supercomputer/i);
    });
  });

  describe("Product identity", () => {
    it("defines product name as WOPR Bot", () => {
      expect(PRODUCT_NAME).toBe("WOPR Bot");
    });

    it("defines brand name as WOPR", () => {
      expect(BRAND_NAME).toBe("WOPR");
    });

    it("defines domain as wopr.bot", () => {
      expect(DOMAIN).toBe("wopr.bot");
    });

    it("has a tagline that asks a question", () => {
      expect(TAGLINE).toContain("WOPR Bot");
      expect(TAGLINE).toContain("?");
    });

    it("defines the price point", () => {
      expect(PRICE).toBe("$5/month");
    });
  });

  describe("Name rules", () => {
    it("has correct name forms", () => {
      expect(nameRules.correct).toContain("WOPR Bot");
      expect(nameRules.correct).toContain("your WOPR Bot");
    });

    it("flags incorrect name forms", () => {
      expect(nameRules.incorrect).toContain("the WOPR platform");
      expect(nameRules.incorrect).toContain("WOPR AI");
    });

    it("does not allow bare WOPR as product name", () => {
      expect(nameRules.incorrect).toContain("WOPR");
    });
  });

  describe("Color palette", () => {
    it("has black as primary background", () => {
      expect(colors.black).toBe("#000000");
    });

    it("defines terminal green as primary brand color", () => {
      expect(colors.green).toMatch(/^#00FF/i);
    });

    it("has white for text contrast", () => {
      expect(colors.white).toBe("#FFFFFF");
    });

    it("defines all required palette colors", () => {
      const required = [
        "black",
        "green",
        "greenDim",
        "greenFaint",
        "greenBorder",
        "white",
        "gray",
        "grayDim",
        "surface",
        "surfaceElevated",
        "red",
        "amber",
      ] as const;
      for (const key of required) {
        expect(colors[key]).toMatch(/^#[0-9A-Fa-f]+$/);
      }
    });
  });

  describe("Typography", () => {
    it("uses a monospace font family", () => {
      expect(typography.fontFamily).toContain("monospace");
    });

    it("specifies JetBrains Mono", () => {
      expect(typography.fontFamily).toContain("JetBrains Mono");
    });

    it("defines all scale levels", () => {
      const levels = ["hero", "h1", "h2", "h3", "body", "small", "xs", "mono"] as const;
      for (const level of levels) {
        expect(typography.scale[level].size).toMatch(/^\d/);
        expect(typography.scale[level].lineHeight).toMatch(/^\d/);
        expect(typeof typography.scale[level].weight).toBe("string");
      }
    });
  });

  describe("Layout", () => {
    it("uses sharp border radius", () => {
      expect(Number.parseFloat(layout.radius)).toBeLessThanOrEqual(0.25);
    });

    it("has generous section padding", () => {
      expect(Number.parseFloat(layout.sectionPadding)).toBeGreaterThanOrEqual(6);
    });
  });

  describe("Voice guide", () => {
    it("has 7 voice rules", () => {
      expect(voice.rules).toHaveLength(7);
    });

    it("bans corporate language", () => {
      expect(voice.bannedWords).toContain("leverage");
      expect(voice.bannedWords).toContain("empower");
      expect(voice.bannedWords).toContain("seamless");
      expect(voice.bannedWords).toContain("robust");
    });

    it("bans specific phrases", () => {
      expect(voice.notAllowed.length).toBeGreaterThan(0);
      for (const phrase of voice.notAllowed) {
        expect(typeof phrase).toBe("string");
        expect(phrase.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Copy examples", () => {
    it("has at least 10 do/dont pairs", () => {
      expect(copyExamples.length).toBeGreaterThanOrEqual(10);
    });

    it("each example has do, dont, and rule", () => {
      for (const example of copyExamples) {
        expect(typeof example.do).toBe("string");
        expect(typeof example.dont).toBe("string");
        expect(typeof example.rule).toBe("string");
      }
    });

    it("includes WOPR Bot name usage examples", () => {
      const hasNameExample = copyExamples.some(
        (e) => e.do.includes("WOPR Bot") || e.rule.includes("WOPR Bot"),
      );
      expect(hasNameExample).toBe(true);
    });

    it("includes supercomputer angle", () => {
      const hasSupercomputer = copyExamples.some((e) =>
        e.do.toLowerCase().includes("supercomputer"),
      );
      expect(hasSupercomputer).toBe(true);
    });
  });

  describe("Animation", () => {
    it("keeps backwards-compat allowed list", () => {
      expect(animation.allowed).toContain("typing-effect");
      expect(animation.allowed).toContain("cursor-blink");
      expect(animation.allowed).toHaveLength(2);
    });

    it("bans parallax and scroll-jacking", () => {
      expect(animation.banned).toContain("parallax");
      expect(animation.banned).toContain("scroll-jacking");
    });

    it("separates marketing from product UI animation", () => {
      expect(animation.marketing.allowed).toBeInstanceOf(Array);
      expect(animation.productUI.allowed).toBeInstanceOf(Array);
    });

    it("marketing animation is restrained", () => {
      expect(animation.marketing.allowed.length).toBeLessThanOrEqual(5);
      expect(animation.marketing.banned).toContain("parallax");
    });

    it("product UI allows functional motion", () => {
      expect(animation.productUI.allowed).toContain("stagger-enter");
      expect(animation.productUI.allowed).toContain("status-pulse");
      expect(animation.productUI.allowed).toContain("hover-glow");
      expect(animation.productUI.allowed).toContain("skeleton-loading");
    });

    it("product UI still bans gratuitous animation", () => {
      expect(animation.productUI.banned).toContain("parallax");
      expect(animation.productUI.banned).toContain("confetti");
    });
  });

  describe("Imagery", () => {
    it("bans stock photos", () => {
      expect(imagery.banned).toContain("stock photos");
    });

    it("allows screenshots of real things", () => {
      const hasScreenshots = imagery.allowed.some((a) => a.includes("screenshot"));
      expect(hasScreenshots).toBe(true);
    });
  });

  describe("Copy frameworks", () => {
    it("defines frameworks for all page types", () => {
      const pages = [
        "landing",
        "onboarding",
        "dashboard",
        "marketplace",
        "billing",
        "settings",
        "empty",
      ] as const;
      for (const page of pages) {
        expect(typeof copyFrameworks[page].headline).toBe("string");
      }
    });

    it("empty states always suggest action", () => {
      expect(copyFrameworks.empty.antiPattern).toContain("nothing here yet");
    });

    it("landing page has a complete example", () => {
      expect(copyFrameworks.landing.example).toBeDefined();
      expect(copyFrameworks.landing.example.headline).toContain("WOPR Bot");
      expect(copyFrameworks.landing.example.reveal).toContain("$5");
    });
  });
});
