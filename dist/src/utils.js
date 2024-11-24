import * as R from 'ramda';
import keywordExtractor from 'keyword-extractor';
export class ScoreCalculator {
    static round(value) {
        return Math.round(value * 100) / 100;
    }
    static score(min, max, value) {
        value = Math.min(max, value);
        value = Math.max(min, value);
        return this.round(1 + 9 * (value - min) / (max - min));
    }
    static zScore(max, value) {
        return this.score(0, max, value);
    }
    static iScore(min, max, value) {
        value = Math.min(max, value);
        value = Math.max(min, value);
        return this.round(1 + 9 * (max - value) / (max - min));
    }
    static izScore(max, value) {
        return this.iScore(0, max, value);
    }
    static aggregate(weights, values) {
        const max = 10 * R.sum(weights);
        const min = 1 * R.sum(weights);
        const sum = R.sum(R.zipWith((a, b) => a * b, weights, values));
        return this.score(min, max, sum);
    }
}
export class KeywordAnalyzer {
    static async extractKeywords(text) {
        const options = {
            language: "english",
            remove_digits: true,
            return_changed_case: true,
            remove_duplicates: true
        };
        return keywordExtractor.extract(text, options);
    }
    static getDaysSince(date) {
        const timestamp = typeof date === 'string' ? Date.parse(date) : date;
        return Math.floor((Date.now() - timestamp) / 86400000);
    }
    static getMatchType(keyword, title) {
        keyword = keyword.toLowerCase();
        title = title.toLowerCase();
        if (title.includes(keyword)) {
            return 'exact';
        }
        const matches = keyword.split(' ').map(word => title.includes(word));
        if (R.all(R.identity, matches)) {
            return 'broad';
        }
        if (R.any(R.identity, matches)) {
            return 'partial';
        }
        return 'none';
    }
}
//# sourceMappingURL=utils.js.map