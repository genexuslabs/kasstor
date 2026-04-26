/**
 * Minimal subset of the Custom Elements Manifest schema (v2.1.0).
 *
 * Reference: https://github.com/webcomponents/custom-elements-manifest
 *
 * Only the fields lit-analyzer consumes are typed here. The CEM spec is
 * intentionally extensible — third-party fields produced by other tooling
 * are tolerated via structural typing and are silently ignored on ingest.
 */

export interface CemPackage {
	schemaVersion: string;
	readme?: string;
	deprecated?: boolean | string;
	modules: JavaScriptModule[];
}

export interface JavaScriptModule {
	kind: "javascript-module";
	path: string;
	declarations?: Declaration[];
	exports?: Export[];
	deprecated?: boolean | string;
}

export type Declaration = ClassDeclaration | CustomElementDeclaration | FunctionDeclaration | VariableDeclaration | MixinDeclaration;

export interface ClassLike {
	name: string;
	description?: string;
	summary?: string;
	deprecated?: boolean | string;
	members?: ClassMember[];
	mixins?: Reference[];
	superclass?: Reference;
	source?: SourceReference;
}

export interface ClassDeclaration extends ClassLike {
	kind: "class";
}

export interface MixinDeclaration extends ClassLike {
	kind: "mixin";
}

export interface CustomElementDeclaration extends ClassLike {
	kind: "class";
	customElement: true;
	tagName?: string;
	attributes?: Attribute[];
	events?: Event[];
	slots?: Slot[];
	cssParts?: CssPart[];
	cssProperties?: CssCustomProperty[];
	cssStates?: CssCustomState[];
	demos?: Demo[];
}

export type ClassMember = ClassField | ClassMethod;

export interface ClassField {
	kind: "field";
	name: string;
	description?: string;
	summary?: string;
	type?: Type;
	default?: string;
	static?: boolean;
	privacy?: "public" | "private" | "protected";
	readonly?: boolean;
	deprecated?: boolean | string;
	attribute?: string;
	reflects?: boolean;
	source?: SourceReference;
}

export interface ClassMethod {
	kind: "method";
	name: string;
	description?: string;
	summary?: string;
	parameters?: Parameter[];
	return?: { type?: Type; description?: string; summary?: string };
	static?: boolean;
	privacy?: "public" | "private" | "protected";
	deprecated?: boolean | string;
	source?: SourceReference;
}

export interface Parameter {
	name: string;
	description?: string;
	summary?: string;
	type?: Type;
	default?: string;
	optional?: boolean;
	rest?: boolean;
}

export interface Attribute {
	name: string;
	description?: string;
	summary?: string;
	type?: Type;
	default?: string;
	deprecated?: boolean | string;
	fieldName?: string;
}

export interface Event {
	name: string;
	description?: string;
	summary?: string;
	type?: Type;
	deprecated?: boolean | string;
	inheritedFrom?: Reference;
}

export interface Slot {
	name: string;
	description?: string;
	summary?: string;
	deprecated?: boolean | string;
}

export interface CssPart {
	name: string;
	description?: string;
	summary?: string;
	deprecated?: boolean | string;
}

export interface CssCustomProperty {
	name: string;
	description?: string;
	summary?: string;
	syntax?: string;
	default?: string;
	deprecated?: boolean | string;
}

export interface CssCustomState {
	name: string;
	description?: string;
	summary?: string;
	deprecated?: boolean | string;
}

export interface Type {
	text: string;
	references?: Array<{ name: string; package?: string; module?: string; start?: number; end?: number }>;
}

export interface Reference {
	name: string;
	package?: string;
	module?: string;
}

export interface SourceReference {
	href: string;
}

export interface FunctionDeclaration {
	kind: "function";
	name: string;
}

export interface VariableDeclaration {
	kind: "variable";
	name: string;
}

export interface Export {
	kind: "js" | "custom-element-definition";
	name: string;
	declaration: Reference;
}

export interface Demo {
	url: string;
	description?: string;
}

/**
 * Type guard for CustomElementDeclaration.
 */
export function isCustomElementDeclaration(declaration: Declaration): declaration is CustomElementDeclaration {
	return declaration.kind === "class" && (declaration as Partial<CustomElementDeclaration>).customElement === true;
}
