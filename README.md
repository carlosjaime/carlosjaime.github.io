# carlosjaime.github.io

Portafolio personal de **Carlos Jaime “Jimmy” López Martínez** — Senior Software Developer,
Software Architect y Product Builder.

Sitio estático, sin build step y sin dependencias de terceros en runtime.
Se publica tal cual desde GitHub Pages.

## Dirección de diseño

**Obsidiana & champán.** Lienzo casi monocromo cálido, una sola familia de acento metálico
y tipografía editorial: serif de display contra una sans humanista. La elegancia viene de la
contención — el acento condimenta, no inunda.

| Rol | Familia | Uso |
|-----|---------|-----|
| Display | **Instrument Serif** (regular + itálica) | Nombre, títulos de sección, roles del timeline |
| UI / texto | **Plus Jakarta Sans** (variable 400–700) | Cuerpo, botones, navegación |
| Mono | **JetBrains Mono** (variable 400–500) | Índices, etiquetas, metadatos, chips |

Todas **self-hosted** (`assets/fonts/`, subsets latin + latin-ext, woff2): sin request a
`fonts.gstatic.com`, sin DNS ni TLS de terceros en la ruta crítica. ~60 KB para el render inicial.

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
│   │   ├── tokens.css      # Design tokens: color, tipografía, espaciado, motion
│   │   ├── base.css        # Reset, defaults, primitivas tipográficas, a11y
│   │   ├── components.css  # Nav, botones, chips, cards, dialogs, formulario, footer
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

- **Cortina de entrada** de ~1.4 s, saltable con cualquier input deliberado.
- **Reveal por palabras**: los títulos se parten en `<span class="word">` enmascarados que
  suben escalonados. El split recorre el árbol, así que la itálica de acento sobrevive, y
  deja un `aria-label` limpio para lectores de pantalla.
- **Parallax** de scroll y puntero en las luces ambientales y el retrato, con easing ponderado.
- **Cursor propio** con anillo que crece sobre elementos interactivos (solo `pointer: fine`).
- **Botones magnéticos**, spotlight que sigue el cursor en cards, marquee que acelera con la
  velocidad de scroll y se pausa cuando sale de pantalla o la pestaña pierde el foco.
- Reveals de media por `clip-path`, contadores, typewriter de roles, barra de progreso.

Todo se desactiva con `prefers-reduced-motion: reduce`.

## Accesibilidad

Landmarks correctos, skip link, foco visible, `aria-current` en la navegación por scroll,
`<dialog>` nativo (el navegador gestiona foco y `Escape`), formulario con errores asociados
y `aria-live`. Las animaciones dependen de una clase `js` en `<html>`: **sin JavaScript nada
queda oculto**, y lo mismo al imprimir.

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
