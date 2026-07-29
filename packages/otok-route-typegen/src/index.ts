export {
  scanRoutes,
  routeFileToEntries,
  segmentToVariants,
  publicRoutePattern,
  routePatternsForScan,
  isApiRoute,
  isLayoutFile,
  isSpecialRouteFile,
  routeModuleId,
  type RouteEntry,
  type RoutesScanResult,
  type ScanRoutesOptions,
} from "./parser.js";

export {
  analyzeRoutes,
  detectRouteConflicts,
  detectUnreachableRoutes,
  formatRouteIssues,
  type RouteIssue,
  type RouteIssueSeverity,
  type AnalyzeRoutesResult,
} from "./conflicts.js";

export {
  paramsFromRoutePattern,
  paramsTypeFromPattern,
  paramsTypeFromRoutePath,
  uniqueRoutesByFile,
  type RouteParamType,
} from "./params.js";

export { buildRouteTree, formatRouteTree, formatRouteList, type RouteTreeNode } from "./tree.js";

export { generateRouteTypes, runRouteTypegen, type RouteTypegenOptions, type RouteTypegenResult } from "./generate.js";
