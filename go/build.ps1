# Cross-compile single-file executables for 5 platforms (static, no runtime needed)
# Usage: .\build.ps1                          # build all (version from git tag or 'dev')
#        .\build.ps1 -Target win-x64          # build one target
#        .\build.ps1 -Version 1.1.0           # pin the version shown in the banner
param(
    [string]$Target = "",
    [string]$Version = ""
)

# Run from the script's own directory no matter where it is invoked from
Set-Location $PSScriptRoot

# Resolve version: -Version param > DSH_PROXY_VERSION env > latest git tag > 'dev'
if (-not $Version) { $Version = $env:DSH_PROXY_VERSION }
if (-not $Version) {
    $tag = git describe --tags --abbrev=0 2>$null
    if ($LASTEXITCODE -eq 0 -and $tag) { $Version = $tag.TrimStart('v') }
}
if (-not $Version) { $Version = 'dev' }
Write-Host "[build] version: $Version"

$targets = @(
    @{ name = 'win-x64';     os = 'windows'; arch = 'amd64'; ext = '.exe' },
    @{ name = 'linux-x64';   os = 'linux';   arch = 'amd64'; ext = '' },
    @{ name = 'linux-arm64'; os = 'linux';   arch = 'arm64'; ext = '' },
    @{ name = 'macos-x64';   os = 'darwin';  arch = 'amd64'; ext = '' },
    @{ name = 'macos-arm64'; os = 'darwin';  arch = 'arm64'; ext = '' }
)

if ($Target -ne '') {
    $targets = $targets | Where-Object { $_.name -eq $Target }
    if (-not $targets) { Write-Error "Unknown target: $Target"; exit 1 }
}

New-Item -ItemType Directory -Force -Path dist | Out-Null

foreach ($t in $targets) {
    # Go artifacts are prefixed with -go to avoid name collision with the Node build (dsh-proxy-<platform>)
    $out = "dist/dsh-proxy-go-$($t.name)$($t.ext)"
    Write-Host "[build] $($t.name) -> $out"
    $env:GOOS = $t.os
    $env:GOARCH = $t.arch
    $env:CGO_ENABLED = '0'   # pure static, so cross-compiled binaries run anywhere
    go build -trimpath -ldflags "-s -w -X main.version=$Version" -o $out .
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    $mb = [math]::Round((Get-Item $out).Length / 1MB, 1)
    Write-Host "[build]   OK ($mb MB)"
}

Write-Host "All done. Output in dist/"
