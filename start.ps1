param(
  [string]$Host = "127.0.0.1",
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

function Get-PythonCommand {
  if (Get-Command python -ErrorAction SilentlyContinue) { return "python" }
  if (Get-Command py -ErrorAction SilentlyContinue) { return "py -3" }
  throw "未找到 Python。请先安装 Python 3 并加入 PATH。"
}

$pythonCmd = Get-PythonCommand
$url = "http://$Host`:$Port/"

Write-Host "启动本地服务中..."
Write-Host "项目目录: $projectRoot"
Write-Host "访问地址: $url"
Write-Host "按 Ctrl+C 可停止服务。"
Write-Host ""

Invoke-Expression "$pythonCmd -m card_server --host $Host --port $Port --dir ."
