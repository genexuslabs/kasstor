import {
  Component,
  KasstorElement,
  type ComponentOptions
} from "@genexus/kasstor-core/decorators/component.js";
import { getCurrentTranslations } from "@genexus/kasstor-webkit/internationalization/get-current-translations.js";
import {
  subscribeToLanguageChanges,
  unsubscribeToLanguageChanges
} from "@genexus/kasstor-webkit/internationalization/subscriber.js";
import { state } from "lit/decorators/state.js";

import type { LibraryMetadata } from "./typings/library-metadata";
import type { LibraryTranslationsSchema } from "./typings/translation-schemas";

export const LibraryComponent = <
  LibraryPrefix extends "library-",
  Metadata extends LibraryMetadata,
  T extends typeof LibraryElement<Metadata>
>(
  options: ComponentOptions<LibraryPrefix, Metadata> & { metadata: Metadata }
) => Component<LibraryPrefix, Metadata, T>(options);

export abstract class LibraryElement<
  Metadata extends LibraryMetadata
> extends KasstorElement<Metadata> {
  /**
   * An accessor for the current translations of the component.
   *
   * These translations are updated automatically when the setLanguage is
   * executed with a new language than the current one.
   */
  @state() protected translations: LibraryTranslationsSchema<Metadata["featureId"]> | undefined =
    getCurrentTranslations(this.kstMetadata!.featureId);

  // We use an explicit ID for the component, because multiple instances of the
  // same component can be used with translations, so we can't relay on the
  // tagName to define the ID of the component, which later is used as the
  // subscriberId when notifying for language changes
  #id!: string;

  override connectedCallback(): void {
    super.connectedCallback();

    this.#id = subscribeToLanguageChanges(this.kstMetadata!.featureId, newTranslations => {
      this.translations = newTranslations as LibraryTranslationsSchema<Metadata["featureId"]>;
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    unsubscribeToLanguageChanges(this.#id);
  }
}

