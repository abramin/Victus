// Voice Command Types (for frontend use)

export type VoiceCommandIntent = 'TRAINING' | 'NUTRITION' | 'BIOMETRICS';

export interface TrainingVoiceData {
    activity: string;
    duration_min?: number | null;
    avg_hr?: number | null;
    rpe?: number | null;
    sensation?: string | null;
}

export interface NutritionItem {
    food: string;
    quantity?: number | null;
    unit?: string | null;
}

export interface NutritionData {
    items: NutritionItem[];
}

export interface BiometricData {
    metric: string;
    value?: number | null;
    unit?: string | null;
    sensation?: string | null;
}

export interface VoiceCommandResult {
    intent: VoiceCommandIntent;
    training_data?: TrainingVoiceData;
    nutrition_data?: NutritionData;
    biometric_data?: BiometricData;
    parsed_at: string;
    raw_input: string;
    confidence: number;
}

export interface BodyMapUpdate {
    body_part: string;
    symptom: string;
    raw_text: string;
    delta: number;
}

export interface ActionTaken {
    type: string;  // "training_logged", "nutrition_logged", "training_draft", etc.
    summary: string;
}

export interface ParseVoiceCommandResponse {
    success: boolean;
    result?: VoiceCommandResult;
    is_draft: boolean;
    needs_more_info: boolean;
    body_map_updates?: BodyMapUpdate[];
    action_taken?: ActionTaken;  // What was persisted
    error?: string;
}

export interface ParseVoiceCommandRequest {
    raw_input: string;
    date?: string;
}
