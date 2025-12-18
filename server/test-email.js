require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmail() {
  console.log('🔧 Probando configuración de email...');
  
  // Test 1: Verificar conexión SMTP
  console.log('\n1. Verificando conexión SMTP...');
  const connectionTest = await emailService.testConnection();
  
  if (connectionTest.success) {
    console.log('✅ Conexión SMTP exitosa');
    
    // Test 2: Enviar email de prueba
    console.log('\n2. Enviando email de prueba...');
    const emailTest = await emailService.sendAlert(
      'comganpor@outlook.com', // Enviar a ti mismo
      'Prueba de Configuración',
      'Este es un email de prueba del Sistema de Gestión Porcina. ¡La configuración funciona correctamente!',
      'success'
    );
    
    if (emailTest.success) {
      console.log('✅ Email enviado exitosamente');
      console.log(`📧 Message ID: ${emailTest.messageId}`);
    } else {
      console.log('❌ Error enviando email:', emailTest.error);
    }
  } else {
    console.log('❌ Error de conexión SMTP:', connectionTest.error);
  }
  
  console.log('\n🏁 Prueba completada');
}

testEmail().catch(console.error);
