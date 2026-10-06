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

Las tablas que existen hoy en el esquema son: `services`, `clients`, `appointments`, `appointment_history`, `service_history`, `products`, `service_consumptions` y `users`.

## Guía de instalación local

Requisitos mínimos: **PHP 8.0+** y **MySQL/MariaDB**. Para desarrollo local podés usar el servidor integrado de PHP; Apache o Nginx también sirven.

1. **Clonar el repositorio** y abrir una terminal en la carpeta del proyecto.
2. **Iniciar MySQL/MariaDB**.
3. **Preparar la base de datos:** importar el script de [`config/schema.sql`](config/schema.sql). Crea la base `peluqueria1` y toda la estructura de tablas, siempre que el usuario de MySQL tenga permisos suficientes.
4. **Configurar la conexión:** para desarrollo local podés usar tu usuario local `root`; en el servidor alojado, usá el usuario de base de datos provisto para la aplicación, limitado a su base. En la misma terminal donde vayas a iniciar PHP, configurá las variables de conexión:

   ```sh
   export DB_HOST=127.0.0.1
   export DB_PORT=3306
   export DB_NAME=peluqueria1
   export DB_USER=root
   read -rsp 'Contraseña de MySQL: ' DB_PASS; echo
   export DB_PASS
   ```

   La contraseña se solicita sin mostrarla y no se guarda en el repositorio. En `localhost`, el registro está habilitado automáticamente solo para conexiones locales; las cuentas nuevas reciben rol `owner` y acceso completo. Fuera de localhost permanece deshabilitado, a menos que configures `AUTH_ALLOW_PUBLIC_REGISTRATION=1`; no actives esa variable en un servidor accesible por otras personas.
5. **Iniciar el servidor local:** ejecutar `php -S localhost:8000` desde la carpeta del proyecto y esa misma terminal. El servidor integrado de PHP usa HTTP, no HTTPS.
6. **Abrir el acceso web:** visitar `http://localhost:8000/login.php`. El login crea una sesión con cookie `HttpOnly`; si el registro local está habilitado, podés crear una cuenta de pruebas desde esa misma página.
7. **Probar el estado de autenticación por API:** abrir `http://localhost:8000/index.php?action=session`. Sin iniciar sesión, la respuesta esperada es `{"success":true,"authenticated":false}`. Usá la URL completa con `http://` y el puerto `:8000`; HTTPS provoca `Unsupported SSL request`.

El botón **Salir** del sidebar llama al endpoint de logout, que invalida la sesión en el servidor y expira la cookie `HttpOnly`; también se limpia el almacenamiento local y de sesión accesible al JavaScript. JavaScript no puede borrar cookies `HttpOnly` directamente.

Si antes configuraste credenciales directamente en [`config/database.php`](config/database.php), rotá esa contraseña: quitarla del archivo actual no la elimina del historial de Git.

---

## Estado del proyecto

Este proyecto es de uso privado para el negocio para el que fue desarrollado. Por el momento no cuenta con una licencia de código abierto definida; cualquier uso, copia o distribución fuera de ese contexto debe consultarse previamente con quienes mantienen el proyecto.
