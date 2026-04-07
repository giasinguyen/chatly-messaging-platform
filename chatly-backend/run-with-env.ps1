$envFile = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envFile)) {
    Write-Error ".env file not found at $envFile"
    exit 1
}

Get-Content $envFile |
  Where-Object { $_ -and -not ($_ -match '^\s*#') } |
  ForEach-Object {
    $parts = $_ -split '=', 2
    if ($parts.Length -eq 2) {
      $name  = $parts[0].Trim()
      $value = $parts[1].Trim().Trim('"')
      [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
  }

Write-Host "Loaded .env — starting Spring Boot..." -ForegroundColor Cyan
mvn spring-boot:run
