import type { ClassDeclaration, ClassElement, JSDoc, SourceFile } from "typescript";
import { getJSDocCommentsAndTags, getJSDocTags, isJSDoc } from "typescript";

import type {
  ComponentDefinition,
  ComponentDefinitionCssVariable,
  ComponentDefinitionPart,
  ComponentDefinitionSlot
} from "../../typings/library-components";

const ALL_KIND_OF_ACCESS = [
  "package",
  "private",
  "protected",
  "public"
] satisfies ComponentDefinition["access"][];

const ALL_KIND_OF_DEVELOPMENT_STATUS = [
  "developer-preview",
  "experimental",
  "stable",
  "to-be-defined"
] satisfies ComponentDefinition["developmentStatus"][];

/**
 * Extract JSDoc information from class declaration
 */
export const extractJSDocInfo = (
  classDeclaration: ClassDeclaration,
  sourceFile: SourceFile
) => {
  const jsDocTags = getJSDocTags(classDeclaration);
  const jsDocComments = getJSDocCommentsAndTags(classDeclaration);

  let description = "";
  let access: ComponentDefinition["access"] | undefined;
  let status: ComponentDefinition["developmentStatus"] = "to-be-defined";
  let accessibleRole: string | string[] | undefined;
  const parts: ComponentDefinitionPart[] = [];
  const slots: ComponentDefinitionSlot[] = [];
  const cssVariables: ComponentDefinitionCssVariable[] = [];

  // Extract main description
  const mainComment = jsDocComments.find(
    comment => isJSDoc(comment) && comment.comment
  ) as JSDoc | undefined;

  if (mainComment?.comment) {
    description =
      typeof mainComment.comment === "string"
        ? mainComment.comment
        : mainComment.comment.map(part => part.text || "").join("");
  }

  // Extract full JSDoc text
  const fullClassJSDoc = jsDocComments[0]
    ? sourceFile.text
        .substring(jsDocComments[0].pos, jsDocComments[0].end)
        .trim()
    : "";

  // Extract tags
  jsDocTags.forEach(tag => {
    const tagName = tag.tagName.text;
    const comment = tag.comment;
    const commentText =
      typeof comment === "string"
        ? comment
        : comment?.map(part => part.text || "").join("") || "";

    switch (tagName) {
      case "access":
        if (
          ALL_KIND_OF_ACCESS.includes(
            commentText as ComponentDefinition["access"]
          )
        ) {
          access = commentText as ComponentDefinition["access"];
        }
        break;
      case "package":
      case "private":
      case "protected":
      case "public":
        access = tagName;
        break;
      case "status":
        if (
          ALL_KIND_OF_DEVELOPMENT_STATUS.includes(
            commentText as ComponentDefinition["developmentStatus"]
          )
        ) {
          status = commentText as ComponentDefinition["developmentStatus"];
        }
        break;
      case "accessibleRole":
        accessibleRole = commentText.includes("|")
          ? commentText.split("|").map(role => role.trim())
          : commentText.trim();
        break;
      case "part": {
        const partMatch = commentText.match(/^(\S+)\s*-\s*(.+)$/);
        if (partMatch) {
          parts.push({
            name: partMatch[1],
            description: partMatch[2].trim()
          });
        } else {
          parts.push({ name: commentText.trim() });
        }
        break;
      }
      case "slot": {
        const slotMatch = commentText.match(/^(\S+)\s*-\s*(.+)$/);
        if (slotMatch) {
          slots.push({
            name: slotMatch[1],
            description: slotMatch[2].trim()
          });
        } else {
          slots.push({ name: commentText.trim() });
        }
        break;
      }
      case "cssprop": {
        const cssMatch = commentText.match(
          /^\[([^\]]+)\](?:\s*=\s*(.+?))?\s*-\s*(.+)$/
        );
        if (cssMatch) {
          cssVariables.push({
            name: cssMatch[1],
            default: cssMatch[2]?.trim(),
            description: cssMatch[3].trim()
          });
        }
        break;
      }
    }
  });

  return {
    access,
    fullClassJSDoc,
    description: description.trim(),
    status,
    accessibleRole,
    parts,
    slots,
    cssVariables
  };
};

/**
 * Extract JSDoc information from class member
 */
export const extractMemberJSDoc = (member: ClassElement) => {
  const jsDocTags = getJSDocTags(member);
  const jsDocComments = getJSDocCommentsAndTags(member);

  let description = "";
  let required = false;
  let rawComment = "";

  // Extract main description
  const mainComment = jsDocComments.find(
    comment => isJSDoc(comment) && comment.comment
  ) as JSDoc | undefined;

  if (mainComment?.comment) {
    description =
      typeof mainComment.comment === "string"
        ? mainComment.comment
        : mainComment.comment.map(part => part.text || "").join("");
    rawComment = description;
  }

  // Check for required tag
  const requiredTag = jsDocTags.find(tag => tag.tagName.text === "required");
  if (requiredTag) {
    required = true;
  }

  return {
    description: description.trim() || undefined,
    required: required || undefined,
    rawComment
  };
};

/**
 * Extract parameter description from JSDoc comment
 */
export const extractParamDescription = (
  rawComment: string,
  paramName: string
): string | undefined => {
  const paramRegex = new RegExp(`@param\\s+${paramName}\\s+(.+?)(?=@|$)`, "s");
  const match = rawComment.match(paramRegex);
  return match?.[1]?.trim();
};

