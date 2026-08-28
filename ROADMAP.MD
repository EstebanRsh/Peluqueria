# Rediseño UX/UI Móvil del Panel de Turnos

## Objetivo

El objetivo de esta mejora es optimizar la experiencia de usuario (UX) y la interfaz (UI) de la lista diaria de turnos en dispositivos móviles. Se busca eliminar la saturación visual de la vista tipo tabla actual y reemplazarla por un flujo dinámico basado en tarjetas de lectura rápida y un panel de control interactivo inferior (_Bottom Sheet / Modal_) perfectamente adaptado al uso táctil.

---

## Problema que resuelve

En un entorno de alta velocidad operativa como la recepción de un centro médico, la claridad de la información y la prevención de errores son críticas. El diseño actual hereda una estructura rígida de escritorio comprimida en pantallas móviles, lo que genera los siguientes problemas:

- **Información truncada:** El espacio horizontal reducido corta los nombres de los pacientes (ej. "Da..." o "Pe..."), obligando a la recepción o al médico a adivinar la identidad de la persona.
- **Falta de precisión táctil:** Los menús desplegables (_dropdowns_) y botones pequeños para cambiar estados clínicos exigen demasiada precisión física, aumentando la fricción y los clics accidentales.
- **Saturación visual:** Intentar meter múltiples columnas horizontales en una pantalla vertical estrecha rompe la estética limpia, minimalista y profesional de la aplicación.

---

## Concepto principal

La solución consiste en desacoplar la visualización pasiva de la información de la ejecución de acciones complejas, dividiendo la interfaz móvil en dos capas independientes:

1. **Tarjetas de lectura rápida (Lista principal):** Los turnos dejan de mostrarse como filas apretadas de una tabla y pasan a ser tarjetas verticales limpias que aprovechan el ancho disponible. Muestran solo lo vital: hora en grande, nombre completo sin cortes, profesional asignado y un indicador visual fijo (Badge) del estado actual del turno.
2. **Bottom Sheet Interactiva (Centro de control):** En lugar de botones individuales diminutos, toda la tarjeta se vuelve interactiva. Al tocarla, se desliza un panel limpio desde la parte inferior de la pantalla (Modal adaptado a móviles) que centraliza todas las operaciones del turno mediante botones amplios y cómodos.

---

## Anatomía de la interacción

Cada elemento del rediseño está pensado estratégicamente para el uso con una sola mano:

### Tarjeta en Lista Diaria

- **Línea Superior:** Hora de inicio y Nombre Completo del Paciente (garantizando espacio para que no se mutile el texto).
- **Línea Inferior:** Nombre del profesional de salud y Badge de color con el estado actual (estático, actúa meramente como indicador visual en esta vista).

### Panel Inferior Táctil (Modal)

- **Cabecera de Identidad:** Nombre completo del paciente destacado, Obra Social/Prepaga y accesos directos nativos para llamarlo por teléfono o abrir un chat de WhatsApp con un solo toque.
- **Selector de Flujo Clinitivo:** Botones táctiles de gran tamaño ("Fat Finger Rule") para avanzar el estado del paciente con total comodidad (ej. "Marcar en Espera", "Hacer Ingresar").
- **Bloque de Contexto:** Notas u observaciones del turno y visualización de la línea de tiempo del recorrido del paciente.

---

## Beneficios para recepción

- Permite identificar de un solo vistazo a los pacientes en la sala de espera sin margen de confusión por nombres cortados.
- Agiliza el cambio de estados en las horas pico mediante botones grandes al alcance del pulgar.
- Integra herramientas de comunicación directa (WhatsApp/Llamadas) para gestionar ausencias o confirmaciones de forma inmediata sin salir del sistema.

---

## Beneficios para el médico

- Proporciona una lista de pacientes en espera sumamente clara y ordenada visualmente desde su propio smartphone.
- Facilita el ingreso del paciente a la consulta cambiando el estado mediante un modal fluido y libre de distracciones visuales o controles colapsados.

---

## Beneficios para el sistema

- Reemplaza un patrón de diseño obsoleto (tablas forzadas en celulares) por un estándar moderno de diseño _Mobile-First_.
- Consolida y eleva la identidad visual de **Prevel** basada en un minimalismo puro de alta gama (alto contraste, blancos, negros y acentos precisos).
- Mejora drásticamente la experiencia de uso en dispositivos móviles, aumentando el valor comercial del SaaS.

---

## Complejidad de implementación

Complejidad: baja a media.

Requiere:

1. Reestructurar el marcado HTML/PHP que renderiza los turnos del día cuando se visualiza en resoluciones móviles.
2. Reemplazar los eventos interactivos de los elementos individuales de la fila por un único _listener_ de clic en toda la tarjeta del turno.
3. Incorporar los estilos CSS correspondientes para la transición y opacidad del Bottom Sheet (animación de entrada desde abajo y desenfoque del fondo).
4. Vincular las funciones de JavaScript existentes (`openPanelForDate` o las llamadas de actualización a la API) con los nuevos controles ampliados dentro del modal.
