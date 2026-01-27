export { SemanticHighlighter } from './SemanticHighlighter';
export { useSemanticDetection } from './useSemanticDetection';
export {
  detectSemanticTokens,
  extractIssuesFromTokens,
  getSymptomSeverity,
  getMuscleGroupsForAlias,
  SYMPTOMS,
  BODY_PARTS,
} from './semanticDictionary';
export type {
  SemanticToken,
  SemanticTokenType,
  DetectedIssue,
  IssueSeverity,
} from './semanticDictionary';
