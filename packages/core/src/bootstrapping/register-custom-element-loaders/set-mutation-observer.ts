import { discover } from "./discover.js";

export const setMutationObserver = () =>
  new MutationObserver(mutations => {
    for (let index = 0; index < mutations.length; index++) {
      const mutation = mutations[index];

      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          discover(node as Element);
        }
      }
    }
  });
