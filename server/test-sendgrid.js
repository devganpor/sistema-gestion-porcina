require('dotenv').config();
const sendgridService = require('./services/sendgridService');

async function testSendGrid() {
  console.log('📧 Probando SendGrid...');
  
  // Test 1: Verificar configuración
  console.log('\n1. Verificando configuración...');
  const configTest = await sendgridService.testConnection();
  
  if (configTest.success) {
    console.log('✅ Configuración correcta');
    
    // Test 2: Enviar email de prueba
    console.log('\n2. Enviando email de prueba...');
    const emailTest = await sendgridService.sendAlert(
      'comganpor@outlook.com',
      'Prueba SendGrid',
      'Este es un email de prueba usando SendGrid. ¡Funciona perfectamente!',
      'success'
    );
    
    if (emailTest.success) {
      console.log('✅ Email enviado exitosamente');
      console.log(`📧 Message ID: ${emailTest.messageId}`);
    } else {
      console.log('❌ Error enviando email:', emailTest.error);
    }
  } else {
    console.log('❌ Error de configuración:', configTest.error);
  }
  
  console.log('\n🏁 Prueba completada');
}

testSendGrid().catch(console.error);
