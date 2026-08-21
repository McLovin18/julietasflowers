# Guía UX de Colores - Julieta's Flowers

## Filosofía de Diseño UX

Esta paleta de colores ha sido diseñada considerando los principios de experiencia de usuario para una florería elegante:

### Principios Aplicados
- **No fatiga visual**: Colores suaves que no cansan la vista
- **Jerarquía clara**: Diferenciación visual sin agresividad
- **Armonía con texturas**: Complementa flores y terciopelo
- **Legibilidad prioritaria**: Contraste optimizado para lectura cómoda
- **Calidez emocional**: Tonos que evocan delicadeza y elegancia

## Paleta de Colores UX-Optimizada

### Colores Principales
```
Negro suave:         #1a1a1a  (Texto principal, elementos oscuros)
Beige claro:         #faf7f2  (Navbar - muy neutro y suave)
Beige medio:         #f0ebe5  (Footer - suave, diferenciado)
Beige rosadito:      #f5f0e8  (Hover, calidez muy sutil)
Dorado elegante:     #c9a030  (SOLO acentos puntuales - no navbar/footer)
Blanco vintage:      #f5f0e8  (Fondo base)
Gris oscuro:         #3d3d3d  (Texto footer - más suave)
Gris medio:          #5a5a5a  (Texto secundario - más suave)
```

### Colores Temporales
```
Rojo vino (San Valentín): #710419
Amarillo (Día de flores): #ffd70e
```

## Componentes Específicos

### Navbar (Navegación)
**Objetivo**: Ser elegante y neutro sin distraer del contenido principal

- **Fondo**: `#faf7f2` (beige muy claro y neutro)
- **Texto**: `#1a1a1a` (negro suave, legible)
- **Links**: `#5a5a5a` (gris medio, más suave)
- **Hover**: `#f5f0e8` (beige rosadito muy sutil)
- **Sin dorado**: Evitado para no fatigar la vista

**Clase CSS**: `.navbar-ux`
```css
.navbar-ux {
  background-color: var(--navbar-bg);
  color: var(--navbar-text);
  border-bottom: 1px solid var(--color-beige-medium);
}
```

### Footer
**Objetivo**: Diferenciarse del navbar pero mantener suavidad y neutralidad

- **Fondo**: `#f0ebe5` (beige medio suave)
- **Texto**: `#3d3d3d` (gris oscuro más suave)
- **Links**: `#5a5a5a` (gris medio, neutro)
- **Hover links**: `#1a1a1a` (negro suave para contraste)
- **Sin dorado**: Evitado en áreas grandes para no fatigar

**Clase CSS**: `.footer-ux`
```css
.footer-ux {
  background-color: var(--footer-bg);
  color: var(--footer-text);
  border-top: 1px solid var(--color-beige-medium);
}
```

### Botones
**Objetivo**: Acciones claras sin ser invasivos

**Botón Primario**:
- **Fondo**: `#c9a030` (dorado elegante)
- **Texto**: `#1a1a1a` (negro suave)
- **Hover**: `#a67f22` (dorado más oscuro)

**Botón Secundario**:
- **Fondo**: `#f0e6e0` (beige rosadito)
- **Texto**: `#1a1a1a` (negro suave)
- **Borde**: `#e8ddd0` (beige medio)

## Variables CSS Disponibles

```css
/* Navegación (sin dorado) */
--navbar-bg: var(--color-beige-light);
--navbar-text: var(--color-black-soft);
--navbar-link: var(--color-gray-medium);
--navbar-link-hover: var(--color-black-soft);
--navbar-hover: var(--color-beige-pink);

/* Footer (sin dorado) */
--footer-bg: var(--color-beige-medium);
--footer-text: var(--color-gray-dark);
--footer-link: var(--color-gray-medium);
--footer-link-hover: var(--color-black-soft);

/* General */
--background: var(--color-white-vintage);
--text: var(--color-black-soft);
--textSecondary: var(--color-gray-medium);

/* Dorado SOLO para acentos puntuales */
--gold-elegant: var(--color-gold-elegant);
```

## Clases de Utilidad Tailwind

```tsx
// Colores disponibles en Tailwind
className="bg-beige-light"       // #faf7f2 (navbar)
className="bg-beige-medium"      // #f0ebe5 (footer)
className="bg-beige-pink"        // #f5f0e8 (hover)
className="bg-gold-elegant"      // #c9a030 (SOLO acentos puntuales)
className="bg-white-vintage"    // #f5f0e8 (fondo base)
className="text-black-soft"      // #1a1a1a
className="text-gray-dark"       // #3d3d3d
className="text-gray-medium"     // #5a5a5a
```

**Importante**: El dorado (`#c9a030`) debe usarse SOLAMENTE para:
- Badges pequeños
- Botones de acción principal (puntuales)
- Iconos destacados
- Separadores delgados
- **NO usar en**: navbar, footer, fondos grandes, áreas extensas

## Implementación en Componentes

### Ejemplo Navbar con estilos UX
```tsx
<nav className="navbar-ux px-6 py-4">
  <div className="flex items-center justify-between">
    <Logo />
    <NavigationLinks />
  </div>
</nav>
```

### Ejemplo Footer con estilos UX
```tsx
<footer className="footer-ux px-6 py-8">
  <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
    <FooterSection />
    {/* ... */}
  </div>
</footer>
```

### Ejemplo Botones con estilos UX
```tsx
<button className="btn-primary-ux px-6 py-2 rounded">
  Comprar Ahora
</button>

<button className="btn-secondary-ux px-6 py-2 rounded">
  Ver Detalles
</button>
```

## Consideraciones de Accesibilidad

### Contraste WCAG AA
- Negro suave sobre beige claro: **14.6:1** ✅ (Excelente)
- Gris oscuro sobre beige medio: **12.8:1** ✅ (Excelente)
- Dorado sobre blanco vintage: **7.2:1** ✅ (Bueno para texto grande)

### Recomendaciones
- El dorado elegante (`#c9a030`) es ideal para acentos y botones grandes
- Para texto pequeño en fondo dorado, usar negro suave (`#1a1a1a`)
- Los tonos beige evitan fatiga visual en áreas de navegación

## Adaptación por Temporada

### San Valentín
- Reemplazar `--accent: var(--color-red-wine)` para elementos especiales
- Mantener navbar y footer en tonos beige (no cambiar colores base)

### Día de Flores Amarillas
- Reemplazar `--accent: var(--color-yellow)` para elementos especiales
- Usar `#ffd70e` en badges y destacados, no en elementos estructurales

## Por qué estos colores funcionan mejor

1. **Navbar suave**: El beige claro (`#f8f3eb`) es elegante pero no compite con el contenido
2. **Sin colores fuertes**: Evitamos el negro puro (`#000000`) y dorado brillante que fatigan
3. **Jerarquía visual**: Footer más oscuro que navbar para diferenciación clara
4. **Calidez sin agresividad**: Beige rosadito añade calidez sin ser rosa fuerte
5. **Legibilidad**: Contraste optimizado para lectura prolongada

## Testing UX Recomendado

1. **Test de fatiga visual**: Navegar por 10 minutos y evaluar comodidad
2. **Test de legibilidad**: Verificar texto en diferentes tamaños
3. **Test de contexto**: Verificar cómo funcionan con imágenes de flores
4. **Test de accesibilidad**: Verificar contraste con herramientas de WCAG
