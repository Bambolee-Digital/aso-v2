
import { ASOAnalyzer } from './analyzer.js';  // Note a extensão .js
import { ASO } from './main.js';
import { AppInfo, ScoreResult, StoreConfig } from './types.js';
import { ScoreCalculator } from './utils.js';

// Exportações
export { ASO } from './main.js';
export { ASOAnalyzer } from './analyzer.js';
export { ScoreCalculator, KeywordAnalyzer } from './utils.js';
export * from './types.js';

// Constants
export const VERSION = '2.0.0';

export const DEFAULT_CONFIG: StoreConfig = {
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
} as const;

// Suggestion strategy constants
export const STRATEGIES = {
  SIMILAR: 'similar',
  COMPETITION: 'competition',
  CATEGORY: 'category',
  ARBITRARY: 'arbitrary',
  KEYWORDS: 'keywords',
  SEARCH: 'search'
} as const;

// Helper functions for common use cases
export const helpers = {
  /**
   * Create a Google Play store instance with default configuration
   */
  createGPlayStore(config?: Partial<StoreConfig>): ASO {
    return new ASO('gplay', { ...DEFAULT_CONFIG, ...config });
  },

  /**
   * Create an iTunes store instance with default configuration
   */
  createITunesStore(config?: Partial<StoreConfig>): ASO {
    return new ASO('itunes', { ...DEFAULT_CONFIG, ...config });
  },

  /**
   * Quick keyword analysis for Google Play
   */
  async analyzeGPlayKeyword(
    keyword: string,
    config?: Partial<StoreConfig>
  ): Promise<ScoreResult> {
    const store = new ASO('gplay', { ...DEFAULT_CONFIG, ...config });
    return store.analyzeKeyword(keyword);
  },

  /**
   * Quick keyword analysis for iTunes
   */
  async analyzeITunesKeyword(
    keyword: string,
    config?: Partial<StoreConfig>
  ): Promise<ScoreResult> {
    const store = new ASO('itunes', { ...DEFAULT_CONFIG, ...config });
    return store.analyzeKeyword(keyword);
  },

  /**
   * Analyze multiple keywords in parallel
   */
  async analyzeKeywords(
    store: ASO,
    keywords: string[],
    concurrency: number = 3
  ): Promise<Record<string, ScoreResult>> {
    const results: Record<string, ScoreResult> = {};
    const chunks = [];

    // Split keywords into chunks based on concurrency
    for (let i = 0; i < keywords.length; i += concurrency) {
      chunks.push(keywords.slice(i, i + concurrency));
    }

    // Process chunks sequentially to avoid rate limiting
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async (keyword) => {
          try {
            const result = await store.analyzeKeyword(keyword);
            return [keyword, result] as const;
          } catch (error) {
            console.error(`Error analyzing keyword: ${keyword}`, error);
            return [keyword, null] as const;
          }
        })
      );

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
  async compareApps(
    store: ASO,
    appId1: string,
    appId2: string
  ): Promise<{
    app1: AppInfo;
    app2: AppInfo;
    analysis: {
      advantages: string[];
      disadvantages: string[];
      opportunities: string[];
    };
  }> {
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
  getKeywordCombinations(
    keywords: string[],
    maxLength: number = 100
  ): string[] {
    return ASOAnalyzer.generateKeywordCombinations(keywords, maxLength);
  },

  /**
   * Calculate market opportunity score
   */
  async calculateMarketOpportunity(
    store: ASO,
    keyword: string
  ): Promise<{
    opportunity: number;
    saturation: number;
    competition: number;
  }> {
    const results = await store.search({
      term: keyword,
      num: 100,
      fullDetail: true
    });

    const saturation = ASOAnalyzer.calculateMarketSaturation(results);
    const analysis = await store.analyzeKeyword(keyword);

    const opportunity = ScoreCalculator.aggregate(
      [4, 3, 3],
      [
        10 - saturation,
        10 - analysis.difficulty.score,
        analysis.traffic.score
      ]
    );

    return {
      opportunity,
      saturation,
      competition: analysis.difficulty.score
    };
  }
};

// Default export
export default ASO;