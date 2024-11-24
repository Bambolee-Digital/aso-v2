// main.ts
// @ts-ignore
import * as appStoreScraperDefault from 'app-store-scraper';
// @ts-ignore
import * as googlePlayScraperDefault from 'google-play-scraper';
import { ScoreCalculator, KeywordAnalyzer } from './utils';
import { ASOAnalyzer } from './analyzer';
import * as R from 'ramda';
import pThrottle from 'p-throttle';
import pRetry from 'p-retry';
import debug from 'debug';
const log = debug('aso');
// Normaliza as APIs para garantir que temos as funções necessárias
const normalizeAPI = (api) => {
    const methods = {
        search: api.search || api.default?.search,
        app: api.app || api.default?.app,
        similar: api.similar || api.default?.similar,
        suggest: api.suggest || api.default?.suggest,
        list: api.list || api.default?.list
    };
    return methods;
};
// Fix para os módulos que não têm export default
const appStore = normalizeAPI(appStoreScraperDefault);
const google = normalizeAPI(googlePlayScraperDefault);
export class ASO {
    store;
    api;
    MAX_SEARCH;
    MAX_LIST;
    MAX_KEYWORD_LENGTH = 25;
    throttle;
    config;
    constructor(store, config = {}) {
        this.store = store;
        this.api = store === 'gplay' ? google : appStore;
        this.MAX_SEARCH = store === 'gplay' ? 250 : 200;
        this.MAX_LIST = store === 'gplay' ? 120 : 100;
        // Configure API with defaults
        this.config = {
            country: 'us',
            language: 'en',
            throttle: 20,
            timeout: 10000,
            cache: true,
            ...config
        };
        // Setup request throttling
        this.throttle = pThrottle({
            limit: 1,
            interval: this.config.throttle
        });
    }
    /**
     * Execute API request with retry and throttling
     */
    async executeRequest(method, params) {
        const throttled = this.throttle(async () => {
            log(`Executing ${method} with params:`, params);
            return pRetry(async () => {
                // Merge config with params
                const mergedParams = {
                    ...params,
                    country: this.config.country,
                    language: this.config.language,
                    timeout: this.config.timeout
                };
                if (!this.api[method]) {
                    throw new Error(`Method ${method} not found in API`);
                }
                const result = await this.api[method](mergedParams);
                log(`${method} result:`, result);
                return result;
            }, {
                retries: 3,
                onFailedAttempt: error => {
                    log(`Request failed, attempt ${error.attemptNumber}/3. ${error.message}`);
                }
            });
        });
        return throttled();
    }
    /**
     * Search for apps in the store
     */
    async search(options) {
        return this.executeRequest('search', {
            term: options.term,
            num: options.num || 10,
            fullDetail: options.fullDetail
        });
    }
    /**
     * Get detailed app information
     */
    async getAppInfo(appId) {
        return this.executeRequest('app', { appId });
    }
    /**
     * Get similar apps
     */
    async getSimilarApps(appId, fullDetail = true) {
        return this.executeRequest('similar', { appId, fullDetail });
    }
    /**
     * Get search suggestions
     */
    async getSuggestions(term) {
        const results = await this.executeRequest('suggest', { term });
        return this.store === 'itunes'
            ? results.map(r => r.term)
            : results;
    }
    /**
     * Get collection of apps
     */
    async getCollection(options) {
        return this.executeRequest('list', {
            collection: options.collection,
            category: options.category,
            num: options.num || this.MAX_LIST,
            country: options.country
        });
    }
    /**
     * Analyze a keyword
     */
    async analyzeKeyword(keyword) {
        log(`Analyzing keyword: ${keyword}`);
        const searchResults = await this.search({
            term: keyword,
            num: 100,
            fullDetail: true
        });
        const [difficulty, traffic] = await Promise.all([
            this.calculateDifficulty(keyword, searchResults),
            this.calculateTraffic(keyword, searchResults)
        ]);
        return { difficulty, traffic };
    }
    /**
     * Calculate keyword difficulty metrics
     */
    async calculateDifficulty(keyword, apps) {
        const topApps = apps.slice(0, 10);
        const [titleMatches, competitors, installs, rating, age] = await Promise.all([
            this.analyzeTitleMatches(keyword, topApps),
            this.analyzeCompetitors(keyword, topApps),
            this.calculateInstallsScore(topApps),
            this.calculateRatingScore(topApps),
            this.calculateAgeScore(topApps)
        ]);
        const score = ScoreCalculator.aggregate([4, 3, 5, 2, 1], [
            titleMatches.score,
            competitors.score,
            installs.score,
            rating.score,
            age.score
        ]);
        return {
            titleMatches,
            competitors,
            installs,
            rating,
            age,
            score
        };
    }
    /**
     * Calculate keyword traffic metrics
     */
    async calculateTraffic(keyword, apps) {
        const topApps = apps.slice(0, 10);
        const [suggest, ranked, installs, length] = await Promise.all([
            this.calculateSuggestScore(keyword),
            this.calculateRankedScore(topApps),
            this.calculateInstallsScore(topApps),
            this.calculateLengthScore(keyword)
        ]);
        const score = ScoreCalculator.aggregate([8, 3, 2, 1], [suggest.score, ranked.score, installs.score, length.score]);
        return {
            suggest,
            ranked,
            installs,
            length,
            score
        };
    }
    /**
     * Get keyword suggestions based on strategy
     */
    async suggest(options) {
        const finalOptions = {
            strategy: 'category',
            num: 30,
            ...options
        };
        log('Getting suggestions with options:', finalOptions);
        const apps = await this.getAppsByStrategy(finalOptions);
        const keywords = await this.extractKeywordsFromApps(apps);
        const filtered = this.filterSeedKeywords(keywords, finalOptions.keywords || []);
        return R.slice(0, finalOptions.num, filtered);
    }
    /**
     * Get all keywords from an app
     */
    async getAppKeywords(appId) {
        const app = await this.getAppInfo(appId);
        return KeywordAnalyzer.extractKeywords(`${app.title} ${app.description}`);
    }
    // Private helper methods
    async analyzeTitleMatches(keyword, apps) {
        // Implementation moved to analyzer.ts for better organization
        return ASOAnalyzer.analyzeTitleMatches(keyword, apps);
    }
    async analyzeCompetitors(keyword, apps) {
        // Implementation moved to analyzer.ts
        return ASOAnalyzer.analyzeCompetitors(keyword, apps);
    }
    calculateInstallsScore(apps) {
        // Implementation moved to analyzer.ts
        return ASOAnalyzer.calculateInstallsScore(apps, this.store);
    }
    calculateRatingScore(apps) {
        // Implementation moved to analyzer.ts
        return ASOAnalyzer.calculateRatingScore(apps);
    }
    calculateAgeScore(apps) {
        // Implementation moved to analyzer.ts
        return ASOAnalyzer.calculateAgeScore(apps);
    }
    async calculateSuggestScore(keyword) {
        // Implementation moved to analyzer.ts
        return ASOAnalyzer.calculateSuggestScore(keyword, this);
    }
    async calculateRankedScore(apps) {
        // Implementation moved to analyzer.ts
        return ASOAnalyzer.calculateRankedScore(apps, this);
    }
    calculateLengthScore(keyword) {
        // Implementation moved to analyzer.ts
        return ASOAnalyzer.calculateLengthScore(keyword, this.MAX_KEYWORD_LENGTH);
    }
    async getAppsByStrategy(options) {
        // Implementation moved to analyzer.ts
        return ASOAnalyzer.getAppsByStrategy(options, this);
    }
    async extractKeywordsFromApps(apps) {
        const texts = apps.map(app => `${app.title} ${app.description}`);
        return Promise.all(texts.map(text => KeywordAnalyzer.extractKeywords(text))).then(results => R.uniq(R.flatten(results)));
    }
    filterSeedKeywords(keywords, seeds) {
        return keywords.filter(kw => !seeds.includes(kw));
    }
    // Static methods
    isGPlay() {
        return this.store === 'gplay';
    }
    isITunes() {
        return this.store === 'itunes';
    }
}
//# sourceMappingURL=main.js.map