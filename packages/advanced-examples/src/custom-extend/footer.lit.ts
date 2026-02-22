import { html } from "lit";
import { LibraryComponent, LibraryElement } from "./component-decorator.js";
import type { LibraryMetadata } from "./typings/library-metadata";

const libraryFooterMetadata = { featureId: "footer" } as const satisfies {
  featureId: LibraryMetadata["featureId"];
};

@LibraryComponent({
  tag: "library-footer",
  metadata: libraryFooterMetadata
})
export class LibraryFooterElement extends LibraryElement<typeof libraryFooterMetadata> {
  override render() {
    return html`<div>Hello, world!${this.translations?.copyright}</div>`;
  }
}

