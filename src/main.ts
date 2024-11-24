// main.ts
// @ts-ignore
import * as appStoreScraperDefault from 'app-store-scraper';
// @ts-ignore
import * as googlePlayScraperDefault from 'google-play-scraper';

import {
  AppInfo,
  SearchOptions,
  ScoreResult,
  SuggestOptions,
  SearchResult,
  StoreCollection,
  StoreType,
  StoreConfig,
  CollectionOptions
} from './types';
import { ScoreCalculator, KeywordAnalyzer } from './utils';
import { ASOAnalyzer } from './analyzer';
import * as R from 'ramda';
import pThrottle from 'p-throttle';
import pRetry from 'p-retry';
import debug from 'debug';

const log = debug('aso');

// Normaliza as APIs para garantir que temos as funções necessárias
const normalizeAPI = (api: any) => {
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
  private readonly store: StoreType;
  private readonly api: ReturnType<typeof normalizeAPI>;
  private readonly MAX_SEARCH: number;
  private readonly MAX_LIST: number;
  private readonly MAX_KEYWORD_LENGTH = 25;
  private readonly throttle: ReturnType<typeof pThrottle>;
  private readonly config: StoreConfig;

  constructor(store: StoreType, config: Partial<StoreConfig> = {}) {
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
      interval: this.config.throttle as number
    });
  }

  /**
   * Execute API request with retry and throttling
   */
  private async executeRequest<T>(
    method: keyof ReturnType<typeof normalizeAPI>,
    params: Record<string, any>
  ): Promise<T> {
    const throttled = this.throttle(async () => {
      log(`Executing ${method} with params:`, params);

      return pRetry(
        async () => {
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
        },
        {
          retries: 3,
          onFailedAttempt: error => {
            log(
              `Request failed, attempt ${error.attemptNumber}/3. ${error.message}`
            );
          }
        }
      );
    });

    return throttled();
  }

  /**
   * Search for apps in the store
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    return this.executeRequest<SearchResult[]>('search', {
      term: options.term,
      num: options.num || 10,
      fullDetail: options.fullDetail
    });
  }

  /**
   * Get detailed app information
   */
  async getAppInfo(appId: string): Promise<AppInfo> {
    return this.executeRequest<AppInfo>('app', { appId });
  }

  /**
   * Get similar apps
   */
  async getSimilarApps(appId: string, fullDetail: boolean = true): Promise<AppInfo[]> {
    return this.executeRequest<AppInfo[]>('similar', { appId, fullDetail });
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(term: string): Promise<string[]> {
    const results = await this.executeRequest<any[]>('suggest', { term });
    return this.store === 'itunes'
      ? results.map(r => r.term)
      : results;
  }

  /**
   * Get collection of apps
   */
  async getCollection(options: CollectionOptions): Promise<AppInfo[]> {
    return this.executeRequest<AppInfo[]>('list', {
      collection: options.collection,
      category: options.category,
      num: options.num || this.MAX_LIST,
      country: options.country
    });
  }

  /**
   * Analyze a keyword
   */
  async analyzeKeyword(keyword: string): Promise<ScoreResult> {
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
  private async calculateDifficulty(
    keyword: string,
    apps: AppInfo[]
  ): Promise<ScoreResult['difficulty']> {
    const topApps = apps.slice(0, 10);

    const [
      titleMatches,
      competitors,
      installs,
      rating,
      age
    ] = await Promise.all([
      this.analyzeTitleMatches(keyword, topApps),
      this.analyzeCompetitors(keyword, topApps),
      this.calculateInstallsScore(topApps),
      this.calculateRatingScore(topApps),
      this.calculateAgeScore(topApps)
    ]);

    const score = ScoreCalculator.aggregate(
      [4, 3, 5, 2, 1],
      [
        titleMatches.score,
        competitors.score,
        installs.score,
        rating.score,
        age.score
      ]
    );

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
  private async calculateTraffic(
    keyword: string,
    apps: AppInfo[]
  ): Promise<ScoreResult['traffic']> {
    const topApps = apps.slice(0, 10);

    const [suggest, ranked, installs, length] = await Promise.all([
      this.calculateSuggestScore(keyword),
      this.calculateRankedScore(topApps),
      this.calculateInstallsScore(topApps),
      this.calculateLengthScore(keyword)
    ]);

    const score = ScoreCalculator.aggregate(
      [8, 3, 2, 1],
      [suggest.score, ranked.score, installs.score, length.score]
    );

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
  async suggest(options: SuggestOptions): Promise<string[]> {
    const finalOptions = {
      strategy: 'category' as const,
      num: 30,
      ...options
    };

    log('Getting suggestions with options:', finalOptions);

    const apps = await this.getAppsByStrategy(finalOptions);
    const keywords = await this.extractKeywordsFromApps(apps);
    const filtered = this.filterSeedKeywords(
      keywords,
      finalOptions.keywords || []
    );

    return R.slice(0, finalOptions.num, filtered);
  }

  /**
   * Get all keywords from an app
   */
  async getAppKeywords(appId: string): Promise<string[]> {
    const app = await this.getAppInfo(appId);
    return KeywordAnalyzer.extractKeywords(
      `${app.title} ${app.description}`
    );
  }

  // Private helper methods

  private async analyzeTitleMatches(keyword: string, apps: AppInfo[]) {
    // Implementation moved to analyzer.ts for better organization
    return ASOAnalyzer.analyzeTitleMatches(keyword, apps);
  }

  private async analyzeCompetitors(keyword: string, apps: AppInfo[]) {
    // Implementation moved to analyzer.ts
    return ASOAnalyzer.analyzeCompetitors(keyword, apps);
  }

  private calculateInstallsScore(apps: AppInfo[]) {
    // Implementation moved to analyzer.ts
    return ASOAnalyzer.calculateInstallsScore(apps, this.store);
  }

  private calculateRatingScore(apps: AppInfo[]) {
    // Implementation moved to analyzer.ts
    return ASOAnalyzer.calculateRatingScore(apps);
  }

  private calculateAgeScore(apps: AppInfo[]) {
    // Implementation moved to analyzer.ts
    return ASOAnalyzer.calculateAgeScore(apps);
  }

  private async calculateSuggestScore(keyword: string) {
    // Implementation moved to analyzer.ts
    return ASOAnalyzer.calculateSuggestScore(keyword, this);
  }

  private async calculateRankedScore(apps: AppInfo[]) {
    // Implementation moved to analyzer.ts
    return ASOAnalyzer.calculateRankedScore(apps, this);
  }

  private calculateLengthScore(keyword: string) {
    // Implementation moved to analyzer.ts
    return ASOAnalyzer.calculateLengthScore(keyword, this.MAX_KEYWORD_LENGTH);
  }

  private async getAppsByStrategy(options: SuggestOptions): Promise<AppInfo[]> {
    // Implementation moved to analyzer.ts
    return ASOAnalyzer.getAppsByStrategy(options, this);
  }

  private async extractKeywordsFromApps(apps: AppInfo[]): Promise<string[]> {
    const texts = apps.map(app => `${app.title} ${app.description}`);
    return Promise.all(
      texts.map(text => KeywordAnalyzer.extractKeywords(text))
    ).then(results => R.uniq(R.flatten(results)));
  }

  private filterSeedKeywords(keywords: string[], seeds: string[]): string[] {
    return keywords.filter(kw => !seeds.includes(kw));
  }

  // Static methods
  public isGPlay(): boolean {
    return this.store === 'gplay';
  }

  public isITunes(): boolean {
    return this.store === 'itunes';
  }
}