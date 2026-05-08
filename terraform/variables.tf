variable "backend_image" {
  description = "Backend Docker image"
  type        = string
  default     = "ghcr.io/lyutinal/shiftcontrol:latest"
}

variable "frontend_image" {
  description = "Frontend Docker image"
  type        = string
  default     = "ghcr.io/lyutinal/shiftcontrol-frontend:latest"
}

variable "postgres_version" {
  description = "PostgreSQL image tag"
  type        = string
  default     = "16-alpine"
}

variable "redis_version" {
  description = "Redis image tag"
  type        = string
  default     = "7-alpine"
}

variable "frontend_port" {
  description = "Host port for the frontend (nginx)"
  type        = number
  default     = 8080
}

variable "postgres_db" {
  description = "PostgreSQL database name"
  type        = string
  default     = "shiftcontrol"
}

variable "postgres_user" {
  description = "PostgreSQL username"
  type        = string
  default     = "shiftcontrol"
}

variable "postgres_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "secret_key" {
  description = "Application secret key for session signing"
  type        = string
  sensitive   = true
}
