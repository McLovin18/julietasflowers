# Fuentes Originales Julieta's Flowers

## Situación Actual
El sitio actualmente usa alternativas de Google Fonts que imitan el estilo de las fuentes originales:
- **VONCA** → Playfair Display (Google Fonts)
- **Lovely Flowers** → Great Vibes (Google Fonts)

## Fuentes Originales (Comerciales)

### VONCA
- **Diseñador**: Bayu Noor Witarsa (Asenbayu)
- **Estilo**: Minimalista, elegante contemporánea
- **Donde comprar**: 
  - MyFonts: https://www.myfonts.com/collections/vonca-font-asenbayu
  - Creative Market: https://creativemarket.com/Asenbayu/244656308-Vonca-Font-Family
  - YouWorkForThem: https://www.youworkforthem.com/font/T24092/vonca
- **Estilos disponibles**: Extra Light, Light, Regular, Medium, Semibold, Bold, Extra Bold
- **Uso previsto**: Títulos y copies dentro del entorno marcario

### Lovely Flowers
- **Diseñador**: Fajar Gunawan (Fargun Studio)
- **Estilo**: Cursiva elegante y ornamental
- **Donde comprar**:
  - MyFonts: https://www.myfonts.com/collections/lovely-flowers-font-fargun-studio
  - FreeFontDL: https://freefontdl.com/lovely-flowers-font/
- **Uso previsto**: Subtítulos y adornos de diseño gráfico

## Pasos para Implementar Fuentes Originales

### 1. Comprar y Descargar
Adquiere las licencias de ambas fuentes en sus respectivos sitios web.

### 2. Organizar Archivos
Coloca los archivos de fuente en el directorio `public/fonts/`:
```
public/
  fonts/
    vonca/
      Vonca-Regular.woff2
      Vonca-Regular.woff
      Vonca-Bold.woff2
      Vonca-Bold.woff
    lovely-flowers/
      LovelyFlowers.woff2
      LovelyFlowers.woff
```

### 3. Agregar @font-face en globals.css
Agrega las siguientes declaraciones al inicio de `app/globals.css`:

```css
@font-face {
  font-family: 'VONCA';
  src: url('/fonts/vonca/Vonca-Regular.woff2') format('woff2'),
       url('/fonts/vonca/Vonca-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'VONCA';
  src: url('/fonts/vonca/Vonca-Bold.woff2') format('woff2'),
       url('/fonts/vonca/Vonca-Bold.woff') format('woff');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Lovely Flowers';
  src: url('/fonts/lovely-flowers/LovelyFlowers.woff2') format('woff2'),
       url('/fonts/lovely-flowers/LovelyFlowers.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

### 4. Actualizar Variables CSS
En `app/globals.css`, actualiza las variables de fuentes:

```css
/* --- Tipografía Julieta's Flowers --- */
/* VONCA - Títulos y copies (minimalista, elegante contemporánea) */
--font-body-family: "VONCA", "Playfair Display", "Cormorant Garamond", Georgia, serif;
--font-body-style: normal;
--font-body-weight: 400;
--font-body-weight-bold: 700;

/* Lovely Flowers - Subtítulos y adornos (cursiva, ornamental, sofisticada) */
--font-heading-family: "Lovely Flowers", "Great Vibes", var(--font-vonca), "Playfair Display", "Cormorant Garamond", Georgia, serif;
--font-heading-style: normal;
--font-heading-weight: 400;

--font-body-scale: 1.0;
--font-heading-scale: 1.35;

/* --- Tipografía para navbar (mantiene VONCA) --- */
--font-navbar-body-family: "VONCA", "Playfair Display", "Cormorant Garamond", serif;
--font-navbar-heading-family: "VONCA", "Playfair Display", "Cormorant Garamond", serif;
```

### 5. Actualizar layout.tsx
Opcionalmente puedes remover las importaciones de Google Fonts alternativas si prefieres usar solo las fuentes originales:

```typescript
// Remover estas líneas si solo usarás fuentes originales:
// import { Playfair_Display, Great_Vibes } from "next/font/google";
// const playfairDisplay = Playfair_Display({...});
// const greatVibes = Great_Vibes({...});
// className={`${sourceSerif4.variable} ${playfairDisplay.variable} ${greatVibes.variable}`}
```

### 6. Verificar
Ejecuta el servidor de desarrollo y verifica que las fuentes se carguen correctamente:
```bash
npm run dev
```

## Notas de Licencia
- Asegúrate de cumplir con los términos de licencia de cada fuente
- Las licencias web generalmente permiten uso en sitios web
- Verifica si necesitas licencias adicionales para uso en branding/logos
- Guarda las licencias en un lugar seguro para referencia futura
