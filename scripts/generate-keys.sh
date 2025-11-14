#!/bin/bash

# Generate JWT keys for Supabase self-hosted deployment
# This script generates secure random keys for production use

set -e

echo "🔑 Generating JWT Keys for Supabase..."
echo ""

# Generate random JWT secret (32+ characters)
JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-64)

# Function to generate JWT token
generate_jwt() {
    local role=$1
    local secret=$2
    local expiry=${3:-1983812996}  # Far future expiry
    
    # Header
    header='{"alg":"HS256","typ":"JWT"}'
    
    # Payload
    payload="{\"iss\":\"supabase\",\"role\":\"$role\",\"exp\":$expiry}"
    
    # Encode header and payload
    header_b64=$(echo -n "$header" | openssl base64 -e | tr -d '=' | tr '/+' '_-' | tr -d '\n')
    payload_b64=$(echo -n "$payload" | openssl base64 -e | tr -d '=' | tr '/+' '_-' | tr -d '\n')
    
    # Create signature
    signature=$(echo -n "${header_b64}.${payload_b64}" | openssl dgst -sha256 -hmac "$secret" -binary | openssl base64 -e | tr -d '=' | tr '/+' '_-' | tr -d '\n')
    
    # Return complete JWT
    echo "${header_b64}.${payload_b64}.${signature}"
}

# Generate keys
ANON_KEY=$(generate_jwt "anon" "$JWT_SECRET")
SERVICE_ROLE_KEY=$(generate_jwt "service_role" "$JWT_SECRET")

# Generate random postgres password
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

echo "✅ Keys generated successfully!"
echo ""
echo "Add these to your .env file:"
echo ""
echo "# Database"
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo ""
echo "# JWT Configuration"
echo "JWT_SECRET=$JWT_SECRET"
echo ""
echo "# API Keys"
echo "ANON_KEY=$ANON_KEY"
echo "SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
echo ""
echo "# Frontend .env"
echo "VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY"
echo ""
echo "⚠️  IMPORTANT: Keep these keys secure and never commit them to version control!"
echo ""
