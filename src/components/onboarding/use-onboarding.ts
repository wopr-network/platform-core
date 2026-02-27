"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type OnboardingConfigField, usePluginRegistry } from "@/hooks/use-plugin-registry";
import { deployInstance, getCreditBalance, listInstances, testChannelConnection } from "@/lib/api";
import { formatCreditStandard } from "@/lib/format-credit";
import { type ByokAiProvider, getAiKeyField } from "@/lib/onboarding-data";
import { markOnboardingComplete } from "@/lib/onboarding-store";

export type ChannelValidationStatus = "idle" | "validating" | "valid" | "invalid";

export type WizardMode = "onboarding" | "fleet-add";

export type ProviderMode = "hosted" | "byok";

export type OnboardingStep =
  | "name"
  | "channels"
  | "connect"
  | "superpowers"
  | "cost-compare"
  | "power-source"
  | "billing"
  | "launch";

const STEP_ORDER: OnboardingStep[] = [
  "name",
  "channels",
  "connect",
  "superpowers",
  "cost-compare",
  "power-source",
  "billing",
  "launch",
];

export type DeployStatus =
  | "idle"
  | "provisioning"
  | "configuring"
  | "starting"
  | "health-check"
  | "done"
  | "error";

export interface ExistingBot {
  id: string;
  name: string;
  personalityId: string;
  customPersonality: string;
  superpowers: string[];
}

export interface OnboardingState {
  mode: WizardMode;
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  progress: number;
  // Step 1: Name + personality
  woprName: string;
  personalityId: string;
  customPersonality: string;
  // Step 2: Channel selection
  selectedChannels: string[];
  // Step 3: Channel connection keys
  channelKeyValues: Record<string, string>;
  channelKeyErrors: Record<string, string | null>;
  channelValidationStatus: Record<string, ChannelValidationStatus>;
  channelValidationErrors: Record<string, string | null>;
  // Step 4: Superpowers
  selectedSuperpowers: string[];
  // Step 5: Power source
  providerMode: ProviderMode;
  byokAiProvider: ByokAiProvider;
  creditBalance: string;
  byokKeyValues: Record<string, string>;
  byokKeyErrors: Record<string, string | null>;
  byokKeyValidationStatus: Record<string, "idle" | "validating" | "valid" | "invalid">;
  byokKeyValidationErrors: Record<string, string | null>;
  // Step 5b: Billing (hosted mode only)
  paymentMethodReady: boolean;
  // Step 6: Launch
  deployStatus: DeployStatus;
  // Fleet-add mode extras
  existingBots: ExistingBot[];
  cloneFromBotId: string;
}

export interface OnboardingActions {
  // Step 1
  setWoprName: (name: string) => void;
  setPersonalityId: (id: string) => void;
  setCustomPersonality: (value: string) => void;
  setCloneFromBot: (botId: string) => void;
  // Step 2
  toggleChannel: (id: string) => void;
  // Step 3
  setChannelKeyValue: (key: string, value: string) => void;
  validateChannelKey: (key: string) => void;
  verifyChannel: (channelId: string) => void;
  // Step 4
  toggleSuperpower: (id: string) => void;
  // Step 5
  setProviderMode: (mode: ProviderMode) => void;
  setByokAiProvider: (provider: ByokAiProvider) => void;
  setByokKeyValue: (key: string, value: string) => void;
  validateByokKey: (key: string) => void;
  validateByokKeyAsync: (key: string) => Promise<void>;
  // Step 5b
  setPaymentMethodReady: (ready: boolean) => void;
  // Navigation
  next: () => void;
  back: () => void;
  canAdvance: () => boolean;
  // Step 6
  deploy: () => void;
  reset: () => void;
}

/** Build the env record for the fleet create API from onboarding state. */
function buildDeployEnv(opts: {
  personalityId: string;
  customPersonality: string;
  selectedChannels: string[];
  channelKeyValues: Record<string, string>;
  selectedSuperpowers: string[];
  providerMode: "hosted" | "byok";
  byokAiProvider: string;
  byokKeyValues: Record<string, string>;
}): Record<string, string> {
  const env: Record<string, string> = {};

  // Personality
  env.WOPR_PERSONALITY = opts.personalityId;
  if (opts.personalityId === "custom" && opts.customPersonality) {
    env.WOPR_CUSTOM_PERSONALITY = opts.customPersonality;
  }

  // Channels
  if (opts.selectedChannels.length > 0) {
    env.WOPR_PLUGINS_CHANNELS = opts.selectedChannels.join(",");
  }

  // Channel credentials (e.g., DISCORD_BOT_TOKEN, SLACK_BOT_TOKEN)
  for (const [key, value] of Object.entries(opts.channelKeyValues)) {
    if (value) {
      env[key.toUpperCase()] = value;
    }
  }

  // Superpowers
  if (opts.selectedSuperpowers.length > 0) {
    env.WOPR_PLUGINS_OTHER = opts.selectedSuperpowers.join(",");
  }

  // Inference mode
  env.WOPR_INFERENCE_MODE = opts.providerMode;
  if (opts.providerMode === "byok") {
    env.WOPR_AI_PROVIDER = opts.byokAiProvider;
    for (const [key, value] of Object.entries(opts.byokKeyValues)) {
      if (value) {
        env[key.toUpperCase()] = value;
      }
    }
  }

  return env;
}

export function useOnboarding(
  mode: WizardMode = "onboarding",
): [OnboardingState, OnboardingActions] {
  const registry = usePluginRegistry();
  const isFleetAdd = mode === "fleet-add";

  // Fetch real bots from API in fleet-add mode
  const [fetchedBots, setFetchedBots] = useState<ExistingBot[]>([]);

  useEffect(() => {
    if (!isFleetAdd) return;
    let cancelled = false;
    listInstances()
      .then((instances) => {
        if (cancelled) return;
        setFetchedBots(
          instances.map((inst) => ({
            id: inst.id,
            name: inst.name,
            personalityId: "helpful",
            customPersonality: "",
            superpowers: inst.plugins.filter((p) => p.enabled).map((p) => p.id),
          })),
        );
      })
      .catch(() => {
        // Fail silently — fleet-add works fine with empty existing bots
      });
    return () => {
      cancelled = true;
    };
  }, [isFleetAdd]);

  // Fetch real credit balance from API
  const [realCreditBalance, setRealCreditBalance] = useState<string>("$0.00");

  useEffect(() => {
    let cancelled = false;
    getCreditBalance()
      .then((data) => {
        if (!cancelled) setRealCreditBalance(formatCreditStandard(data.balance));
      })
      .catch(() => {
        // Keep default $0.00 on error
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pre-check superpowers from existing bots in fleet-add mode
  const fleetSuperpowers = useMemo(() => {
    if (!isFleetAdd) return [];
    const ids = new Set<string>();
    for (const bot of fetchedBots) {
      for (const sp of bot.superpowers) {
        ids.add(sp);
      }
    }
    return [...ids];
  }, [isFleetAdd, fetchedBots]);

  const [step, setStep] = useState<OnboardingStep>("name");
  // Step 1
  const [woprName, setWoprName] = useState("");
  const [personalityId, setPersonalityId] = useState("helpful");
  const [customPersonality, setCustomPersonality] = useState("");
  const [cloneFromBotId, setCloneFromBotId] = useState("");
  // Step 2
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  // Step 3
  const [channelKeyValues, setChannelKeyValues] = useState<Record<string, string>>({});
  const [channelKeyErrors, setChannelKeyErrors] = useState<Record<string, string | null>>({});
  const [channelValidationStatus, setChannelValidationStatus] = useState<
    Record<string, ChannelValidationStatus>
  >({});
  const [channelValidationErrors, setChannelValidationErrors] = useState<
    Record<string, string | null>
  >({});
  // Step 4 — pre-check superpowers from fleet in fleet-add mode
  const [selectedSuperpowers, setSelectedSuperpowers] = useState<string[]>(fleetSuperpowers);

  // Sync fleet superpowers when they load async
  useEffect(() => {
    if (isFleetAdd && fleetSuperpowers.length > 0) {
      setSelectedSuperpowers(fleetSuperpowers);
    }
  }, [isFleetAdd, fleetSuperpowers]);
  // Step 5
  const [providerMode, setProviderModeState] = useState<ProviderMode>("hosted");
  const [byokAiProvider, setByokAiProviderState] = useState<ByokAiProvider>("openrouter");
  const [byokKeyValues, setByokKeyValues] = useState<Record<string, string>>({});
  const [byokKeyErrors, setByokKeyErrors] = useState<Record<string, string | null>>({});
  const [byokKeyValidationStatus, setByokKeyValidationStatus] = useState<
    Record<string, "idle" | "validating" | "valid" | "invalid">
  >({});
  const [byokKeyValidationErrors, setByokKeyValidationErrors] = useState<
    Record<string, string | null>
  >({});
  // Step 5b: Billing
  const [paymentMethodReady, setPaymentMethodReady] = useState(false);
  // Step 6
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("idle");

  const deployIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (deployIntervalRef.current) clearInterval(deployIntervalRef.current);
    };
  }, []);

  // Compute effective step order -- skip power-source if no superpowers need keys
  const effectiveStepOrder = useMemo(() => {
    const needsPowerSource =
      selectedSuperpowers.length > 0 &&
      selectedSuperpowers.some((id) => {
        const sp = registry.superpowers.find((s) => s.id === id);
        return sp?.requiresKey;
      });

    let steps = STEP_ORDER;
    if (!needsPowerSource) {
      steps = steps.filter((s) => s !== "power-source");
    }
    // Only show billing step for hosted mode
    if (providerMode !== "hosted") {
      steps = steps.filter((s) => s !== "billing");
    }
    return steps;
  }, [selectedSuperpowers, providerMode, registry.superpowers]);

  const stepIndex = effectiveStepOrder.indexOf(step);
  const totalSteps = effectiveStepOrder.length;
  const progress = totalSteps > 1 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  // Collect config fields for selected channels
  const channelConfigFields = useMemo(() => {
    const fields: OnboardingConfigField[] = [];
    const seen = new Set<string>();
    for (const id of selectedChannels) {
      const plugin = registry.channels.find((c) => c.id === id);
      if (!plugin) continue;
      for (const field of plugin.configFields) {
        if (!seen.has(field.key)) {
          seen.add(field.key);
          fields.push(field);
        }
      }
    }
    return fields;
  }, [selectedChannels, registry.channels]);

  // Collect config fields for BYOK superpowers
  // AI-key superpowers share a single key field that depends on byokAiProvider
  const byokConfigFields = useMemo(() => {
    const fields: OnboardingConfigField[] = [];
    const seen = new Set<string>();
    let needsAiKey = false;
    for (const id of selectedSuperpowers) {
      const sp = registry.superpowers.find((s) => s.id === id);
      if (!sp?.requiresKey) continue;
      if (sp.usesAiKey) {
        needsAiKey = true;
        continue;
      }
      for (const field of sp.configFields) {
        if (!seen.has(field.key)) {
          seen.add(field.key);
          fields.push(field);
        }
      }
    }
    if (needsAiKey) {
      const aiField = getAiKeyField(byokAiProvider);
      if (!seen.has(aiField.key)) {
        seen.add(aiField.key);
        fields.unshift(aiField);
      }
    }
    return fields;
  }, [selectedSuperpowers, byokAiProvider, registry.superpowers]);

  // --- Actions ---

  const setCloneFromBot = useCallback(
    (botId: string) => {
      setCloneFromBotId(botId);
      if (!botId) return;
      const bot = fetchedBots.find((b) => b.id === botId);
      if (!bot) return;
      setPersonalityId(bot.personalityId);
      setCustomPersonality(bot.customPersonality);
      setSelectedSuperpowers([...bot.superpowers]);
    },
    [fetchedBots],
  );

  const toggleChannel = useCallback((id: string) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }, []);

  const setChannelKeyValue = useCallback(
    (key: string, value: string) => {
      setChannelKeyValues((prev) => ({ ...prev, [key]: value }));
      setChannelKeyErrors((prev) => ({ ...prev, [key]: null }));
      // Reset validation status for the channel that owns this key
      for (const channel of registry.channels) {
        if (channel.configFields.some((f) => f.key === key)) {
          setChannelValidationStatus((prev) => ({ ...prev, [channel.id]: "idle" }));
          setChannelValidationErrors((prev) => ({ ...prev, [channel.id]: null }));
          break;
        }
      }
    },
    [registry.channels],
  );

  const validateChannelKey = useCallback(
    (key: string) => {
      const field = channelConfigFields.find((f) => f.key === key);
      if (!field) return;
      const value = channelKeyValues[key] || "";
      const error = registry.validateField(field, value);
      setChannelKeyErrors((prev) => ({ ...prev, [key]: error }));
    },
    [channelConfigFields, channelKeyValues, registry],
  );

  const verifyChannel = useCallback(
    async (channelId: string) => {
      const channel = registry.channels.find((c) => c.id === channelId);
      if (!channel) return;

      const credentials: Record<string, string> = {};
      for (const field of channel.configFields) {
        credentials[field.key] = channelKeyValues[field.key] || "";
      }

      setChannelValidationStatus((prev) => ({ ...prev, [channelId]: "validating" }));
      setChannelValidationErrors((prev) => ({ ...prev, [channelId]: null }));

      try {
        const result = await testChannelConnection(channelId, credentials);
        if (result.success) {
          setChannelValidationStatus((prev) => {
            if (prev[channelId] !== "validating") return prev;
            return { ...prev, [channelId]: "valid" };
          });
        } else {
          setChannelValidationStatus((prev) => {
            if (prev[channelId] !== "validating") return prev;
            return { ...prev, [channelId]: "invalid" };
          });
          setChannelValidationErrors((prev) => ({
            ...prev,
            [channelId]: result.error || "Verification failed",
          }));
        }
      } catch {
        setChannelValidationStatus((prev) => {
          if (prev[channelId] !== "validating") return prev;
          return { ...prev, [channelId]: "invalid" };
        });
        setChannelValidationErrors((prev) => ({
          ...prev,
          [channelId]: "Could not reach the server. Check your connection.",
        }));
      }
    },
    [channelKeyValues, registry.channels],
  );

  const toggleSuperpower = useCallback((id: string) => {
    setSelectedSuperpowers((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }, []);

  const setProviderMode = useCallback((mode: ProviderMode) => {
    setProviderModeState(mode);
  }, []);

  const setByokAiProvider = useCallback(
    (provider: ByokAiProvider) => {
      if (provider === byokAiProvider) return;
      setByokAiProviderState(provider);
      // Clear AI key values when switching providers (different key formats)
      setByokKeyValues((prev) => {
        const next = { ...prev };
        delete next.openai_api_key;
        delete next.openrouter_api_key;
        return next;
      });
      setByokKeyErrors((prev) => {
        const next = { ...prev };
        delete next.openai_api_key;
        delete next.openrouter_api_key;
        return next;
      });
      setByokKeyValidationStatus((prev) => {
        const next = { ...prev };
        delete next.openai_api_key;
        delete next.openrouter_api_key;
        return next;
      });
      setByokKeyValidationErrors((prev) => {
        const next = { ...prev };
        delete next.openai_api_key;
        delete next.openrouter_api_key;
        return next;
      });
    },
    [byokAiProvider],
  );

  const setByokKeyValue = useCallback((key: string, value: string) => {
    setByokKeyValues((prev) => ({ ...prev, [key]: value }));
    setByokKeyErrors((prev) => ({ ...prev, [key]: null }));
    setByokKeyValidationStatus((prev) => ({ ...prev, [key]: "idle" }));
    setByokKeyValidationErrors((prev) => ({ ...prev, [key]: null }));
  }, []);

  const validateByokKey = useCallback(
    (key: string) => {
      const field = byokConfigFields.find((f) => f.key === key);
      if (!field) return;
      const value = byokKeyValues[key] || "";
      const error = registry.validateField(field, value);
      setByokKeyErrors((prev) => ({ ...prev, [key]: error }));
    },
    [byokConfigFields, byokKeyValues, registry],
  );

  const validateByokKeyAsync = useCallback(
    async (key: string) => {
      const value = byokKeyValues[key] || "";
      if (!value.trim()) return;

      let provider: string;
      if (key === "openai_api_key") {
        provider = "openai";
      } else if (key === "openrouter_api_key") {
        provider = "openrouter";
      } else {
        provider = key.replace(/_api_key$/, "");
      }

      setByokKeyValidationStatus((prev) => ({ ...prev, [key]: "validating" }));
      setByokKeyValidationErrors((prev) => ({ ...prev, [key]: null }));

      try {
        const { testProviderKey } = await import("@/lib/settings-api");
        const result = await testProviderKey(provider, value);
        if (result.valid) {
          setByokKeyValidationStatus((prev) => ({ ...prev, [key]: "valid" }));
        } else {
          setByokKeyValidationStatus((prev) => ({ ...prev, [key]: "invalid" }));
          setByokKeyValidationErrors((prev) => ({
            ...prev,
            [key]: result.error ?? "Invalid API key. Please check and try again.",
          }));
        }
      } catch {
        setByokKeyValidationStatus((prev) => ({ ...prev, [key]: "invalid" }));
        setByokKeyValidationErrors((prev) => ({
          ...prev,
          [key]: "Could not validate key. Check your connection and try again.",
        }));
      }
    },
    [byokKeyValues],
  );

  const canAdvance = useCallback((): boolean => {
    switch (step) {
      case "name":
        return woprName.trim().length > 0;
      case "channels":
        return selectedChannels.length > 0;
      case "connect":
        return (
          channelConfigFields.every((f) => {
            const value = channelKeyValues[f.key] || "";
            return registry.validateField(f, value) === null;
          }) && selectedChannels.every((id) => channelValidationStatus[id] === "valid")
        );
      case "superpowers":
        return true; // superpowers are optional
      case "cost-compare":
        return true; // informational, always skippable
      case "power-source":
        if (providerMode === "hosted") return true;
        // BYOK: all key fields must pass regex AND server validation
        return byokConfigFields.every((f) => {
          const value = byokKeyValues[f.key] || "";
          return (
            registry.validateField(f, value) === null && byokKeyValidationStatus[f.key] === "valid"
          );
        });
      case "billing":
        return paymentMethodReady;
      case "launch":
        return deployStatus === "done";
    }
  }, [
    step,
    woprName,
    selectedChannels,
    channelConfigFields,
    channelKeyValues,
    channelValidationStatus,
    providerMode,
    byokConfigFields,
    byokKeyValues,
    byokKeyValidationStatus,
    paymentMethodReady,
    deployStatus,
    registry,
  ]);

  const next = useCallback(() => {
    const currentIndex = effectiveStepOrder.indexOf(step);
    if (currentIndex < effectiveStepOrder.length - 1) {
      // Validate channel keys before leaving connect step
      if (step === "connect") {
        const errors: Record<string, string | null> = {};
        let valid = true;
        for (const field of channelConfigFields) {
          const value = channelKeyValues[field.key] || "";
          const error = registry.validateField(field, value);
          errors[field.key] = error;
          if (error) valid = false;
        }
        setChannelKeyErrors(errors);
        if (!valid) return;
      }
      // Validate BYOK keys before leaving power-source step
      if (step === "power-source" && providerMode === "byok") {
        const errors: Record<string, string | null> = {};
        let valid = true;
        for (const field of byokConfigFields) {
          const value = byokKeyValues[field.key] || "";
          const error = registry.validateField(field, value);
          errors[field.key] = error;
          if (error) valid = false;
        }
        setByokKeyErrors(errors);
        if (!valid) return;
      }
      const nextStep = effectiveStepOrder[currentIndex + 1];
      setStep(nextStep);
      try {
        window.dispatchEvent(
          new CustomEvent("wopr:onboarding:step", { detail: { step: nextStep, mode } }),
        );
      } catch {
        // ignore — analytics must never break the flow
      }
    }
  }, [
    step,
    mode,
    effectiveStepOrder,
    channelConfigFields,
    channelKeyValues,
    providerMode,
    byokConfigFields,
    byokKeyValues,
    registry,
  ]);

  const back = useCallback(() => {
    const currentIndex = effectiveStepOrder.indexOf(step);
    if (currentIndex > 0) {
      setStep(effectiveStepOrder[currentIndex - 1]);
    }
  }, [step, effectiveStepOrder]);

  const deploy = useCallback(async () => {
    if (deployIntervalRef.current) clearInterval(deployIntervalRef.current);
    setDeployStatus("provisioning");

    const env = buildDeployEnv({
      personalityId,
      customPersonality,
      selectedChannels,
      channelKeyValues,
      selectedSuperpowers,
      providerMode,
      byokAiProvider,
      byokKeyValues,
    });

    try {
      setDeployStatus("configuring");
      const instance = await deployInstance({
        name: woprName,
        description: "",
        env,
      });

      setDeployStatus("starting");
      // Brief pause so the user sees the "starting" stage in the terminal UI
      await new Promise((resolve) => setTimeout(resolve, 800));

      setDeployStatus("health-check");
      await new Promise((resolve) => setTimeout(resolve, 800));

      setDeployStatus("done");
      markOnboardingComplete();
      try {
        window.dispatchEvent(
          new CustomEvent("wopr:onboarding:complete", {
            detail: { mode, instanceId: instance.id },
          }),
        );
      } catch {
        // ignore — analytics must never break the flow
      }
    } catch {
      setDeployStatus("error");
    }
  }, [
    mode,
    woprName,
    personalityId,
    customPersonality,
    selectedChannels,
    channelKeyValues,
    selectedSuperpowers,
    providerMode,
    byokAiProvider,
    byokKeyValues,
  ]);

  const reset = useCallback(() => {
    if (deployIntervalRef.current) {
      clearInterval(deployIntervalRef.current);
      deployIntervalRef.current = null;
    }
    setStep("name");
    setWoprName("");
    setPersonalityId("helpful");
    setCustomPersonality("");
    setCloneFromBotId("");
    setSelectedChannels([]);
    setChannelKeyValues({});
    setChannelKeyErrors({});
    setChannelValidationStatus({});
    setChannelValidationErrors({});
    setSelectedSuperpowers(isFleetAdd ? fleetSuperpowers : []);
    setProviderModeState("hosted");
    setByokAiProviderState("openrouter");
    setByokKeyValues({});
    setByokKeyErrors({});
    setByokKeyValidationStatus({});
    setByokKeyValidationErrors({});
    setPaymentMethodReady(false);
    setDeployStatus("idle");
  }, [isFleetAdd, fleetSuperpowers]);

  const state: OnboardingState = {
    mode,
    step,
    stepIndex,
    totalSteps,
    progress,
    woprName,
    personalityId,
    customPersonality,
    selectedChannels,
    channelKeyValues,
    channelKeyErrors,
    channelValidationStatus,
    channelValidationErrors,
    selectedSuperpowers,
    providerMode,
    byokAiProvider,
    creditBalance: realCreditBalance,
    byokKeyValues,
    byokKeyErrors,
    byokKeyValidationStatus,
    byokKeyValidationErrors,
    paymentMethodReady,
    deployStatus,
    existingBots: isFleetAdd ? fetchedBots : [],
    cloneFromBotId,
  };

  const actions: OnboardingActions = {
    setWoprName,
    setPersonalityId,
    setCustomPersonality,
    setCloneFromBot,
    toggleChannel,
    setChannelKeyValue,
    validateChannelKey,
    verifyChannel,
    toggleSuperpower,
    setProviderMode,
    setByokAiProvider,
    setByokKeyValue,
    validateByokKey,
    validateByokKeyAsync,
    setPaymentMethodReady,
    next,
    back,
    canAdvance,
    deploy,
    reset,
  };

  return [state, actions];
}
