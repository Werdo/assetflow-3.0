import pandas as pd
import json

# Leer el archivo Excel
excel_file = r'C:\Users\pedro\claude-code-workspace\Assetflow-workspace\OFICINAS_DEF_LANZAMIENTO-1.xlsx'
xls = pd.ExcelFile(excel_file)

print(f"Hojas disponibles: {xls.sheet_names}\n")

# Leer la primera hoja
df = pd.read_excel(excel_file, sheet_name=0)

print(f"Número de filas: {len(df)}")
print(f"Columnas: {list(df.columns)}\n")
print("Primeras 5 filas:")
print(df.head())
print("\n")
print("Información del DataFrame:")
print(df.info())
