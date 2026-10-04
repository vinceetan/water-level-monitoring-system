# Web Deployment Documentation

This document explains the containerization strategy for the Water Level Monitoring System, covering how the frontend and backend are packaged, and how `docker-compose` orchestrates the entire application.

## 1. How Frontend is Containerized

The frontend (React + Vite) is containerized using a **multi-stage Docker build** to keep the final image lightweight and secure (`frontend/Dockerfile`):

- **Stage 1: Build (`node:22-alpine`)**
  - Uses a lightweight Node.js alpine image.
  - Copies `package.json` and `package-lock.json` first, taking advantage of Docker's layer caching for dependencies.
  - Installs dependencies using `npm ci` for a clean, reproducible installation.
  - Copies the rest of the source code and runs `npm run build` to generate the production-ready static files in the `dist` folder.

- **Stage 2: Production (`nginx:1.27-alpine`)**
  - Uses an Nginx alpine image to serve the built static assets.
  - Removes the default Nginx configuration and replaces it with a custom setup.
  - Copies the built assets from the `build` stage (`/app/dist`) into Nginx's serving directory (`/usr/share/nginx/html`).
  - Sets up an Nginx server block that includes gzip compression, static asset caching headers, and a crucial **SPA fallback route** (`try_files $uri $uri/ /index.html;`), which ensures that client-side routing works correctly when users refresh the page.
  - Exposes port 80 and runs Nginx in the foreground.

## 2. How Backend is Containerized

The backend (Laravel API) is also containerized using a **multi-stage Docker build**, ensuring only necessary files and extensions are present in production (`backend/Dockerfile`):

- **Stage 1: Composer Dependencies (`composer:2`)**
  - Uses the official Composer image.
  - Copies `composer.json` and `composer.lock`, and runs `composer install` with flags (`--no-dev`, `--optimize-autoloader`) to fetch and prepare production PHP dependencies securely and efficiently.

- **Stage 2: Application (`php:8.4-fpm-alpine`)**
  - Uses a PHP FastCGI Process Manager (FPM) alpine image.
  - Installs required Alpine system dependencies (like `nginx`, `supervisor`, `curl`) and compiles necessary PHP extensions required by Laravel and MySQL (e.g., `pdo_mysql`, `gd`, `mbstring`, `zip`).
  - Copies the Composer `vendor` directory from Stage 1, followed by the rest of the application source code.
  - Creates necessary Laravel storage/cache directories and explicitly sets `www-data` ownership and permissions (`775`) to prevent runtime permission errors.
  - Generates the default `.env` from `.env.example` and discovers Laravel packages.
  - **Process Management**: Rather than running PHP-FPM and a web server in separate containers, this Dockerfile sets up **Supervisord**. It creates an Nginx configuration (which reverse-proxies PHP requests to the local `127.0.0.1:9000` PHP-FPM socket) and a Supervisor configuration (`supervisord.conf`) to keep both `nginx` and `php-fpm` running simultaneously within the same container.
  - Exposes port 80 and starts Supervisord as the main process.

## 3. How Docker Compose Orchestrates the Application

The `docker-compose.yml` file is the central orchestrator that wires all these components together. It defines four main services operating on a shared bridge network (`wlms-network`):

- **Database (`db`)**
  - Runs a MySQL 8.0 instance.
  - Configures the root password, database name, user, and user password via environment variables.
  - Mounts a local volume (`./data/mysql`) to ensure database data persists across container restarts.
  - Implements a `healthcheck` that pings MySQL continuously, so dependent services know exactly when the database is actually ready to accept connections.
  - Maps host port 4406 to container port 3306.

- **Backend (`backend`)**
  - Builds from the `backend/Dockerfile`.
  - Injects essential Laravel environment variables (like database credentials) directly from the compose configuration so it connects correctly to the `db` service.
  - Binds a volume (`./data/backend/storage`) for Laravel's storage folder, persisting logs and uploaded files.
  - Uses `depends_on` with a `condition: service_healthy` for the database. This ensures the backend will not attempt to start until MySQL is fully initialized and passing health checks.
  - Maps host port 8082 to container port 80.

- **Frontend (`frontend`)**
  - Builds from the `frontend/Dockerfile`.
  - Maps host port 82 to container port 80, making the web UI accessible.
  - Depends on the `backend` service starting up first.

- **phpMyAdmin (`phpmyadmin`)**
  - Provides a web-based GUI for the database.
  - Connects securely to the `db` container over the shared Docker network.
  - Depends on the `db` service's health check.
  - Maps host port 8080 to container port 80.

All services are configured with `restart: unless-stopped` to ensure high availability and automatic recovery upon system reboots or unexpected crashes.

## 4. Cloud Deployment (Host Nginx Reverse Proxy)

To expose the application to the internet securely, an Nginx server was set up on the **host machine** to act as a reverse proxy. This handles incoming web traffic on standard HTTP/HTTPS ports and routes it to the respective Docker containers.

### Configuration Overview

- **Port Setup:** The host Nginx is configured to listen on the standard web ports (80 and 443 for SSL). 
- **Traffic Routing:** 
  - Requests to the main domain are proxied to the **Frontend container** running on local port `82`.
  - Requests to the API domain are proxied to the **Backend container** running on local port `8082`.
- **SSL/TLS:** SSL certificates can be managed at this host Nginx layer (e.g., via Certbot), securing the connections before they are routed internally to the isolated Docker network.

By using this reverse proxy on the host machine, you benefit from a centralized place to manage SSL certificates and domain routing, while keeping the internal application architecture containerized and isolated.
