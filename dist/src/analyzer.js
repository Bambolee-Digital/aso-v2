// analyzer.ts
import { ScoreCalculator, KeywordAnalyzer } from './utils';
import * as R from 'ramda';
import { ASO } from './main';
import debug from 'debug';
const log = debug('aso:analyzer');
export class ASOAnalyzer {
    /**
     * Analyze title matches for keyword
     */
    static analyzeTitleMatches(keyword, apps) {
        const matches = apps.map(app => KeywordAnalyzer.getMatchType(keyword, app.title));
        const counts = {
            exact: matches.filter(m => m === 'exact').length,
            broad: matches.filter(m => m === 'broad').length,
            partial: matches.filter(m => m === 'partial').length,
            none: matches.filter(m => m === 'none').length
        };
        const score = (10 * counts.exact +
            5 * counts.broad +
            2.5 * counts.partial) / apps.length;
        return {
            ...counts,
            score: ScoreCalculator.round(score)
        };
    }
    /**
     * Analyze competitors targeting the keyword
     */
    static async analyzeCompetitors(keyword, apps) {
        const competitors = await Promise.all(apps.map(async (app) => {
            const keywords = await KeywordAnalyzer.extractKeywords(`${app.title} ${app.description}`);
            return keywords.slice(0, 10).includes(keyword);
        }));
        const count = competitors.filter(Boolean).length;
        return {
            count,
            score: ScoreCalculator.zScore(apps.length, count)
        };
    }
    /**
     * Calculate installs/reviews score
     */
    static calculateInstallsScore(apps, store) {
        const getMetric = (app) => store === 'gplay' ? (app.minInstalls || 0) : (app.reviews || 0);
        const avg = R.mean(apps.map(getMetric));
        const max = store === 'gplay' ? 1000000 : 100000;
        return {
            avg,
            score: ScoreCalculator.zScore(max, avg)
        };
    }
    /**
     * Calculate rating score
     */
    static calculateRatingScore(apps) {
        const avg = R.mean(apps.map(app => app.score || 0));
        return {
            avg,
            score: avg * 2
        };
    }
    /**
     * Calculate app age/update score
     */
    static calculateAgeScore(apps) {
        const daysSinceUpdated = apps.map(app => KeywordAnalyzer.getDaysSince(app.updated || 0));
        const avgDaysSinceUpdated = R.mean(daysSinceUpdated);
        const score = ScoreCalculator.izScore(500, avgDaysSinceUpdated);
        return {
            avgDaysSinceUpdated,
            score
        };
    }
    /**
     * Calculate suggest score based on search suggestions
     */
    static async calculateSuggestScore(keyword, aso) {
        const calculateItunesSuggestScore = async () => {
            const suggestions = await aso.getSuggestions(keyword);
            return {
                score: ScoreCalculator.zScore(8000, suggestions.length ? 5000 : 0)
            };
        };
        const calculateGPlaySuggestScore = async (length = 1) => {
            if (length > Math.min(keyword.length, 25)) {
                return {
                    length: undefined,
                    index: undefined,
                    score: 1
                };
            }
            const prefix = keyword.slice(0, length);
            const suggestions = await aso.getSuggestions(prefix);
            const index = suggestions.indexOf(keyword);
            if (index === -1) {
                return calculateGPlaySuggestScore(length + 1);
            }
            const lengthScore = ScoreCalculator.iScore(1, 25, length);
            const indexScore = ScoreCalculator.izScore(4, index);
            const score = ScoreCalculator.aggregate([10, 1], [lengthScore, indexScore]);
            return { length, index, score };
        };
        return aso instanceof ASO && 'store' in aso && aso.isITunes()
            ? calculateItunesSuggestScore()
            : calculateGPlaySuggestScore();
    }
    /**
     * Calculate ranked score based on category rankings
     */
    static async calculateRankedScore(apps, aso) {
        try {
            const collections = await Promise.all(apps.map(app => aso.getCollection({
                collection: app.free ? 'TOP_FREE' : 'TOP_PAID',
                category: app.genreId,
                num: 120
            })));
            const rankings = apps.map((app, i) => {
                const collectionApps = collections[i];
                const rank = collectionApps.findIndex(a => a.appId === app.appId) + 1;
                return rank || undefined;
            }).filter(Boolean);
            if (!rankings.length) {
                return { count: 0, score: 1 };
            }
            const avgRank = R.mean(rankings.filter((rank) => rank !== undefined));
            const count = rankings.length;
            const countScore = ScoreCalculator.zScore(apps.length, count);
            const avgRankScore = ScoreCalculator.iScore(1, 100, avgRank);
            const score = ScoreCalculator.aggregate([5, 1], [countScore, avgRankScore]);
            return { count, avgRank, score };
        }
        catch (error) {
            log('Error calculating ranked score:', error);
            return { count: 0, score: 1 };
        }
    }
    /**
     * Calculate length score for keyword
     */
    static calculateLengthScore(keyword, maxLength) {
        const length = keyword.length;
        return {
            length,
            score: ScoreCalculator.iScore(1, maxLength, length)
        };
    }
    /**
     * Get apps based on suggestion strategy
     */
    static async getAppsByStrategy(options, aso) {
        switch (options.strategy) {
            case 'similar':
                return options.appId
                    ? aso.getSimilarApps(options.appId)
                    : [];
            case 'category': {
                if (!options.appId)
                    return [];
                const app = await aso.getAppInfo(options.appId);
                return aso.getCollection({
                    collection: app.free ? 'TOP_FREE' : 'TOP_PAID',
                    category: app.genreId,
                    num: 120
                });
            }
            case 'competition': {
                if (!options.appId)
                    return [];
                const app = await aso.getAppInfo(options.appId);
                const keywords = await KeywordAnalyzer.extractKeywords(`${app.title} ${app.description}`);
                const topKeywords = R.slice(0, 10, keywords);
                const searches = await Promise.all(topKeywords.map(kw => aso.search({ term: kw, num: 10, fullDetail: true })));
                return R.uniqBy(app => app.appId, R.flatten(searches));
            }
            case 'keywords':
                if (!options.keywords?.length)
                    return [];
                return this.getAppsFromKeywords(options.keywords, aso);
            case 'arbitrary':
                if (!options.apps?.length)
                    return [];
                return Promise.all(options.apps.map(id => aso.getAppInfo(id)));
            default:
                return [];
        }
    }
    /**
     * Get apps from keywords
     */
    static async getAppsFromKeywords(keywords, aso) {
        const searches = await Promise.all(keywords.map(kw => aso.search({ term: kw, num: 10, fullDetail: true })));
        return R.uniqBy(app => app.appId, R.flatten(searches));
    }
    /**
     * Calculate market opportunity score
     */
    static calculateMarketOpportunity(saturation, difficulty, traffic) {
        return ScoreCalculator.aggregate([4, 3, 3], [
            10 - saturation,
            10 - difficulty,
            traffic
        ]);
    }
    /**
     * Calculate market saturation
     */
    static calculateMarketSaturation(searchResults, minInstalls = 10000) {
        const totalApps = searchResults.length;
        if (totalApps === 0)
            return 0;
        const saturatedApps = searchResults.filter(app => (app.minInstalls || 0) >= minInstalls).length;
        return (saturatedApps / totalApps) * 10;
    }
    /**
     * Generate keyword combinations
     */
    static generateKeywordCombinations(keywords, maxLength = 100) {
        const combinations = [];
        const used = new Set();
        const combine = (current, start) => {
            const phrase = current.join(' ');
            if (phrase.length <= maxLength && !used.has(phrase)) {
                combinations.push(phrase);
                used.add(phrase);
            }
            for (let i = start; i < keywords.length; i++) {
                const newPhrase = [...current, keywords[i]].join(' ');
                if (newPhrase.length <= maxLength) {
                    combine([...current, keywords[i]], i + 1);
                }
            }
        };
        keywords.forEach((_, i) => combine([], i));
        return R.uniq(combinations)
            .sort((a, b) => b.split(' ').length - a.split(' ').length);
    }
    /**
     * Analyze competitive gaps between apps
     */
    static analyzeCompetitiveGap(mainApp, competitors) {
        const advantages = [];
        const disadvantages = [];
        const opportunities = [];
        // Rating analysis
        const avgRating = R.mean(competitors.map(app => app.score || 0));
        if ((mainApp.score || 0) > avgRating) {
            advantages.push('Higher rating than competitors');
        }
        else if ((mainApp.score || 0) < avgRating) {
            disadvantages.push('Lower rating than competitors');
        }
        // Installs analysis
        const avgInstalls = R.mean(competitors.map(app => app.minInstalls || 0));
        if ((mainApp.minInstalls || 0) < avgInstalls * 0.8) {
            opportunities.push('Potential for install growth');
        }
        // Title optimization
        const avgTitleLength = R.mean(competitors.map(app => app.title.length));
        if (mainApp.title.length < avgTitleLength * 0.7) {
            opportunities.push('Title could be optimized for keywords');
        }
        // Description analysis
        const avgDescLength = R.mean(competitors.map(app => app.description.length));
        if (mainApp.description.length < avgDescLength * 0.8) {
            opportunities.push('Description could be expanded');
        }
        // Review volume analysis
        const avgReviews = R.mean(competitors.map(app => app.reviews || 0));
        if ((mainApp.reviews || 0) < avgReviews * 0.5) {
            opportunities.push('Could improve review volume');
        }
        return {
            advantages,
            disadvantages,
            opportunities
        };
    }
    /**
     * Calculate keyword relevancy score
     */
    static calculateKeywordRelevancy(keyword) {
        const length = keyword.length;
        const words = keyword.split(' ').length;
        const lengthScore = ScoreCalculator.score(1, 25, length > 20 ? length * 0.8 : length);
        const wordScore = words === 2 || words === 3 ? 10 :
            words === 1 ? 7 :
                words === 4 ? 6 : 4;
        return ScoreCalculator.aggregate([6, 4], [lengthScore, wordScore]);
    }
}
//# sourceMappingURL=analyzer.js.map