output "frontend_url" {
  description = "URL приложения"
  value       = "http://localhost:${var.frontend_port}"
}

output "container_names" {
  description = "Имена запущенных контейнеров"
  value = {
    frontend = docker_container.frontend.name
    backend  = docker_container.backend.name
    db       = docker_container.db.name
    cache    = docker_container.cache.name
  }
}

output "network_name" {
  description = "Имя Docker-сети"
  value       = docker_network.internal.name
}

output "volumes" {
  description = "Имена Docker volumes"
  value = {
    postgres = docker_volume.postgres_data.name
    redis    = docker_volume.redis_data.name
    media    = docker_volume.media_data.name
  }
}
