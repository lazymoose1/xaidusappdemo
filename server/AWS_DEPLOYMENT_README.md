# AWS Elastic Beanstalk Deployment Guide

## Prerequisites

1. **AWS Account**: Sign up at [aws.amazon.com](https://aws.amazon.com)
2. **AWS CLI**: Install and configure with your access keys
3. **EB CLI**: Install with `pip install awsebcli`

## Step 1: Configure AWS CLI

```bash
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (us-east-1 recommended)
- Default output format (json)

## Step 2: Initialize Elastic Beanstalk

```bash
cd server
eb init
```

Choose:
- Region: us-east-1 (or your preferred region)
- Application name: dus-api (or your choice)
- Platform: Node.js
- Platform version: Latest Node.js version
- CodeCommit: No

## Step 3: Create Environment

```bash
eb create production-env
```

This will:
- Create an EC2 instance
- Set up load balancer
- Configure auto-scaling
- Deploy your app

## Step 4: Set Environment Variables

```bash
# Database
eb setenv DB_PASSWORD=your_mongodb_atlas_password
eb setenv JWT_SECRET=your_secure_jwt_secret
eb setenv TOKEN_ENCRYPTION_KEY=your_32_char_key

# Optional: OAuth, AWS services, etc.
eb setenv GOOGLE_CLIENT_ID=your_google_client_id
eb setenv OPENAI_API_KEY=your_openai_key
```

## Step 5: Update Frontend

In your frontend `.env` file, update the API base URL:

```dotenv
VITE_API_BASE=https://your-app-name.elasticbeanstalk.com
```

## Step 6: Deploy Updates

```bash
eb deploy
```

## Useful Commands

```bash
# Check status
eb status

# View logs
eb logs

# Open app in browser
eb open

# Terminate environment (be careful!)
eb terminate production-env
```

## Environment Variables Reference

### Required
- `DB_PASSWORD`: Your MongoDB Atlas password
- `JWT_SECRET`: Random string for JWT signing
- `TOKEN_ENCRYPTION_KEY`: 32-character random key

### Optional
- `GOOGLE_CLIENT_ID/SECRET`: For Google OAuth
- `FACEBOOK_APP_ID/SECRET`: For Facebook OAuth
- `OPENAI_API_KEY`: For AI features
- `AWS_ACCESS_KEY_ID/SECRET`: For S3 file uploads
- `AWS_S3_BUCKET`: S3 bucket name

## Troubleshooting

1. **App not starting**: Check logs with `eb logs`
2. **Database connection**: Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0`
3. **Environment variables**: Use `eb printenv` to check current values
4. **Health check failing**: Ensure your app responds to `GET /api/health`

## Cost Estimation

- **t3.micro instance**: ~$10/month
- **Load balancer**: ~$15/month
- **Data transfer**: Variable based on usage

Monitor costs in AWS Billing console.