"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  channelPlugins,
  type OnboardingConfigField,
  superpowers,
  validateField,
} from "@/lib/onboarding-data";

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

export interface OnboardingState {
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
  creditBalance: string;
  byokKeyValues: Record<string, string>;
  byokKeyErrors: Record<string, string | null>;
  // Step 6: Launch
  deployStatus: DeployStatus;
}

export interface OnboardingActions {
  // Step 1
  setWoprName: (name: string) => void;
  setPersonalityId: (id: string) => void;
  setCustomPersonality: (value: string) => void;
  // Step 2
  toggleChannel: (id: string) => void;
  // Step 3
  setChannelKeyValue: (key: string, value: string) => void;
  validateChannelKey: (key: string) => void;
  // Step 4
  toggleSuperpower: (id: string) => void;
  // Step 5
  setProviderMode: (mode: ProviderMode) => void;
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

export function useOnboarding(): [OnboardingState, OnboardingActions] {
  const [step, setStep] = useState<OnboardingStep>("name");
  // Step 1
  const [woprName, setWoprName] = useState("");
  const [personalityId, setPersonalityId] = useState("helpful");
  const [customPersonality, setCustomPersonality] = useState("");
  // Step 2
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  // Step 3
  const [channelKeyValues, setChannelKeyValues] = useState<Record<string, string>>({});
  const [channelKeyErrors, setChannelKeyErrors] = useState<Record<string, string | null>>({});
  // Step 4
  const [selectedSuperpowers, setSelectedSuperpowers] = useState<string[]>([]);
  // Step 5
  const [providerMode, setProviderModeState] = useState<ProviderMode>("hosted");
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
        const sp = superpowers.find((s) => s.id === id);
        return sp?.requiresKey;
      });
    if (needsPowerSource) return STEP_ORDER;
    return STEP_ORDER.filter((s) => s !== "power-source");
  }, [selectedSuperpowers]);

  const stepIndex = effectiveStepOrder.indexOf(step);
  const totalSteps = effectiveStepOrder.length;
  const progress = totalSteps > 1 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  // Collect config fields for selected channels
  const channelConfigFields = useMemo(() => {
    const fields: OnboardingConfigField[] = [];
    const seen = new Set<string>();
    for (const id of selectedChannels) {
      const plugin = channelPlugins.find((c) => c.id === id);
      if (!plugin) continue;
      for (const field of plugin.configFields) {
        if (!seen.has(field.key)) {
          seen.add(field.key);
          fields.push(field);
        }
      }
    }
    return fields;
  }, [selectedChannels]);

  // Collect config fields for BYOK superpowers
  const byokConfigFields = useMemo(() => {
    const fields: OnboardingConfigField[] = [];
    const seen = new Set<string>();
    for (const id of selectedSuperpowers) {
      const sp = superpowers.find((s) => s.id === id);
      if (!sp?.requiresKey) continue;
      for (const field of sp.configFields) {
        if (!seen.has(field.key)) {
          seen.add(field.key);
          fields.push(field);
        }
      }
    }
    return fields;
  }, [selectedSuperpowers]);

  // --- Actions ---

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
      const error = validateField(field, value);
      setChannelKeyErrors((prev) => ({ ...prev, [key]: error }));
    },
    [channelConfigFields, channelKeyValues],
  );

  const toggleSuperpower = useCallback((id: string) => {
    setSelectedSuperpowers((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }, []);

  const setProviderMode = useCallback((mode: ProviderMode) => {
    setProviderModeState(mode);
  }, []);

  const setByokKeyValue = useCallback((key: string, value: string) => {
    setByokKeyValues((prev) => ({ ...prev, [key]: value }));
    setByokKeyErrors((prev) => ({ ...prev, [key]: null }));
  }, []);

  const validateByokKey = useCallback(
    (key: string) => {
      const field = byokConfigFields.find((f) => f.key === key);
      if (!field) return;
      const value = byokKeyValues[key] || "";
      const error = validateField(field, value);
      setByokKeyErrors((prev) => ({ ...prev, [key]: error }));
    },
    [byokConfigFields, byokKeyValues],
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
          return validateField(f, value) === null;
        });
      case "superpowers":
        return true; // superpowers are optional
      case "power-source":
        if (providerMode === "hosted") return true;
        // BYOK: all key fields must be valid
        return byokConfigFields.every((f) => {
          const value = byokKeyValues[f.key] || "";
          return validateField(f, value) === null;
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
          const error = validateField(field, value);
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
          const error = validateField(field, value);
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
    setSelectedChannels([]);
    setChannelKeyValues({});
    setChannelKeyErrors({});
    setSelectedSuperpowers([]);
    setProviderModeState("hosted");
    setByokKeyValues({});
    setByokKeyErrors({});
    setDeployStatus("idle");
  }, []);

  const state: OnboardingState = {
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
    creditBalance: "$5.00",
    byokKeyValues,
    byokKeyErrors,
    deployStatus,
  };

  const actions: OnboardingActions = {
    setWoprName,
    setPersonalityId,
    setCustomPersonality,
    toggleChannel,
    setChannelKeyValue,
    validateChannelKey,
    toggleSuperpower,
    setProviderMode,
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
