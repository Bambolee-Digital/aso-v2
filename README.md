# ASO-V2

[![NPM Version][npm-version-image]][npm-url]
[![License][license-image]][license-url]

ASO-V2 is a modern Node.js library for App Store Optimization (ASO) analysis. It helps you optimize your app's visibility on both Google Play and Apple App Store by providing detailed keyword analysis, competitor insights, and market opportunities.

This is a TypeScript rewrite and enhancement of the original [ASO package](https://github.com/facundoolano/aso) with modern features, better error handling, and improved performance.

## Features

- 🔍 Comprehensive keyword analysis
- 📊 Market saturation metrics
- 🏆 Competitor analysis
- 💡 Keyword suggestions
- 🔄 Cross-store support (Google Play & App Store)
- 📈 Traffic score calculation
- 🎯 Difficulty score assessment
- ⚡ Modern TypeScript implementation
- 🛡️ Robust error handling
- 🚦 Built-in rate limiting
- 💾 Optional request caching

## Installation

```bash
npm install aso-v2
```

## Quick Start

```typescript
import { ASO } from 'aso-v2';

// For Google Play Store
const gplay = new ASO('gplay');

// For Apple App Store
const appStore = new ASO('itunes');

// Analyze a keyword
const analysis = await gplay.analyzeKeyword('fitness app');
console.log(analysis);
```

## Basic Usage

### Keyword Analysis

```typescript
const analysis = await gplay.analyzeKeyword('fitness app');

// Results include:
{
  difficulty: {
    titleMatches: {
      exact: number,
      broad: number,
      partial: number,
      none: number,
      score: number
    },
    competitors: {
      count: number,
      score: number
    },
    // ... other metrics
    score: number
  },
  traffic: {
    suggest: {
      score: number
    },
    ranked: {
      count: number,
      avgRank: number,
      score: number
    },
    // ... other metrics
    score: number
  }
}
```

### App Search

```typescript
const results = await gplay.search({
  term: 'fitness tracker',
  num: 10,
  fullDetail: true
});
```

### Get App Details

```typescript
const appInfo = await gplay.getAppInfo('com.example.app');
```

### Keyword Suggestions

```typescript
const suggestions = await gplay.suggest({
  strategy: 'competition',
  appId: 'com.example.app',
  num: 30
});
```

## Advanced Usage

### Market Analysis

```typescript
import { ASOAnalyzer } from 'aso-v2';

// Calculate market saturation
const saturation = ASOAnalyzer.calculateMarketSaturation(
  searchResults,
  10000 // minimum installs threshold
);

// Get competitive analysis
const analysis = ASOAnalyzer.analyzeCompetitiveGap(
  myApp,
  competitors
);
```

### Keyword Combinations

```typescript
const combinations = ASOAnalyzer.generateKeywordCombinations(
  ['fitness', 'workout', 'trainer'],
  100 // max length
);
```

### Custom Configuration

```typescript
const gplay = new ASO('gplay', {
  country: 'us',
  language: 'en',
  throttle: 1000, // milliseconds between requests
  timeout: 10000, // request timeout
  cache: true     // enable request caching
});
```

## API Reference

### ASO Class

#### Constructor
```typescript
new ASO(store: 'gplay' | 'itunes', config?: StoreConfig)
```

#### Methods

- `analyzeKeyword(keyword: string): Promise<ScoreResult>`
- `search(options: SearchOptions): Promise<SearchResult[]>`
- `getAppInfo(appId: string): Promise<AppInfo>`
- `getSimilarApps(appId: string, fullDetail?: boolean): Promise<AppInfo[]>`
- `getSuggestions(term: string): Promise<string[]>`
- `suggest(options: SuggestOptions): Promise<string[]>`
- `getAppKeywords(appId: string): Promise<string[]>`

### ASOAnalyzer Class

Static methods for advanced analysis:

- `analyzeTitleMatches(keyword: string, apps: AppInfo[])`
- `analyzeCompetitors(keyword: string, apps: AppInfo[])`
- `calculateMarketSaturation(searchResults: SearchResult[], minInstalls?: number)`
- `calculateKeywordRelevancy(keyword: string)`
- `generateKeywordCombinations(keywords: string[], maxLength?: number)`
- `analyzeCompetitiveGap(mainApp: AppInfo, competitors: AppInfo[])`

## Types

### SearchOptions
```typescript
interface SearchOptions {
  term: string;
  num?: number;
  fullDetail?: boolean;
  price?: 'all' | 'free' | 'paid';
  sortBy?: 'relevance' | 'rating' | 'newest';
}
```

### SuggestOptions
```typescript
interface SuggestOptions {
  strategy?: 'similar' | 'competition' | 'category' | 'arbitrary' | 'keywords';
  appId?: string;
  apps?: string[];
  keywords?: string[];
  num?: number;
}
```

### StoreConfig
```typescript
interface StoreConfig {
  country?: string;
  language?: string;
  throttle?: number;
  timeout?: number;
  cache?: boolean;
}
```

## Error Handling

ASO-V2 includes robust error handling with retry mechanisms:

```typescript
try {
  const analysis = await gplay.analyzeKeyword('fitness app');
} catch (error) {
  if (error.code === 'THROTTLED') {
    // Handle rate limiting
  }
  // Handle other errors
}
```

## Best Practices

1. Use throttling to avoid rate limiting
2. Enable caching for repeated requests
3. Handle errors appropriately
4. Use fullDetail sparingly to reduce API calls
5. Batch operations when possible

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -am 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## Credits

This is a TypeScript rewrite and enhancement of the original [ASO package](https://github.com/facundoolano/aso) by Facundo Olano. The new version includes modern features, better error handling, TypeScript support, and improved performance while maintaining the core functionality of the original package.

## License

MIT License - see the [LICENSE.md](LICENSE.md) file for details

[npm-version-image]: https://img.shields.io/npm/v/aso-v2.svg
[npm-url]: https://npmjs.org/package/aso-v2
[license-image]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: LICENSE.md# aso-v2
# aso-v2
