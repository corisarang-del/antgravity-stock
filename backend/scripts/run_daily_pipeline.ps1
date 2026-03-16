$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $scriptDir
$logDir = Join-Path $backendDir "logs"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logPath = Join-Path $logDir "daily_pipeline_$timestamp.log"

Set-Location $backendDir
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  $line | Tee-Object -FilePath $logPath -Append
}

Write-Log "daily pipeline started"
python .\scripts\daily_ingest.py 2>&1 | Tee-Object -FilePath $logPath -Append
python .\scripts\daily_retrain.py 2>&1 | Tee-Object -FilePath $logPath -Append
python .\scripts\daily_precompute_predictions.py 2>&1 | Tee-Object -FilePath $logPath -Append
python .\scripts\cleanup_runtime_artifacts.py 2>&1 | Tee-Object -FilePath $logPath -Append
Write-Log "daily pipeline finished"
