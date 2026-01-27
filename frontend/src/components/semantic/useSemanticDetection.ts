import { useMemo } from 'react';
import {
  SemanticToken,
  DetectedIssue,
  detectSemanticTokens,
  extractIssuesFromTokens,
} from './semanticDictionary';

interface UseSemanticDetectionResult {
  tokens: SemanticToken[];
  issues: DetectedIssue[];
  hasDetections: boolean;
  bodyPartCount: number;
  symptomCount: number;
}

/**
 * Hook to detect semantic tokens (body parts and symptoms) in text.
 * Memoizes detection results for performance.
 *
 * @param text - The text to analyze
 * @returns Detection results including tokens and extracted issues
 */
export function useSemanticDetection(text: string): UseSemanticDetectionResult {
  return useMemo(() => {
    if (!text || text.trim().length === 0) {
      return {
        tokens: [],
        issues: [],
        hasDetections: false,
        bodyPartCount: 0,
        symptomCount: 0,
      };
    }

    const tokens = detectSemanticTokens(text);
    const issues = extractIssuesFromTokens(text, tokens);

    const bodyPartCount = tokens.filter((t) => t.type === 'bodyPart').length;
    const symptomCount = tokens.filter((t) => t.type === 'symptom').length;

    return {
      tokens,
      issues,
      hasDetections: tokens.length > 0,
      bodyPartCount,
      symptomCount,
    };
  }, [text]);
}
