# Formato de Importación de Números de Serie

## Estándar establecido basado en archivo: `00077395(1).xlsx`

### Formato 1: CSV con Cabecera (RECOMENDADO para Excel)

El archivo debe tener una columna llamada `product_sn` con los números de serie:

```csv
product_sn
861888084164660
861888084137872 8934013132319434302F
861888083826426
861888084261714 8934013132319434303F
861888083720223
```

**Características:**
- Compatible con exports de Excel
- Puede incluir otras columnas (se ignorarán)
- **Soporta múltiples códigos por celda** (IMEI + ICCID separados por espacio)
- Más robusto para archivos grandes

### Formato 2: Texto plano (SIMPLE)

Un número de serie por línea, sin cabecera. **Soporta múltiples códigos por línea** (IMEI + ICCID):

```
861888084164660
861888084137872 8934013132319434302F
861888083826426
861888084261714 8934013132319434303F
861888083720223
```

**Ventajas:**
- Más simple
- Compatible con copiar/pegar directamente desde escáner de balizas
- Ideal para listas pequeñas
- **Soporta formato de escaneo de balizas** (IMEI + ICCID en la misma línea)

## Formato de Balizas (IMEI + ICCID)

Cuando se escanean balizas, el sistema captura **dos códigos en la misma línea**:

**Ejemplo de escaneo de baliza:**
```
861888081796522 8934013132319434302F
```

Donde:
- **IMEI**: 861888081796522 (15 dígitos)
- **ICCID**: 8934013132319434302F (19-20 caracteres, puede terminar en letra)

**El sistema automáticamente:**
- Detecta múltiples códigos separados por espacio
- Almacena IMEI e ICCID como códigos independientes
- Permite búsqueda por cualquiera de los dos códigos

**Separadores soportados:** espacio, coma, punto y coma, tab

## Reglas de Validación

1. ✅ **Números de serie únicos**: No se permiten duplicados
2. ✅ **Formato mixto**: Soporta IMEI (15 dígitos) e ICCID (alfanumérico)
3. ✅ **Múltiples códigos por línea**: IMEI + ICCID en la misma línea
4. ✅ **Detección de conflictos**: El sistema verifica si un código ya existe en otro depósito
5. ✅ **Conversión automática**: Todos los códigos se convierten a MAYÚSCULAS
6. ✅ **Líneas vacías**: Se ignoran automáticamente
7. ✅ **Separadores flexibles**: Espacio, coma, punto y coma o tabulación

## Ejemplo Real

Archivo original: `00077395(1).xlsx`
- **Total registros**: 80,004 números de serie
- **Columna principal**: `product_sn`
- **Formato**: Números IMEI de 15 dígitos
- **Otras columnas**: imei_1, imei_2, work_order_id, etc. (se ignoran)

## Archivos de Ejemplo

- **Plantilla CSV con cabecera**: `PLANTILLA_IMPORTACION_NUMEROS_SERIE.csv`
- **Ejemplo formato balizas** (IMEI + ICCID): `EJEMPLO_BALIZAS.txt`
- **Archivo de prueba**: `PRUEBA_IMPORTACION_20_SERIES.csv`

## Proceso de Importación

1. Selecciona el archivo CSV o TXT
2. El sistema detecta automáticamente el formato (con/sin cabecera)
3. Extrae códigos:
   - De la columna `product_sn` si tiene cabecera
   - Línea por línea si es formato simple
   - **Separa múltiples códigos por línea** (IMEI + ICCID)
4. Convierte todos los códigos a MAYÚSCULAS
5. Valida duplicados contra otros depósitos
6. Muestra resumen: códigos nuevos vs duplicados

**Ejemplo de resultado con balizas:**
- Input: "861888081796522 8934013132319434302F"
- Códigos almacenados: 2 (IMEI y ICCID como registros independientes)
- Búsqueda: Podrás encontrar el depósito buscando por cualquiera de los dos códigos
