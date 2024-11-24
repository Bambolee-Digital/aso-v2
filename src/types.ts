// types.ts

export type StoreType = 'gplay' | 'itunes';

export type StoreCollection =
  | 'TOP_FREE'
  | 'TOP_PAID'
  | 'TOP_FREE_IOS'
  | 'TOP_PAID_IOS'
  | 'TOP_GROSSING'
  | 'TRENDING';

export type SuggestionStrategy =
  | 'similar'
  | 'competition'
  | 'category'
  | 'arbitrary'
  | 'keywords'
  | 'search';

export interface AppInfo {
  appId: string;
  title: string;
  description: string;
  summary?: string;
  score?: number;
  free?: boolean;
  genreId?: string;
  reviews?: number;
  minInstalls?: number;
  updated?: string | number;
  price?: number;
  ratings?: number;
  primaryGenre?: string;
}

export interface SearchOptions {
  term: string;
  num?: number;
  fullDetail?: boolean;
  price?: 'all' | 'free' | 'paid';
  sortBy?: 'relevance' | 'rating' | 'newest';
}

export interface SearchResult extends AppInfo {
  url: string;
  icon?: string;
  developer?: string;
  developerId?: string;
  currency?: string;
}

export interface ScoreResult {
  difficulty: {
    titleMatches: {
      exact: number;
      broad: number;
      partial: number;
      none: number;
      score: number;
    };
    competitors: {
      count: number;
      score: number;
    };
    installs: {
      avg: number;
      score: number;
    };
    rating: {
      avg: number;
      score: number;
    };
    age: {
      avgDaysSinceUpdated: number;
      score: number;
    };
    score: number;
  };
  traffic: {
    suggest: {
      length?: number;
      index?: number;
      score: number;
    };
    ranked: {
      count: number;
      avgRank?: number;
      score: number;
    };
    installs: {
      avg: number;
      score: number;
    };
    length: {
      length: number;
      score: number;
    };
    score: number;
  };
}

export interface SuggestOptions {
  strategy?: SuggestionStrategy;
  appId?: string;
  apps?: string[];
  keywords?: string[];
  num?: number;
  country?: string;
  language?: string;
}

export interface CollectionOptions {
  collection: StoreCollection;
  category?: string;
  num?: number;
  country?: string;
}

export interface KeywordMetrics {
  keyword: string;
  difficulty: number;
  traffic: number;
  relevancy: number;
  chance: number;
}

export interface StoreResponse<T> {
  data: T;
  error?: string;
  success: boolean;
}

export interface StoreConfig {
  country?: string;
  language?: string;
  throttle?: number;
  timeout?: number;
  cache?: boolean;
}