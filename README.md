# Fundación Cacata Puede

Portal institucional estático, preparado para Netlify.

## Publicación en Netlify

1. Crea un repositorio Git y súbelo a GitHub.
2. En Netlify, selecciona **Add new site → Import an existing project**.
3. Conecta el repositorio. Netlify detectará `netlify.toml`: no requiere comando de compilación y el directorio publicado es la raíz (`.`).
4. Tras recibir el dominio definitivo, sustituye `REEMPLAZAR-CON-TU-DOMINIO` en `index.html` (canonical, Open Graph y datos estructurados), `sitemap.xml` y `robots.txt`.

## Imágenes

- `assets/` contiene las imágenes optimizadas que usa la web, organizadas por tema (`marca`, `equipo`, `educacion`, `comunidad`, `deporte`, `aliados`).
- `assets/galeria/` contiene miniaturas de 440 px para la galería; la foto completa se indica con `data-full` en cada `<figure>`.
- `originales/` guarda las versiones de alta calidad sin comprimir. Netlify no las sirve al público.
- Al cambiar `styles.css` o `script.js`, sube el número `?v=N` en `index.html`: el navegador los guarda en caché un año.

## Antes de abrir becas

Este sitio no procesa solicitudes de becas ni adjuntos: es deliberado para no publicar información sensible en una implementación estática. Antes de activar ese módulo se requiere un backend autenticado, almacenamiento privado, reglas de acceso por rol, URLs temporales de descarga, política de privacidad y la información validada por la fundación.

El formulario de contacto usa Netlify Forms. Actívalo desde el panel de Netlify después del primer despliegue y configura las notificaciones del equipo responsable.
