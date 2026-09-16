// =========================================================
// AI INTENT
// =========================================================

export type AiIntent =
  | 'BUY_PROPERTY'
  | 'RENT_PROPERTY'
  | 'FINANCIAL_ADVICE'
  | 'SYSTEM_HELP'
  | 'GENERAL_SUPPORT';


// =========================================================
// MATCH TYPE
// =========================================================

export type AiMatchType =
  | 'EXACT_MATCH'
  | 'NEAR_MATCH'
  | 'NO_MATCH';


// =========================================================
// FILTER
// =========================================================

export type AiFilters = {
  city?: string;
  district?: string;

  maxPrice?: number;
  minPrice?: number;

  minArea?: number;
  maxArea?: number;

  bedrooms?: number;
  bathrooms?: number;

  keyword?: string;

  monthlyIncome?: number;

  desiredTransaction?:
    | 'SALE'
    | 'RENT';
};


// =========================================================
// AI ANALYSIS RESULT
// =========================================================

export type AiAnalysisResult = {
  intent:
    AiIntent;

  filters:
    AiFilters;

  summary:
    string;

  clarificationNeeded:
    boolean;

  clarificationQuestion?:
    string;
};


// =========================================================
// PROPERTY SUGGESTION
// =========================================================

export type AiPropertySuggestion = {
  id:
    number;

  title:
    string;

  thumbnail:
    string | null;

  images:
    string[];

  price:
    number;

  area:
    number;

  transactionType:
    string;

  city:
    string | null;

  district:
    string | null;

  ward:
    string | null;

  addressDetail:
    string | null;

  bedrooms:
    number | null;

  bathrooms:
    number | null;

  sellerName:
    string | null;

  score:
    number;
};


// =========================================================
// FINANCIAL GUIDANCE
// =========================================================

export type AiFinancialGuidance = {
  monthlyIncome:
    number;

  suggestedHousingBudget:
    number;

  upperHousingBudget:
    number;

  note:
    string;
};


// =========================================================
// SYSTEM HELP
// =========================================================

export type AiSystemHelp = {
  topic:
    string;

  title:
    string;

  description:
    string;

  steps:
    string[];
};


// =========================================================
// ACTION
// =========================================================

export type AiAction = {
  label:
    string;

  route:
    string;
};


// =========================================================
// CHAT RESPONSE
// =========================================================

export type AiChatResponse = {
  success:
    boolean;

  intent:
    AiIntent;

  message:
    string;

  filters:
    AiFilters;

  recommendations:
    AiPropertySuggestion[];

  matchType?:
    AiMatchType;

  matchNote?:
    string;

  financialGuidance?:
    AiFinancialGuidance;

  systemHelp?:
    AiSystemHelp;

  action?:
    AiAction;

  clarificationNeeded:
    boolean;

  clarificationQuestion?:
    string;
};