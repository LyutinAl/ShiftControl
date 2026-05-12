# --- Network ---

resource "docker_network" "internal" {
  name   = "shiftcontrol_internal"
  driver = "bridge"
}

# --- Volumes ---

resource "docker_volume" "postgres_data" {
  name = "shiftcontrol_postgres_data"
}

resource "docker_volume" "redis_data" {
  name = "shiftcontrol_redis_data"
}

resource "docker_volume" "media_data" {
  name = "shiftcontrol_media_data"
}

# --- Images ---

resource "docker_image" "postgres" {
  name         = "postgres:${var.postgres_version}"
  keep_locally = true
}

resource "docker_image" "redis" {
  name         = "redis:${var.redis_version}"
  keep_locally = true
}

resource "docker_image" "backend" {
  name         = var.backend_image
  keep_locally = true
}

resource "docker_image" "frontend" {
  name         = var.frontend_image
  keep_locally = true
}

# --- Containers ---

resource "docker_container" "db" {
  name    = "shiftcontrol_db"
  image   = docker_image.postgres.image_id
  restart = "unless-stopped"

  env = [
    "POSTGRES_DB=${var.postgres_db}",
    "POSTGRES_USER=${var.postgres_user}",
    "POSTGRES_PASSWORD=${var.postgres_password}",
  ]

  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }

  networks_advanced {
    name = docker_network.internal.name
  }

  healthcheck {
    test     = ["CMD-SHELL", "pg_isready -U ${var.postgres_user} -d ${var.postgres_db}"]
    interval = "10s"
    timeout  = "5s"
    retries  = 5
  }
}

resource "docker_container" "cache" {
  name    = "shiftcontrol_cache"
  image   = docker_image.redis.image_id
  command = ["redis-server", "--appendonly", "yes"]
  restart = "unless-stopped"

  volumes {
    volume_name    = docker_volume.redis_data.name
    container_path = "/data"
  }

  networks_advanced {
    name = docker_network.internal.name
  }
}

resource "docker_container" "backend" {
  name    = "shiftcontrol_backend"
  image   = docker_image.backend.image_id
  restart = "unless-stopped"

  env = [
    "DATABASE_URL=postgresql+psycopg://${var.postgres_user}:${var.postgres_password}@${docker_container.db.name}:5432/${var.postgres_db}",
    "SECRET_KEY=${var.secret_key}",
  ]

  ports {
    internal = 8000
    external = 8000
  }

  volumes {
    volume_name    = docker_volume.media_data.name
    container_path = "/app/media"
  }

  networks_advanced {
    name    = docker_network.internal.name
    aliases = ["backend"]
  }

  depends_on = [
    docker_container.db,
    docker_container.cache,
  ]
}

resource "docker_container" "frontend" {
  name    = "shiftcontrol_frontend"
  image   = docker_image.frontend.image_id
  restart = "unless-stopped"

  ports {
    internal = 80
    external = var.frontend_port
  }

  networks_advanced {
    name = docker_network.internal.name
  }

  depends_on = [docker_container.backend]
}
