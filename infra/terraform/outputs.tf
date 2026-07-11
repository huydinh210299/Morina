output "instance_id" {
  value = aws_instance.app.id
}

output "public_ip" {
  value = aws_eip.app.public_ip
}

output "public_dns" {
  value = aws_instance.app.public_dns
}

output "ssh_command" {
  value = "ssh ec2-user@${aws_eip.app.public_ip}"
}

output "atlas_ip_access_list_entry" {
  description = "Add this CIDR to the MongoDB Atlas project IP access list."
  value       = "${aws_eip.app.public_ip}/32"
}
