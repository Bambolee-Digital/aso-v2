import { ASO } from '../src/main.js';

async function runTest() {
  try {
    console.log('Iniciando teste ASO...');

    const asoClient = new ASO('itunes', {
      country: 'us',
      language: 'en',
      throttle: 1000 // 1 segundo entre requisições
    });

    console.log('Analisando keyword "understand dog language"...');
    const result = await asoClient.analyzeKeyword('talk to santa live');

    console.log('Resultado:', JSON.stringify(result, null, 2));

    // Testar busca
    console.log('\nBuscando apps...');
    const searchResults = await asoClient.search({
      term: 'understand dog language',
      num: 5,
      fullDetail: true
    });

    console.log('Resultados da busca:',
      searchResults.map(app => ({
        title: app.title,
        appId: app.appId
      }))
    );

  } catch (error) {
    console.error('Erro no teste:', error);
  }
}

runTest().catch(console.error);