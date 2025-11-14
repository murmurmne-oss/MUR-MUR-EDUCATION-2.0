FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_BASE_URL
ARG ADMIN_USERNAME
ARG ADMIN_PASSWORD
ARG ADMIN_ALLOWED_IDS
ARG ADMIN_ACCESS_TOKEN
ARG ADMIN_SESSION_SECRET
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV ADMIN_USERNAME=${ADMIN_USERNAME}
ENV ADMIN_PASSWORD=${ADMIN_PASSWORD}
ENV ADMIN_ALLOWED_IDS=${ADMIN_ALLOWED_IDS}
ENV ADMIN_ACCESS_TOKEN=${ADMIN_ACCESS_TOKEN}
ENV ADMIN_SESSION_SECRET=${ADMIN_SESSION_SECRET}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["npm", "run", "start"]


