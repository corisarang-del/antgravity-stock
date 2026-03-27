$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$WorkRoot = Join-Path $RepoRoot ".history-rewrite"
$MirrorPath = Join-Path $WorkRoot "antgravity-stock-mirror.git"
$RemoteUrl = (git -C $RepoRoot remote get-url origin).Trim()
$ReplaceTextPath = Join-Path $PSScriptRoot "filter-repo-replacements.txt"

if (-not (Get-Command git-filter-repo -ErrorAction SilentlyContinue)) {
  throw "git-filter-repo가 필요하다. 먼저 설치해라."
}

if (Test-Path $MirrorPath) {
  Remove-Item -Recurse -Force $MirrorPath
}

New-Item -ItemType Directory -Force -Path $WorkRoot | Out-Null

git clone --mirror $RemoteUrl $MirrorPath

git -C $MirrorPath filter-repo `
  --force `
  --invert-paths `
  --path docs `
  --path research.md `
  --path research-refer.md `
  --path SECURITY_AUDIT.md `
  --path .env `
  --path backend/.env `
  --replace-text $ReplaceTextPath

Write-Host ""
Write-Host "다음 검증을 먼저 해라:"
Write-Host "1. git -C `"$MirrorPath`" log --all -- docs .env backend/.env research.md research-refer.md SECURITY_AUDIT.md"
Write-Host "2. git -C `"$MirrorPath`" grep -n `"SUPABASE_SERVICE_ROLE_KEY`""
Write-Host ""
Write-Host "검증이 끝나면 아래를 수동 실행해라:"
Write-Host "git -C `"$MirrorPath`" push --force --all"
Write-Host "git -C `"$MirrorPath`" push --force --tags"
