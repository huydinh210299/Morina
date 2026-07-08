# Deploying RentalShop to AWS EC2

This repository is now set up for a simple production path:

- One EC2 instance
- Dockerized Node.js app
- MongoDB running on the same EC2 instance in Docker
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

## 2. Push this code to GitHub

Create a GitHub repository, then push this project to the branch that will deploy from `main`.

## 3. Add GitHub repository secrets

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
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=replace_with_a_long_random_password
MONGODB_URI=mongodb://admin:replace_with_a_long_random_password@mongodb:27017/rental-shop?authSource=admin
```

You can start from [.env.production.example](C:\Users\thinkbook\Documents\RentalShop\.env.production.example).

## 4. First deployment

The GitHub Actions workflow at [.github/workflows/deploy.yml](C:\Users\thinkbook\Documents\RentalShop\.github\workflows\deploy.yml) runs automatically on every push to `main`, or you can trigger it manually from the Actions tab.

The workflow will:

1. Package the application
2. Upload it to the EC2 instance over SSH
3. Write the production `.env`
4. Run Docker Compose
5. Start or rebuild the app and MongoDB containers

## 5. Verify the app

After deployment:

- Open `http://<your-ec2-public-ip>/`
- Check the health endpoint at `http://<your-ec2-public-ip>/health`

## Notes

- MongoDB data persists in the Docker volume `mongodb_data`.
- The app is exposed on port `80`.
- This setup is intentionally simple and good for a small single-instance deployment.
- For higher reliability later, the next upgrades would be an Application Load Balancer, HTTPS via Nginx or ALB + ACM, and MongoDB Atlas or DocumentDB instead of MongoDB on the same host.
