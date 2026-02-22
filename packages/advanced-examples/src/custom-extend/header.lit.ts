import { html } from "lit";
import { LibraryComponent, LibraryElement } from "./component-decorator.js";
import type { LibraryMetadata } from "./typings/library-metadata";

const libraryHeaderMetadata = { featureId: "header" } as const satisfies {
  featureId: LibraryMetadata["featureId"];
};

@LibraryComponent({
  tag: "library-header",
  metadata: libraryHeaderMetadata
})
export class LibraryHeaderElement extends LibraryElement<typeof libraryHeaderMetadata> {
  override render() {
    return html`<div>Hello, world!${this.translations?.title}</div>`;
  }
}

