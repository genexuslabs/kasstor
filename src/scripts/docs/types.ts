export type ChameleonDocs = {
  version: "string";
  tags: ChameleonComponentDocs;
};
export type ChameleonComponentDocs = ChameleonComponentDoc[];

export type ChameleonComponentDoc = {
  name: string;
  description?: string;
  properties: ChameleonComponentPropertiesDocs;
  events?: ChameleonComponentEventsDocs;
  cssParts?: ChameleonComponentCssPartsDocs;
  cssProperties?: ChameleonComponentCssPropertiesDocs;
  slots?: ChameleonComponentSlotsDocs;
};

export type ChameleonComponentPropertiesDocs = ChameleonComponentPropertyDoc[];
export type ChameleonComponentEventsDocs = ChameleonComponentEventDoc[];
export type ChameleonComponentCssPartsDocs = ChameleonComponentCssPartDoc[];
export type ChameleonComponentCssPropertiesDocs =
  ChameleonComponentCssPropertyDoc[];
export type ChameleonComponentSlotsDocs = ChameleonComponentSlotDoc[];

export type ChameleonComponentPropertyDoc = {
  name: string;
  attribute?: string;
  description?: string;
  type: string;
  default?: string;
};

export type ChameleonComponentEventDoc = {
  name: string;
  description?: string;
};

export type ChameleonComponentCssPartDoc = {
  name: string;
  description?: string;
};

export type ChameleonComponentCssPropertyDoc = {
  name: string;
  description?: string;
  default?: string;
};

export type ChameleonComponentSlotDoc = {
  name: string;
  description?: string;
};

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                      Docs for json2
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export type ChameleonDocsJson2 = {
  version: "string";
  modules: ChameleonModulesDocsJson2;
};

export type ChameleonModulesDocsJson2 = ChameleonModuleDocJson2[];

export type ChameleonModuleDocJson2 = {
  path: string;
  exports: ChameleonModuleExportsDocsJson2;
};

export type ChameleonModuleExportsDocsJson2 = (
  | ChameleonModuleExportDefinitionDocJson2
  | ChameleonModuleExportClassDocJson2
)[];

export type ChameleonModuleExportDefinitionDocJson2 = {
  kind: "definition";
  name: string;
  declaration: {
    name: string;
    module: string;
  };
};

export type ChameleonModuleExportClassDocJson2 = {
  kind: "class";
  name: string;
  tagName: string;
};
