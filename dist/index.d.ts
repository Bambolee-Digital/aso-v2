import { ASO } from './main.js';
import { AppInfo, ScoreResult, StoreConfig } from './types.js';
export { ASO } from './main.js';
export { ASOAnalyzer } from './analyzer.js';
export { ScoreCalculator, KeywordAnalyzer } from './utils.js';
export * from './types.js';
export declare const VERSION = "2.0.0";
export declare const DEFAULT_CONFIG: StoreConfig;
export declare const COLLECTIONS: {
    readonly GPLAY: {
        readonly TOP_FREE: "TOP_FREE";
        readonly TOP_PAID: "TOP_PAID";
        readonly TOP_GROSSING: "TOP_GROSSING";
        readonly TRENDING: "TRENDING";
    };
    readonly ITUNES: {
        readonly TOP_FREE_IOS: "TOP_FREE_IOS";
        readonly TOP_PAID_IOS: "TOP_PAID_IOS";
        readonly TOP_GROSSING_IOS: "TOP_GROSSING_IOS";
        readonly NEW_IOS: "NEW_IOS";
    };
};
export declare const STRATEGIES: {
    readonly SIMILAR: "similar";
    readonly COMPETITION: "competition";
    readonly CATEGORY: "category";
    readonly ARBITRARY: "arbitrary";
    readonly KEYWORDS: "keywords";
    readonly SEARCH: "search";
};
export declare const helpers: {
    /**
     * Create a Google Play store instance with default configuration
     */
    createGPlayStore(config?: Partial<StoreConfig>): ASO;
    /**
     * Create an iTunes store instance with default configuration
     */
    createITunesStore(config?: Partial<StoreConfig>): ASO;
    /**
     * Quick keyword analysis for Google Play
     */
    analyzeGPlayKeyword(keyword: string, config?: Partial<StoreConfig>): Promise<ScoreResult>;
    /**
     * Quick keyword analysis for iTunes
     */
    analyzeITunesKeyword(keyword: string, config?: Partial<StoreConfig>): Promise<ScoreResult>;
    /**
     * Analyze multiple keywords in parallel
     */
    analyzeKeywords(store: ASO, keywords: string[], concurrency?: number): Promise<Record<string, ScoreResult>>;
    /**
     * Compare two apps and get competitive analysis
     */
    compareApps(store: ASO, appId1: string, appId2: string): Promise<{
        app1: AppInfo;
        app2: AppInfo;
        analysis: {
            advantages: string[];
            disadvantages: string[];
            opportunities: string[];
        };
    }>;
    /**
     * Get optimal keyword combinations from a list of keywords
     */
    getKeywordCombinations(keywords: string[], maxLength?: number): string[];
    /**
     * Calculate market opportunity score
     */
    calculateMarketOpportunity(store: ASO, keyword: string): Promise<{
        opportunity: number;
        saturation: number;
        competition: number;
    }>;
};
export default ASO;
