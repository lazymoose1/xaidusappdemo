# AWS Deployment Guide for Dus API

## Prerequisites
1. AWS Account with billing enabled
2. AWS CLI installed and configured
3. MongoDB Atlas database

## Step 1: Configure AWS CLI

Get your AWS Access Keys from: https://console.aws.amazon.com/iam/home#/security_credentials

```bash
aws configure
# Enter your Access Key ID, Secret Access Key, default region (us-east-1), and output format (json)
```

## Step 2: Prepare Your Application

```bash
cd server
npm run build  # Compile TypeScript to JavaScript
```

## Step 3: Create S3 Bucket for Deployment

```bash
# Create a unique bucket name
BUCKET_NAME="dus-api-deploy-$(date +%s)"
aws s3 mb s3://$BUCKET_NAME

# Upload your built application
aws s3 cp dist/ s3://$BUCKET_NAME/dist/ --recursive
aws s3 cp package.json s3://$BUCKET_NAME/
aws s3 cp package-lock.json s3://$BUCKET_NAME/
```

## Step 4: Create Elastic Beanstalk Application

```bash
# Create the application
aws elasticbeanstalk create-application \
  --application-name dus-api \
  --description "Dus API Backend"

# Create the environment
aws elasticbeanstalk create-environment \
  --application-name dus-api \
  --environment-name dus-api-prod \
  --solution-stack-name "64bit Amazon Linux 2023 v6.0.0 running Node.js 18" \
  --option-settings '[
    {"Namespace": "aws:autoscaling:launchconfiguration", "OptionName": "InstanceType", "Value": "t3.micro"},
    {"Namespace": "aws:elasticbeanstalk:application:environment", "OptionName": "NODE_ENV", "Value": "production"},
    {"Namespace": "aws:elasticbeanstalk:application:environment", "OptionName": "PORT", "Value": "8080"}
  ]'
```

## Step 5: Set Environment Variables

```bash
aws elasticbeanstalk update-environment \
  --application-name dus-api \
  --environment-name dus-api-prod \
  --option-settings '[
    {"Namespace": "aws:elasticbeanstalk:application:environment", "OptionName": "DB_PASSWORD", "Value": "YOUR_MONGODB_PASSWORD"},
    {"Namespace": "aws:elasticbeanstalk:application:environment", "OptionName": "JWT_SECRET", "Value": "your-super-secret-jwt-key"},
    {"Namespace": "aws:elasticbeanstalk:application:environment", "OptionName": "TOKEN_ENCRYPTION_KEY", "Value": "32-character-random-key"},
    {"Namespace": "aws:elasticbeanstalk:application:environment", "OptionName": "MONGODB_DBNAME", "Value": "dusapp"}
  ]'
```

## Step 6: Get Your API URL

```bash
aws elasticbeanstalk describe-environments \
  --application-name dus-api \
  --environment-names dus-api-prod \
  --query 'Environments[0].CNAME' \
  --output text
```

This will give you something like: `dus-api-prod.elasticbeanstalk.com`

## Step 7: Update Frontend

In your main project `.env` file, update:

```dotenv
VITE_API_BASE=https://dus-api-prod.elasticbeanstalk.com
```

## Alternative: Use the Automated Script

If you prefer automation, run:

```bash
cd server
./deploy-aws.sh
```

But you'll still need to manually set the environment variables in AWS Console.

## Cost Estimate

- **EC2 t3.micro**: ~$8-10/month
- **Elastic Beanstalk**: Free (you only pay for underlying resources)
- **S3 Storage**: ~$1/month for deployment files

## Troubleshooting

1. **Environment fails to start**: Check AWS CloudWatch logs in the Elastic Beanstalk console
2. **Database connection fails**: Verify your MongoDB Atlas IP whitelist includes `0.0.0.0/0` or your AWS IP
3. **Port issues**: Elastic Beanstalk uses port 8080 internally, but serves on port 80 externally

## Next Steps

1. Test your deployed API: `curl https://your-api-url.elasticbeanstalk.com/api/health`
2. Deploy your frontend to Netlify/Vercel with the new API URL
3. Set up monitoring with AWS CloudWatch