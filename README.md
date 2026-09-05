<div align="center">

# SISTEMA DE GESTIÓN DE TURNOS

**Plataforma Integral de Administración Operativa para Peluquerías**

[![PHP](https://img.shields.io/badge/PHP_8.0+-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://php.net)
[![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://w3.org)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://w3.org)
[![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org)

<br>

[![Estado](https://img.shields.io/badge/Estado-Desarrollo_Activo-10b981?style=flat-square)](#)
[![Arquitectura](https://img.shields.io/badge/Arquitectura-MVC-black?style=flat-square)](#)
[![API](https://img.shields.io/badge/API-HTTP_JSON-0ea5e9?style=flat-square)](#)

</div>

<br>

## 📌 Descripción del Proyecto

Sistema web para la gestión de turnos de una peluquería. Permite organizar la agenda, administrar servicios y precios, asignar profesionales, gestionar estados de los turnos y consultar el historial de cambios de cada reserva.

---

## ⚙️ Características Principales

<table>
  <tr>
    <td width="50%">
      <h3>📅 Gestión de Calendario</h3>
      Visualización mensual con un resumen de ocupación, turnos disponibles y reservas consolidadas.
    </td>
    <td width="50%">
      <h3>📊 Panel Operativo</h3>
      Visualización de los turnos correspondientes a una fecha seleccionada, con búsqueda, filtros por estado y acceso a las acciones disponibles.
    </td>
  </tr>
  <tr>
    <td>
      <h3>📝 Administración de Turnos</h3>
      Registro completo: información del cliente, contacto, servicio, profesional asignado y montos.
    </td>
    <td>
      <h3>🔄 Trazabilidad de Estados</h3>
      Seguimiento del ciclo de vida del turno (reservado, en sala de espera, en atención, finalizado, cancelado y ausente) y registro histórico de sus cambios de estado.
    </td>
  </tr>
  <tr>
    <td>
      <h3>💇 Gestión de Servicios y Precios</h3>
      Creación, edición, activación, desactivación y eliminación de servicios, con configuración de duración y precio base.
    </td>
    <td>
      <h3>🔎 Búsqueda y Filtros</h3>
      Consulta de servicios por nombre y filtrado por estado activo o inactivo desde el panel administrativo.
    </td>
  </tr>
</table>

---

## 📂 Estructura del Proyecto

<details>
  <summary><b>Haz clic para expandir la estructura del directorio</b></summary>
  <br>

```text
/
├── controllers/    # Controladores que manejan la lógica de negocio y peticiones.
├── models/         # Clases de acceso a datos y consultas a la base de datos.
├── views/          # Interfaces de usuario y plantillas de presentación.
├── public/         # Recursos estáticos (hojas de estilo CSS, scripts JS, imágenes).
└── config/         # Archivos de configuración general y conexión a la base de datos.
```

</details>

---

## 🚀 Guía de Instalación Local

Para ejecutar el sistema en un entorno local, asegúrese de cumplir con los siguientes requisitos mínimos: **PHP 8.0+** y **MySQL/MariaDB**.

1. **Clonar el repositorio** en el directorio raíz del servidor web (ej. `htdocs` en XAMPP o `www` en Laragon).
2. **Iniciar los servicios** del servidor web (Apache/Nginx) y del motor de base de datos.
3. **Preparar la base de datos**:

- Importar el script SQL de inicialización ubicado en `config/schema.sql`. El script crea la base de datos `peluqueria` y genera la estructura de tablas, siempre que el usuario de MySQL tenga permisos suficientes.

4. **Configurar el entorno**:
   - Editar el archivo `config/database.php` con las credenciales de conexión correctas (usuario, contraseña y host).
5. **Ejecución**:
   - Acceder a la aplicación a través del navegador web utilizando la ruta correspondiente (ej. `http://localhost/nombre-del-proyecto`).

---

## 🗺️ Roadmap y Próximas Implementaciones

### Fases Completadas

- [x] Gestión básica de turnos y calendario mensual.
- [x] Validaciones básicas de datos en backend.
- [x] Panel administrativo de servicios y precios.

### Módulos Operativos (Próximos Pasos)

- [ ] **Historial de servicios, fórmulas utilizadas y preferencias del cliente:** Registro avanzado de visitas anteriores, guardado de fórmulas exactas de tinturas, documentación de alergias a químicos y preferencias de corte.
- [ ] **Control de Stock Dual (Productos):** Diferenciación a nivel inventario entre artículos destinados a la venta al público (shampoos, tratamientos) y productos de uso profesional interno (oxidantes, pomos).
- [ ] **Alertas de Stock:** Sistema de notificaciones automáticas para alertar cuando los insumos críticos o de alto uso alcancen su nivel mínimo.
- [ ] **Sistema de Promociones y Descuentos:** Gestión de promociones por servicio, beneficios para clientes frecuentes, cupones y descuentos aplicables a turnos.
- [ ] **Vencimiento de Productos:** Control automático de fechas de expiración de productos, alertas de próximo vencimiento y generación de reportes.

### Gestión de Agenda

- [ ] Detección de solapamientos de turnos.
- [ ] Validación de disponibilidad del profesional.
- [ ] Configuración de horarios de atención.
- [ ] Bloqueo de días/horarios no laborables.

### Reportes y Análisis

- [ ] **Servicios Más Vendidos:** Estadísticas sobre los servicios con mayor demanda, frecuencia de reservas y tendencias mensuales.

### Seguridad

- [ ] Autenticación de usuarios.
- [ ] Roles y permisos.
- [ ] Protección de endpoints.
- [ ] Manejo avanzado de excepciones y logging.

### Infraestructura

- [ ] **Respaldo automático de base de datos:** Generación programada de copias de seguridad y almacenamiento de varias versiones.
- [ ] **Recuperación de respaldos:** Restauración controlada de la base de datos a partir de una copia seleccionada.
- [ ] Configuración para despliegue productivo.

---

<div align="center">
  <p><i>Proyecto desarrollado con fines educativos y de portfolio.</i></p>
</div>
