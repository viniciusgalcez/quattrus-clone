param(
  [Parameter(Mandatory = $true)]
  [string]$DumpPath,
  [string]$EnvFile = ".env.production",
  [string]$Project = "gestiona-prod",
  [switch]$ConfirmRestore
)

$ErrorActionPreference = "Stop"

if (-not $ConfirmRestore) {
  throw "Restore is cancelled by default. Run again with -ConfirmRestore after confirming that the destination may be overwritten."
}

if (-not (Test-Path -LiteralPath $DumpPath)) {
  throw "Backup file not found: $DumpPath"
}

function Read-EnvValue {
  param([string]$Name, [string]$Default)

  if (Test-Path -LiteralPath $EnvFile) {
    $line = Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
    if ($line) {
      return ($line -replace "^$Name=", "").Trim('"').Trim("'")
    }
  }

  $value = [Environment]::GetEnvironmentVariable($Name)
  if ($value) { return $value }
  return $Default
}

$postgresUser = Read-EnvValue -Name "POSTGRES_USER" -Default "quattrus"
$postgresDb = Read-EnvValue -Name "POSTGRES_DB" -Default "quattrus"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$containerDumpPath = "/tmp/gestiona-restore-$timestamp.dump"
$containerId = docker compose --env-file $EnvFile -p $Project ps -q postgres
if (-not $containerId) {
  throw "Postgres container not found for compose project $Project."
}

docker cp $DumpPath "${containerId}:$containerDumpPath"
try {
  docker compose --env-file $EnvFile -p $Project exec -T postgres pg_restore -U $postgresUser -d $postgresDb --clean --if-exists --no-owner $containerDumpPath
} finally {
  docker compose --env-file $EnvFile -p $Project exec -T postgres rm -f $containerDumpPath
}

Write-Host "Restore completed from $DumpPath"
