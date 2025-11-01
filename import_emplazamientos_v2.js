require('dotenv').config({ path: '.env' });
const { MongoClient, ObjectId } = require('mongodb');
const XLSX = require('xlsx');
const axios = require('axios');

// Caché de coordenadas por ciudad
const cacheCoordenadas = new Map();

// Función para geocodificar una dirección
async function geocodificarDireccion(direccion, ciudad, provincia, codigoPostal) {
  try {
    // Crear clave de caché usando ciudad y código postal
    const cacheClave = `${ciudad}-${codigoPostal}`;

    // Si ya tenemos coordenadas para esta ciudad, usarlas
    if (cacheCoordenadas.has(cacheClave)) {
      return cacheCoordenadas.get(cacheClave);
    }

    // Construir query de búsqueda solo con ciudad y código postal para ser más eficiente
    const query = `${ciudad}, ${codigoPostal}, España`;

    // Usar Nominatim de OpenStreetMap (gratuito pero con rate limit)
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        limit: 1,
        countrycodes: 'es'
      },
      headers: {
        'User-Agent': 'AssetFlow/1.0'
      },
      timeout: 5000
    });

    let coordenadas;
    if (response.data && response.data.length > 0) {
      const resultado = response.data[0];
      coordenadas = {
        type: 'Point',
        coordinates: [parseFloat(resultado.lon), parseFloat(resultado.lat)]
      };
    } else {
      // Si no encuentra, retornar coordenadas de Madrid como fallback
      coordenadas = {
        type: 'Point',
        coordinates: [-3.7038, 40.4168] // Madrid
      };
    }

    // Guardar en caché
    cacheCoordenadas.set(cacheClave, coordenadas);

    // Esperar 1 segundo solo cuando hacemos una petición real
    await sleep(1000);

    return coordenadas;
  } catch (error) {
    console.log(`⚠️  Error geocodificando ${ciudad}: ${error.message}, usando Madrid como fallback`);
    const coordenadas = {
      type: 'Point',
      coordinates: [-3.7038, 40.4168] // Madrid
    };
    return coordenadas;
  }
}

// Función para esperar (rate limiting)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mapeo de códigos de provincia a nombres
const provinciasMap = {
  1: 'Álava', 2: 'Albacete', 3: 'Alicante', 4: 'Almería', 5: 'Ávila',
  6: 'Badajoz', 7: 'Baleares', 8: 'Barcelona', 9: 'Burgos', 10: 'Cáceres',
  11: 'Cádiz', 12: 'Castellón', 13: 'Ciudad Real', 14: 'Córdoba', 15: 'A Coruña',
  16: 'Cuenca', 17: 'Girona', 18: 'Granada', 19: 'Guadalajara', 20: 'Guipúzcoa',
  21: 'Huelva', 22: 'Huesca', 23: 'Jaén', 24: 'León', 25: 'Lleida',
  26: 'La Rioja', 27: 'Lugo', 28: 'Madrid', 29: 'Málaga', 30: 'Murcia',
  31: 'Navarra', 32: 'Ourense', 33: 'Asturias', 34: 'Palencia', 35: 'Las Palmas',
  36: 'Pontevedra', 37: 'Salamanca', 38: 'Santa Cruz de Tenerife', 39: 'Cantabria',
  40: 'Segovia', 41: 'Sevilla', 42: 'Soria', 43: 'Tarragona', 44: 'Teruel',
  45: 'Toledo', 46: 'Valencia', 47: 'Valladolid', 48: 'Vizcaya', 49: 'Zamora',
  50: 'Zaragoza', 51: 'Ceuta', 52: 'Melilla'
};

async function importarEmplazamientos() {
  const mongoUri = process.env.MONGODB_URI.replace('@mongodb:', '@localhost:');
  const client = new MongoClient(mongoUri);

  try {
    console.log('🔄 Conectando a MongoDB...');
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db('assetflow');
    const clientesCollection = db.collection('clientes');
    const emplazamientosCollection = db.collection('emplazamientos');

    // Buscar el cliente Omnitrade
    console.log('🔍 Buscando cliente Omnitrade (CLI-00001)...');
    const cliente = await clientesCollection.findOne({ codigo: 'CLI-00001' });

    if (!cliente) {
      console.error('❌ No se encontró el cliente CLI-00001 (Omnitrade)');
      return;
    }
    console.log(`✅ Cliente encontrado: ${cliente.nombre} (ID: ${cliente._id})\n`);

    // Leer el archivo Excel
    console.log('📖 Leyendo archivo Excel...');
    const workbook = XLSX.readFile('OFICINAS_DEF_LANZAMIENTO-1.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`✅ ${data.length} emplazamientos encontrados en el Excel\n`);

    // Verificar cuántos emplazamientos ya existen
    const existingCount = await emplazamientosCollection.countDocuments({ cliente: cliente._id });
    console.log(`ℹ️  Emplazamientos existentes para este cliente: ${existingCount}\n`);

    // Procesar cada fila del Excel
    let procesados = 0;
    let creados = 0;
    let errores = 0;
    let saltados = 0;

    console.log('🚀 Iniciando importación...\n');

    for (const fila of data) {
      try {
        procesados++;

        // Verificar si ya existe un emplazamiento con este CODIRED
        const codigoEmplazamiento = `EMP-OMN-${fila.CODIRED}`;
        const existente = await emplazamientosCollection.findOne({ codigo: codigoEmplazamiento });

        if (existente) {
          console.log(`⏭️  [${procesados}/${data.length}] Ya existe: ${codigoEmplazamiento} - ${fila['NOMBRE UNIDAD']}`);
          saltados++;
          continue;
        }

        // Geocodificar dirección (usa caché para ciudades repetidas)
        const coordenadas = await geocodificarDireccion(
          fila['LOCALIZACION (domicilio)'],
          fila['LOCALIZACION (localidad)'],
          provinciasMap[fila.PROVINCIA] || `Provincia ${fila.PROVINCIA}`,
          fila['LOCALIZACION CP']
        );

        // Preparar datos del emplazamiento
        const nuevoEmplazamiento = {
          codigo: codigoEmplazamiento,
          cliente: cliente._id,
          nombre: fila['NOMBRE UNIDAD'],
          direccion: {
            calle: fila['LOCALIZACION (domicilio)'],
            ciudad: fila['LOCALIZACION (localidad)'],
            provincia: provinciasMap[fila.PROVINCIA] || `Provincia ${fila.PROVINCIA}`,
            codigoPostal: String(fila['LOCALIZACION CP']),
            pais: 'España'
          },
          coordenadas: coordenadas,
          contacto: {
            telefono: String(fila.TELÉFONO || ''),
            email: fila.EMAIL || ''
          },
          activo: true,
          observaciones: [
            `Tipo: ${fila.TIPO}`,
            `CCAA: ${fila.CCAA}`,
            `Gerencia: ${fila.GERENCIA}`,
            `Formato: ${fila.FORMATO}`,
            `Zona: ${fila.ZONA}`,
            `Sector: ${fila.COD_SECTOR}`,
            `Idiomas: ${fila.IDIOMAS}`
          ].join(' | '),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Crear emplazamiento
        await emplazamientosCollection.insertOne(nuevoEmplazamiento);
        creados++;

        console.log(`✅ [${procesados}/${data.length}] Creado: ${codigoEmplazamiento} - ${nuevoEmplazamiento.nombre}`);

      } catch (error) {
        errores++;
        console.error(`❌ [${procesados}/${data.length}] Error procesando ${fila.CODIRED}: ${error.message}`);
      }
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(60));
    console.log(`Total procesados:          ${procesados}`);
    console.log(`✅ Creados:                ${creados}`);
    console.log(`⏭️  Saltados (ya existían): ${saltados}`);
    console.log(`❌ Errores:                ${errores}`);
    console.log('='.repeat(60) + '\n');

    // Verificar total final
    const finalCount = await emplazamientosCollection.countDocuments({ cliente: cliente._id });
    console.log(`ℹ️  Total de emplazamientos para ${cliente.nombre}: ${finalCount}\n`);

  } catch (error) {
    console.error('❌ Error en la importación:', error);
  } finally {
    await client.close();
    console.log('👋 Conexión cerrada');
  }
}

// Ejecutar importación
importarEmplazamientos();
