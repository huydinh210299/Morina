variable "aws_region" {
  description = "AWS region for the EC2 instance."
  type        = string
  default     = "ap-southeast-1"
}

variable "app_name" {
  description = "Name used for AWS resource tags and paths."
  type        = string
  default     = "rental-shop"
}

variable "instance_type" {
  description = "EC2 instance type."
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Existing AWS EC2 key pair name for SSH access."
  type        = string
}

variable "root_volume_size" {
  description = "Root EBS volume size in GiB."
  type        = number
  default     = 20
}

variable "ssh_cidr_blocks" {
  description = "CIDR blocks allowed to SSH into the instance."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "http_cidr_blocks" {
  description = "CIDR blocks allowed to reach the app on port 80."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
