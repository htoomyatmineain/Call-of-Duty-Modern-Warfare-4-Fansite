# Call of Duty: Modern Warfare 4 Fansite

An unofficial fan project being refined into a cinematic Modern Warfare 4 character and campaign showcase.

## Current state

The preserved prototype still contains Modern Warfare II content and images. Modern Warfare 4 research, content replacement, responsive layouts, and completed navigation are upcoming work. Login, signup, membership, and Read More controls are currently presentation only. About, Campaigns, and Contact pages do not exist yet.

## Local development

Open `homePage.html` directly, with VS Code Live Server, or serve this folder with any static HTTP server. The committed aircraft viewer bundle also supports direct-file viewing.

With Node.js 22 or later:

```sh
npm ci
npm run check
npm run build
```

The build extracts the F-35 geometry from `assets/f35.glb`, bundles the Three.js viewer with esbuild, copies the website into `dist/`, and generates `dist/index.html` as its homepage. The original `homePage.html` URL also remains available. `dist/` is generated and is not committed.

The aircraft section includes scroll-driven flight, a barrel roll, decorative rocket launches, moving captions, and drag/keyboard controls. Reduced-motion preferences disable the flight sequence. The model is by bohmerang, adapted for holographic display under CC BY-NC-SA 4.0; see `assets/F35-LICENSE.txt`. Three.js uses the MIT license in `vendor/THREE-LICENSE.txt`.

## Deploy on Netlify

1. In Netlify, choose **Add new project → Import an existing project**.
2. Connect GitHub and select `htoomyatmineain/Call-of-Duty-Modern-Warfare-4-Fansite`.
3. Select `main` as the production branch.
4. Leave the base directory at the repository root. `netlify.toml` sets the build command to `npm run build` and publish directory to `dist`.
5. Deploy, then verify images, the homepage, and character switching on the live URL.

After connection, pushes to the production branch trigger new deployments. A custom domain is optional.

## Project direction

- Tactical cinematic design with charcoal surfaces and military-green accents.
- Preserve the existing character switching concept.
- Replace legacy content with verified Modern Warfare 4 character and storyline information.
- Add spoiler controls, responsive navigation, and a finished media section.
- Explore React + Vite and an optional 3D scene on a separate development branch.

This is an unofficial fan project and is not affiliated with Activision. Call of Duty names, characters, and game imagery belong to their respective owners.
