/**
 * Script para inicializar la configuración de Claude Sonnet 4.5
 * Ejecutar: node scripts/init_claude_config.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AI_Config = require('../src/models/AI_Config');
const User = require('../src/models/User');

// API Key desde variable de entorno o argumento de línea de comandos
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.argv[2];

if (!CLAUDE_API_KEY) {
  console.error('✗ Error: CLAUDE_API_KEY no proporcionada');
  console.error('  Uso: CLAUDE_API_KEY=sk-ant-xxx node scripts/init_claude_config.js');
  console.error('  O:   node scripts/init_claude_config.js sk-ant-xxx');
  process.exit(1);
}

async function initClaudeConfig() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Conectado a MongoDB');

    // Buscar usuario admin
    const adminUser = await User.findOne({ email: 'ppelaez@oversunenergy.com' });

    if (!adminUser) {
      console.error('✗ Usuario admin no encontrado');
      process.exit(1);
    }

    console.log('✓ Usuario admin encontrado:', adminUser.name);

    // Verificar si ya existe configuración de Claude
    const existingConfig = await AI_Config.findOne({
      proveedor: 'anthropic',
      modelo: 'claude-sonnet-4-5-20250929'
    });

    if (existingConfig) {
      console.log('⚠ Ya existe una configuración de Claude Sonnet 4.5');
      console.log('   ID:', existingConfig._id);
      console.log('   ¿Deseas actualizarla? Eliminando y recreando...');
      await existingConfig.deleteOne();
      console.log('✓ Configuración anterior eliminada');
    }

    // Crear nueva configuración
    const config = new AI_Config({
      proveedor: 'anthropic',
      nombreDisplay: 'Claude Sonnet 4.5',
      apiUrl: 'https://api.anthropic.com/v1/messages',
      modelo: 'claude-sonnet-4-5-20250929',
      maxTokens: 64000,
      temperatura: 0.7,
      activo: true,
      prioridadUso: 1,
      costoPor1000Tokens: 9.0, // $3 input + $15 output = promedio $9
      limiteMensual: 1000000,
      notas: 'Claude Sonnet 4.5 - Modelo más inteligente para agentes complejos y coding. 200K tokens de contexto, $3/M input + $15/M output',
      creadoPor: adminUser._id
    });

    // Encriptar y guardar API key
    config.setApiKey(CLAUDE_API_KEY);
    await config.save();

    console.log('✓ Configuración de Claude Sonnet 4.5 creada exitosamente');
    console.log('');
    console.log('Detalles de la configuración:');
    console.log('  ID:', config._id);
    console.log('  Proveedor:', config.proveedor);
    console.log('  Modelo:', config.modelo);
    console.log('  API Key (masked):', config.apiKeyMasked);
    console.log('  Max Tokens:', config.maxTokens);
    console.log('  Temperatura:', config.temperatura);
    console.log('  Activo:', config.activo);
    console.log('  Prioridad:', config.prioridadUso);
    console.log('  Costo/1000 tokens:', `$${config.costoPor1000Tokens}`);
    console.log('  Límite mensual:', config.limiteMensual.toLocaleString(), 'tokens');
    console.log('');
    console.log('🎉 ¡Listo! La configuración de Claude está activa y lista para usar.');

  } catch (error) {
    console.error('✗ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar
initClaudeConfig();
