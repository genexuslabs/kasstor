/**
 * Given an array of decorators, it creates a regex to find the tag name,
 * assuming the kasstor-core package was used to register the component.
 *
 * This function is useful when custom decorators are created based on the
 * Component decorator of the kasstor-core package.
 *
 * For reference, this functions is based on this regex:
 * ```ts
 * /@Component\s*\(\s*\{[\s\S]*?tag\s*:\s*["']([^"']+)["']/m;
 * ```
 */
export const getComponentDecoratorRegex = (decorators: string[]) =>
  new RegExp(
    `@(${decorators.join("|")})\\s*\\(\\s*\\{[\\s\\S]*?tag\\s*:\\s*["']([^"']+)["']`,
    "m"
  );

