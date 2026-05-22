import type { DesignSystemBundleUrl, DesignSystemRegistryOptions } from "../typings/types";

/**
 * Alias to improve minification
 */
const global = globalThis;

// Side effect to initialize the registry if it's not already initialized
global.geneXusDesignSystemsRegistry ??= new Map<string, DesignSystemRegistryOptions>();
global.geneXusDesignSystemsLoaders ??= new Map<string, DesignSystemBundleUrl>();

export const getDesignSystemRegistry = () => global.geneXusDesignSystemsRegistry!;

export const getDesignSystemLoaders = () => global.geneXusDesignSystemsLoaders!;

