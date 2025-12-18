require('dotenv').config();
const alertService = require('./services/alertService');

async function testAlerts() {
  console.log('🚨 Probando sistema de alertas...');
  
  // Test 1: Verificar alertas actuales
  console.log('\n1. Verificando alertas actuales...');
  const alerts = await alertService.checkReproductiveAlerts();
  
  console.log(`📊 Alertas encontradas: ${alerts.length}`);
  alerts.forEach((alert, index) => {
    console.log(`\n${index + 1}. ${alert.title} (${alert.type})`);
    console.log(`   ${alert.message}`);
  });
  
  // Test 2: Enviar reporte diario
  console.log('\n2. Enviando reporte diario...');
  const reportResult = await alertService.sendDailyReport('comganpor@outlook.com');
  
  if (reportResult.success) {
    console.log('✅ Reporte diario enviado exitosamente');
  } else {
    console.log('❌ Error enviando reporte:', reportResult.error || reportResult.message);
  }
  
  console.log('\n🏁 Prueba de alertas completada');
}

testAlerts().catch(console.error);
