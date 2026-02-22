import type { LibraryMetadata } from "./library-metadata";

export type LibraryHeaderTranslationsSchema = {
  title: string;
};

export type LibraryFooterTranslationsSchema = {
  copyright: string;
};

export type LibraryTranslationsSchema<T extends LibraryMetadata["featureId"]> = T extends "header"
  ? LibraryHeaderTranslationsSchema
  : LibraryFooterTranslationsSchema;

