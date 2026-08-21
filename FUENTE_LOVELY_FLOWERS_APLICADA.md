# Aplicación de Fuente Lovely Flowers - Estados Vacíos

## Resumen de Cambios

Se ha aplicado la fuente Lovely Flowers (alternativa Great Vibes) en todos los mensajes de estado vacío del sitio web para dar una apariencia más elegante y sofisticada, tal como se usa en la página de blogs.

## Componente Creado

### EmptyState.tsx
**Ubicación**: `app/components/EmptyState.tsx`

Componente reutilizable que incluye:
- Icono con opacidad suave
- Título con fuente Lovely Flowers
- Mensaje opcional con fuente estándar
- Estilos consistentes con la identidad visual de Julieta's Flowers

```tsx
<EmptyState
  icon="search_off"
  title="No hay resultados"
  message="Prueba con otros términos de búsqueda"
/>
```

## Páginas Actualizadas

### 1. **Blogs** (`app/blogs/page.tsx`)
- Mensaje: "No hay artículos disponibles"
- Icono: `article`

### 2. **Productos** (`app/productos/page.tsx`)
- Mensaje: "Sin resultados"
- Icono: `search_off`
- Aplicación directa de clase `font-lovely-flowers`

### 3. **Resultados de Búsqueda** (`app/search-results/page.tsx`)
- Mensaje: "No hay resultados"
- Icono: `search_off`
- Mensaje secundario: "Prueba con otros términos de búsqueda"

### 4. **Ofertas** (`app/ofertas/page.tsx`)
- Mensaje: "No hay ofertas activas"
- Icono: `local_offer`
- Mensaje secundario: "En este momento no hay productos con descuento publicado"

### 5. **Nueva Colección** (`app/nueva-coleccion/page.tsx`)
- Mensaje: "Sin resultados"
- Icono: `search_off`
- Mensaje secundario: "Prueba otros términos o selecciona otra categoría"

### 6. **Personalizados** (`app/personalizados/page.tsx`)
- Mensaje: "No hay productos personalizados"
- Icono: `auto_awesome`
- Mensaje secundario: "En este momento no hay productos con personalización disponible"

### 7. **Página Principal** (`app/page.tsx`)
- Mensaje: "No hay secciones publicadas"
- Icono: `web`
- Mensaje secundario: "El sitio está siendo configurado"

### 8. **Carrito** (`app/cart/page.tsx`)
- Mensaje: "Tu carrito está vacío"
- Icono: `shopping_bag`
- Mensaje secundario: "Agrega productos para continuar"
- Aplicación directa de clase `font-lovely-flowers`

### 9. **Productos por Categoría** (`app/products-by-category/page.tsx`)
- Mensaje: "Sin resultados"
- Icono: `search_off`
- Mensaje secundario: "Prueba otros términos o ajusta los filtros"

### 10. **Componentes de Landing**
- **RelatedProductsCarousel**: "No hay productos relacionados para mostrar"
- **QuickProductsSection**: "No hay productos en esta categoría"

## Estilos Aplicados

La fuente Lovely Flowers se aplica con los siguientes estilos:
```css
font-lovely-flowers {
  font-family: var(--font-lovely-flowers), "Great Vibes", cursive;
  font-size: 1.5rem; /* Para títulos principales */
  line-height: 1.4;
}
```

## Beneficios Visuales

1. **Consistencia**: Todos los estados vacíos ahora tienen la misma apariencia elegante
2. **Identidad de marca**: Refuerza la sofisticación y feminidad de Julieta's Flowers
3. **Experiencia UX**: Los mensajes vacíos son menos frustrantes visualmente
4. **Jerarquía visual**: La fuente cursiva indica claramente que es un mensaje de estado

## Iconos Utilizados

- `article` - Blogs y artículos
- `search_off` - Sin resultados en búsquedas
- `local_offer` - Ofertas y descuentos
- `auto_awesome` - Productos personalizados
- `web` - Página principal
- `shopping_bag` - Carrito vacío
- `favorite` - Favoritos (si se implementa en el futuro)

## Mantenimiento

Para agregar nuevos estados vacíos con la misma fuente:

1. Importar el componente:
```tsx
import EmptyState from "../components/EmptyState";
```

2. Usar el componente:
```tsx
<EmptyState
  icon="icono_apropiado"
  title="Mensaje principal"
  message="Mensaje secundario opcional"
/>
```

3. O aplicar la clase directamente:
```tsx
<h3 className="font-lovely-flowers" style={{ fontSize: "1.5rem", lineHeight: "1.4" }}>
  Tu mensaje aquí
</h3>
```

## Notas

- La fuente Lovely Flowers es una alternativa de Google Fonts (Great Vibes) a la fuente comercial original
- Para usar la fuente original, seguir las instrucciones en `FUENTES_ORIGINALES.md`
- Los tamaños de fuente pueden ajustarse según el contexto (1.2rem para espacios pequeños, 1.5rem para espacios amplios)
