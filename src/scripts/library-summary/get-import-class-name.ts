const CLASS_SUFFIX = "Element";

export const getImportClassName = <T extends string>(className: T) =>
  `${className}${CLASS_SUFFIX}` as const;
