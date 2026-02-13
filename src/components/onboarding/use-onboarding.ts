"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collectConfigFields,
  type OnboardingConfigField,
  type Preset,
  presets,
  resolveDependencies,
  validateField,
} from "@/lib/onboarding-data";

export type OnboardingStep =
  | "presets"
  | "channels"
  | "providers"
  | "plugins"
  | "keys"
  | "deploy"
  | "done";

const STEP_ORDER: OnboardingStep[] = [
  "presets",
  "channels",
  "providers",
  "plugins",
  "keys",
  "deploy",
  "done",
];

const CUSTOM_STEP_ORDER: OnboardingStep[] = [
  "channels",
  "providers",
  "plugins",
  "keys",
  "deploy",
  "done",
];

export interface OnboardingState {
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  progress: number;
  selectedPreset: Preset | null;
  selectedChannels: string[];
  selectedProviders: string[];
  selectedPlugins: string[];
  keyValues: Record<string, string>;
  keyErrors: Record<string, string | null>;
  keyValidating: Record<string, boolean>;
  configFields: OnboardingConfigField[];
  deployStatus: DeployStatus;
  isCustomFlow: boolean;
}

export type DeployStatus =
  | "idle"
  | "provisioning"
  | "configuring"
  | "starting"
  | "health-check"
  | "done"
  | "error";

export interface OnboardingActions {
  selectPreset: (preset: Preset) => void;
  toggleChannel: (id: string) => void;
  toggleProvider: (id: string) => void;
  togglePlugin: (id: string) => void;
  setKeyValue: (key: string, value: string) => void;
  validateKey: (key: string) => void;
  validateAllKeys: () => boolean;
  next: () => void;
  back: () => void;
  deploy: () => void;
  reset: () => void;
  canAdvance: () => boolean;
}

export function useOnboarding(): [OnboardingState, OnboardingActions] {
  const [step, setStep] = useState<OnboardingStep>("presets");
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedPlugins, setSelectedPlugins] = useState<string[]>([]);
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [keyErrors, setKeyErrors] = useState<Record<string, string | null>>({});
  const [keyValidating, setKeyValidating] = useState<Record<string, boolean>>({});
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("idle");
  const [isCustomFlow, setIsCustomFlow] = useState(false);

  const deployIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const validateTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      if (deployIntervalRef.current) clearInterval(deployIntervalRef.current);
      for (const t of Object.values(validateTimeoutsRef.current)) clearTimeout(t);
    };
  }, []);

  const stepOrder = isCustomFlow ? CUSTOM_STEP_ORDER : STEP_ORDER;
  const stepIndex = stepOrder.indexOf(step);
  const totalSteps = stepOrder.length;
  const progress = totalSteps > 1 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  const resolvedPlugins = useMemo(
    () => resolveDependencies(selectedChannels, selectedProviders, selectedPlugins),
    [selectedChannels, selectedProviders, selectedPlugins],
  );

  const configFields = useMemo(
    () => collectConfigFields(selectedChannels, selectedProviders, resolvedPlugins),
    [selectedChannels, selectedProviders, resolvedPlugins],
  );

  const selectPreset = useCallback((preset: Preset) => {
    setSelectedPreset(preset);
    setKeyValues({});
    setKeyErrors({});
    setKeyValidating({});
    if (preset.id === "custom") {
      setIsCustomFlow(true);
      setSelectedChannels([]);
      setSelectedProviders([]);
      setSelectedPlugins([]);
      setStep("channels");
    } else {
      setIsCustomFlow(false);
      setSelectedChannels(preset.channels);
      setSelectedProviders(preset.providers);
      setSelectedPlugins(preset.plugins);
      setStep("keys");
    }
  }, []);

  const toggleChannel = useCallback((id: string) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }, []);

  const toggleProvider = useCallback((id: string) => {
    setSelectedProviders((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }, []);

  const togglePlugin = useCallback((id: string) => {
    setSelectedPlugins((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }, []);

  const setKeyValue = useCallback((key: string, value: string) => {
    setKeyValues((prev) => ({ ...prev, [key]: value }));
    setKeyErrors((prev) => ({ ...prev, [key]: null }));
  }, []);

  const validateKey = useCallback(
    (key: string) => {
      const field = configFields.find((f) => f.key === key);
      if (!field) return;
      const value = keyValues[key] || "";
      if (validateTimeoutsRef.current[key]) {
        clearTimeout(validateTimeoutsRef.current[key]);
      }
      setKeyValidating((prev) => ({ ...prev, [key]: true }));
      // Mock async validation
      validateTimeoutsRef.current[key] = setTimeout(() => {
        const error = validateField(field, value);
        setKeyErrors((prev) => ({ ...prev, [key]: error }));
        setKeyValidating((prev) => ({ ...prev, [key]: false }));
        delete validateTimeoutsRef.current[key];
      }, 600);
    },
    [configFields, keyValues],
  );

  const validateAllKeys = useCallback((): boolean => {
    const errors: Record<string, string | null> = {};
    let valid = true;
    for (const field of configFields) {
      const value = keyValues[field.key] || "";
      const error = validateField(field, value);
      errors[field.key] = error;
      if (error) valid = false;
    }
    setKeyErrors(errors);
    return valid;
  }, [configFields, keyValues]);

  const canAdvance = useCallback((): boolean => {
    switch (step) {
      case "presets":
        return true; // user picks a preset which auto-advances
      case "channels":
        return selectedChannels.length > 0;
      case "providers":
        return selectedProviders.length > 0;
      case "plugins":
        return true; // plugins are optional
      case "keys":
        return configFields.every((f) => {
          const value = keyValues[f.key] || "";
          return validateField(f, value) === null;
        });
      case "deploy":
        return deployStatus === "done";
      case "done":
        return false;
    }
  }, [step, selectedChannels, selectedProviders, configFields, keyValues, deployStatus]);

  const next = useCallback(() => {
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex < stepOrder.length - 1) {
      if (step === "keys" && !validateAllKeys()) return;
      setStep(stepOrder[currentIndex + 1]);
    }
  }, [step, stepOrder, validateAllKeys]);

  const back = useCallback(() => {
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex > 0) {
      setStep(stepOrder[currentIndex - 1]);
    } else if (isCustomFlow) {
      // Go back to presets
      setIsCustomFlow(false);
      setStep("presets");
    }
  }, [step, stepOrder, isCustomFlow]);

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
    for (const t of Object.values(validateTimeoutsRef.current)) clearTimeout(t);
    validateTimeoutsRef.current = {};
    setStep("presets");
    setSelectedPreset(null);
    setSelectedChannels([]);
    setSelectedProviders([]);
    setSelectedPlugins([]);
    setKeyValues({});
    setKeyErrors({});
    setKeyValidating({});
    setDeployStatus("idle");
    setIsCustomFlow(false);
  }, []);

  const state: OnboardingState = {
    step,
    stepIndex,
    totalSteps,
    progress,
    selectedPreset,
    selectedChannels,
    selectedProviders,
    selectedPlugins: resolvedPlugins,
    keyValues,
    keyErrors,
    keyValidating,
    configFields,
    deployStatus,
    isCustomFlow,
  };

  const actions: OnboardingActions = {
    selectPreset,
    toggleChannel,
    toggleProvider,
    togglePlugin,
    setKeyValue,
    validateKey,
    validateAllKeys,
    next,
    back,
    deploy,
    reset,
    canAdvance,
  };

  return [state, actions];
}

export { presets };
