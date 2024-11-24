// tests/index.ts
import { ASO } from '../src/main.js';
async function test() {
    try {
        // Criar instância do ASO
        const itunes = new ASO('itunes', {
            country: 'us',
            throttle: 10000 // 1 segundo entre requisições
        });
        console.log('Analisando keyword "fitness app"...');
        // Analisar keyword
        const analysis = await itunes.analyzeKeyword('fitness app');
        console.log('Análise:', JSON.stringify(analysis, null, 2));
        // // Buscar sugestões
        // const suggestions = await gplay.suggest({
        //   strategy: 'category',
        //   appId: 'com.myfitnesspal.android',
        //   num: 5
        // });
        // console.log('Sugestões:', suggestions);
        // // Análise de mercado
        // const saturation = ASOAnalyzer.calculateMarketSaturation(
        //   await gplay.search({ term: 'fitness app', num: 50 })
        // );
        // console.log('Saturação do mercado:', saturation);
    }
    catch (error) {
        console.error('Erro:', error);
    }
}
test();
//# sourceMappingURL=index.js.map