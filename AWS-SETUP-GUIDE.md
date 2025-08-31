# 🚨 AWS Amplify Setup Guide - URGENT FIXES

## 🔴 CRITICAL: Remove .env files from GitHub IMMEDIATELY!

### Step 1: Delete .env files from GitHub
1. Go to your GitHub repository: https://github.com/Naseem0712/riders-
2. Delete these files:
   - `.env` 
   - `.env.production`
3. Commit: "🔒 Remove sensitive environment files"

### Step 2: Upload Updated amplify.yml
Upload the new `amplify.yml` file to GitHub (overwrite the old one)

### Step 3: Configure Environment Variables in AWS Amplify Console

**Go to AWS Amplify → Your App → Environment Variables**

Add these variables:

```
MONGODB_URI = mongodb+srv://finilexnaseem_db_user:zWy6nTHBcN0XJoOC@cluster0.mongodb.net/riders-luxury?retryWrites=true&w=majority&appName=Cluster0

JWT_SECRET = riders-luxury-production-secret-key-2024-aws-amplify

NODE_ENV = production

PORT = 8080

FRONTEND_URL = https://your-app-name.amplifyapp.com
```

### Step 4: Build Settings in AWS Amplify
1. **App Settings → Build Settings**
2. Make sure **amplify.yml** is detected
3. **Node.js version**: 18.x or 20.x

### Step 5: Redeploy
1. Click **"Redeploy this version"** 
2. Or trigger new build from GitHub

## ✅ Expected Build Log:
```
Installing dependencies...
Environment check...
MONGODB_URI=mongodb+srv://...
Building Riders Luxury App...
Server started successfully
Build completed successfully!
```

## 🚀 After Successful Deploy:
Your app will be live at: `https://your-app-name.amplifyapp.com`

## 🔧 If Still Failing:
Check build logs for specific errors and share them.
