import { AppInfo, SearchOptions, ScoreResult, SuggestOptions, SearchResult, StoreType, StoreConfig, CollectionOptions } from './types';
export declare class ASO {
    private readonly store;
    private readonly api;
    private readonly MAX_SEARCH;
    private readonly MAX_LIST;
    private readonly MAX_KEYWORD_LENGTH;
    private readonly throttle;
    private readonly config;
    constructor(store: StoreType, config?: Partial<StoreConfig>);
    /**
     * Execute API request with retry and throttling
     */
    private executeRequest;
    /**
     * Search for apps in the store
     */
    search(options: SearchOptions): Promise<SearchResult[]>;
    /**
     * Get detailed app information
     */
    getAppInfo(appId: string): Promise<AppInfo>;
    /**
     * Get similar apps
     */
    getSimilarApps(appId: string, fullDetail?: boolean): Promise<AppInfo[]>;
    /**
     * Get search suggestions
     */
    getSuggestions(term: string): Promise<string[]>;
    /**
     * Get collection of apps
     */
    getCollection(options: CollectionOptions): Promise<AppInfo[]>;
    /**
     * Analyze a keyword
     */
    analyzeKeyword(keyword: string): Promise<ScoreResult>;
    /**
     * Calculate keyword difficulty metrics
     */
    private calculateDifficulty;
    /**
     * Calculate keyword traffic metrics
     */
    private calculateTraffic;
    /**
     * Get keyword suggestions based on strategy
     */
    suggest(options: SuggestOptions): Promise<string[]>;
    /**
     * Get all keywords from an app
     */
    getAppKeywords(appId: string): Promise<string[]>;
    private analyzeTitleMatches;
    private analyzeCompetitors;
    private calculateInstallsScore;
    private calculateRatingScore;
    private calculateAgeScore;
    private calculateSuggestScore;
    private calculateRankedScore;
    private calculateLengthScore;
    private getAppsByStrategy;
    private extractKeywordsFromApps;
    private filterSeedKeywords;
    isGPlay(): boolean;
    isITunes(): boolean;
}
