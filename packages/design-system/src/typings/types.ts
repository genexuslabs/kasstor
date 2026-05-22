export type DesignSystemRegistry = Map<string, DesignSystemRegistryOptions>;

export type DesignSystemBundleUrl = string;

export type DesignSystemRegistryOptions = {
  bundleLoaders: DesignSystemLoaders;
};

export type DesignSystemLoaders = Record<string, DesignSystemBundleUrl>;

