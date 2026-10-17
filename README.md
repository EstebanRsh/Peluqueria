<div align="center">

# Sistema de Gestión de Turnos para Peluquería

**Una agenda pensada para el día a día real de una peluquería**

[![PHP](https://img.shields.io/badge/PHP_8.0+-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://php.net)
[![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://w3.org)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://w3.org)
[![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org)

[![Estado](https://img.shields.io/badge/Estado-Beta-10b981?style=flat-square)](#estado-del-proyecto)
[![Arquitectura](https://img.shields.io/badge/Arquitectura-MVC-black?style=flat-square)](#aspectos-técnicos)

</div>

<br>

## ¿Qué es esta aplicación?

Cualquiera que haya trabajado en una peluquería conoce esta escena: la agenda repartida entre mensajes de WhatsApp, un cuaderno y la memoria del profesional. Buscar quién tiene turno hoy a las 15 hs, confirmar si un cliente ya vino esta semana o recordar qué color se le aplicó la última vez termina consumiendo tiempo y generando errores.

Esta aplicación está pensada para resolverlo: ordena la agenda diaria, deja registrado qué se hizo en cada turno y le da al profesional un historial claro de cada cliente, sin depender de la memoria ni de anotaciones difíciles de encontrar.

---

## Cómo pensamos la app

Un profesional que atiende solo no tiene tiempo para cargar datos entre un cliente y otro. Por eso la aplicación se diseña para sentirse **ligera y rápida**: las acciones de todos los días se resuelven con un toque, no hay pasos de más ni confirmaciones que cansen, y cuando alguien se equivoca se corrige en lugar de volver a empezar. La idea es evitar errores y agotamiento, no sumar tareas.

---

## Qué podés hacer hoy con la app

### Calendario y turnos

- Vista mensual con seis semanas siempre visibles. Cada día muestra, en cuadraditos de color, cuántos turnos están **Finalizados** y cuántos **Reservados**.
- Un resumen del mes con el total de reservados, el de finalizados y los días con turnos reservados.
- Al tocar un día se abre su agenda completa, con buscador por cliente (el alias empieza con lo que escribís) y filtros por estado.
- Alta de turnos con cliente registrado o con un alias suelto, para cuando alguien llega sin estar cargado todavía. El servicio se busca por el comienzo de su nombre.
- Validación antes de guardar: cliente, servicio, fecha y horarios. El horario de inicio se sugiere a continuación del último turno del día, la hora de fin se calcula con la duración del servicio y se avisa si se superpone con otro turno del mismo profesional.
- Un turno nace **Reservado**. Con **Cambiar estado** se abre una ventanita para dejarlo **Finalizado**, **Ausente** o **Cancelado** (o volver a Reservado). Cada cambio queda registrado con fecha y hora y se puede deshacer.
- Eliminación de turnos, con confirmación.

### Clientes

- Alta y edición con alias, código interno, notas y alergias.
- Búsqueda por el comienzo del alias, resuelta en el servidor y de a 25 resultados.
- Activar, desactivar o eliminar un cliente. Solo se puede eliminar si no tiene turnos ni fichas asociadas, para no perder información.
- Perfil de cada cliente con sus alergias, su historial técnico (con búsqueda y filtros por color, tratamiento y corte) y sus turnos con ficha. Desde el perfil se puede editar al cliente o agendarle un turno.

### Servicios

- Alta, edición, activación, desactivación y eliminación, con protección para no borrar un servicio que ya tiene turnos o fichas.
- Cada servicio tiene nombre, descripción, duración y precio base.
- Búsqueda por el comienzo del nombre, resuelta en el servidor.

### Productos y stock

- Alta, edición, activación, desactivación y eliminación de productos, con marca, unidad de medida (ml, g o unidad), stock y costo por unidad.
- Un producto que ya se usó en alguna ficha no se puede eliminar: se desactiva.
- Búsqueda por el comienzo del nombre, resuelta en el servidor.

### Fichas de servicio

- Registro de lo que se hizo en cada atención, organizado por **color**, **tratamiento**, **corte** y **general y productos**.
- La ficha puede quedar asociada a un turno o cargarse suelta con un cliente y un servicio.
- Los productos usados descuentan el stock automáticamente. Si no alcanza, la ficha no se guarda, y una misma ficha no descuenta dos veces.
- **Copiar última ficha** del cliente para repetir una atención sin volver a cargar todo.

### Acceso y seguridad

- Inicio de sesión con cuenta propia. La sesión usa cookie `HttpOnly` y las acciones de escritura exigen un token CSRF.
- Cada cuenta ve únicamente sus propios datos; el servidor es quien lo define en cada consulta.

### Interfaz

- Pensada para celular, tablet y escritorio. En el celular, los listados pasan a tarjetas y al tocarlas se abre una ventanita con sus datos y acciones.
- Botón flotante de acciones rápidas para crear un turno, una ficha, un cliente, un producto o un servicio.
- Uso completo con teclado y compatible con lectores de pantalla.

---

### Visión a más largo plazo (futuro, aún en desarrollo)

- **Alertas de stock**, para productos por agotarse o próximos a vencer.
- **Separación entre productos de venta y productos de uso profesional interno**.
- **Panel de notificaciones**, para recordatorios y avisos configurables.
- **Panel de ajustes**, con configuraciones generales del sistema.
- **Promociones y descuentos**.
- **Roles y permisos** más allá de la cuenta propietaria.
- **Gestión de profesionales** como entidad propia (hoy el profesional se guarda como un texto libre dentro del turno).
- **Recuperación de respaldos** de la base de datos.

Ninguno de estos puntos debe presentarse en materiales de producto, capturas o documentación como si ya estuviera implementado.

---

## Estructura del proyecto

```text
/
├── controllers/    # Lógica de negocio y manejo de las peticiones
├── models/         # Acceso a datos y consultas a la base de datos
├── views/          # Esqueleto HTML de cada vista y de cada panel
├── public/         # Recursos estáticos (CSS y JS)
├── config/         # Configuración por entorno, esquema y datos de prueba
├── index.php       # Enrutador principal de la API
└── login.php       # Pantalla de acceso
```

## Aspectos técnicos

- **Backend:** PHP 8.0+, arquitectura MVC simple, conexión a base de datos con `mysqli`.
- **Base de datos:** MySQL/MariaDB.
- **Frontend:** JavaScript vanilla con módulos ES (sin frameworks), HTML5 y CSS3.
- **API:** HTTP basada en JSON, con acciones definidas por el parámetro `action`.
- **Configuración:** un perfil por entorno en `config/environments/`. El entorno activo se elige con la constante `HAIRAPP_ENVIRONMENT` de [`config/environment.php`](config/environment.php).

Las tablas que existen hoy en el esquema son: `users`, `services`, `clients`, `appointments`, `appointment_history`, `service_history`, `products` y `service_consumptions`.

## Guía de instalación local

Requisitos mínimos: **PHP 8.0+** y **MySQL/MariaDB**. Para desarrollo local podés usar el servidor integrado de PHP o Apache (por ejemplo, con XAMPP).

1. **Clonar el repositorio** y abrir una terminal en la carpeta del proyecto.
2. **Iniciar MySQL/MariaDB**.
3. **Preparar la base de datos:** importar [`config/schema.sql`](config/schema.sql). Crea la base `peluqueria` y todas las tablas, siempre que el usuario de MySQL tenga permisos suficientes.
4. **Crear el perfil de conexión:** copiar [`config/environments/xampp.example.php`](config/environments/xampp.example.php) como `config/environments/xampp.php` y ajustar los datos de `database` si tu MySQL no usa `root` sin contraseña. Ese archivo está ignorado por Git, así que tus credenciales no se publican. En el perfil local el registro de cuentas está habilitado solo para conexiones locales; las cuentas nuevas reciben rol `owner`.
5. **Datos de prueba (opcional):** [`config/seed.sql`](config/seed.sql) carga clientes, servicios, productos, turnos y fichas de ejemplo. **Borra todo el contenido de las tablas antes de cargarlos**, incluidos los usuarios: usalo solo en desarrollo.
6. **Iniciar el servidor:** con el servidor integrado, ejecutar `php -S localhost:8000` desde la carpeta del proyecto y visitar `http://localhost:8000/login.php`. Con Apache, visitar la ruta de la carpeta, por ejemplo `http://localhost/Agenda/Peluqueria/login.php`. El servidor integrado usa HTTP, no HTTPS, e ignora los archivos `.htaccess`.
7. **Entrar:** crear una cuenta de pruebas desde la misma página (si el registro local está habilitado) e iniciar sesión.
8. **Probar el estado de la sesión por API (opcional):** abrir `index.php?action=session`. Sin iniciar sesión, la respuesta esperada es `{"success":true,"authenticated":false}`. Usá la URL completa con `http://`; con HTTPS el servidor integrado responde `Unsupported SSL request`.

El botón **Salir** del menú lateral llama al endpoint de logout, que invalida la sesión en el servidor y expira la cookie `HttpOnly`.

### En un servidor alojado

Copiar [`config/environments/hosting.example.php`](config/environments/hosting.example.php) como `config/environments/hosting.php`, completar los datos de base de datos y los hosts permitidos que entrega el hosting, y cambiar `HAIRAPP_ENVIRONMENT` a `'hosting'`. En ese perfil el registro público de cuentas queda deshabilitado: no lo habilites en un servidor accesible por otras personas. La carpeta `config/environments/` niega el acceso web directo mediante `.htaccess`, y los archivos de perfil están ignorados por Git.

---

## Estado del proyecto

El proyecto se encuentra en etapa **beta**, previa a su lanzamiento. Es de uso privado para el negocio para el que fue desarrollado y, por el momento, no cuenta con una licencia de código abierto definida; cualquier uso, copia o distribución fuera de ese contexto debe consultarse previamente con quienes mantienen el proyecto.
