export type ThemePromiseResolver = {
  promiseResolver: (value: { name: string; styleSheet: CSSStyleSheet | undefined }) => void;
  promise: Promise<{ name: string; styleSheet: CSSStyleSheet | undefined }>;
  isDownloading: boolean;
};
