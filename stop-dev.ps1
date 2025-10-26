# stop-dev.ps1
# Stops processes that are listening on ports 5173 (frontend) and 3897 (heatmap backend).
# Usage: Run in an elevated PowerShell if needed.

$ports = @(5173,3897)

foreach ($p in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
n        if ($conns) {
            $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($pid in $pids) {
                if ($pid -and ($pid -ne 0)) {
                    Write-Output "Stopping PID $pid (port $p)..."
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                }
            }
        } else {
            Write-Output "No process found listening on port $p"
        }
    } catch {
        Write-Output "Could not query port $p with Get-NetTCPConnection: $_"
        Write-Output "Falling back to netstat parsing..."
        $lines = netstat -ano | Select-String ":$p\b"
        foreach ($line in $lines) {
            $cols = ($line -split '\s+') -ne ''
            $pid = $cols[-1]
            if ($pid) {
                Write-Output "Stopping PID $pid (port $p) via taskkill..."
                taskkill /PID $pid /F | Out-Null
            }
        }
    }
}

Write-Output "Stop script finished."
