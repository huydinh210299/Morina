# Deploying RentalShop to AWS EC2

This repository is now set up for a production path with optional HTTPS:

- One EC2 instance
- Dockerized Node.js app
- MongoDB running on the same EC2 instance in Docker
- Nginx reverse proxy in front of the app
- Let's Encrypt certificates for HTTPS
- GitHub Actions deploys on push to `main`

## 1. Create the AWS EC2 instance

Use the Terraform files in [infra/terraform](C:\Users\thinkbook\Documents\RentalShop\infra\terraform).

1. Install Terraform and configure AWS credentials locally.
2. Copy `infra/terraform/terraform.tfvars.example` to `infra/terraform/terraform.tfvars`.
3. Set `key_name` to an existing EC2 key pair in your AWS account.
4. Tighten `ssh_cidr_blocks` if possible so SSH is not open to the world.
5. Run:

```bash
cd infra/terraform
terraform init
terraform apply
```

After `terraform apply`, note the `public_ip` output.

## 2. Point your domain to the EC2 server

Before HTTPS can work, your domain must point to the instance.

1. Buy or use an existing domain.
2. In your DNS provider, create an `A` record:
   - Host: `app` or `@`
   - Value: your EC2 `public_ip`
3. Wait for DNS propagation.

Example:

- `app.example.com` -> `18.142.10.25`

## 3. Push this code to GitHub

Create a GitHub repository, then push this project to the branch that will deploy from `main`.

## 4. Add GitHub repository secrets

In GitHub, open `Settings > Secrets and variables > Actions` and add:

- `EC2_HOST`: the EC2 public IP or DNS name
- `EC2_USER`: `ec2-user`
- `EC2_SSH_KEY`: the private key content for the EC2 key pair
- `APP_ENV_FILE`: the full production `.env` content

Example `APP_ENV_FILE`:

```dotenv
PORT=3000
NODE_ENV=production
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d
COOKIE_NAME=rentalshop_token
DOMAIN_NAME=app.example.com
LETSENCRYPT_EMAIL=admin@example.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace_with_a_long_random_password
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=replace_with_a_long_random_password
MONGODB_URI=mongodb://admin:replace_with_a_long_random_password@mongodb:27017/rental-shop?authSource=admin
```

You can start from [.env.production.example](C:\Users\thinkbook\Documents\RentalShop\.env.production.example).

If you do not set `DOMAIN_NAME` and `LETSENCRYPT_EMAIL`, deployment still works, but only on plain HTTP.

## 5. First deployment

The GitHub Actions workflow at [.github/workflows/deploy.yml](C:\Users\thinkbook\Documents\RentalShop\.github\workflows\deploy.yml) runs automatically on every push to `main`, or you can trigger it manually from the Actions tab.

The workflow will:

1. Package the application
2. Upload it to the EC2 instance over SSH
3. Write the production `.env`
4. Start or rebuild the app, MongoDB, and Nginx containers
5. Request a Let's Encrypt certificate when domain settings are present
6. Switch Nginx from HTTP-only to HTTPS

## 6. Verify the app

After deployment:

- Open `https://<your-domain>/`
- Check the health endpoint at `https://<your-domain>/health`

If the certificate is not issued on first deploy:

1. Confirm the domain `A` record points to the EC2 public IP.
2. Confirm ports `80` and `443` are open in AWS.
3. Run the GitHub Actions deploy workflow again after DNS propagation finishes.

## 7. Renew certificates

Let's Encrypt certificates expire every 90 days, so renew them automatically on the EC2 instance.

SSH into the server and add a cron job:

```bash
crontab -e
```

Add:

```cron
0 3 * * * APP_DIR=/opt/rental-shop bash /opt/rental-shop/scripts/renew-certs.sh >> /var/log/rental-shop-certbot.log 2>&1
```

This renews the certificate daily at 03:00 server time and reloads Nginx when needed.

## Notes

- MongoDB data persists in the Docker volume `mongodb_data`.
- The Node.js app is no longer exposed directly to the internet; Nginx proxies traffic to it internally.
- This setup is intentionally simple and good for a small single-instance deployment.
- For higher reliability later, the next upgrades would be an Application Load Balancer, managed TLS with ACM, and MongoDB Atlas instead of MongoDB on the same host.
