# LoginForge Full-Stack Application

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
    git clone https://github.com/arunv97/login-forge.git # Or your repository URL
    cd login-forge # Or your repository's root directory name
    ```

2.  **Install Dependencies:**
    From the root directory of the project, run:
    ```bash
    pnpm install
    ```
    This will install all necessary dependencies for the monorepo.

**III. Configuration**

1.  **Backend Environment Variables:**

    - At the **root** of the project, you will find an `.env.template` file. Copy this file to a new file named `.env` in the **same root directory**:
      ```bash
      cp .env.template .env
      ```
    - Open the newly created `.env` file (at the project root) and fill in the required values. It should look similar to this:

      ```env
      DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:5432/YOUR_DB_NAME?schema=public"

      JWT_SECRET="YOUR_JWT_STRONG_SECRET_KEY"
      JWT_EXPIRATION_TIME="15m"

      JWT_REFRESH_SECRET="YOUR_JWT_STRONG_REFRESH_SECRET_KEY"
      JWT_REFRESH_EXPIRATION_TIME="7d"

      USER_DELETION_CRON_SCHEDULE="0 2 * * *"
      USER_DELETION_RETENTION_DAYS="5"

      GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
      GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
      GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

      CLOUDINARY_CLOUD_NAME="YOUR_CLOUDINARY_CLOUD_NAME"
      CLOUDINARY_API_KEY="YOUR_CLOUDINARY_API_KEY"
      CLOUDINARY_API_SECRET="YOUR_CLOUDINARY_API_SECRET"
      CLOUDINARY_UPLOAD_FOLDER="login_forge_avatars"

      PORT=3000
      NODE_ENV="development"
      FRONTEND_URL="http://localhost:4200"
      ```

    - **CRITICAL:**
      - For `DATABASE_URL`, use `user_loginforge`, `password_loginforge`, and `db_loginforge` if you are using the default `docker-compose.yml` settings provided with this project.
      - Replace placeholder JWT secrets with actual strong, random keys (e.g., use `openssl rand -hex 32` in your terminal to generate some).
      - For `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`, each developer must obtain their own credentials from the respective cloud provider dashboards for their local development environment.
      - Ensure "Authorized redirect URIs" in your Google Cloud OAuth settings exactly matches `GOOGLE_CALLBACK_URL`.

2.  **Prisma Client Generation (Handled by `serve-dev`):**
    The `pnpm nx serve-dev server` command (see below) will automatically run `prisma generate`. If you need to run it manually from the project root:
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

    This command orchestrates:

    - Starting Docker containers for PostgreSQL and pgAdmin (if not running). See [Docker Compose CLI reference](https://docs.docker.com/compose/reference/).
    - Waiting for PostgreSQL to be healthy.
    - Applying pending database migrations (`prisma migrate deploy`).
    - Generating Prisma Client.
    - Building and starting the NestJS backend server (typically on `http://localhost:3000`).
    - The server will watch for code changes and attempt to hot-reload.

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
  - Initial Login: Use the email and password set in your `docker-compose.yml` for `PGADMIN_DEFAULT_EMAIL` and `PGADMIN_DEFAULT_PASSWORD` (e.g., `admin@example.com` / `admin`).
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
- **Creating New Migrations (When You Change `apps/server/prisma/schema.prisma`):**
  If you modify the schema, generate a new migration file from the project root:
  ```bash
  pnpm nx db-migrate-dev server --name "your-descriptive-migration-name"
  ```
  (Or just `pnpm nx db-migrate-dev server` and Prisma CLI will prompt for a name).
  Commit the generated migration files in `apps/server/prisma/migrations/` along with your schema changes. (Learn more: [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate))

**VII. Stopping the Development Environment**

1.  **Stop the Frontend Server:** Press `Ctrl+C` in the terminal where `pnpm nx serve client` is running.
2.  **Stop the Backend Server:** Press `Ctrl+C` in the terminal where `pnpm nx serve-dev server` is running. This command might take a moment to fully terminate as it also tries to shut down processes gracefully.
3.  **Stop Docker Containers (Database & pgAdmin):**
    From the project root directory, run:
    ```bash
    pnpm nx stop-db server
    ```
    (Alternatively, `docker-compose down` from the root where `docker-compose.yml` is located will also work).

**VIII. Development Workflow Tools (Nx)**

This project uses [Nx - Smart Monorepos. Fast CI.](https://nx.dev/) for workspace management. All `nx` commands should be run from the project root.

- **Linting:**
  ```bash
  pnpm nx lint server
  pnpm nx lint client
  # To lint all affected projects: pnpm nx affected --target=lint
  ```
- **Testing (Unit/Integration):**
  ```bash
  pnpm nx test server
  pnpm nx test client
  # To test all affected projects: pnpm nx affected --target=test
  ```
- **End-to-End (E2E) Testing:**
  - Backend E2E:
    ```bash
    pnpm nx e2e server-e2e
    ```
  - Frontend E2E (Playwright):
    ```bash
    pnpm nx e2e client-e2e
    ```
