export declare class ScoreCalculator {
    static round(value: number): number;
    static score(min: number, max: number, value: number): number;
    static zScore(max: number, value: number): number;
    static iScore(min: number, max: number, value: number): number;
    static izScore(max: number, value: number): number;
    static aggregate(weights: number[], values: number[]): number;
}
export declare class KeywordAnalyzer {
    static extractKeywords(text: string): Promise<string[]>;
    static getDaysSince(date: string | number): number;
    static getMatchType(keyword: string, title: string): 'exact' | 'broad' | 'partial' | 'none';
}
