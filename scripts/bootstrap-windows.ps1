$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

if ($env:OS -ne 'Windows_NT') {
    throw 'This launcher is for Windows. On a Mac, use Start-Or-Birthday-macOS.command.'
}

$ProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$RuntimeRoot = Join-Path $ProjectRoot '.runtime'
$NodeHome = Join-Path $RuntimeRoot 'node-windows'
$Downloads = Join-Path $RuntimeRoot 'downloads'

function Test-SupportedNode {
    param([Parameter(Mandatory = $true)][string]$NodePath)

    try {
        $versionText = (& $NodePath --version 2>$null).Trim()
        if ($versionText -notmatch '^v?(\d+)\.(\d+)\.(\d+)') { return $false }
        $major = [int]$Matches[1]
        $minor = [int]$Matches[2]
        if ($major -eq 20) { return $minor -ge 19 }
        if ($major -eq 22) { return $minor -ge 12 }
        return $major -ge 24
    } catch {
        return $false
    }
}

function Find-LocalNode {
    if (-not (Test-Path -LiteralPath $NodeHome)) { return $null }
    $candidate = Get-ChildItem -LiteralPath $NodeHome -Filter 'node.exe' -File -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1
    $candidateNpm = if ($candidate) { Join-Path $candidate.DirectoryName 'npm.cmd' } else { $null }
    if ($candidate -and (Test-Path -LiteralPath $candidateNpm) -and (Test-SupportedNode -NodePath $candidate.FullName)) {
        return $candidate.FullName
    }
    return $null
}

function Assert-SafeRuntimeTarget {
    param([Parameter(Mandatory = $true)][string]$Target)

    $runtimePrefix = [System.IO.Path]::GetFullPath($RuntimeRoot).TrimEnd('\') + '\'
    $resolvedTarget = [System.IO.Path]::GetFullPath($Target)
    if (-not $resolvedTarget.StartsWith($runtimePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to modify a path outside the project runtime directory: $resolvedTarget"
    }
}

function Install-PortableNode {
    Write-Host 'A compatible Node.js installation was not found.'
    Write-Host 'Downloading a private Node.js 24 LTS runtime from nodejs.org...'

    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
    New-Item -ItemType Directory -Path $Downloads -Force | Out-Null

    $architecture = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64') {
        'arm64'
    } else {
        'x64'
    }

    $baseUrl = 'https://nodejs.org/dist/latest-v24.x'
    $checksumsPath = Join-Path $Downloads 'SHASUMS256.txt'
    Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/SHASUMS256.txt" -OutFile $checksumsPath
    $checksums = Get-Content -LiteralPath $checksumsPath -Raw
    $pattern = "(?m)^([a-f0-9]{64})\s+(node-v[^\s]+-win-$architecture\.zip)$"
    $match = [System.Text.RegularExpressions.Regex]::Match($checksums, $pattern)
    if (-not $match.Success) {
        throw "Could not find a Windows $architecture Node.js download in the official checksum list."
    }

    $expectedHash = $match.Groups[1].Value.ToUpperInvariant()
    $archiveName = $match.Groups[2].Value
    $archivePath = Join-Path $Downloads $archiveName
    Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/$archiveName" -OutFile $archivePath

    $actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($actualHash -ne $expectedHash) {
        throw 'The downloaded Node.js archive failed its SHA-256 verification and will not be used.'
    }

    Assert-SafeRuntimeTarget -Target $NodeHome
    if (Test-Path -LiteralPath $NodeHome) {
        Remove-Item -LiteralPath $NodeHome -Recurse -Force
    }
    New-Item -ItemType Directory -Path $NodeHome -Force | Out-Null
    Expand-Archive -LiteralPath $archivePath -DestinationPath $NodeHome -Force

    $installedNode = Find-LocalNode
    if (-not $installedNode) {
        throw 'Node.js was downloaded but its executable could not be found.'
    }
    return $installedNode
}

New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null

$NodeExecutable = Find-LocalNode
if (-not $NodeExecutable) {
    $systemNode = Get-Command 'node.exe' -ErrorAction SilentlyContinue
    $systemNpm = Get-Command 'npm.cmd' -ErrorAction SilentlyContinue
    if ($systemNode -and $systemNpm -and (Test-SupportedNode -NodePath $systemNode.Source)) {
        $NodeExecutable = $systemNode.Source
    }
}
if (-not $NodeExecutable) {
    $NodeExecutable = Install-PortableNode
}

$NodeDirectory = Split-Path -Parent $NodeExecutable
$env:PATH = "$NodeDirectory;$env:PATH"

Write-Host ''
& $NodeExecutable (Join-Path $ProjectRoot 'setup.js')
exit $LASTEXITCODE
