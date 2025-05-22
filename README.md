**README: LoginForge Full-Stack Application**

This document outlines the steps to install, configure, and run the LoginForge application locally.

**I. Prerequisites**

Before you begin, ensure you have the following installed on your system:

1.  **Node.js:** Version 18.x or higher (includes npm). We recommend using a Node Version Manager like `nvm` ([nvm-sh/nvm on GitHub](https://github.com/nvm-sh/nvm)).
2.  **pnpm:** This project uses `pnpm` as its package manager. If you don't have it, install it globally:
    ```bash
    npm install -g pnpm
    ```
    (See: [pnpm Installation](https://pnpm.io/installation))
3.  **Docker and Docker Compose:** Required for running the PostgreSQL database and pgAdmin.
    - Install Docker Desktop (which includes Docker Compose): [Docker Desktop](https://www.docker.com/products/docker-desktop/)
4.  **Git:** For cloning the repository. ([Git SCM](https://git-scm.com/))

**II. Getting Started**

1.  **Clone the Repository:**

    ```bash
    git clone https://github.com/arunv97/login-forge.git
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
    - Open the newly created `.env` file (e.g., `apps/server/.env`) and fill in the required values.
      It should look similar to this:

      ```env
      # Database connection - These should match your docker-compose.yml
      DATABASE_URL="postgresql://user_loginforge:password_loginforge@localhost:5432/db_loginforge?schema=public"

      # JWT Authentication
      JWT_SECRET="generate_a_strong_random_secret_key_for_jwt" # IMPORTANT: Change this!
      JWT_EXPIRATION_TIME="3600s" # e.g., 1 hour
      JWT_REFRESH_SECRET="generate_a_different_strong_random_secret_for_refresh_tokens" # IMPORTANT: Change this! (Will be used later)

      # OAuth Configuration (Google)
      # Each team member needs their own Google Cloud OAuth 2.0 credentials for local development.
      # See internal documentation or Google Cloud Console for setup.
      GOOGLE_CLIENT_ID="YOUR_DEV_GOOGLE_CLIENT_ID"
      GOOGLE_CLIENT_SECRET="YOUR_DEV_GOOGLE_CLIENT_SECRET"
      GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback" # Ensure this matches your GCP config

      # Application
      PORT=3000
      NODE_ENV="development"
      FRONTEND_URL="http://localhost:4200" # Default frontend URL for OAuth redirects
      ```

    - **CRITICAL:**
      - Replace placeholder JWT secrets with actual strong, random keys (e.g., use `openssl rand -hex 32` in your terminal to generate one).
      - For `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, each developer must obtain their own credentials from the [Google Cloud Console](https://console.cloud.google.com/) for their local development environment. This prevents quota issues and conflicts. Ensure "Authorized redirect URIs" in your Google Cloud OAuth settings exactly matches `GOOGLE_CALLBACK_URL`.
    - Navigate back to the project root: `cd ../..`

2.  **Prisma Client Generation (Handled by `serve-dev`):**
    The `pnpm nx serve-dev server` command (see below) will automatically run `prisma generate`. If you need to run it manually for any reason:
    ```bash
    pnpm nx db-generate server
    ```
    This uses the Prisma schema located at `apps/server/prisma/schema.prisma`. (Learn more: [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client))

**IV. Running the Application Locally**

1.  **Start Database and Backend Server (Recommended for Development):**
    From the project root directory, run:

    ```bash
    pnpm nx serve-dev server
    ```

    This single command orchestrates the following:

    - Starts the Docker containers for PostgreSQL and pgAdmin in the background (if not already running). See [Docker Compose CLI reference](https://docs.docker.com/compose/reference/).
    - Waits for the PostgreSQL database to report as healthy.
    - Applies any pending database migrations using `prisma migrate deploy`.
    - Generates the Prisma Client to ensure it's in sync with the schema.
    - Builds and starts the NestJS backend server (typically on `http://localhost:3000`).
    - The server will watch for code changes and attempt to hot-reload.

    You should see console output indicating Docker containers starting, migrations applying, Prisma Client generating, and then the NestJS application bootstrapping with its available routes.

2.  **Running the Frontend (Client) Application:**
    In a **separate terminal window/tab**, from the project root directory, run:
    ```bash
    pnpm nx serve client
    ```
    This will start the React frontend development server (typically on `http://localhost:4200`).

**V. Accessing the Applications**

- **Backend API (NestJS):** `http://localhost:3000/api`
- **API Documentation (Swagger UI):** `http://localhost:3000/api/docs` (Powered by [NestJS Swagger](https://docs.nestjs.com/openapi/introduction))
- **pgAdmin (Database GUI):** `http://localhost:5050` ([pgAdmin Official Site](https://www.pgadmin.org/))
  - Initial Login: email `admin@example.com`, password `admin` (or as configured in `docker-compose.yml`).
  - To connect to the project database:
    - Server Name (for display): `LoginForgeDB_Docker` (or any name you prefer)
    - Host name/address: `postgres` (this is the Docker service name)
    - Port: `5432`
    - Maintenance database: `db_loginforge`
    - Username: `user_loginforge`
    - Password: `password_loginforge`
- **Frontend Application (React):** `http://localhost:4200`

**VI. Database Migrations**

- **Automatic Application:** The `pnpm nx serve-dev server` command automatically applies existing, committed migrations using `prisma migrate deploy`.
- **Creating New Migrations (When You Change `schema.prisma`):**
  If you modify `apps/server/prisma/schema.prisma`, you need to generate a new migration file. From the project root, run:
  ```bash
  pnpm nx db-migrate-dev server --name "your-descriptive-migration-name"
  ```
  (Or just `pnpm nx db-migrate-dev server` and Prisma CLI will prompt for a name).
  Commit the generated migration files in `apps/server/prisma/migrations/` along with your schema changes. (Learn more: [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate))

**VII. Stopping the Development Environment**

1.  **Stop the Frontend Server:** Press `Ctrl+C` in the terminal where `pnpm nx serve client` is running.
2.  **Stop the Backend Server:** Press `Ctrl+C` in the terminal where `pnpm nx serve-dev server` is running.
3.  **Stop Docker Containers (Database & pgAdmin):**
    From the project root directory, run:
    ```bash
    pnpm nx stop-db server
    ```
    (Alternatively, `docker-compose down` from the root will also work).

**VIII. Development Workflow Tools (Nx)**

This project uses [Nx - Smart Monorepos. Fast CI.](https://nx.dev/) for workspace management.

- **Linting:**
  ```bash
  pnpm nx lint server
  pnpm nx lint client
  # To lint all affected projects: pnpm nx affected:lint
  ```
- **Testing (Unit/Integration):**
  ```bash
  pnpm nx test server
  pnpm nx test client
  # To test all affected projects: pnpm nx affected:test
  ```
- **End-to-End (E2E) Testing:**
  - Backend E2E:
    ````bash
    pnpm nx e2e server-e2e
    ```    *   Frontend E2E (Playwright):
    ```bash
    pnpm nx e2e client-e2e
    ````
