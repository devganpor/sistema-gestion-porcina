require('dotenv').config();
const sendgridService = require('./services/sendgridService');

async function testSimpleEmail() {
  console.log('📧 Enviando email simple...');
  
  const result = await sendgridService.sendEmail(
    'comganpor@outlook.com',
    'Prueba Simple - Sistema Porcino',
    '<h1>¡Hola!</h1><p>Este es un email de prueba simple del Sistema de Gestión Porcina.</p><p>Si recibes este mensaje, la configuración funciona correctamente.</p>',
    'Hola! Este es un email de prueba simple del Sistema de Gestión Porcina.'
  );
  
  if (result.success) {
    console.log('✅ Email enviado exitosamente');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log('📬 Revisa tu bandeja de entrada y carpeta de spam');
  } else {
    console.log('❌ Error:', result.error);
  }
}

testSimpleEmail();