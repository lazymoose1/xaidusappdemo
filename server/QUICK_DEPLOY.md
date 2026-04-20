# Quick AWS Deployment (Manual Method)

Since AWS CLI setup is tricky, here's the manual approach:

## 1. Build Your App
```bash
cd server
npm run build
```

## 2. Create ZIP for Deployment
```bash
zip -r dus-api-deploy.zip dist/ package.json package-lock.json .env
```

## 3. AWS Console Steps

### Create S3 Bucket
1. Go to https://console.aws.amazon.com/s3/
2. Create bucket: `dus-api-deployments`
3. Upload `dus-api-deploy.zip`

### Create Elastic Beanstalk App
1. Go to https://console.aws.amazon.com/elasticbeanstalk/
2. Create application: "dus-api"
3. Choose "Node.js" platform
4. Upload your ZIP from S3
5. Configure environment:
   - Instance type: t3.micro
   - **VPC**: Use default VPC
   - **Subnets**: Select 2+ public subnets (different AZs for HA)
   - **Database**: Skip RDS (you're using MongoDB Atlas)
   - Environment variables:
     - JWT_SECRET: your_jwt_secret
     - TOKEN_ENCRYPTION_KEY: 32_char_random_key
     - MONGODB_DBNAME: dusapp

## 4. Get Your API URL
Once deployed, EB will give you a URL like: `dus-api-prod.elasticbeanstalk.com`

## 5. Update Frontend
```dotenv
VITE_API_BASE=https://dus-api-prod.elasticbeanstalk.com
```

## Cost: ~$8-10/month

That's it! Much simpler than CLI setup.