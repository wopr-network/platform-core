"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type OnboardingConfigField, usePluginRegistry } from "@/hooks/use-plugin-registry";
import { type ByokAiProvider, getAiKeyField } from "@/lib/onboarding-data";

export type WizardMode = "onboarding" | "fleet-add";

export type ProviderMode = "hosted" | "byok";

export type OnboardingStep =
  | "name"
  | "channels"
  | "connect"
  | "superpowers"
  | "power-source"
  | "launch";

const STEP_ORDER: OnboardingStep[] = [
  "name",
  "channels",
  "connect",
  "superpowers",
  "power-source",
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

/** Mock data for existing bots in fleet-add mode */
export interface ExistingBot {
  id: string;
  name: string;
  personalityId: string;
  customPersonality: string;
  superpowers: string[];
}

const MOCK_EXISTING_BOTS: ExistingBot[] = [
  {
    id: "bot-1",
    name: "Jarvis",
    personalityId: "helpful",
    customPersonality: "",
    superpowers: ["image-gen", "memory"],
  },
  {
    id: "bot-2",
    name: "Friday",
    personalityId: "creative",
    customPersonality: "",
    superpowers: ["voice", "memory", "search"],
  },
];

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
  // Step 4: Superpowers
  selectedSuperpowers: string[];
  // Step 5: Power source
  providerMode: ProviderMode;
  byokAiProvider: ByokAiProvider;
  creditBalance: string;
  byokKeyValues: Record<string, string>;
  byokKeyErrors: Record<string, string | null>;
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
  // Step 4
  toggleSuperpower: (id: string) => void;
  // Step 5
  setProviderMode: (mode: ProviderMode) => void;
  setByokAiProvider: (provider: ByokAiProvider) => void;
  setByokKeyValue: (key: string, value: string) => void;
  validateByokKey: (key: string) => void;
  // Navigation
  next: () => void;
  back: () => void;
  canAdvance: () => boolean;
  // Step 6
  deploy: () => void;
  reset: () => void;
}

export function useOnboarding(
  mode: WizardMode = "onboarding",
): [OnboardingState, OnboardingActions] {
  const registry = usePluginRegistry();
  const isFleetAdd = mode === "fleet-add";

  // Pre-check superpowers from existing bots in fleet-add mode
  const fleetSuperpowers = useMemo(() => {
    if (!isFleetAdd) return [];
    const ids = new Set<string>();
    for (const bot of MOCK_EXISTING_BOTS) {
      for (const sp of bot.superpowers) {
        ids.add(sp);
      }
    }
    return [...ids];
  }, [isFleetAdd]);

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
  // Step 4 — pre-check superpowers from fleet in fleet-add mode
  const [selectedSuperpowers, setSelectedSuperpowers] = useState<string[]>(fleetSuperpowers);
  // Step 5
  const [providerMode, setProviderModeState] = useState<ProviderMode>("hosted");
  const [byokAiProvider, setByokAiProviderState] = useState<ByokAiProvider>("openrouter");
  const [byokKeyValues, setByokKeyValues] = useState<Record<string, string>>({});
  const [byokKeyErrors, setByokKeyErrors] = useState<Record<string, string | null>>({});
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
    if (needsPowerSource) return STEP_ORDER;
    return STEP_ORDER.filter((s) => s !== "power-source");
  }, [selectedSuperpowers, registry.superpowers]);

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

  const setCloneFromBot = useCallback((botId: string) => {
    setCloneFromBotId(botId);
    if (!botId) return;
    const bot = MOCK_EXISTING_BOTS.find((b) => b.id === botId);
    if (!bot) return;
    setPersonalityId(bot.personalityId);
    setCustomPersonality(bot.customPersonality);
    setSelectedSuperpowers([...bot.superpowers]);
  }, []);

  const toggleChannel = useCallback((id: string) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }, []);

  const setChannelKeyValue = useCallback((key: string, value: string) => {
    setChannelKeyValues((prev) => ({ ...prev, [key]: value }));
    setChannelKeyErrors((prev) => ({ ...prev, [key]: null }));
  }, []);

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
    },
    [byokAiProvider],
  );

  const setByokKeyValue = useCallback((key: string, value: string) => {
    setByokKeyValues((prev) => ({ ...prev, [key]: value }));
    setByokKeyErrors((prev) => ({ ...prev, [key]: null }));
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

  const canAdvance = useCallback((): boolean => {
    switch (step) {
      case "name":
        return woprName.trim().length > 0;
      case "channels":
        return selectedChannels.length > 0;
      case "connect":
        return channelConfigFields.every((f) => {
          const value = channelKeyValues[f.key] || "";
          return registry.validateField(f, value) === null;
        });
      case "superpowers":
        return true; // superpowers are optional
      case "power-source":
        if (providerMode === "hosted") return true;
        // BYOK: all key fields must be valid
        return byokConfigFields.every((f) => {
          const value = byokKeyValues[f.key] || "";
          return registry.validateField(f, value) === null;
        });
      case "launch":
        return deployStatus === "done";
    }
  }, [
    step,
    woprName,
    selectedChannels,
    channelConfigFields,
    channelKeyValues,
    providerMode,
    byokConfigFields,
    byokKeyValues,
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
      setStep(effectiveStepOrder[currentIndex + 1]);
    }
  }, [
    step,
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

  const deploy = useCallback(() => {
    if (deployIntervalRef.current) clearInterval(deployIntervalRef.current);
    setDeployStatus("provisioning");
    const stages: DeployStatus[] = ["configuring", "starting", "health-check", "done"];
    let i = 0;
    deployIntervalRef.current = setInterval(() => {
      if (i < stages.length) {
        setDeployStatus(stages[i]);
        i++;
      } else {
        if (deployIntervalRef.current) clearInterval(deployIntervalRef.current);
        deployIntervalRef.current = null;
      }
    }, 1200);
  }, []);

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
    setSelectedSuperpowers(isFleetAdd ? fleetSuperpowers : []);
    setProviderModeState("hosted");
    setByokAiProviderState("openrouter");
    setByokKeyValues({});
    setByokKeyErrors({});
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
    selectedSuperpowers,
    providerMode,
    byokAiProvider,
    creditBalance: "$5.00",
    byokKeyValues,
    byokKeyErrors,
    deployStatus,
    existingBots: isFleetAdd ? MOCK_EXISTING_BOTS : [],
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
    toggleSuperpower,
    setProviderMode,
    setByokAiProvider,
    setByokKeyValue,
    validateByokKey,
    next,
    back,
    canAdvance,
    deploy,
    reset,
  };

  return [state, actions];
}
