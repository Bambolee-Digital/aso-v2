import { AppInfo, SearchResult, SuggestOptions, StoreType } from './types';
import { ASO } from './main';
export declare class ASOAnalyzer {
    /**
     * Analyze title matches for keyword
     */
    static analyzeTitleMatches(keyword: string, apps: AppInfo[]): {
        score: number;
        exact: number;
        broad: number;
        partial: number;
        none: number;
    };
    /**
     * Analyze competitors targeting the keyword
     */
    static analyzeCompetitors(keyword: string, apps: AppInfo[]): Promise<{
        count: number;
        score: number;
    }>;
    /**
     * Calculate installs/reviews score
     */
    static calculateInstallsScore(apps: AppInfo[], store: StoreType): {
        avg: number;
        score: number;
    };
    /**
     * Calculate rating score
     */
    static calculateRatingScore(apps: AppInfo[]): {
        avg: number;
        score: number;
    };
    /**
     * Calculate app age/update score
     */
    static calculateAgeScore(apps: AppInfo[]): {
        avgDaysSinceUpdated: number;
        score: number;
    };
    /**
     * Calculate suggest score based on search suggestions
     */
    static calculateSuggestScore(keyword: string, aso: ASO): Promise<{
        score: number;
    }>;
    /**
     * Calculate ranked score based on category rankings
     */
    static calculateRankedScore(apps: AppInfo[], aso: ASO): Promise<{
        count: number;
        score: number;
        avgRank?: undefined;
    } | {
        count: number;
        avgRank: number;
        score: number;
    }>;
    /**
     * Calculate length score for keyword
     */
    static calculateLengthScore(keyword: string, maxLength: number): {
        length: number;
        score: number;
    };
    /**
     * Get apps based on suggestion strategy
     */
    static getAppsByStrategy(options: SuggestOptions, aso: ASO): Promise<AppInfo[]>;
    /**
     * Get apps from keywords
     */
    private static getAppsFromKeywords;
    /**
     * Calculate market opportunity score
     */
    static calculateMarketOpportunity(saturation: number, difficulty: number, traffic: number): number;
    /**
     * Calculate market saturation
     */
    static calculateMarketSaturation(searchResults: SearchResult[], minInstalls?: number): number;
    /**
     * Generate keyword combinations
     */
    static generateKeywordCombinations(keywords: string[], maxLength?: number): string[];
    /**
     * Analyze competitive gaps between apps
     */
    static analyzeCompetitiveGap(mainApp: AppInfo, competitors: AppInfo[]): {
        advantages: string[];
        disadvantages: string[];
        opportunities: string[];
    };
    /**
     * Calculate keyword relevancy score
     */
    static calculateKeywordRelevancy(keyword: string): number;
}
