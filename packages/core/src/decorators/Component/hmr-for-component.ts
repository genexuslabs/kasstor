// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import type { SSRLitElement } from "./index.js";

globalThis.kasstorCoreHmrData ??= {
  proxiesForTagNames: new Map(),
  tagNameForClasses: new Map()
};

const { proxiesForTagNames, tagNameForClasses } = globalThis.kasstorCoreHmrData;

const proxyMethods = [
  "construct",
  "defineProperty",
  "deleteProperty",
  "getOwnPropertyDescriptor",
  "getPrototypeOf",
  "setPrototypeOf",
  "isExtensible",
  "ownKeys",
  "preventExtensions",
  "has",
  "get",
  "set"
] as const;

/**
 * Creates a proxy for the given target, and forwards any calls to the most up to the latest
 * version of the target. (ex. the latest hot replaced class).
 */
function createProxy(originalTarget: unknown, getCurrentTarget: () => unknown) {
  const proxyHandler: {
    [key in (typeof proxyMethods)[number]]?: (...args: unknown[]) => unknown;
  } = {};

  for (const method of proxyMethods) {
    proxyHandler[method] = (_, ...args) => {
      if (method === "get" && args[0] === "prototype") {
        // prototype must always return original target value
        return Reflect[method](_, ...args);
      }
      return Reflect[method](getCurrentTarget(), ...args);
    };
  }
  return new Proxy(originalTarget, proxyHandler as ProxyHandler<unknown>);
}

/**
 * Replaces all prototypes in the inheritance chain with a proxy
 * that references the latest implementation
 */
function replacePrototypesWithProxies(instance: HTMLElement) {
  let previous = instance;
  let proto = Object.getPrototypeOf(instance);

  while (proto && proto.constructor !== HTMLElement) {
    const key = tagNameForClasses.get(proto.constructor);

    if (key) {
      // this is a prototype that might be hot-replaced later
      const getCurrentProto = () =>
        proxiesForTagNames.get(key)!.currentClass.prototype;

      Object.setPrototypeOf(previous, createProxy(proto, getCurrentProto));
    }

    previous = proto;
    proto = Object.getPrototypeOf(proto);
  }
}

export const replaceConstructorWithProxy = (classRef: SSRLitElement) => {
  const tagName = tagNameForClasses.get(classRef.constructor);

  // check if the constructor is registered
  if (tagName) {
    const proxy = proxiesForTagNames.get(tagName)!;
    // replace the constructor with a proxy that references the latest implementation of this class
    classRef.constructor = proxy.currentProxy;
  }

  // replace prototype chain with a proxy to the latest prototype implementation
  replacePrototypesWithProxies(classRef);
};

/**
 * Registers a web component class. Triggers a hot replacement if the
 * class was already registered before.
 */
export function register(tagName: string, classRef: SSRLitElement) {
  const existing = proxiesForTagNames.get(tagName);

  if (!existing) {
    // this class was not yet registered,

    // create a proxy that will forward to the latest implementation
    const proxy = createProxy(
      classRef,
      () => proxiesForTagNames.get(tagName)!.currentClass
    );

    proxiesForTagNames.set(tagName, {
      originalProxy: proxy,
      currentProxy: proxy,
      originalClass: classRef,
      currentClass: classRef
    });

    tagNameForClasses.set(classRef, tagName);

    return proxy;
  }
  // class was already registered before

  // register new class, all calls will be proxied to this class
  const previousProxy = existing.currentProxy;
  const currentProxy = createProxy(
    classRef,
    () => proxiesForTagNames.get(tagName)!.currentClass
  );
  existing.currentClass = classRef;
  existing.currentProxy = currentProxy;

  Promise.resolve().then(() => {
    // call optional HMR on the class if they exist, after next microtask to ensure
    // module bodies have executed fully
    const connectedElements =
      globalThis.kasstorCoreRegisteredInstances?.get(tagName) ?? new Set();

    connectedElements.forEach(element => {
      if (element.constructor === previousProxy) {
        // we need to update the constructor of the element to match to newly created proxy
        // but we should only do this for elements that was directly created with this class
        // and not for elements that extend this
        element.constructor = currentProxy;
      }

      try {
        element.requestUpdate();
      } catch (error) {
        console.error(error);
      }
    });
  });

  // the original proxy already forwards to the new class but we're return a new proxy
  // because access to `prototype` must return the original value and we need to be able to
  // manipulate the prototype on the new class
  return currentProxy;
}

