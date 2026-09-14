# carlosjaime.github.io

Portafolio personal de **Carlos Jaime “Jimmy” López Martínez** — Senior Software Developer,
Software Architect y Product Builder.

Sitio estático, sin build step y sin dependencias de terceros en runtime.
Se publica tal cual desde GitHub Pages.

## Stack

| Capa | Decisión |
|------|----------|
| Markup | HTML5 semántico, una sola página con secciones ancladas |
| Estilos | CSS moderno con design tokens (`@property`-free custom properties), `clamp()` fluido, `color-mix()`, container-agnostic grid |
| Scripts | JavaScript nativo, sin framework ni librerías (0 KB de vendor) |
| Iconos | Sprite SVG inline (`<symbol>` + `<use>`) — sin icon font |
| Imágenes | WebP optimizado, `loading="lazy"`, dimensiones explícitas para evitar CLS |
| Tipografía | Space Grotesk · Inter · JetBrains Mono vía Google Fonts con `display=swap` |

## Estructura

```
.
├── index.html              # Página principal
├── 404.html                # Página de error
├── assets/
│   ├── css/
│   │   ├── tokens.css      # Design tokens: color, tipografía, espaciado, motion
│   │   ├── base.css        # Reset, defaults, utilidades de accesibilidad
│   │   ├── components.css  # Nav, botones, cards, dialogs, formulario, footer
│   │   └── sections.css    # Layout por sección + utilidades de animación
│   ├── js/
│   │   └── main.js         # Capa de mejora progresiva (módulos independientes)
│   └── img/                # WebP optimizados, favicon SVG, portada Open Graph
├── site.webmanifest
├── robots.txt
├── sitemap.xml
└── .nojekyll               # GitHub Pages sirve los archivos sin procesar con Jekyll
```

## Principios de diseño

- **Mobile-first.** Todo el layout parte de una columna y crece con `grid-template-columns`
  y `minmax()`; ningún elemento fuerza scroll horizontal.
- **Design tokens.** Ningún componente declara un color o un espacio literal: todos
  resuelven contra `tokens.css`, así que el tema completo se cambia en un solo archivo.
- **Motion con intención.** Parallax por scroll y puntero, reveals escalonados,
  typewriter, contadores y spotlight en cards — todo detrás de un único `requestAnimationFrame`
  compartido y desactivado por completo con `prefers-reduced-motion: reduce`.
- **Accesibilidad.** Landmarks correctos, skip link, foco visible, `aria-current` en la
  navegación, `<dialog>` nativo con gestión de foco del navegador, formulario con
  errores asociados y `aria-live`.
- **Rendimiento.** Sin JS de terceros, imágenes WebP, `fetchpriority` en el LCP,
  `preconnect` a los orígenes de fuentes y animaciones limitadas a `transform`/`opacity`.

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
