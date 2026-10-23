# 🚚 BizLink · Sistema de Despacho Diario & Gestión Operativa

Recreación moderna del sistema de despacho diario de vehículos, cuadrillas, rutas, clientes (CRM), contratistas, proveedores y planeación visual, con interfaz inspirada en **BizLink**.

---

## ✨ Características y Mejoras Frontend

1. **Diseño Moderno Inspirado en BizLink**:
   - Paleta de colores cálida y profesional (`#f5f4ef`), tarjetas redondeadas con bordes sutiles y tipografía **Plus Jakarta Sans**.
   - Barra lateral con accesos rápidos, contador dinámico de fichas activas y lista de miembros de la cuadrilla con estado de disponibilidad en tiempo real.
   - Resumen superior con gráfica de barras de despachos diarios, medidor radial de efectividad (gauge chart), contador de operaciones activas y balance por cobrar.

2. **Vista de Despacho Dual (Kanban & Tarjetas)**:
   - **Modo Kanban**: Columnas organizadas por estado de flujo de trabajo (*Borrador*, *Por iniciar*, *En ruta*, *En sitio*, *Completada*).
   - **Modo Tarjetas (Grid)**: Vista compacta en cuadrícula para pantallas grandes.
   - Ciclo interactivo de paradas: con un solo toque cambia entre *Pendiente*, *En proceso* y *Completado*.
   - Módulos dinámicos: Control de herramientas con verificación QR, odómetro inicial/final y fotos de evidencia.

3. **Hoja de Ruta & Envío por WhatsApp**:
   - Generación automática del mensaje formal de ruta para cada chofer/cuadrilla.
   - Enlace directo a `wa.me` para enviar en un clic o copiar al portapapeles.

4. **Clientes (CRM & Garantías)**:
   - Vista maestro-detalle para inspeccionar saldos por cobrar, vencimientos, términos de crédito y equipos con alertas de vencimiento de garantía.
   - Plantillas de mensajes rápidos para confirmar visitas, avisar llegada o recordar pagos.

5. **Asistente (Wizard) de 3 Pasos**:
   - Creación intuitiva de nuevas fichas: Selección de vehículo → Asignación de personal → Primer destino.

---

## 🚀 Cómo Ejecutar la Aplicación

No requiere instalación de Node.js ni compilación previa. Puedes abrirla directamente:

1. Ve a la carpeta del proyecto:
   ```
   C:\Users\Andre\.gemini\antigravity\scratch\despacho-bizlink
   ```
2. Haz doble clic en `index.html` para abrirlo en cualquier navegador (Google Chrome, Edge, Safari, Firefox).

---

## 🐙 Cómo Subirlo a tu GitHub

Para subir este proyecto a tu repositorio de GitHub, abre una terminal (PowerShell o Git Bash) en esta carpeta y ejecuta:

```powershell
# 1. Posicionarte en la carpeta del proyecto
cd C:\Users\Andre\.gemini\antigravity\scratch\despacho-bizlink

# 2. Inicializar el repositorio Git
git init

# 3. Agregar los archivos y hacer el primer commit
git add .
git commit -m "feat: recreación y rediseño completo del frontend estilo BizLink"

# 4. Vincular con tu repositorio de GitHub
# (Reemplaza con la URL de tu repositorio)
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# 5. Renombrar la rama principal a main y subir los cambios
git branch -M main
git push -u origin main
```

> **Tip:** También puedes activar **GitHub Pages** en la configuración de tu repositorio (`Settings` > `Pages` > `Deploy from a branch: main`) para que la aplicación quede disponible en línea de forma gratuita.
