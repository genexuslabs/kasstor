# Migrar de StencilJS a Kasstor

Quiero agregar documentación de cómo migrar un proyecto de StencilJS a Kasstor. Acá va una guía de cómo hacerlo

## Migración a nivel de proyecto

### Dependencias

1. Remover las dependencias relacionadas con StencilJS, por ejemplo, "@stencil-community/eslint-plugin", "@stencil/core", "@stencil/react-output-target" y "@stencil/sass".
2. Instalar las dependencias de @genexus/kasstor-core y @genexus/vite-plugin-kasstor.
3. Si además se usaba la dependencia de @stencil/store, esta se puede eliminar y se instala el paquete @genexus/kasstor-signals para manejar estados globales.

### Configuraciones es ESLint

1. Remover toda configuración relacionada al ESLint de StencilJS en los archivos de eslint y cualquier otro archivo de configuración.

### Configuraciones de TypeScript

1. Remover cualquier regla respectiva de StencilJS.
2. Asegurarse de estar usando en el tsconfig.json (o en el tsconfig que use el servidor de desarrollo y build de producción) las siguientes compilerOptions:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "es2022",

    "moduleResolution": "bundler"
  }
}
```

En general, estas son unas buenas reglas de TypeScript para todo proyecto Kasstor:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "es2022",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    // Bundler mode
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "outDir": "dist/",

    // Necessary to not add the src folder inside the dist
    "rootDir": "./src",

    // Linting
    "allowUnreachableCode": false,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noImplicitOverride": true,
    "noUncheckedSideEffectImports": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "strict": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "vite.config.ts", "**/*.e2e.ts"]
}
```

### Configuraciones de Prettier

Si habían configuraciones particular de StencilJS para prettier, hay que eliminarlas.

### Configuraciones de Testing unitario y e2e

1. Remover todas las dependencias de Jest y Puppeteer. Por ejemplo: "@types/jest", "@types/puppeteer", "jest", "jest-cli" y "puppeteer".
2. Remover todos los archivos de configuración de Jest y puppeteer, e incluso aquellas configuraciones que se hayan hecho en el package.json para poder usar jest.
3. Un reemplazo para las dependencias de testing es usar Vitest y Playwright, es decir, instalar las dependencias de desarrollo: "@vitest/browser", "@vitest/browser-playwright", "@vitest/coverage-v8", "@vitest/ui", "playwright" y "vitest-browser-lit"
4. Crear el archivo vitest.config.ts con la siguiente configuración (si necesitas copiar assets al test server, puedes instalar la dependencia de desarrollo "vite-plugin-static-copy", sino no hace falta instalarla ni usarla como plugin)

```ts
import { playwright } from "@vitest/browser-playwright";
import { viteStaticCopy } from "vite-plugin-static-copy"; // Totally optional
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "threads",
    projects: [
      // Tests that don't run on the Browser
      {
        // Inherit options from this config like plugins and pool
        extends: true,
        test: {
          include: ["src/tests/**/*.{test,spec}.ts"],
          name: "unit",
          environment: "node"
        }
      },
      // Tests that runs on the Browser
      {
        // Inherit options from this config like plugins and pool
        extends: true,
        test: {
          exclude: ["node_modules", "dist"],
          include: ["**/*.e2e.ts"],
          name: "browser",

          // Improve performance by running more tests in parallel. Adjust this value based on the number of cores available.
          maxWorkers: 16,

          browser: {
            provider: playwright(),

            // Disable screenshots when the test fails
            screenshotFailures: false,

            enabled: true,

            // It means that no UI will be displayed. Turn this off if you want to
            // see how the UI is tested
            headless: true,

            // At least one instance is required
            instances: [{ browser: "chromium" }]
          }
        },
        // If necessary, you can install the vite-plugin-static-copy dev dependency to copy assets to the test server
        plugins: [
          // Totally optional:
          viteStaticCopy({
            targets: [
              {
                src: "source path",
                dest: "test server destination path"
              }
            ]
          })
        ]
      }
    ]
  }
});
```

5. Migrar implementación de los tests.
   - Tener en cuenta que para esperar que un elemento se termina de renderizar en Lit es tan simple como hacer `await elementRef.updateComplete`
   - En vitest y playwright se opera sobre la misma página, entonces se tiene acceso a todas las APIs del DOM y es mucho menos engorroso que en puppeteer que se tenía que serializar los elementos y muchas cosas no funcionaban, como mantener una referencia activa de un elemento puesto que había que refrescarla.
   - Podes tomar algunas ideas claves de acá para entender y armar un ejemplo de cómo se hacia antes un test de StencilJS vs cómo se hace ahora en Kasstor: https://github.com/genexuslabs/chameleon-controls-library/blob/feat/chameleon-7/packages/chameleon/src/testing/implementation/reflect-disabled.ts

   De acá podes tomar tests antiguos de StencilJS (o podes buscar otro archivo de Chameleon si lo ves bien): https://github.com/genexuslabs/chameleon-controls-library/blob/main/src/components/action-list/tests/selection.e2e.ts

### Configuraciones del servidor de desarrollo y cómo migrar el stencil.config.ts

1. Agregar el vite.config.ts con el siguiente contenido como base:

```ts
import { defineConfig } from "vite";
import { kasstor } from "@genexus/vite-plugin-kasstor";

export default defineConfig({
  plugins: [kasstor()]
});
```

2. Create `src/vite-env.d.ts` with the following content so TypeScript recognizes Vite-specific import suffixes like `?inline` (used when importing SCSS/CSS files):

```ts
// eslint-disable-next-line spaced-comment
/// <reference types="vite/client" />
```

Without this file, TypeScript will report an error on any `import styles from './component.scss?inline'` line.

3. Aplicar las migraciones de las siguientes sub secciones en caso de que apliquen y, finalmente, borrar el `stencil.config.ts`.

#### Cómo migrar la regla opción bundles del stencil.config.ts

La opción `bundles` del `stencil.config.ts` permitía empaquetar varios componentes en el mismo chunk de JS al momento de hacer la distribución (dist) de la librería. Ahora, para hacer eso en Kasstor, es tan simple como importar el TypeScript/JavaScript de un componente a otro, ya que luego las builds tools se encargarán de analizar el grafo de imports y optimizarán el bundle juntando dichos componentes en caso de ser necesario. Esto es mucho mejor que la regla bundles del stencil.config.ts, porque delega esta responsabilidad a la build tool y esta tiene mucho más contexto para optimizar el resultado final que cuando solo se construye una librería de componentes y no se sabe cómo se usan en la aplicación final.

Ejemplo para la siguiente estructura de archivos:

```
project/
└── src/
    └── components/
        ├── action-menu.tsx
        └── action-menu-item.tsx
```

Si en el stencil.config.ts se hacia esto:

```ts
bundles: [{ components: ["my-action-menu", "my-action-menu-item"] }];
```

Ahora en Kasstor los archivos `.tsx` terminan en `.lit.ts`, así que en el action-menu.lit.ts hay que agregar esta linea en los top level imports

```ts
import "./action-menu-item.lit.js";
```

## Migración a nivel de componentes

StencilJS y Lit tienen varias diferencias y APIs que no existen en uno vs el otro, pero Kasstor intenta cerrar ese GAP. Hay que hacer lo siguiente para migrar cada componente:

1. Cambiar la extensión de los archivos .tsx a .lit.ts

2. Migrar cada uno de los conceptos de StencilJS a Kasstor. Para ello, en las siguientes secciones se explica cómo migrar cada concepto de StencilJS a Kasstor.

### Decorators de StencilJS

#### Decorator Element

En Lit no existe tal concepto que era propio de StencilJS. El motivo principal es porque en StencilJS se tenía que usar este decorator para poder acceder a la referencia del HTMLElement del tag construido, por ejemplo, con `@Element() el: HTMLMyComponentElement;` se podía hacer `this.el` para acceder a la referencia `HTMLMyComponentElement` la cual era la misma que hacer un querySelector del tag del elemento en cuestión. Esto en Lit y Kasstor no es necesario, ya que `this` es la referencia al elemento del DOM y no existe tal cosa como `this.el`.

El principal motivo por el cual esto era necesario en StencilJS, es porque los custom elements construidos eran un proxy a la implementación real (por motivos de cómo implementaba el lazy loading StencilJS), entonces `this` apuntaba a ese proxy que no tenía la implementación real.

// Mostrar ejemplo de cómo se migra este patrón de StencilJS a Kasstor

#### Decorator Component

En Kasstor también tenemos un decorator Component, solo que se usa de manera distintas al de StencilJS, dado que Kasstor está basado en Lit y no es compilado como StencilJS (por más que tenga un plugin de Vite que resuelve ciertas cosas). El decorator Component se importa desde import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";

// Mostrar ejemplo de todo lo que se puede hacer en el decorator de StencilJS y cómo eso se haría con lo que ofrece Kasstor. Referirse a la última documentación de StencilJS. Este ejemplo tiene que cubrir el apartado de cómo se importar los estilos en Kasstor vs StencilJS.

#### Decorator Event y type EventEmitter

Esto es muy parecido en Kasstor a como era en StencilJS. Principalmente lo que ahora el import es desde import { Event, type EventEmitter } from "@genexus/kasstor-core/decorators/event.js";

Lo mejor para evitar problemas con el TypeScript estricto es colocar el `!` en el nombre del evento (verlo en el ejemplo)

// Mostrar ejemplo de cómo se hacía en StencilJS y de cómo se hace ahora en Kasstor

#### Decorator Watch

En Kasstor se llama Observe y se importa desde import { Observe } from "@genexus/kasstor-core/decorators/observe.js";

Una diferencia clave de este decorator es que también se ejecuta antes del primer render, cosa que con el Watch de StencilJS era muy engorroso, porque no se ejecutaba antes del primer render, entonces tenías que duplicar lógica de inicialización en el connectedCallback (tomando como referencia lo que se hacía en el método del Watch), cosa que con Kasstor no sucede.

// Mostrar ejemplo de cómo se hacía en StencilJS (teniendo en cuenta el caso de connectedCallback) y de cómo se hace ahora en Kasstor, además de que hay que agregar el campo protected en el método del Observe

#### Decorator Method

No existe en Kasstor. Directamente se usan los métodos de la clase del componente, los cuales no son async por defecto, como sí los son en StencilJS a pesar de que en StencilJS la implementación del método nunca ejecutara un await o devolviera una Promise.

// Mostrar ejemplo de cómo se hace con StencilJS y de cómo se haría en Kasstor

#### Decorator Listen

No existe actualmentet en Kasstor. Se puede agregar un listener en el connectedCallback y removerlo en el disconnectedCallback como forma de migración

// Mostrar ejemplo del antes en StencilJS y después en Kasstor

#### Decorator Prop

Como Kasstor está basado en Lit, se usa el decorator property de Lit el cual se importa desde `import { property } from "lit/decorators/property.js"`;

Algunas cosas a tener en cuenta:

- Este decorator property exige que se le coloque la conversión de tipos cuando la property no es solo un string, es decir, `type: Number`, `type: Boolean`, o cuando la property puede ser un objeto, array o tipo no primitivo, lo mejor es colocar `{attribute: false}` en el decorator `property`.

El `reflect: true` sigue funcionando también en el decorator property de Lit.

#### Decorator State

Como Kasstor está basado en Lit, se usa el decorator state de Lit el cual se importa desde `import { state } from "lit/decorators/state.js"`;

Se debe agregar la keyword de TypeScript private o protected para evitar problemas de tipos. El resto es practicamente igual a cómo funcionaba con StencilJS.

// Mostrar ejemplo del antes en StencilJS y después en Kasstor

#### Decorators AttachInternals y clase ElementInternals

// Explicar las pequeñas diferencias de uso que tiene el ElementInternals de StencilJS vs lo que ofrece Kasstor. Recordar que en Kasstor no existe el decorator AttachInternals. Mostrar ejemplo de cómo queda antes y después

### Lifecycle de StencilJS

// Introducir un mapping de los lifecycle de StencilJS a los de Lit, teniendo en cuenta sus diferencias y qué pasa si se cambia un state/property en los de StencilJS vs los de Lit. Notar que Kasstor agrega el lifecycle firstWillUpdate que viene a ser muy parecido al componentWillLoad de StencilJS

// Mostrar un ejemplo completo de la diversidad de lifecycles de StencilJS y de cómo se migran a Kasstor. Tener en cuenta las keywords override y de que el scheduleUpdate es async así que el override tiene que hacer await del super.scheduleUpdate() (seguramente hay que ajustar este detalle también en la documentación del paquete core y de la skill de kasstor, ya que ahora mismo no está documentado y es super importante que esté)

// Hacer mucho incapié en que Lit/Kasstor hay que llamar a los super.method() de varios lifecycle method para que anden las cosas.

### Utilirarias de StencilJS

#### Componente funcional Host

StencilJS permitía usar en sus templates un "tag" especial, mejor conocido, como un functional component llamado `Host`. Este permitía agregar clases, styles, atributos y eventos en el propio tag donde se definía en el componente (de ahí viene el nombre de "Host"). Esto en Kasstor y Lit no existe, así que la forma de migrarlo es mover partes de esos settings al connectedCallback (en caso de que fueran atributos, clases y/o estilos estáticos), para los eventos que siempre estaban seteados también moverlos en el connectedCallback/disconnectedCallback, y las cosas dinámicas se pueden mover a los decorator `Observe` para volverlas dinámicas.

// Ejemplo de cómo podría ser la migración para un caso complejo que combiene inicialización estática con cosas dinámicas del componente Host

#### Función forceUpdate

En StencilJS se podía importar una función llamada forceUpdate el cual permitía forzar el re-render de un componente haciendo forceUpdate(this) o forceUpdate(referencia al elemento). Esto en Lit y Kasstor se maneja de otra manera, ya que si se tiene la referencia al elemento, tan solo hace falta hacer this.requestUpdate() para encolar un re-render del elemento.

// Mostrar un ejemplo del antes y después de esto

#### Store de StencilJS

// Mostrar un ejemplo de cómo se haría una store en Kasstor con los signals y de lo bueno que son los signals

### Renderizado del template

// Explicar que Lit/Kasstor tiene un motor muy distinto al de StencilJS para renderizar el template, el cual es mucho más eficiente y rápido que el de StencilJS. Explicar punto a punto como se migra cada tipo de binding y que además en Lit/Kasstor se tiene más poder para expresar otros tipos de bindings

### Ejemplo que reune todas las features posibles de StencilJS y cómo quedan migradas a Kasstor

// Mostrar un ejemplo bien completo de esto.

