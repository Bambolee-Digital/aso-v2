import * as R from 'ramda';
import keywordExtractor from 'keyword-extractor';
import { AppInfo } from './types';
import { ExtractionOptions } from 'keyword-extractor/types/lib/keyword_extractor';

export class ScoreCalculator {
  public static round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  static score(min: number, max: number, value: number): number {
    value = Math.min(max, value);
    value = Math.max(min, value);
    return this.round(1 + 9 * (value - min) / (max - min));
  }

  static zScore(max: number, value: number): number {
    return this.score(0, max, value);
  }

  static iScore(min: number, max: number, value: number): number {
    value = Math.min(max, value);
    value = Math.max(min, value);
    return this.round(1 + 9 * (max - value) / (max - min));
  }

  static izScore(max: number, value: number): number {
    return this.iScore(0, max, value);
  }

  static aggregate(weights: number[], values: number[]): number {
    const max = 10 * R.sum(weights);
    const min = 1 * R.sum(weights);
    const sum = R.sum(R.zipWith((a, b) => a * b, weights, values));
    return this.score(min, max, sum);
  }
}

export class KeywordAnalyzer {
  static async extractKeywords(text: string): Promise<string[]> {
    const options: ExtractionOptions = {
      language: "english",
      remove_digits: true,
      return_changed_case: true,
      remove_duplicates: true
    };

    return keywordExtractor.extract(text, options);
  }

  static getDaysSince(date: string | number): number {
    const timestamp = typeof date === 'string' ? Date.parse(date) : date;
    return Math.floor((Date.now() - timestamp) / 86400000);
  }

  static getMatchType(keyword: string, title: string): 'exact' | 'broad' | 'partial' | 'none' {
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
