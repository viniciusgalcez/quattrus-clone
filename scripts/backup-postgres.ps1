param(
  [string]$EnvFile = ".env.production",
  [string]$Project = "gestiona-prod",
  [string]$BackupDir = "backups"
)

$ErrorActionPreference = "Stop"

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
$containerDumpPath = "/tmp/gestiona-$timestamp.dump"

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$backupPath = Join-Path $BackupDir "gestiona-$timestamp.dump"
$containerId = docker compose --env-file $EnvFile -p $Project ps -q postgres
if (-not $containerId) {
  throw "Postgres container not found for compose project $Project."
}

docker compose --env-file $EnvFile -p $Project exec -T postgres pg_dump -U $postgresUser -d $postgresDb -Fc -f $containerDumpPath
docker cp "${containerId}:$containerDumpPath" $backupPath
docker compose --env-file $EnvFile -p $Project exec -T postgres rm -f $containerDumpPath

Write-Host "Backup created at $backupPath"
