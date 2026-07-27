import ts from "typescript";

export type ConfigPatchReason = "added" | "already-installed" | "no-define-config";

export interface ConfigPatchResult {
  content: string;
  changed: boolean;
  reason: ConfigPatchReason;
  identifier: string;
  importInserted: boolean;
  pluginInserted: boolean;
}

export interface ConfigPatchOptions {
  packageName: string;
  identifier: string;
  pluginCall?: string;
}

function createSourceFile(source: string, fileName: string): ts.SourceFile {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function isDefineConfigCall(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "defineConfig"
  );
}

function findDefineConfigCall(sourceFile: ts.SourceFile): ts.CallExpression | undefined {
  let found: ts.CallExpression | undefined;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (isDefineConfigCall(node)) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function collectImportSpecifiers(sourceFile: ts.SourceFile): Map<string, string> {
  const byModule = new Map<string, string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.moduleSpecifier) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const moduleName = statement.moduleSpecifier.text;

    if (statement.importClause?.name) {
      byModule.set(moduleName, statement.importClause.name.text);
      continue;
    }

    const elements = statement.importClause?.namedBindings;
    if (elements && ts.isNamedImports(elements)) {
      for (const element of elements.elements) {
        const local = element.name.text;
        byModule.set(moduleName, local);
      }
    }
  }
  return byModule;
}

function collectUsedIdentifiers(sourceFile: ts.SourceFile): Set<string> {
  const used = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) used.add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return used;
}

function pluginAlreadyRegistered(sourceFile: ts.SourceFile, identifier: string): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (!ts.isCallExpression(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    if (ts.isIdentifier(node.expression) && node.expression.text === identifier) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function findPluginsArrayProperty(
  configArg: ts.ObjectLiteralExpression,
): ts.PropertyAssignment | undefined {
  for (const property of configArg.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = property.name;
    if (ts.isIdentifier(name) && name.text === "plugins") return property;
    if (ts.isStringLiteral(name) && name.text === "plugins") return property;
  }
  return undefined;
}

function insertImport(source: string, sourceFile: ts.SourceFile, packageName: string, identifier: string): string {
  const importLine = `import ${identifier} from "${packageName}";\n`;
  const imports = sourceFile.statements.filter((statement) => ts.isImportDeclaration(statement));
  if (imports.length === 0) {
    return `${importLine}${source}`;
  }

  const lastImport = imports[imports.length - 1]!;
  const insertPos = lastImport.getEnd();
  return `${source.slice(0, insertPos)}\n${importLine}${source.slice(insertPos)}`;
}

function insertPluginIntoExistingArray(source: string, arrayLiteral: ts.ArrayLiteralExpression, pluginCall: string): string {
  const elements = arrayLiteral.elements;
  if (elements.length === 0) {
    const open = arrayLiteral.getChildren(sourceFileOf(arrayLiteral))[0];
    const openPos = open ? open.getEnd() : arrayLiteral.getStart() + 1;
    return `${source.slice(0, openPos)}${pluginCall}${source.slice(openPos)}`;
  }

  const last = elements[elements.length - 1]!;
  const insertPos = last.getEnd();
  const between = source.slice(insertPos, arrayLiteral.end - 1);
  const separator = between.includes("\n") ? ",\n  " : ", ";
  return `${source.slice(0, insertPos)}${separator}${pluginCall}${source.slice(insertPos)}`;
}

function sourceFileOf(node: ts.Node): ts.SourceFile {
  let current: ts.Node = node;
  while (current.parent) current = current.parent;
  if (!ts.isSourceFile(current)) {
    throw new Error("Expected source file");
  }
  return current;
}

function addPluginsProperty(source: string, configArg: ts.ObjectLiteralExpression, pluginCall: string): string {
  if (configArg.properties.length === 0) {
    const innerStart = configArg.getStart() + 1;
    return `${source.slice(0, innerStart)} plugins: [${pluginCall}] ${source.slice(innerStart)}`;
  }

  const lastProperty = configArg.properties[configArg.properties.length - 1]!;
  const insertPos = lastProperty.getEnd();
  const gap = source.slice(insertPos, configArg.end - 1);
  const separator = gap.includes("\n") ? ",\n  " : ", ";
  return `${source.slice(0, insertPos)}${separator}plugins: [${pluginCall}]${source.slice(insertPos)}`;
}

export function patchOtokConfig(source: string, options: ConfigPatchOptions): ConfigPatchResult {
  const { packageName, identifier } = options;
  const pluginCall = options.pluginCall ?? `${identifier}()`;
  const fileName = "otok.config.ts";
  const sourceFile = createSourceFile(source, fileName);

  const imports = collectImportSpecifiers(sourceFile);
  const existingIdentifier = imports.get(packageName);
  const resolvedIdentifier = existingIdentifier ?? identifier;

  if (existingIdentifier && pluginAlreadyRegistered(sourceFile, existingIdentifier)) {
    return {
      content: source,
      changed: false,
      reason: "already-installed",
      identifier: resolvedIdentifier,
      importInserted: false,
      pluginInserted: false,
    };
  }

  if (!existingIdentifier && pluginAlreadyRegistered(sourceFile, identifier)) {
    return {
      content: source,
      changed: false,
      reason: "already-installed",
      identifier: resolvedIdentifier,
      importInserted: false,
      pluginInserted: false,
    };
  }

  const defineConfigCall = findDefineConfigCall(sourceFile);
  if (!defineConfigCall || defineConfigCall.arguments.length === 0) {
    return {
      content: source,
      changed: false,
      reason: "no-define-config",
      identifier: resolvedIdentifier,
      importInserted: false,
      pluginInserted: false,
    };
  }

  const configArg = defineConfigCall.arguments[0];
  if (!configArg || !ts.isObjectLiteralExpression(configArg)) {
    return {
      content: source,
      changed: false,
      reason: "no-define-config",
      identifier: resolvedIdentifier,
      importInserted: false,
      pluginInserted: false,
    };
  }

  let next = source;
  let importInserted = false;

  if (!existingIdentifier) {
    next = insertImport(next, createSourceFile(next, fileName), packageName, identifier);
    importInserted = true;
  }

  const patchedFile = createSourceFile(next, fileName);
  const patchedDefineConfig = findDefineConfigCall(patchedFile);
  const patchedArg = patchedDefineConfig?.arguments[0];
  if (!patchedDefineConfig || !patchedArg || !ts.isObjectLiteralExpression(patchedArg)) {
    return {
      content: next,
      changed: importInserted,
      reason: "no-define-config",
      identifier: resolvedIdentifier,
      importInserted,
      pluginInserted: false,
    };
  }

  const pluginsProperty = findPluginsArrayProperty(patchedArg);
  if (pluginsProperty && ts.isArrayLiteralExpression(pluginsProperty.initializer)) {
    next = insertPluginIntoExistingArray(next, pluginsProperty.initializer, pluginCall);
  } else {
    next = addPluginsProperty(next, patchedArg, pluginCall);
  }

  return {
    content: next,
    changed: true,
    reason: "added",
    identifier: resolvedIdentifier,
    importInserted,
    pluginInserted: true,
  };
}

export function resolveIdentifierForConfig(
  source: string,
  packageName: string,
  preferredIdentifier: string,
): { identifier: string; collision: boolean } {
  const sourceFile = createSourceFile(source, "otok.config.ts");
  const imports = collectImportSpecifiers(sourceFile);
  const existing = imports.get(packageName);
  if (existing) return { identifier: existing, collision: false };

  const used = collectUsedIdentifiers(sourceFile);
  if (!used.has(preferredIdentifier)) {
    return { identifier: preferredIdentifier, collision: false };
  }

  return { identifier: preferredIdentifier, collision: true };
}
