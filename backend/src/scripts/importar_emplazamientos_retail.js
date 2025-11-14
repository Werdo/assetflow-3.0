const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Importar modelos
// Path detection: adjust based on execution location
const Emplazamiento = require(
  process.cwd().includes('/app')
    ? './src/models/Emplazamiento'
    : '../models/Emplazamiento'
);

// Detectar si estamos en local o en servidor
const isLocal = !process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost');

// Conectar a MongoDB
async function conectarDB() {
  try {
    let mongoURI;
    let jsonFile;

    if (isLocal) {
      mongoURI = 'mongodb://admin:assetflow2025secure@localhost:27017/assetflow?authSource=admin';
      jsonFile = path.join(__dirname, '../../../emplazamientos_retail_local.json');
      console.log('=== MODO: LOCAL ===');
    } else {
      mongoURI = 'mongodb://admin:assetflow2025secure@mongodb:27017/assetflow?authSource=admin';
      jsonFile = '/app/emplazamientos_retail_cloud.json';
      console.log('=== MODO: SERVIDOR CLOUD ===');
    }

    await mongoose.connect(mongoURI);
    console.log('✓ Conectado a MongoDB');

    return jsonFile;
  } catch (error) {
    console.error('✗ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

// Importar emplazamientos
async function importarEmplazamientos() {
  try {
    console.log('\n=== IMPORTACIÓN DE EMPLAZAMIENTOS RETAIL ===\n');

    // Conectar a BD
    const jsonFile = await conectarDB();

    // Leer archivo JSON
    if (!fs.existsSync(jsonFile)) {
      throw new Error(`Archivo no encontrado: ${jsonFile}`);
    }

    const datos = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    console.log(`✓ Archivo JSON cargado: ${jsonFile}`);
    console.log(`  - Emplazamientos: ${datos.emplazamientos.length}\n`);

    let creados = 0;
    let existentes = 0;
    let errores = 0;

    console.log('=== PROCESANDO IMPORTACIÓN ===\n');

    for (let i = 0; i < datos.emplazamientos.length; i++) {
      const empData = datos.emplazamientos[i];

      try {
        // Buscar si ya existe el emplazamiento
        const existe = await Emplazamiento.findOne({
          nombre: empData.nombre,
          cliente: empData.clienteId
        });

        if (!existe) {
          // Crear nuevo emplazamiento
          const emplazamiento = new Emplazamiento({
            cliente: empData.clienteId,
            nombre: empData.nombre,
            direccion: empData.direccion,
            coordenadas: empData.coordenadas,
            contacto: empData.contacto,
            activo: empData.activo,
            tipoIcono: empData.tipoIcono, // 'square' para retail
            observaciones: empData.observaciones
          });

          await emplazamiento.save();
          creados++;
          console.log(`✓ [${i + 1}/${datos.emplazamientos.length}] Creado: ${empData.nombre}`);
        } else {
          existentes++;
          if ((i + 1) % 50 === 0) {
            console.log(`- [${i + 1}/${datos.emplazamientos.length}] Existente: ${empData.nombre}`);
          }
        }

        // Mostrar progreso cada 50
        if ((i + 1) % 50 === 0) {
          console.log(`\n--- Progreso: ${i + 1}/${datos.emplazamientos.length} ---`);
          console.log(`   Creados: ${creados}, Existentes: ${existentes}\n`);
        }

      } catch (error) {
        console.error(`✗ Error procesando ${empData.nombre}:`, error.message);
        errores++;
      }
    }

    // Resumen
    console.log('\n=== RESUMEN DE IMPORTACIÓN ===');
    console.log(`Total procesado: ${datos.emplazamientos.length}`);
    console.log(`Emplazamientos creados: ${creados}`);
    console.log(`Emplazamientos existentes: ${existentes}`);
    console.log(`Errores: ${errores}`);
    console.log(`Tipo de icono: square (cuadrado)`);
    console.log('\n✓ Importación completada');

  } catch (error) {
    console.error('\n✗ Error fatal:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Desconectado de MongoDB');
  }
}

// Ejecutar
importarEmplazamientos();
