# Agenda Clínica

Aplicación web sencilla para gestionar la agenda y los turnos de una clínica pequeña. El proyecto combina un calendario mensual, un panel diario de turnos y un flujo básico de estados para organizar la operación cotidiana de forma práctica y visual.

## ¿Qué es este proyecto?

Agenda Clínica nació como una herramienta personal y educativa para aprender a construir una aplicación web realista desde cero. Su idea central es simple: ayudar a administrar turnos de forma ordenada, sin depender de soluciones pesadas o complejas.

Aunque sigue en crecimiento, ya permite trabajar con los conceptos principales de una agenda clínica: crear turnos, visualizarlos por día, cambiar su estado y mantener un registro básico de actividad.

## Funcionalidades actuales

- Visualización de un calendario mensual con resumen de turnos por día.
- Panel diario para ver los turnos de una fecha específica.
- Alta de turnos con datos como paciente, teléfono, obra social, pago, profesional, notas y horarios.
- Cambio de estado de un turno entre distintos pasos del flujo clínico.
- Historial simple de cambios de estado por turno.
- Interfaz web básica orientada a uso práctico y rápido.

## Tecnologías utilizadas

- PHP puro
- MySQL / MariaDB
- HTML, CSS y JavaScript vanilla
- Arquitectura simple basada en MVC

## Estructura del proyecto

- controllers/: maneja las peticiones y la lógica de control.
- models/: encapsula la interacción con la base de datos.
- views/: contiene las vistas principales de la interfaz.
- public/: archivos estáticos como CSS y JavaScript.
- config/: configuración de conexión y esquema de base de datos.

## Requisitos

- Servidor local como XAMPP, Laragon o similar.
- PHP 8 o superior.
- MySQL o MariaDB.

## Instalación y uso

1. Clona o copia este proyecto en la carpeta de tu servidor local.
2. Inicia Apache y MySQL.
3. Crea una base de datos llamada consultorio.
4. Importa el archivo de estructura disponible en config/schema.sql.
5. Ajusta las credenciales de conexión si es necesario en config/database.php.
6. Abre la aplicación en tu navegador desde la ruta correspondiente a la carpeta del proyecto.

## Estado actual del proyecto

El sistema ya incluye una base funcional para la gestión de turnos, pero sigue en proceso de mejora. Entre los próximos objetivos se encuentran:

- mejorar validaciones y manejo de errores
- reforzar la experiencia de usuario
- agregar más funcionalidades clínicas
- fortalecer la organización de datos y la escalabilidad

## Próximos pasos

- Gestión más completa de pacientes y profesionales.
- Mejor control de disponibilidad horaria y prevención de superposición.
- Cancelaciones, reprogramaciones y estados más detallados.
- Seguridad, autenticación y usuarios.

## Filosofía del proyecto

Este proyecto no busca ser una solución empresarial compleja desde el inicio. Prioriza aprender, construir paso a paso y mantener un código claro, comprensible y útil para una clínica pequeña.

## Licencia

Este proyecto se encuentra en desarrollo y puede adaptarse según las necesidades del autor.

Construir una aplicación funcional mientras se aprende programación de forma práctica y progresiva.

La calidad del proyecto no se medirá solamente por la cantidad de funcionalidades, sino también por cuánto se comprende de lo que se está construyendo.
