# CooperBench Website

## Project Structure
- `src/pages/`: Astro pages (index.astro, blog.astro, etc.)
- `src/components/`: React and Astro components
- `src/layouts/`: Base layout component
- `src/styles/`: Global styles (index.css)
- `public/`: Static assets (images, data, PDFs)
- `public/static/`: Legacy static path compatibility

## Commands
- Install dependencies: `npm install` or `bun install`
- Run dev server: `npm run dev` or `bun run dev`
- Build for production: `npm run build` or `bun run build`
- Preview build: `npm run preview` or `bun run preview`

## Deployment
- GitHub Actions automatically builds and deploys to GitHub Pages on push to `main`.
- Workflow file: `.github/workflows/deploy-pages.yml`
