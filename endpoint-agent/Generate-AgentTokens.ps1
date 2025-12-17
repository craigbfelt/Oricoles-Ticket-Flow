<#
.SYNOPSIS
    Generate secure agent tokens for Oricol Endpoint Monitoring

.DESCRIPTION
    This script generates secure random tokens for authenticating endpoint agents.
    Tokens are generated with cryptographic randomness and can be exported to CSV
    for bulk deployment.

.PARAMETER Count
    Number of tokens to generate

.PARAMETER OutputFile
    CSV file to export tokens to

.PARAMETER TokenLength
    Length of each token (default: 32 characters)

.EXAMPLE
    .\Generate-AgentTokens.ps1 -Count 100 -OutputFile "tokens.csv"

.EXAMPLE
    .\Generate-AgentTokens.ps1 -Count 10 -TokenLength 64
#>

param(
    [Parameter(Mandatory=$true)]
    [int]$Count,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputFile = "",
    
    [Parameter(Mandatory=$false)]
    [int]$TokenLength = 32
)

function New-SecureToken {
    param([int]$Length = 32)
    
    # Generate cryptographically secure random token
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
    $rng.GetBytes($bytes)
    
    # Convert to base64 and make URL-safe
    $token = [Convert]::ToBase64String($bytes)
    $token = $token.Replace('+', '-').Replace('/', '_').Replace('=', '')
    
    return $token.Substring(0, [Math]::Min($Length, $token.Length))
}

function Get-TokenHash {
    param([string]$Token)
    
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Token)
    $hash = $sha256.ComputeHash($bytes)
    
    return [BitConverter]::ToString($hash).Replace('-', '').ToLower()
}

Write-Host "Generating $Count secure tokens..." -ForegroundColor Cyan

$tokens = @()

for ($i = 1; $i -le $Count; $i++) {
    $token = New-SecureToken -Length $TokenLength
    $tokenHash = Get-TokenHash -Token $token
    
    $tokenObj = [PSCustomObject]@{
        TokenNumber = $i
        Token = $token
        TokenHash = $tokenHash
        Generated = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        ExpiresAt = (Get-Date).AddYears(2).ToString("yyyy-MM-dd HH:mm:ss")
    }
    
    $tokens += $tokenObj
    
    if ($i % 10 -eq 0) {
        Write-Host "  Generated $i / $Count tokens..." -ForegroundColor Gray
    }
}

Write-Host "`nToken generation complete!" -ForegroundColor Green
Write-Host ""

# Display first 5 tokens as preview
Write-Host "Preview (first 5 tokens):" -ForegroundColor Yellow
$tokens | Select-Object -First 5 | Format-Table -AutoSize

# Export to CSV if specified
if ($OutputFile) {
    $tokens | Export-Csv -Path $OutputFile -NoTypeInformation
    Write-Host "`nTokens exported to: $OutputFile" -ForegroundColor Green
} else {
    Write-Host "`nNo output file specified. To export, use -OutputFile parameter." -ForegroundColor Yellow
}

# Generate SQL INSERT statements
Write-Host "`nSQL INSERT Statements (for Supabase SQL Editor):" -ForegroundColor Cyan
Write-Host "-- Copy and paste these into Supabase SQL Editor" -ForegroundColor Gray
Write-Host ""

$sqlStatements = @()
foreach ($token in $tokens) {
    $sql = "INSERT INTO endpoint_agent_tokens (token_hash, token_name, expires_at, is_active) VALUES ('$($token.TokenHash)', 'Token-$($token.TokenNumber)', NOW() + INTERVAL '2 years', true);"
    $sqlStatements += $sql
}

# Save SQL to file
$sqlFile = if ($OutputFile) { 
    [System.IO.Path]::ChangeExtension($OutputFile, "sql")
} else { 
    "agent-tokens-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql" 
}

$sqlStatements | Out-File -FilePath $sqlFile -Encoding UTF8
Write-Host "SQL statements saved to: $sqlFile" -ForegroundColor Green

# Display instructions
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run the SQL file in Supabase SQL Editor to insert tokens into database" -ForegroundColor White
Write-Host "2. Use the tokens from CSV file in your config.json files" -ForegroundColor White
Write-Host "3. Each endpoint can use the same token (recommended) or unique tokens" -ForegroundColor White
Write-Host ""
Write-Host "Security Notes:" -ForegroundColor Red
Write-Host "- Keep the CSV file secure - it contains the plain-text tokens" -ForegroundColor White
Write-Host "- Database only stores hashed versions for security" -ForegroundColor White
Write-Host "- Tokens expire in 2 years by default" -ForegroundColor White
Write-Host ""

# Summary
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Total tokens generated: $Count" -ForegroundColor White
Write-Host "  Token length: $TokenLength characters" -ForegroundColor White
Write-Host "  CSV file: $OutputFile" -ForegroundColor White
Write-Host "  SQL file: $sqlFile" -ForegroundColor White
Write-Host ""
