# carlosjaime.github.io

Portafolio personal de **Carlos Jaime “Jimmy” López Martínez** — Senior Software Developer,
Software Architect, CEO & Product Builder.

Sitio estático, sin build step y sin dependencias de terceros en runtime.
Se publica tal cual desde GitHub Pages.

## Dirección de diseño

**Consola de ingeniería.** Lienzo grafito frío, un verde de señal usado como lo usa una
terminal (prompt, estado, éxito), un índigo para las superficies de IA, y una paleta de
sintaxis compartida por los paneles de código y la UI, de modo que toda la página se lee
como una sola herramienta.

Los recursos del tema no son decorativos: el hero es una terminal que ejecuta
`whoami --full`, el "sobre mí" es un editor con pestañas y números de línea, la trayectoria
es un `git log --graph` con hashes y `HEAD`, los proyectos son tarjetas de repositorio con
punto de lenguaje, y hay una **paleta de comandos ⌘K** que indexa secciones, proyectos y
enlaces.

| Rol | Familia | Uso |
|-----|---------|-----|
| Display | **Space Grotesk** (variable 500–700) | Nombre, títulos de sección, roles |
| UI / texto | **IBM Plex Sans** (variable 400–600) | Cuerpo y leads |
| Mono | **IBM Plex Mono** (400 / 500 / 600) | Terminal, código, nav, etiquetas, chips, status bar |

Todas **self-hosted** (`assets/fonts/`, subsets latin + latin-ext, woff2): sin request a
`fonts.gstatic.com`, sin DNS ni TLS de terceros en la ruta crítica.

## Stack

| Capa | Decisión |
|------|----------|
| Markup | HTML5 semántico, una página con secciones ancladas y numeradas |
| Estilos | CSS moderno con design tokens, `clamp()` fluido, `color-mix()`, `:has()` |
| Scripts | JavaScript nativo, sin framework ni librerías (0 KB de vendor) |
| Iconos | Sprite SVG inline (`<symbol>` + `<use>`) — sin icon font |
| Imágenes | WebP optimizado, `loading="lazy"`, dimensiones explícitas para evitar CLS |

## Estructura

```
.
├── index.html              # Página principal
├── 404.html                # Página de error
├── assets/
│   ├── css/
│   │   ├── fonts.css       # @font-face de las fuentes self-hosted
│   │   ├── tokens.css      # Tokens: grafito, señales, sintaxis, tipografía, motion
│   │   ├── base.css        # Reset, defaults, primitivas tipográficas, a11y
│   │   ├── components.css  # Chrome de ventana, nav, paleta ⌘K, código, form, status bar
│   │   └── sections.css    # Layout por sección + utilidades de animación
│   ├── fonts/              # woff2, subsets latin y latin-ext
│   ├── js/
│   │   └── main.js         # Capa de mejora progresiva (módulos independientes)
│   └── img/                # WebP optimizados, favicon SVG, portada Open Graph
├── site.webmanifest
├── robots.txt
├── sitemap.xml
└── .nojekyll               # GitHub Pages sirve los archivos sin procesar con Jekyll
```

## Motion

Un solo `requestAnimationFrame` compartido coordina todo lo que anima por frame. El
scheduler distingue tareas *once* (handlers de scroll que solo sincronizan estado) de
tareas *always* (loops con easing), y se apaga solo cuando no queda trabajo.

- **Secuencia de arranque**: overlay de boot, el hero teclea `whoami --full` y el output
  aparece línea por línea.
- **Paleta de comandos ⌘K / Ctrl+K** con filtrado por subsecuencia, navegación con flechas
  y `aria-activedescendant`. Se construye leyendo el DOM, así que no hay una segunda fuente
  de verdad que se desincronice.
- **Parallax** de scroll y puntero en las luces ambientales y la retícula de puntos.
- **Cursor propio** que se expande sobre elementos interactivos (solo `pointer: fine`).
- Botones magnéticos, spotlight en cards, marquee que acelera con la velocidad de scroll y
  se pausa fuera de pantalla, reveals por `clip-path`, contadores, typewriter de roles,
  scanline y barra de progreso.

Todo se desactiva con `prefers-reduced-motion: reduce`.

## Accesibilidad

Landmarks correctos, skip link, foco visible, `aria-current` en la navegación por scroll,
pestañas con patrón ARIA completo (flechas + `tabindex` móvil), `<dialog>` nativo para
proyectos y paleta (el navegador gestiona foco y `Escape`), formulario con errores
asociados y `aria-live`.

Las animaciones dependen de una clase `js` en `<html>`: **sin JavaScript nada queda
oculto** — ni el overlay de boot (que no llega a mostrarse) ni el output de la terminal,
que permanece en el documento para lectores y buscadores. Lo mismo al imprimir.

## Desarrollo local

No hace falta instalar nada:

```bash
python3 -m http.server 8080
# http://localhost:8080
```

## Formulario de contacto

GitHub Pages es hosting estático, por lo que no hay backend al que hacer POST. El formulario
valida en cliente y abre el cliente de correo del visitante con el mensaje ya redactado.
Para recibir los mensajes por HTTP basta con apuntar el `action` del `<form>` a un servicio
tipo Formspree/Basin y sustituir el handler de `initContactForm` en `assets/js/main.js`.
