# Step 1: Node.js 26 (Active LTS line since Oct-2026). Keep NODE_VERSION in sync
# with .nvmrc and engines.node in package.json.
#
# This app used to build with nixpacks, which has no Node 26 package (it falls
# back to Node 18), so it builds from this Dockerfile instead.
ARG NODE_VERSION=26.13.1
FROM node:${NODE_VERSION}

# Step 2: Set the working directory in the container
WORKDIR /dockerfile-workdir

# Step 3: Copy package.json, the lockfile and the workspace config
# (pnpm-workspace.yaml carries the install settings: allowBuilds, the
# minimumReleaseAge supply-chain guard)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Step 4: Node >=25 no longer ships corepack, so install the pnpm version pinned
# in package.json's `packageManager` field (the single source of truth) with npm
RUN npm install -g --no-audit --no-fund "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")"

# Install dependencies
RUN pnpm install --frozen-lockfile

# Step 5: Copy the rest of the application code
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Step 6: Build the application
RUN pnpm run build

EXPOSE 3000

# Step 7: Run the app
CMD ["pnpm", "start"]
