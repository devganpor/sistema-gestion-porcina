require('dotenv').config();
const userEmailService = require('./services/userEmailService');

async function testUserEmails() {
  console.log('👤 Probando emails de administración de usuarios...');
  
  // Test 1: Email de bienvenida
  console.log('\n1. Enviando email de bienvenida...');
  const welcomeResult = await userEmailService.sendWelcomeEmail(
    'comganpor@outlook.com',
    'Carlos Ganpor',
    'temp123456'
  );
  
  if (welcomeResult.success) {
    console.log('✅ Email de bienvenida enviado');
  } else {
    console.log('❌ Error:', welcomeResult.error);
  }
  
  // Test 2: Email de cambio de rol
  console.log('\n2. Enviando notificación de cambio de rol...');
  const roleResult = await userEmailService.sendRoleChanged(
    'comganpor@outlook.com',
    'Carlos Ganpor',
    'Administrador',
    'Sistema Automático'
  );
  
  if (roleResult.success) {
    console.log('✅ Email de cambio de rol enviado');
  } else {
    console.log('❌ Error:', roleResult.error);
  }
  
  console.log('\n🏁 Prueba de emails de usuarios completada');
  console.log('📬 Revisa tu bandeja de entrada para ver los emails');
}

testUserEmails().catch(console.error);