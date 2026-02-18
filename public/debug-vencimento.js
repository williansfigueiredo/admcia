// ====================================
// 🔍 SCRIPT DE DEBUG - COLAR NO CONSOLE DO NAVEGADOR (F12)
// ====================================

console.clear();
console.log('🔍 Iniciando debug de vencimentos...\n');

// 1. Verificar data de hoje
const hoje = new Date();
console.log('📅 DATA DE HOJE:', hoje.toISOString().split('T')[0]);
console.log('📅 Data LOCAL:', hoje.toLocaleDateString('pt-BR'));
console.log('');

// 2. Verificar se a função existe
if (typeof window.calcularAlertaVencimento === 'function') {
    console.log('✅ Função window.calcularAlertaVencimento existe');
} else {
    console.error('❌ Função window.calcularAlertaVencimento NÃO ENCONTRADA!');
}
console.log('');

// 3. Testar com data de hoje
console.log('🧪 TESTE 1: Vence hoje (2026-02-18)');
const teste1 = window.calcularAlertaVencimento('2026-02-18', 'Pendente');
console.log('Resultado:', teste1);
console.log('Esperado: HTML com ⚠️ VENCE HOJE!');
console.log('Passou?', teste1.includes('VENCE HOJE') ? '✅ SIM' : '❌ NÃO');
console.log('');

// 4. Testar com amanhã
const amanha = new Date();
amanha.setDate(hoje.getDate() + 1);
const amanhaStr = amanha.toISOString().split('T')[0];
console.log('🧪 TESTE 2: Vence amanhã (' + amanhaStr + ')');
const teste2 = window.calcularAlertaVencimento(amanhaStr, 'Pendente');
console.log('Resultado:', teste2);
console.log('Esperado: HTML com ⚠️ Vence amanhã');
console.log('Passou?', teste2.includes('amanhã') ? '✅ SIM' : '❌ NÃO');
console.log('');

// 5. Verificar jobs na memória
console.log('🔍 VERIFICANDO JOBS NA MEMÓRIA:');
if (typeof jobsCache !== 'undefined' && jobsCache.length > 0) {
    console.log('Total de jobs:', jobsCache.length);
    
    // Filtrar jobs com data de vencimento
    const jobsComVencimento = jobsCache.filter(j => j.data_vencimento);
    console.log('Jobs com data de vencimento:', jobsComVencimento.length);
    
    // Mostrar os primeiros 5
    console.log('\n📋 Primeiros 5 jobs com vencimento:');
    jobsComVencimento.slice(0, 5).forEach((job, i) => {
        console.log(`\n${i + 1}. JOB #${job.id}:`);
        console.log('   Descrição:', job.descricao);
        console.log('   Data Vencimento:', job.data_vencimento);
        console.log('   Status Pagamento:', job.pagamento);
        console.log('   Tipo da data:', typeof job.data_vencimento);
        
        // Calcular alerta
        const alerta = window.calcularAlertaVencimento(job.data_vencimento, job.pagamento);
        console.log('   Alerta gerado:', alerta || '(nenhum)');
    });
} else {
    console.warn('⚠️ jobsCache não encontrado ou vazio');
    console.log('Tente recarregar a página ou navegar para a aba de Jobs');
}
console.log('');

// 6. Verificar transações
console.log('🔍 VERIFICANDO TRANSAÇÕES NA MEMÓRIA:');
if (typeof transacoesCache !== 'undefined' && transacoesCache.length > 0) {
    console.log('Total de transações:', transacoesCache.length);
    
    const transComVencimento = transacoesCache.filter(t => t.data_vencimento);
    console.log('Transações com data de vencimento:', transComVencimento.length);
    
    console.log('\n📋 Primeiras 5 transações com vencimento:');
    transComVencimento.slice(0, 5).forEach((trans, i) => {
        console.log(`\n${i + 1}. Transação #${trans.id}:`);
        console.log('   Descrição:', trans.descricao);
        console.log('   Data Vencimento:', trans.data_vencimento);
        console.log('   Status:', trans.status);
        console.log('   Tipo da data:', typeof trans.data_vencimento);
        
        const alerta = window.calcularAlertaVencimento(trans.data_vencimento, trans.status);
        console.log('   Alerta gerado:', alerta || '(nenhum)');
    });
} else {
    console.warn('⚠️ transacoesCache não encontrado ou vazio');
}
console.log('');

console.log('✅ Debug concluído!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('💡 DICAS:');
console.log('• Se a função retorna string vazia, verifique o status');
console.log('• Status "Pago", "Vencido" ou "Cancelado" não mostram alerta');
console.log('• Limpe o cache: Ctrl + Shift + Delete ou Ctrl + F5');
console.log('• Verifique se a data está no formato correto (YYYY-MM-DD)');
