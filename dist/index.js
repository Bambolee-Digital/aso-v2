import { ASOAnalyzer } from './analyzer.js'; // Note a extensão .js
import { ASO } from './main.js';
import { ScoreCalculator } from './utils.js';
// Exportações
export { ASO } from './main.js';
export { ASOAnalyzer } from './analyzer.js';
export { ScoreCalculator, KeywordAnalyzer } from './utils.js';
export * from './types.js';
// Constants
export const VERSION = '2.0.0';
export const DEFAULT_CONFIG = {
    country: 'us',
    language: 'en',
    throttle: 20,
    timeout: 10000,
    cache: true
};
// Store collection constants
export const COLLECTIONS = {
    GPLAY: {
        TOP_FREE: 'TOP_FREE',
        TOP_PAID: 'TOP_PAID',
        TOP_GROSSING: 'TOP_GROSSING',
        TRENDING: 'TRENDING'
    },
    ITUNES: {
        TOP_FREE_IOS: 'TOP_FREE_IOS',
        TOP_PAID_IOS: 'TOP_PAID_IOS',
        TOP_GROSSING_IOS: 'TOP_GROSSING_IOS',
        NEW_IOS: 'NEW_IOS'
    }
};
// Suggestion strategy constants
export const STRATEGIES = {
    SIMILAR: 'similar',
    COMPETITION: 'competition',
    CATEGORY: 'category',
    ARBITRARY: 'arbitrary',
    KEYWORDS: 'keywords',
    SEARCH: 'search'
};
// Helper functions for common use cases
export const helpers = {
    /**
     * Create a Google Play store instance with default configuration
     */
    createGPlayStore(config) {
        return new ASO('gplay', { ...DEFAULT_CONFIG, ...config });
    },
    /**
     * Create an iTunes store instance with default configuration
     */
    createITunesStore(config) {
        return new ASO('itunes', { ...DEFAULT_CONFIG, ...config });
    },
    /**
     * Quick keyword analysis for Google Play
     */
    async analyzeGPlayKeyword(keyword, config) {
        const store = new ASO('gplay', { ...DEFAULT_CONFIG, ...config });
        return store.analyzeKeyword(keyword);
    },
    /**
     * Quick keyword analysis for iTunes
     */
    async analyzeITunesKeyword(keyword, config) {
        const store = new ASO('itunes', { ...DEFAULT_CONFIG, ...config });
        return store.analyzeKeyword(keyword);
    },
    /**
     * Analyze multiple keywords in parallel
     */
    async analyzeKeywords(store, keywords, concurrency = 3) {
        const results = {};
        const chunks = [];
        // Split keywords into chunks based on concurrency
        for (let i = 0; i < keywords.length; i += concurrency) {
            chunks.push(keywords.slice(i, i + concurrency));
        }
        // Process chunks sequentially to avoid rate limiting
        for (const chunk of chunks) {
            const chunkResults = await Promise.all(chunk.map(async (keyword) => {
                try {
                    const result = await store.analyzeKeyword(keyword);
                    return [keyword, result];
                }
                catch (error) {
                    console.error(`Error analyzing keyword: ${keyword}`, error);
                    return [keyword, null];
                }
            }));
            // Add successful results to the map
            chunkResults.forEach(([keyword, result]) => {
                if (result) {
                    results[keyword] = result;
                }
            });
            // Add delay between chunks to respect rate limits
            if (chunks.indexOf(chunk) < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return results;
    },
    /**
     * Compare two apps and get competitive analysis
     */
    async compareApps(store, appId1, appId2) {
        const [app1, app2] = await Promise.all([
            store.getAppInfo(appId1),
            store.getAppInfo(appId2)
        ]);
        const analysis = ASOAnalyzer.analyzeCompetitiveGap(app1, [app2]);
        return {
            app1,
            app2,
            analysis
        };
    },
    /**
     * Get optimal keyword combinations from a list of keywords
     */
    getKeywordCombinations(keywords, maxLength = 100) {
        return ASOAnalyzer.generateKeywordCombinations(keywords, maxLength);
    },
    /**
     * Calculate market opportunity score
     */
    async calculateMarketOpportunity(store, keyword) {
        const results = await store.search({
            term: keyword,
            num: 100,
            fullDetail: true
        });
        const saturation = ASOAnalyzer.calculateMarketSaturation(results);
        const analysis = await store.analyzeKeyword(keyword);
        const opportunity = ScoreCalculator.aggregate([4, 3, 3], [
            10 - saturation,
            10 - analysis.difficulty.score,
            analysis.traffic.score
        ]);
        return {
            opportunity,
            saturation,
            competition: analysis.difficulty.score
        };
    }
};
// Default export
export default ASO;
