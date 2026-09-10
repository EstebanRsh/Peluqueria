<div align="center">

# Sistema de Gestión de Turnos para Peluquería

**Una agenda pensada para el día a día real de una peluquería**

[![PHP](https://img.shields.io/badge/PHP_8.0+-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://php.net)
[![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://w3.org)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://w3.org)
[![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org)

[![Estado](https://img.shields.io/badge/Estado-En_desarrollo-10b981?style=flat-square)](#estado-del-proyecto)
[![Arquitectura](https://img.shields.io/badge/Arquitectura-MVC-black?style=flat-square)](#aspectos-técnicos)

</div>

<br>

## ¿Qué es esta aplicación?

Cualquiera que haya trabajado en una peluquería o gestionado sus turnos conoce esta escena: la agenda repartida entre mensajes de WhatsApp, un cuaderno y la memoria del profesional. Buscar quién tiene turno hoy a las 15hs, confirmar si tal cliente ya vino esta semana, o recordar qué color se le aplicó la última vez. Termina consumiendo tiempo y generando errores.

Esta aplicación esta siendo desarrollada para solucionar esto: ordenar la agenda diaria, dejar registrado qué se hizo en cada turno, y con el tiempo, darle a cada profesional una historial claro de cada cliente sin tener que confiar en la memoria o anotaciones dificiles de allar.

---

## Qué podés hacer hoy con la app

### 📅 Calendario y turnos

- Vista mensual del calendario, con los turnos agrupados por día y por estado.
- Un panel al seleccionar un dia del calendario muestra la agenda completa del día seleccionado.
- Buscador y filtros por estado dentro de ese panel, para encontrar un turno rápido sin scrollear toda la lista.
- Alta de un turno, con o sin cliente asociado (para cuando alguien llega sin estar registrado todavía).
- El turno se valida antes de guardarse: cliente, servicio, fecha y horarios de inicio y fin.
- Búsqueda de turnos por nombre o alias del cliente, código interno.
- El estado de un turno se puede mover entre: **Reservado → En sala de espera → En atención → Finalizado**, o marcarlo como **Cancelado** o **Ausente**.
- Cada cambio de estado queda registrado con fecha y hora, formando una pequeña línea de tiempo del turno.
- Eliminación de turnos.

### 👤 Clientes

- Alta y edición de clientes, con alias, código interno y notas.
- Búsqueda por alias o código.
- Activar, desactivar o eliminar un cliente (solo si no tiene turnos asociados, para no perder información).
- Listado de clientes activos e inactivos.

> **Nota:** hoy el panel de clientes todavía no muestra el historial de atención de cada persona. Eso es el próximo paso — lo explicamos más abajo en _"Hacia dónde va el proyecto"_.

### 💈 Servicios

- Alta, edición, activación, desactivación y eliminación de servicios, con protección para no borrar un servicio que ya tiene turnos asociados.
- Cada servicio tiene nombre, descripción, duración y precio base.
- Listado de servicios activos (para elegir al crear un turno) y listado completo activos/inactivos (para administración).

### 🕒 Lo que la app ya guarda para el futuro

Aunque todavía no hay una pantalla que lo muestre de forma consolidada, la aplicación ya está guardando la información necesaria para reconstruir el historial de cada cliente:

- **Historial de estados del turno**: cada cambio de estado (de "Reservado" a "En atención", por ejemplo) queda registrado con fecha.
- **Snapshot del servicio realizado**: al crear un turno, se guarda un registro en el historial del servicio y en qué fecha realizado.

Esta base es la que permitirá construir el historial de cliente sin tener que rediseñar todo desde cero.

---

### 🔭 Visión a más largo plazo (futuro, aún en desarrollo)

- **Control de productos y stock**, con alertas para productos por agotarse o próximos a vencer.
- **Separación entre productos de venta y productos de uso profesional interno**.
- **Panel de notificaciones**, para recordatorios y avisos configurables.
- **Panel de ajustes**, con configuraciones generales del sistema.
- **Promociones y descuentos**.
- **Autenticación de usuarios, roles y permisos**, y protección de los endpoints de la API.
- **Gestión de profesionales** como entidad propia (hoy el profesional se guarda como un texto libre dentro del turno, no como un registro independiente).
- **Recuperación de respaldos** de la base de datos.

Ninguno de estos puntos debe presentarse en materiales de producto, capturas o documentación como si ya estuviera implementado.

---

## Estructura del proyecto

```text
/
├── controllers/    # Lógica de negocio y manejo de las peticiones
├── models/         # Acceso a datos y consultas a la base de datos
├── views/          # Interfaces de usuario y plantillas de presentación
├── public/         # Recursos estáticos (CSS, JS, imágenes)
├── config/         # Configuración general y esquema de base de datos
└── index.php       # Enrutador principal de la aplicación
```

## Aspectos técnicos

- **Backend:** PHP 8.0+, arquitectura MVC simple, conexión a base de datos con `mysqli`.
- **Base de datos:** MySQL/MariaDB.
- **Frontend:** JavaScript vanilla (sin frameworks), HTML5 y CSS3.
- **API:** HTTP basada en JSON, con acciones definidas por parámetro `action`.

Las tablas que existen hoy en el esquema son: `services`, `clients`, `appointments`, `service_history` y `appointment_history`.

## Guía de instalación local

Requisitos mínimos: **PHP 8.0+** y **MySQL/MariaDB**, junto con un servidor web (Apache o Nginx).

1. **Clonar el repositorio** en la raíz del servidor web (por ejemplo, `htdocs` en XAMPP o `www` en Laragon).
2. **Iniciar los servicios** del servidor web y del motor de base de datos.
3. **Preparar la base de datos:** importar el script de [`config/schema.sql`](config/schema.sql). Crea la base `peluqueria` y toda la estructura de tablas, siempre que el usuario de MySQL tenga permisos suficientes.
4. **Configurar el entorno:** editar [`config/database.php`](config/database.php) con las credenciales de conexión correctas (usuario, contraseña y host).
5. **Ejecutar la aplicación:** acceder desde el navegador a la ruta correspondiente (por ejemplo, `http://localhost/nombre-del-proyecto`).

---

## Estado del proyecto

Este proyecto es de uso privado para el negocio para el que fue desarrollado. Por el momento no cuenta con una licencia de código abierto definida; cualquier uso, copia o distribución fuera de ese contexto debe consultarse previamente con quienes mantienen el proyecto.
