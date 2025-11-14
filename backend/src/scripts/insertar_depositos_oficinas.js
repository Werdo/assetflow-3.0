const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const mongoose = require('mongoose');

// Importar modelos con rutas relativas correctas
const Cliente = require('../models/Cliente');
const Producto = require('../models/Producto');
const Emplazamiento = require('../models/Emplazamiento');
const Deposito = require('../models/Deposito');

// Configuración
const CODIGO_CLIENTE = 'CLI-00001';
const CODIGO_SUBCLIENTE = 'SUB-CLI-00001';
const CODIGO_PRODUCTO = 'HDP-PRD-00008';
const FECHA_INICIO = new Date('2025-11-06');
const FECHA_FIN = new Date('2026-01-15');

// Conectar a MongoDB
async function conectarDB() {
  try {
    // Usar localhost para conexión local
    const mongoURI = 'mongodb://admin:assetflow2025secure@localhost:27017/assetflow?authSource=admin';
    await mongoose.connect(mongoURI);
    console.log('✓ Conectado a MongoDB');
  } catch (error) {
    console.error('✗ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

// Generar coordenadas aproximadas basadas en el código postal
function generarCoordenadasPorCP(codigoPostal) {
  // Mapa aproximado de provincias españolas con coordenadas centrales
  const provinciaCoordenadas = {
    '01': [-2.673, 42.849],  // Álava
    '02': [-1.858, 39.000],  // Albacete
    '03': [-0.483, 38.345],  // Alicante
    '04': [-2.464, 36.840],  // Almería
    '05': [-4.701, 40.657],  // Ávila
    '06': [-6.970, 38.879],  // Badajoz
    '07': [2.650, 39.570],   // Baleares
    '08': [2.168, 41.387],   // Barcelona
    '09': [-3.696, 42.343],  // Burgos
    '10': [-6.389, 39.474],  // Cáceres
    '11': [-6.288, 36.529],  // Cádiz
    '12': [-0.106, 39.986],  // Castellón
    '13': [-3.927, 38.985],  // Ciudad Real
    '14': [-4.779, 37.888],  // Córdoba
    '15': [-8.396, 43.362],  // A Coruña
    '16': [-2.137, 40.070],  // Cuenca
    '17': [2.821, 41.979],   // Girona
    '18': [-3.601, 37.177],  // Granada
    '19': [-3.163, 40.632],  // Guadalajara
    '20': [-2.041, 43.318],  // Gipuzkoa
    '21': [-6.944, 37.261],  // Huelva
    '22': [-0.408, 42.140],  // Huesca
    '23': [-3.787, 37.779],  // Jaén
    '24': [-5.567, 42.598],  // León
    '25': [0.620, 41.618],   // Lleida
    '26': [-2.445, 42.466],  // La Rioja
    '27': [-7.556, 43.013],  // Lugo
    '28': [-3.703, 40.416],  // Madrid
    '29': [-4.421, 36.721],  // Málaga
    '30': [-1.130, 37.992],  // Murcia
    '31': [-1.645, 42.817],  // Navarra
    '32': [-7.864, 42.336],  // Ourense
    '33': [-5.843, 43.361],  // Asturias
    '34': [-4.524, 42.009],  // Palencia
    '35': [-15.413, 28.100], // Las Palmas
    '36': [-8.722, 42.231],  // Pontevedra
    '37': [-5.663, 40.965],  // Salamanca
    '38': [-16.251, 28.463], // Santa Cruz de Tenerife
    '39': [-3.804, 43.464],  // Cantabria
    '40': [-4.117, 40.942],  // Segovia
    '41': [-5.984, 37.389],  // Sevilla
    '42': [-2.463, 41.763],  // Soria
    '43': [0.802, 40.798],   // Tarragona
    '44': [-1.106, 40.344],  // Teruel
    '45': [-4.024, 39.857],  // Toledo
    '46': [-0.375, 39.469],  // Valencia
    '47': [-4.724, 41.652],  // Valladolid
    '48': [-2.924, 43.263],  // Bizkaia
    '49': [-5.746, 41.503],  // Zamora
    '50': [-0.877, 41.656],  // Zaragoza
    '51': [-5.316, 36.140],  // Ceuta
    '52': [-2.937, 35.290]   // Melilla
  };

  if (!codigoPostal || codigoPostal.length < 2) {
    // Coordenadas por defecto (centro de España)
    return [-3.703, 40.416];
  }

  const provincia = codigoPostal.substring(0, 2);
  const coords = provinciaCoordenadas[provincia];

  if (coords) {
    // Añadir pequeña variación aleatoria para que no todos estén en el mismo punto
    const variacion = 0.1;
    return [
      coords[0] + (Math.random() - 0.5) * variacion,
      coords[1] + (Math.random() - 0.5) * variacion
    ];
  }

  // Por defecto, Madrid
  return [-3.703, 40.416];
}

// Leer Excel
function leerExcel() {
  try {
    const filePath = path.join(__dirname, '../../../OFICINAS DEF. LANZAMIENTO-1.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`✓ Leídas ${data.length} filas del Excel`);
    return data;
  } catch (error) {
    console.error('✗ Error leyendo Excel:', error);
    throw error;
  }
}

// Verificar existencia de datos maestros
async function verificarDatosMaestros() {
  console.log('\n=== VERIFICANDO DATOS MAESTROS ===');

  // Verificar Cliente
  const cliente = await Cliente.findOne({ codigo: CODIGO_CLIENTE });
  if (!cliente) {
    throw new Error(`Cliente ${CODIGO_CLIENTE} no encontrado`);
  }
  console.log(`✓ Cliente encontrado: ${cliente.nombre} (${cliente.codigo})`);

  // Verificar Subcliente
  const subcliente = await Cliente.findOne({ codigo: CODIGO_SUBCLIENTE });
  if (!subcliente) {
    throw new Error(`Subcliente ${CODIGO_SUBCLIENTE} no encontrado`);
  }
  console.log(`✓ Subcliente encontrado: ${subcliente.nombre} (${subcliente.codigo})`);

  // Verificar Producto
  const producto = await Producto.findOne({ codigo: CODIGO_PRODUCTO });
  if (!producto) {
    throw new Error(`Producto ${CODIGO_PRODUCTO} no encontrado`);
  }
  console.log(`✓ Producto encontrado: ${producto.nombre} (${producto.codigo})`);

  return { cliente, subcliente, producto };
}

// Procesar oficinas y crear depósitos
async function procesarOficinasYDepositos(datos, cliente, subcliente, producto) {
  console.log('\n=== PROCESANDO OFICINAS Y CREANDO DEPÓSITOS ===\n');

  let emplazamientosCreados = 0;
  let emplazamientosExistentes = 0;
  let depositosCreados = 0;
  let errores = 0;

  for (let i = 0; i < datos.length; i++) {
    const fila = datos[i];
    const nombreUnidad = fila['NOMBRE UNIDAD'];
    const unidades = fila['UNIDADES'];
    const codigoPostal = fila['LOCALIZACION CP'];
    const localidad = fila['LOCALIZACION (localidad)'];
    const domicilio = fila['LOCALIZACION (domicilio)'];
    const email = fila['EMAIL'];
    const telefono = fila['TELÉFONO'];
    const provincia = fila['PROVINCIA'];
    const ccaa = fila['CCAA'];

    if (!nombreUnidad || !unidades) {
      console.log(`⚠ Fila ${i + 1}: Faltan datos (nombre o unidades)`);
      errores++;
      continue;
    }

    try {
      // Buscar o crear emplazamiento
      let emplazamiento = await Emplazamiento.findOne({
        nombre: nombreUnidad,
        cliente: cliente._id
      });

      if (!emplazamiento) {
        // Crear nuevo emplazamiento
        const coordenadas = generarCoordenadasPorCP(codigoPostal);

        emplazamiento = new Emplazamiento({
          cliente: cliente._id,
          subcliente: subcliente._id,
          nombre: nombreUnidad,
          direccion: {
            calle: domicilio || '',
            ciudad: localidad || '',
            provincia: ccaa || provincia || '',
            codigoPostal: codigoPostal || '',
            pais: 'España'
          },
          coordenadas: {
            type: 'Point',
            coordinates: coordenadas
          },
          contacto: {
            email: email || '',
            telefono: telefono || ''
          },
          activo: true,
          observaciones: `Oficina de Correos - ${fila['TIPO'] || 'N/A'} - ${fila['FORMATO'] || 'N/A'}`
        });

        await emplazamiento.save();
        emplazamientosCreados++;
        console.log(`✓ [${i + 1}/${datos.length}] Emplazamiento creado: ${nombreUnidad} (${emplazamiento.codigo})`);
      } else {
        emplazamientosExistentes++;
        console.log(`- [${i + 1}/${datos.length}] Emplazamiento existente: ${nombreUnidad} (${emplazamiento.codigo})`);
      }

      // Crear depósito
      const deposito = new Deposito({
        producto: producto._id,
        emplazamiento: emplazamiento._id,
        cliente: cliente._id,
        subcliente: subcliente._id,
        cantidad: parseInt(unidades) || 0,
        fechaDeposito: FECHA_INICIO,
        fechaVencimiento: FECHA_FIN,
        estado: 'activo',
        activo: true,
        observaciones: `Oficina ${fila['CODIRED'] || 'N/A'} - ${fila['GERENCIA'] || 'N/A'}`
      });

      await deposito.save();
      depositosCreados++;
      console.log(`  → Depósito creado: ${deposito.numeroDeposito} - ${unidades} unidades`);

    } catch (error) {
      console.error(`✗ [${i + 1}/${datos.length}] Error procesando ${nombreUnidad}:`, error.message);
      errores++;
    }

    // Mostrar progreso cada 100 filas
    if ((i + 1) % 100 === 0) {
      console.log(`\n--- Progreso: ${i + 1}/${datos.length} filas procesadas ---\n`);
    }
  }

  return {
    emplazamientosCreados,
    emplazamientosExistentes,
    depositosCreados,
    errores
  };
}

// Función principal
async function main() {
  try {
    console.log('=== INICIO DE IMPORTACIÓN DE OFICINAS Y DEPÓSITOS ===\n');

    // Conectar a BD
    await conectarDB();

    // Leer Excel
    const datos = leerExcel();

    // Verificar datos maestros
    const { cliente, subcliente, producto } = await verificarDatosMaestros();

    // Procesar
    const resultado = await procesarOficinasYDepositos(datos, cliente, subcliente, producto);

    // Resumen
    console.log('\n=== RESUMEN DE IMPORTACIÓN ===');
    console.log(`Total de filas procesadas: ${datos.length}`);
    console.log(`Emplazamientos creados: ${resultado.emplazamientosCreados}`);
    console.log(`Emplazamientos existentes: ${resultado.emplazamientosExistentes}`);
    console.log(`Depósitos creados: ${resultado.depositosCreados}`);
    console.log(`Errores: ${resultado.errores}`);
    console.log('\n✓ Importación completada exitosamente');

  } catch (error) {
    console.error('\n✗ Error fatal:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Desconectado de MongoDB');
  }
}

// Ejecutar
main();
