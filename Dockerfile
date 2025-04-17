FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/fix-dependencies.js ./scripts/fix-dependencies.js
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure index.js exists in the pages directory
RUN mkdir -p ./pages && \
    if [ ! -f "./pages/index.js" ]; then \
    echo "Creating index.js file"; \
    echo 'import { useEffect } from "react"; import { useRouter } from "next/router"; export default function Home() { const router = useRouter(); useEffect(() => { router.replace("/ExecutiveSummary"); }, [router]); return (<div className="flex h-screen items-center justify-center"><div className="text-center"><h1 className="text-2xl font-semibold mb-4">Loading Dashboard...</h1><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div></div>);}' > ./pages/index.js; \
    fi

# Fix the middleware.ts file if it uses SecurityConfig directly
RUN sed -i 's/import { SecurityConfig, MonitoringConfig } from/import { SecurityConfig, MonitoringConfig, defaultSecurityConfig } from/' ./lib/middleware.ts 2>/dev/null || true && \
    sed -i 's/max: SecurityConfig.maxRequestsPerMinute/max: defaultSecurityConfig.maxRequestsPerMinute/' ./lib/middleware.ts 2>/dev/null || true

# Update next.config.js to use standalone output
RUN sed -i 's/output: .export./output: "standalone"/' ./next.config.js 2>/dev/null || true

# Run the build
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public directory and required build files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME 0.0.0.0

CMD ["node", "server.js"]
