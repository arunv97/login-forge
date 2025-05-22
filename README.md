**README: LoginForge Full-Stack Application**

This document outlines the steps to install, configure, and run the LoginForge application locally.

**I. Prerequisites**

Before you begin, ensure you have the following installed on your system:

1.  **Node.js:** Version 18.x or higher (includes npm). We recommend using a Node Version Manager like `nvm`.
2.  **pnpm:** This project uses `pnpm` as its package manager. If you don't have it, install it globally:
    ```bash
    npm install -g pnpm
    ```
3.  **Docker and Docker Compose:** Required for running the PostgreSQL database and pgAdmin.
    - Install Docker Desktop (which includes Docker Compose): [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
4.  **Git:** For cloning the repository.

**II. Getting Started**

1.  **Clone the Repository:**

    ```bash
    git clone <your-repository-url>
    cd login-forge # Or your repository's root directory name
    ```

2.  **Install Dependencies:**
    From the root directory of the project, run:
    ```bash
    pnpm install
    ```
    This will install all necessary dependencies for the monorepo, including frontend, backend, and development tools.

**III. Configuration**

1.  **Backend Environment Variables:**

    - Navigate to the server application's directory: `cd apps/server`
    - You will find an `.env.template` file. Copy this file to a new file named `.env`:
      ```bash
      cp .env.template .env
      ```
    - Open the newly created `.env` file and fill in the required values.
      It should look like this:

      ```env
      # Database connection - These should match your docker-compose.yml
      DATABASE_URL="postgresql://user_loginforge:password_loginforge@localhost:5432/db_loginforge?schema=public"

      # JWT Authentication
      JWT_SECRET="generate_a_strong_random_secret_key_for_jwt" # IMPORTANT: Change this!
      JWT_EXPIRATION_TIME="3600s" # e.g., 1 hour
      JWT_REFRESH_SECRET="generate_a_different_strong_random_secret_for_refresh_tokens" # IMPORTANT: Change this! (Will be used later)

      # OAuth Configuration (Google)
      # You will need to create your own OAuth 2.0 Client ID and Secret
      # in the Google Cloud Console for your development environment.
      # Follow the project's internal documentation or ask a team member for guidance
      # on setting up your personal Google OAuth credentials for development.
      GOOGLE_CLIENT_ID="YOUR_DEV_GOOGLE_CLIENT_ID"
      GOOGLE_CLIENT_SECRET="YOUR_DEV_GOOGLE_CLIENT_SECRET"
      GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback" # Should match your GCP config

      # Application
      PORT=3000
      NODE_ENV="development"
      FRONTEND_URL="http://localhost:4200" # Default frontend URL for redirects
      ```

    - **CRITICAL:**
      - Replace `"generate_a_strong_random_secret_key_for_jwt"` and `"generate_a_different_strong_random_secret_for_refresh_tokens"` with actual strong, random secret keys. You can use an online generator or a command like `openssl rand -hex 32`.
      - For `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, each team member will likely need to set up their **own** Google Cloud OAuth 2.0 credentials for their local development environment. This is because redirect URIs are often tied to `localhost` and specific ports, and sharing a single dev credential can lead to quota issues or conflicts. Provide internal team documentation or instructions on how they can obtain these.
    - Navigate back to the project root: `cd ../..`

2.  **Prisma: Generate Client**
    After installing dependencies, and ensuring your `apps/server/.env` has the `DATABASE_URL`, generate the Prisma client:
    ```bash
    pnpm prisma generate
    ```
    _(This command should be run from the workspace root, and it will use the schema location defined in your root `package.json`'s `prisma` field, or you can target it: `pnpm nx exec server -- pnpx prisma generate --schema=./prisma/schema.prisma`)_

**IV. Running the Application Locally**

This project is configured to run the database (PostgreSQL & pgAdmin) via Docker Compose and the backend server.

1.  **Start Database and Backend Server (Recommended for Development):**
    From the project root, run:

    ```bash
    pnpm nx serve-dev server
    ```

    This command will:

    - Start the Docker containers for PostgreSQL and pgAdmin in the background (if not already running).
    - Wait for the PostgreSQL database to be healthy.
    - Apply any pending database migrations automatically (see "Database Migrations" below).
    - Build and start the NestJS backend server (typically on `http://localhost:3000`).
    - The server will watch for changes and hot-reload.

    You should see logs indicating:

    - Docker containers starting.
    - NestJS application starting, listing available API routes and the Swagger UI URL.

2.  **Running the Frontend (Client) Application:**
    In a **separate terminal window/tab**, from the project root, run:
    ```bash
    pnpm nx serve client
    ```
    This will start the React frontend development server (typically on `http://localhost:4200`).

**V. Accessing the Applications**

- **Backend API (NestJS):** `http://localhost:3000/api`
- **API Documentation (Swagger UI):** `http://localhost:3000/api/docs`
- **pgAdmin (Database GUI):** `http://localhost:5050`
  - Login with email: `admin@example.com` and password: `admin` (or as configured in `docker-compose.yml`).
  - Connect to the database server:
    - Host: `postgres`
    - Port: `5432`
    - Maintenance DB: `db_loginforge`
    - Username: `user_loginforge`
    - Password: `password_loginforge`
- **Frontend Application (React):** `http://localhost:4200`

**VI. Database Migrations**

- The initial database schema is set up. When you run `pnpm nx serve-dev server`, it should ideally include a step to run migrations if configured, or you might need to do it manually the first time if the `serve-dev` script doesn't explicitly include it yet.
- **To apply migrations manually (if needed, e.g., first setup or after pulling schema changes):**
  From the project root:
  ```bash
  pnpm nx exec server -- pnpx prisma migrate dev --name init # Or a descriptive name for new migrations
  ```
  _(Or, more simply if your root `package.json`'s `prisma.schema` points correctly: `pnpm prisma migrate dev --name init`)_

**VII. Stopping the Development Environment**

1.  **Stop the Frontend Server:** Press `Ctrl+C` in the terminal where `pnpm nx serve client` is running.
2.  **Stop the Backend Server:** Press `Ctrl+C` in the terminal where `pnpm nx serve-dev server` is running.
3.  **Stop Docker Containers (Database & pgAdmin):**
    From the project root, run:
    ```bash
    pnpm nx stop-db server
    ```
    Or directly:
    ```bash
    docker-compose down
    ```

**VIII. Linting and Testing**

- **Lint:**
  ```bash
  pnpm nx lint server
  pnpm nx lint client
  ```
- **Run Backend Tests:**
  ```bash
  pnpm nx test server
  ```
- **Run Frontend Tests:**
  ```bash
  pnpm nx test client
  ```
- **Run Backend E2E Tests:**
  ```bash
  pnpm nx e2e server-e2e
  ```
- **Run Frontend E2E Tests (Playwright):**
  ```bash
  pnpm nx e2e client-e2e
  ```

---

**Notes on the README:**

- **Clarity on Google Credentials:** It's important to emphasize that each developer needs their own Google OAuth credentials for `localhost` development. You might even link to internal documentation on how your team handles this.
- **Database Migrations in `serve-dev`:**
  Currently, the `serve-dev` script for the server (`docker-compose up -d --wait postgres`, then `nx serve server`) does _not_ automatically run `prisma migrate dev`. You might want to add it.
  If you want to include automatic migration in `serve-dev`, you could modify the `commands` in `apps/server/project.json`:
  ```json
        "commands": [
          "docker-compose up -d --wait postgres",
          "pnpx prisma migrate deploy --schema=./apps/server/prisma/schema.prisma", // Use deploy for non-interactive
          "nx serve server"
        ],
  ```
  Or, for development, you might prefer `prisma migrate dev` but it's interactive. `prisma migrate deploy` is generally for CI/CD or production-like environments as it applies pending migrations without prompting. For local dev, prompting developers to run `migrate dev` manually after pulling changes that affect the schema is also a common workflow.
- **Prisma Generate:** I added a step for `pnpm prisma generate` as it's crucial after `pnpm install`.
- **Simpler Prisma Commands:** If you have `"prisma": { "schema": "apps/server/prisma/schema.prisma" }` in your **root `package.json`**, then commands like `pnpm prisma generate` and `pnpm prisma migrate dev` can often be run from the root without specifying the schema path, as the Prisma CLI will pick it up.
