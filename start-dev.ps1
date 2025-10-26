# start-dev.ps1
# Usage: Run this in PowerShell (from any folder).
# It opens two PowerShell windows and starts the frontend (Vite) and the heatmap backend.

$root = "D:\\2YP\\vite"
$heatmap = Join-Path $root "backend\heatmap\backend\exhibition-map-backend"

Write-Output "Starting frontend (Vite) in new PowerShell window..."
Start-Process powershell -ArgumentList "-NoExit","-Command","Set-Location -Path '$root'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 1

Write-Output "Starting heatmap backend in new PowerShell window..."
Start-Process powershell -ArgumentList "-NoExit","-Command","Set-Location -Path '$heatmap'; node .\index.js" -WindowStyle Normal

Write-Output "Started frontend and heatmap backend. Give them a few seconds to boot and then open http://localhost:5173 and http://localhost:3897"
