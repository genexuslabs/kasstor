import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as ts from "typescript";

// Types for component analysis
interface ComponentInfo {
  className: string;
  tagName: string;
  filePath: string;
  properties: PropertyInfo[];
  events: EventInfo[];
  methods: MethodInfo[];
  imports: ImportInfo[];
}

interface PropertyInfo {
  name: string;
  type: string;
  isOptional: boolean;
  documentation?: string;
}

interface EventInfo {
  name: string;
  type: string;
  documentation?: string;
}

interface MethodInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType: string;
  documentation?: string;
  isPublic: boolean;
}

interface ParameterInfo {
  name: string;
  type: string;
  isOptional: boolean;
  hasDefaultValue: boolean;
}

interface ImportInfo {
  name: string;
  path: string;
  isTypeOnly: boolean;
}

interface EventTypeInfo {
  typeName: string;
  importPath: string;
}

/**
 * Generator for components.d.ts file based on Lit components analysis
 */
export class ComponentsDefinitionGenerator {
  private components: ComponentInfo[] = [];
  private eventTypes: Map<string, EventTypeInfo> = new Map();

  constructor(private projectPath: string) {}

  /**
   * Analyzes all Lit components in the specified pattern and generates components.d.ts
   */
  async generateComponentsDefinition(pattern: string): Promise<string> {
    const files = await this.findLitComponents(pattern);

    for (const filePath of files) {
      await this.analyzeComponent(filePath);
    }

    // Collect event types after analyzing all components
    this.collectEventTypes();

    return this.generateDefinitionFile();
  }

  /**
   * Finds all .lit.ts files in the specified pattern
   */
  private async findLitComponents(pattern: string): Promise<string[]> {
    const files = (
      await fs.readdir(pattern, {
        recursive: true,
        withFileTypes: true
      })
    )
      .filter(file => file.isFile() && file.name.endsWith(".lit.ts"))
      .map(file => path.join(file.parentPath ?? file.path, file.name))
      .sort((a, b) => (a <= b ? -1 : 0));

    return files;
  }

  /**
   * Analyzes a single Lit component file using simple AST parsing
   */
  private async analyzeComponent(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, "utf-8");

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.ES2022,
      true
    );

    const componentInfo = this.extractComponentInfo(sourceFile, filePath);

    if (componentInfo) {
      this.components.push(componentInfo);
    }
  }

  /**
   * Collects event types from all components and determines their import paths
   */
  private collectEventTypes(): void {
    this.components.forEach(comp => {
      comp.events.forEach(event => {
        if (this.isNonPrimitiveType(event.type)) {
          // Try to find the import path for this type
          const importInfo = comp.imports.find(
            imp => imp.name === event.type || imp.name.includes(event.type)
          );

          if (importInfo) {
            // Calculate the absolute path of the imported file
            const componentDir = path.dirname(comp.filePath);
            const absoluteImportPath = path.resolve(
              componentDir,
              importInfo.path
            );

            // Calculate relative path from project root (where components.d.ts will be)
            const relativeFromProjectRoot = path
              .relative(this.projectPath, absoluteImportPath)
              .replace(/\\/g, "/");
            const finalImportPath = relativeFromProjectRoot.startsWith(".")
              ? relativeFromProjectRoot
              : `./${relativeFromProjectRoot}`;

            this.eventTypes.set(event.type, {
              typeName: event.type,
              importPath: finalImportPath
            });
          } else {
            // If not found in imports, assume it's from a types file in the same directory as the component
            const componentDir = path.dirname(comp.filePath);
            const typesPath = path.join(componentDir, "types");
            const relativeTypesPath = path
              .relative(this.projectPath, typesPath)
              .replace(/\\/g, "/");
            const importPath = relativeTypesPath.startsWith(".")
              ? relativeTypesPath
              : `./${relativeTypesPath}`;

            this.eventTypes.set(event.type, {
              typeName: event.type,
              importPath
            });
          }
        }
      });
    });
  }

  /**
   * Checks if a type is non-primitive (needs to be imported)
   */
  private isNonPrimitiveType(type: string): boolean {
    const primitiveTypes = [
      "any",
      "boolean",
      "string",
      "number",
      "void",
      "undefined",
      "null"
    ];
    return (
      !primitiveTypes.includes(type) &&
      !type.includes("|") &&
      !type.includes("&")
    );
  }

  /**
   * Extracts component information from TypeScript AST without creating a program
   */
  private extractComponentInfo(
    sourceFile: ts.SourceFile,
    filePath: string
  ): ComponentInfo | null {
    let componentInfo: ComponentInfo | null = null;

    const visit = (node: ts.Node): void => {
      // Look for class declarations with @Component decorator
      if (ts.isClassDeclaration(node) && node.modifiers) {
        const componentDecorator = this.findComponentDecorator(node.modifiers);

        if (componentDecorator && node.name) {
          const tagName = this.extractTagNameFromDecorator(componentDecorator);
          if (tagName) {
            componentInfo = {
              className: node.name.text,
              tagName,
              filePath,
              properties: this.extractProperties(node),
              events: this.extractEvents(node),
              methods: this.extractMethods(node),
              imports: this.extractImports(sourceFile)
            };
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return componentInfo;
  }

  /**
   * Finds the @Component decorator in the modifiers array
   */
  private findComponentDecorator(
    modifiers: readonly ts.ModifierLike[]
  ): ts.Decorator | null {
    for (const modifier of modifiers) {
      if (ts.isDecorator(modifier)) {
        if (ts.isCallExpression(modifier.expression)) {
          if (
            ts.isIdentifier(modifier.expression.expression) &&
            modifier.expression.expression.text === "Component"
          ) {
            return modifier;
          }
        } else if (
          ts.isIdentifier(modifier.expression) &&
          modifier.expression.text === "Component"
        ) {
          return modifier;
        }
      }
    }
    return null;
  }

  /**
   * Extracts tag name from @Component decorator
   */
  private extractTagNameFromDecorator(decorator: ts.Decorator): string | null {
    if (
      ts.isCallExpression(decorator.expression) &&
      decorator.expression.arguments.length > 0
    ) {
      const arg = decorator.expression.arguments[0];
      if (ts.isObjectLiteralExpression(arg)) {
        for (const prop of arg.properties) {
          if (
            ts.isPropertyAssignment(prop) &&
            ts.isIdentifier(prop.name) &&
            prop.name.text === "tag" &&
            ts.isStringLiteral(prop.initializer)
          ) {
            return prop.initializer.text;
          }
        }
      }
    }
    return null;
  }

  /**
   * Extracts properties decorated with @property
   */
  private extractProperties(classNode: ts.ClassDeclaration): PropertyInfo[] {
    const properties: PropertyInfo[] = [];

    for (const member of classNode.members) {
      if (
        ts.isPropertyDeclaration(member) &&
        member.modifiers &&
        ts.isIdentifier(member.name)
      ) {
        const hasPropertyDecorator = this.hasDecorator(
          member.modifiers,
          "property"
        );

        if (hasPropertyDecorator) {
          const type = member.type ? this.getTypeString(member.type) : "any";
          const isOptional = !!member.questionToken;
          const documentation = this.extractJSDocComment(member);

          properties.push({
            name: member.name.text,
            type,
            isOptional,
            documentation
          });
        }
      }
    }

    return properties;
  }

  /**
   * Extracts events decorated with @Event
   */
  private extractEvents(classNode: ts.ClassDeclaration): EventInfo[] {
    const events: EventInfo[] = [];

    for (const member of classNode.members) {
      if (
        ts.isPropertyDeclaration(member) &&
        member.modifiers &&
        ts.isIdentifier(member.name)
      ) {
        const hasEventDecorator = this.hasDecorator(member.modifiers, "Event");

        if (hasEventDecorator) {
          // Extract event type from EventEmitter<T>
          let eventType = "any";
          if (member.type && ts.isTypeReferenceNode(member.type)) {
            if (
              member.type.typeArguments &&
              member.type.typeArguments.length > 0
            ) {
              eventType = this.getTypeString(member.type.typeArguments[0]);
            }
          }

          const documentation = this.extractJSDocComment(member);

          events.push({
            name: member.name.text,
            type: eventType,
            documentation
          });
        }
      }
    }

    return events;
  }

  /**
   * Checks if a member has a specific decorator
   */
  private hasDecorator(
    modifiers: readonly ts.ModifierLike[],
    decoratorName: string
  ): boolean {
    return modifiers.some(modifier => {
      if (ts.isDecorator(modifier)) {
        if (ts.isCallExpression(modifier.expression)) {
          return (
            ts.isIdentifier(modifier.expression.expression) &&
            modifier.expression.expression.text === decoratorName
          );
        }
        if (ts.isIdentifier(modifier.expression)) {
          return modifier.expression.text === decoratorName;
        }
      }
      return false;
    });
  }

  /**
   * Extracts public methods from the class
   */
  private extractMethods(classNode: ts.ClassDeclaration): MethodInfo[] {
    const methods: MethodInfo[] = [];

    for (const member of classNode.members) {
      if (ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) {
        const hasPrivateModifier = member.modifiers?.some(
          mod =>
            mod.kind === ts.SyntaxKind.PrivateKeyword ||
            mod.kind === ts.SyntaxKind.ProtectedKeyword
        );

        const isPublic =
          !hasPrivateModifier && !member.name.text.startsWith("#");

        // Skip lifecycle methods and private methods
        const lifecycleMethods = [
          "connectedCallback",
          "disconnectedCallback",
          "attributeChangedCallback",
          "adoptedCallback",
          "willUpdate",
          "update",
          "render",
          "firstUpdated",
          "updated",
          "shouldUpdate",
          "scheduleUpdate",
          "performUpdate"
        ];

        if (isPublic && !lifecycleMethods.includes(member.name.text)) {
          const parameters = member.parameters.map(param => ({
            name: ts.isIdentifier(param.name) ? param.name.text : "param",
            type: param.type ? this.getTypeString(param.type) : "any",
            isOptional: !!param.questionToken,
            hasDefaultValue: !!param.initializer
          }));

          const returnType = member.type
            ? this.getTypeString(member.type)
            : "void";
          const documentation = this.extractJSDocComment(member);

          methods.push({
            name: member.name.text,
            parameters,
            returnType,
            documentation,
            isPublic
          });
        }
      }
    }

    return methods;
  }

  /**
   * Extracts import statements from the source file
   */
  private extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
    const imports: ImportInfo[] = [];

    for (const statement of sourceFile.statements) {
      if (
        ts.isImportDeclaration(statement) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        const modulePath = statement.moduleSpecifier.text;

        if (statement.importClause) {
          const isTypeOnly = !!statement.importClause.isTypeOnly;

          // Handle named imports
          if (
            statement.importClause.namedBindings &&
            ts.isNamedImports(statement.importClause.namedBindings)
          ) {
            for (const element of statement.importClause.namedBindings
              .elements) {
              imports.push({
                name: element.name.text,
                path: modulePath,
                isTypeOnly: isTypeOnly || !!element.isTypeOnly
              });
            }
          }

          // Handle default imports
          if (statement.importClause.name) {
            imports.push({
              name: statement.importClause.name.text,
              path: modulePath,
              isTypeOnly
            });
          }
        }
      }
    }

    return imports;
  }

  /**
   * Converts TypeScript type node to string representation
   */
  private getTypeString(typeNode: ts.TypeNode): string {
    if (ts.isTypeReferenceNode(typeNode)) {
      if (ts.isIdentifier(typeNode.typeName)) {
        const typeName = typeNode.typeName.text;
        if (typeNode.typeArguments) {
          const args = typeNode.typeArguments
            .map(arg => this.getTypeString(arg))
            .join(", ");
          return `${typeName}<${args}>`;
        }
        return typeName;
      }
      if (ts.isQualifiedName(typeNode.typeName)) {
        // Handle qualified names like Namespace.Type
        return typeNode.typeName.getText();
      }
    }

    if (ts.isUnionTypeNode(typeNode)) {
      return typeNode.types.map(type => this.getTypeString(type)).join(" | ");
    }

    if (ts.isIntersectionTypeNode(typeNode)) {
      return typeNode.types.map(type => this.getTypeString(type)).join(" & ");
    }

    if (ts.isLiteralTypeNode(typeNode)) {
      if (ts.isStringLiteral(typeNode.literal)) {
        return `"${typeNode.literal.text}"`;
      }
      if (ts.isNumericLiteral(typeNode.literal)) {
        return typeNode.literal.text;
      }
      if (typeNode.literal.kind === ts.SyntaxKind.TrueKeyword) {
        return "true";
      }
      if (typeNode.literal.kind === ts.SyntaxKind.FalseKeyword) {
        return "false";
      }
    }

    if (ts.isArrayTypeNode(typeNode)) {
      return `${this.getTypeString(typeNode.elementType)}[]`;
    }

    if (ts.isParenthesizedTypeNode(typeNode)) {
      return `(${this.getTypeString(typeNode.type)})`;
    }

    if (ts.isTupleTypeNode(typeNode)) {
      const elements = typeNode.elements
        .map(el => this.getTypeString(el))
        .join(", ");
      return `[${elements}]`;
    }

    if (ts.isFunctionTypeNode(typeNode)) {
      const params = typeNode.parameters
        .map(param => {
          const name = ts.isIdentifier(param.name) ? param.name.text : "param";
          const type = param.type ? this.getTypeString(param.type) : "any";
          const optional = param.questionToken ? "?" : "";
          return `${name}${optional}: ${type}`;
        })
        .join(", ");
      const returnType = this.getTypeString(typeNode.type);
      return `(${params}) => ${returnType}`;
    }

    // Handle basic types
    switch (typeNode.kind) {
      case ts.SyntaxKind.StringKeyword:
        return "string";
      case ts.SyntaxKind.NumberKeyword:
        return "number";
      case ts.SyntaxKind.BooleanKeyword:
        return "boolean";
      case ts.SyntaxKind.UndefinedKeyword:
        return "undefined";
      case ts.SyntaxKind.NullKeyword:
        return "null";
      case ts.SyntaxKind.AnyKeyword:
        return "any";
      case ts.SyntaxKind.VoidKeyword:
        return "void";
      case ts.SyntaxKind.UnknownKeyword:
        return "unknown";
      case ts.SyntaxKind.NeverKeyword:
        return "never";
      case ts.SyntaxKind.ObjectKeyword:
        return "object";
      default:
        // Fallback to getting text from the node
        return typeNode.getText();
    }
  }

  /**
   * Extracts JSDoc comment from a node
   */
  private extractJSDocComment(node: ts.Node): string | undefined {
    const sourceFile = node.getSourceFile();
    const fullText = sourceFile.getFullText();
    const nodeStart = node.getFullStart();
    const nodeEnd = node.getStart();
    const leadingTrivia = fullText.substring(nodeStart, nodeEnd);

    // Look for JSDoc comments in the leading trivia
    const jsDocMatch = leadingTrivia.match(/\/\*\*[\s\S]*?\*\//g);
    if (jsDocMatch && jsDocMatch.length > 0) {
      const jsDoc = jsDocMatch[jsDocMatch.length - 1];
      // Extract the comment content, removing /** and */ and leading asterisks
      return jsDoc
        .replace(/^\/\*\*/, "")
        .replace(/\*\/$/, "")
        .split("\n")
        .map(line => line.replace(/^\s*\*\s?/, "").trim())
        .filter(line => line.length > 0)
        .join(" ");
    }

    return undefined;
  }

  /**
   * Generates the complete components.d.ts file content
   */
  private generateDefinitionFile(): string {
    const imports = this.generateImports();
    const eventTypeImports = this.generateEventTypeImports();
    const componentsNamespace = this.generateComponentsNamespace();
    const customEventInterfaces = this.generateCustomEventInterfaces();
    const globalEventMaps = this.generateGlobalEventMaps();
    const jsxNamespace = this.generateJSXNamespace();
    const stencilModule = this.generateStencilModule();
    const globalTagNameMap = this.generateGlobalTagNameMap();

    return `/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LitElement } from "lit";
import type { SSRLitElement } from "./utilities/decorators/Component";

// Components
${imports}

${eventTypeImports}

export type RemoveLitLifecycleMembers<T extends LitElement> = Omit<T, keyof SSRLitElement | "shouldUpdate" | "scheduleUpdate" | "performUpdate" | "willUpdate" | "update" | "render" | "firstUpdated" | "updated">;

/**
 * All component definitions of the library. Each interface contains the
 * properties and method of the custom elements.
 */
export namespace Components {
${componentsNamespace}
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                       Custom Events
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
${customEventInterfaces}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//           Global definitions for Custom Events
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
declare global {
${globalEventMaps}
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                  Types for JSX templates
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
declare namespace LocalJSX {
${jsxNamespace}

  interface IntrinsicElements {
${this.components.map(comp => `    "${comp.tagName}": ${this.toPascalCase(comp.className)};`).join("\n")}
  }
}
export type { LocalJSX as JSX };

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//               Types for StencilJS templates
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
${stencilModule}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//              Define each component globally
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
declare global {
  interface HTMLElementTagNameMap {
${globalTagNameMap}
  }
}`;
  }

  /**
   * Generates import statements for components
   */
  private generateImports(): string {
    return this.components
      .map(comp => {
        // Convert absolute path to relative path from project root
        const relativePath = path
          .relative(this.projectPath, comp.filePath)
          .replace(/\.ts$/, "")
          .replace(/\\/g, "/");
        const importPath = relativePath.startsWith(".")
          ? relativePath
          : `./${relativePath}`;
        return `import type { ${comp.className}, ${comp.className} as ${comp.className}Element } from "${importPath}";`;
      })
      .join("\n");
  }

  /**
   * Generates imports for event types
   */
  private generateEventTypeImports(): string {
    if (this.eventTypes.size === 0) {
      return "";
    }

    const importGroups = new Map<string, string[]>();

    // Group types by import path
    this.eventTypes.forEach((eventTypeInfo, typeName) => {
      if (!importGroups.has(eventTypeInfo.importPath)) {
        importGroups.set(eventTypeInfo.importPath, []);
      }
      importGroups.get(eventTypeInfo.importPath)!.push(typeName);
    });

    // Generate import statements
    const imports = Array.from(importGroups.entries())
      .map(
        ([importPath, types]) =>
          `import type { ${types.join(", ")} } from "${importPath}";`
      )
      .join("\n");

    return `// Event types\n${imports}`;
  }

  /**
   * Generates the Components namespace
   */
  private generateComponentsNamespace(): string {
    return this.components
      .map(
        comp =>
          `  export type ${comp.className} = RemoveLitLifecycleMembers<${comp.className}Element>;`
      )
      .join("\n");
  }

  /**
   * Generates custom event interfaces
   */
  private generateCustomEventInterfaces(): string {
    return this.components
      .filter(comp => comp.events.length > 0)
      .map(comp => {
        const componentComment = `// - - - - - - - - - - - - - - - - - - - -\n// ${comp.tagName}\n// - - - - - - - - - - - - - - - - - - - -`;
        const customEventInterface = `export interface ${comp.className}CustomEvent<T> extends CustomEvent<T> {
  detail: T;
  target: ${comp.className};
}`;

        const eventTypes = comp.events
          .map(event => {
            const eventTypeName = `${comp.className}${this.toPascalCase(event.name)}Event`;
            const documentation = `/**\n * Type of the \`${comp.tagName}\`'s \`${event.name}\` event.\n */`;
            return `${documentation}\nexport type ${eventTypeName} = ${comp.className}CustomEvent<HTML${comp.className}ElementEventMap["${event.name}"]>;`;
          })
          .join("\n\n");

        return `${componentComment}\n${customEventInterface}\n\n${eventTypes}`;
      })
      .join("\n\n");
  }

  /**
   * Generates global event maps
   */
  private generateGlobalEventMaps(): string {
    const componentsWithEvents = this.components.filter(
      comp => comp.events.length > 0
    );
    const componentsWithoutEvents = this.components.filter(
      comp => comp.events.length === 0
    );

    let result = "";

    // Components with events
    if (componentsWithEvents.length > 0) {
      result += componentsWithEvents
        .map(comp => {
          const componentComment = `  // - - - - - - - - - - - - - - - - - - - -\n  // ${comp.tagName}\n  // - - - - - - - - - - - - - - - - - - - -`;

          const eventMap = `  interface HTML${comp.className}ElementEventMap {
${comp.events.map(event => `    ${event.name}: ${event.type};`).join("\n")}
  }`;

          const eventTypes = `  interface HTML${comp.className}ElementEventTypes {
${comp.events.map(event => `    ${event.name}: ${comp.className}${this.toPascalCase(event.name)}Event;`).join("\n")}
  }`;

          const constructor = `  const HTML${comp.className}Element: {
    prototype: HTML${comp.className}Element;
    new (): HTML${comp.className}Element;
  };`;

          const extendedInterface = `  // Extend the ${comp.className} class redefining the event methods to improve the type definitions
  interface HTML${comp.className}Element extends ${comp.className} {
    addEventListener<K extends keyof HTML${comp.className}ElementEventTypes>(type: K, listener: (this: HTML${comp.className}Element, ev: HTML${comp.className}ElementEventTypes[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;

    removeEventListener<K extends keyof HTML${comp.className}ElementEventTypes>(type: K, listener: (this: HTML${comp.className}Element, ev: HTML${comp.className}ElementEventTypes[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  }`;

          return `${componentComment}\n${eventMap}\n${eventTypes}\n${constructor}\n\n${extendedInterface}`;
        })
        .join("\n\n");
    }

    // Components without events
    if (componentsWithoutEvents.length > 0) {
      if (result) {
        result += "\n\n";
      }

      result += componentsWithoutEvents
        .map(comp => {
          const componentComment = `  // - - - - - - - - - - - - - - - - - - - -\n  // ${comp.tagName}\n  // - - - - - - - - - - - - - - - - - - - -`;

          const constructor = `  const HTML${comp.className}Element: {
    prototype: HTML${comp.className}Element;
    new (): HTML${comp.className}Element;
  };`;

          const typeAlias = `  // Define the HTMLElement for the ${comp.className} as an alias of the class\n  type HTML${comp.className}Element = ${comp.className};`;

          return `${componentComment}\n${constructor}\n\n${typeAlias}`;
        })
        .join("\n\n");
    }

    return result;
  }

  /**
   * Generates JSX namespace
   */
  private generateJSXNamespace(): string {
    return this.components
      .map(comp => {
        const publicMethods = comp.methods.filter(method => method.isPublic);
        const methodsToOmit =
          publicMethods.length > 0
            ? `Omit<Components.${comp.className}, ${publicMethods.map(m => `"${m.name}"`).join(" | ")}>`
            : `Components.${comp.className}`;

        const eventHandlers = comp.events
          .map(event => {
            const documentation = `    /**\n     * The \`${event.name}\` event is emitted when a change to the element's ${event.name} state\n     * is committed by the user.\n     *\n     * It contains the new ${event.name} state of the control.\n     */`;
            return `${documentation}\n    on${this.toPascalCase(event.name)}?: (event: ${comp.className}${this.toPascalCase(event.name)}Event) => void;`;
          })
          .join("\n");

        const eventHandlersSection = eventHandlers
          ? ` & {\n${eventHandlers}\n  }`
          : "";

        return `  type ${comp.className} = ${methodsToOmit}${eventHandlersSection};`;
      })
      .join("\n\n");
  }

  /**
   * Generates StencilJS module declaration
   */
  private generateStencilModule(): string {
    return `declare module "@stencil/core" {
  export namespace JSX {
    type IntrinsicElements = LocalJSX.IntrinsicElements;
  }
}`;
  }

  /**
   * Generates global tag name map
   */
  private generateGlobalTagNameMap(): string {
    return this.components
      .map(comp => `    "${comp.tagName}": HTML${comp.className}Element;`)
      .join("\n");
  }

  /**
   * Converts string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Usage example
export async function generateComponentsDefinition(
  projectPath: string,
  componentsPattern: string
): Promise<void> {
  const generator = new ComponentsDefinitionGenerator(projectPath);
  const definitionContent =
    await generator.generateComponentsDefinition(componentsPattern);

  const outputPath = path.join(projectPath, "components.d.ts");
  await fs.writeFile(outputPath, definitionContent, "utf-8");
}

