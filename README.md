# habit-tracker

Simple Habit-tracking app. Keep statistics of your good (and bad!) habits!

## Features
- Typescript
- Vue 3
- Prisma
- Tailwind
- Vite


## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

## Start backend server in development
```sh
npx nodemon server.ts
```

## Build css

```sh
npx tailwindcss -i ./src/input.css -o ./src/assets/output.css --watch
```

## Build & run Docker image
```sh
docker build -t habit-tracker .
docker run -it -p 3000:3000 habit-tracker
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Cypress](https://www.cypress.io/)

```sh
npm run test:e2e:dev
```

```sh
npm run build
npm run test:e2e
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
