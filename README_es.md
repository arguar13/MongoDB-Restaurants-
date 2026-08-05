*Leer este documento en otros idiomas: [English](README.md)*

# Análisis de Restaurantes de Uber Eats — Proyecto de Ingeniería de Datos y Analítica con MongoDB

## Descripción General del Proyecto

Este proyecto presenta un flujo de trabajo completo de ingeniería de datos y analítica utilizando **MongoDB** como principal almacén de datos analítico, basado en un conjunto de datos del mundo real con **más de 63 mil restaurantes de Uber Eats en Estados Unidos**.

Demuestra el uso de MongoDB más allá del almacenamiento, incluyendo:

- Validación de datos
- Optimización de índices
- Consultas analíticas
- Cálculo de KPIs
- Análisis geoespacial

El pipeline integra **Python (ETL)** con **MongoDB** para simular un sistema analítico preparado para entornos de producción.

## Características Principales

- Pipeline reproducible de extremo a extremo
- MongoDB para almacenamiento, indexación, validación y analítica
- Python para ETL y transformación
- Análisis geoespacial con GeoJSON

## Objetivos del Proyecto

El objetivo es construir un pipeline analítico escalable con MongoDB:

- Ingerir y transformar datos CSV en un entorno NoSQL
- Diseñar un esquema de documentos orientado al análisis
- Implementar estrategias de indexación para mejorar el rendimiento
- Garantizar la calidad de los datos a gran escala
- Calcular KPIs mediante el framework de agregación
- Ejecutar consultas geoespaciales y avanzadas

## Distribución de Responsabilidades

- **MongoDB**: almacenamiento, indexación, validación y agregaciones
- **Python**: ETL, limpieza y transformación

## Contexto del Conjunto de Datos

- Más de 63.000 restaurantes de Uber Eats en Estados Unidos
- Metadatos reales obtenidos mediante scraping

Permite analizar:

- Categorías y popularidad
- Relación entre precio y calificación
- Distribución geográfica
- Patrones de reseñas

## Modelado de Datos en MongoDB

- Un documento por restaurante
- Estructura de dirección anidada
- Categorías almacenadas como arreglos
- GeoJSON para consultas espaciales

MongoDB se utiliza como:

- Base de datos analítica
- Motor de agregación
- Sistema de consultas geoespaciales

## Pipeline ETL (Python)

Construido con `pandas` y `pymongo`:

- Carga de datos CSV
- Limpieza y normalización
- Ingeniería de características (campos anidados, GeoJSON)
- Inserción por lotes en MongoDB

## Capa de Validación de Datos

Detecta:

- Calificaciones inválidas
- Campos faltantes
- Duplicados
- Datos de ubicación incompletos

## Estrategia de Indexación

- `name`, `category`, `score`, `ratings`
- `address.zip_code`
- Índice 2dsphere para ubicación
- Índice compuesto (`category`, `score`)

Mejora el rendimiento de filtrado, ordenamiento y consultas geoespaciales.

## Analítica y KPIs

Utilizando el Framework de Agregación de MongoDB:

- Calificación promedio por categoría
- Restaurantes por rango de precios
- Restaurantes mejor calificados
- Calificaciones por código postal (ZIP Code)
- Frecuencia de categorías
- Métricas basadas en interacción y participación

## Consultas Avanzadas

- Puntaje de popularidad (calificación × cantidad de reseñas)
- Análisis de precio versus calificación
- Detección de restaurantes con alta calificación y baja visibilidad
- Filtrado por categoría

## Análisis Geoespacial

Utiliza los operadores de MongoDB:

- `$near`
- `$geoNear`

Permite:

- Recomendaciones cercanas
- Búsquedas por proximidad
- Información y análisis regionales

## Autor

**Armando Guarnera**  
Científico de Datos — Argentina