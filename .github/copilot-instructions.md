# Copilot Instructions for Monix

## Project Overview

Monix is an addictive, calming economy game where players buy, sell, and invest their way to the top. The application consists of a React-based frontend and an Express/MongoDB backend server.

## Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **UI Components**: Custom components using Tabler Icons and Twemoji
- **Routing**: React Router v7
- **Compiler**: Babel React Compiler plugin

### Backend (server/)
- **Runtime**: Node.js with Express
- **Database**: MongoDB
- **Authentication**: Custom TOTP implementation
- **Payment Processing**: Stripe integration

## Project Structure

```
/
├── src/                    # Frontend source code
│   ├── components/         # Reusable React components (lowercase dirs)
│   ├── pages/              # Page components organized by route
│   ├── helpers/            # Utility functions and API clients
│   ├── providers/          # React context providers
│   └── assets/             # Static assets (images, music, etc.)
├── server/                 # Backend source code
│   ├── src/
│   │   ├── routes/         # Express route handlers
│   │   ├── helpers/        # Server utility functions
│   │   ├── middleware.ts   # Express middleware
│   │   ├── db.ts           # MongoDB connection
│   │   └── index.ts        # Server entry point
│   └── common/             # Shared types and utilities
├── public/                 # Public static assets
└── tools/                  # Build and development tools
```

## Development Workflow

### Setup Commands
```bash
npm install                 # Install frontend dependencies
cd server && npm install    # Install backend dependencies
```

### Development Commands
```bash
npm run dev                 # Start Vite dev server (frontend)
npm run build               # Build TypeScript and bundle with Vite
npm run build:full          # Build with version generation
npm run test                # Run test build (builds then cleans)
npm run lint                # Lint and auto-fix all files
npm run format              # Format all files with Prettier

# Server commands (from server/ directory)
npm run dev                 # Start server with hot reload
npm run build               # Build server TypeScript
npm start                   # Run production server
```

## Code Style and Conventions

### TypeScript/JavaScript
- Use **single quotes** for strings (enforced by ESLint/Prettier)
- Use **semicolons** (required)
- **Print width**: 100 characters
- **Trailing commas**: ES5 style
- **Arrow function parens**: Avoid when possible (`avoid`)
- Prefer **arrow functions** for consistency
- Use **TypeScript** for type safety - avoid `any` types
- Explicit module boundary types are disabled

### Component Conventions
- **Component directories**: Use lowercase names (e.g., `button/`, `modal/`)
- **Component files**: PascalCase with `.tsx` extension (e.g., `Button.tsx`)
- Export components from `index.ts` in component directories
- Use functional components with hooks
- Leverage React 19 features and React Compiler optimizations

### File Naming
- **Components**: PascalCase (e.g., `GameCard.tsx`)
- **Utilities/Helpers**: camelCase (e.g., `auth.ts`, `utils.ts`)
- **Types/Interfaces**: PascalCase in TypeScript
- **CSS Modules**: Match component name (e.g., `Button.module.css`)

### Code Organization
- Keep components focused and single-responsibility
- Extract reusable logic into helper functions (src/helpers/)
- Use context providers for global state (src/providers/)
- Separate API calls into helper modules
- Server routes should be organized by feature/domain

## API Integration

### Frontend → Backend Communication
- API endpoints are proxied through Vite during development (`/api/*` → `http://localhost:6200`)
- Use helper functions from `src/helpers/api.ts` for API calls
- Backend runs on port 6200 by default

### Backend API Structure
- Routes are organized in `server/src/routes/`
- Use middleware from `server/src/middleware.ts`
- Database operations through MongoDB client in `server/src/db.ts`
- CORS is enabled for cross-origin requests

## Testing

- The project uses build-based testing: `npm run test` builds and then cleans up
- Always run `npm run build` to verify TypeScript compilation
- Test both frontend and backend changes
- Verify linting with `npm run lint` before committing

## Build and Deployment

### Frontend Build
- `npm run build` - Compiles TypeScript and creates production bundle in `dist/`
- `npm run build:full` - Generates version info before building
- Build output is optimized for production with Vite

### Backend Build
- `cd server && npm run build` - Compiles TypeScript to `dist/`
- Production server runs compiled JavaScript from `dist/src/index.js`

## Environment Configuration

### Frontend
- No environment variables required for basic development
- Vite configuration in `vite.config.ts`

### Backend
- Copy `server/.env.example` to `server/.env`
- Configure MongoDB connection string
- Configure Stripe keys for payment processing
- Set appropriate environment variables for production

## Dependencies and Package Management

- Use `npm` for package management (not yarn or pnpm)
- Dependencies are managed separately for frontend and backend
- Run `npm install` in root for frontend, and in `server/` for backend
- Husky is used for pre-commit hooks with lint-staged

## Important Notes

### Code Quality
- All code must pass ESLint checks before committing
- Prettier formatting is enforced via pre-commit hooks
- TypeScript strict mode is enabled - resolve all type errors

### Asset Attribution
- Emojis: Twemoji (CC-BY 4.0)
- Icons: Tabler Icons (MIT)
- Music: Ferretosan Music (custom license in src/assets/music)
- Always maintain proper attribution when adding assets

### License Considerations
- Project is MIT licensed
- Individual directories may have specific licenses (check for LICENSE files)
- Directory-specific licenses take priority over project license

## Common Patterns

### Adding a New Page
1. Create page component in `src/pages/{feature}/`
2. Add route in routing configuration
3. Create necessary API endpoints in `server/src/routes/`
4. Add helper functions in `src/helpers/` for API calls
5. Style with CSS modules or inline styles

### Adding a New Component
1. Create component directory in `src/components/{name}/` (lowercase)
2. Create component file (PascalCase)
3. Add associated styles if needed
4. Export from `src/components/index.ts`
5. Document props with TypeScript interfaces

### Adding Backend Functionality
1. Create route handler in `server/src/routes/`
2. Add helper functions in `server/src/helpers/` if needed
3. Register route in `server/src/index.ts`
4. Ensure proper error handling and validation
5. Test with frontend integration

## Best Practices

1. **Type Safety**: Always use TypeScript types, avoid `any`
2. **Error Handling**: Implement proper error boundaries and try-catch blocks
3. **Performance**: Leverage React Compiler optimizations
4. **Accessibility**: Use semantic HTML and ARIA attributes
5. **Security**: Never commit sensitive data, use environment variables
6. **Code Reuse**: Extract common functionality into helpers/utilities
7. **Consistency**: Follow existing patterns in the codebase
8. **Documentation**: Add comments for complex logic
9. **Git Workflow**: Work on feature branches, keep commits focused
10. **Testing**: Verify builds pass before committing changes
