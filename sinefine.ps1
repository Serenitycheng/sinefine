param(
    [ValidateSet('install', 'dev', 'build', 'start', 'test', 'lint', 'typecheck')]
    [string]$Task = 'dev'
)

$ErrorActionPreference = 'Stop'
$sourceDirectory = Join-Path $PSScriptRoot 'source'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    throw 'Install Node.js 24 (including npm), then reopen PowerShell.'
}
$majorVersion = & $nodeCommand.Source -p 'process.versions.node.split(".")[0]'
if ($majorVersion -ne '24') {
    throw 'This project requires Node.js 24. Select Node.js 24 before continuing.'
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
$localNpm = Join-Path $PSScriptRoot '.local-tools/npm/bin/npm-cli.js'
if (-not $npmCommand -and -not (Test-Path -LiteralPath $localNpm)) {
    throw 'npm is unavailable. Install the full Node.js 24 distribution (including npm).'
}
$npmArguments = if ($Task -eq 'install') {
    @('ci', '--no-audit', '--no-fund')
} else {
    @('run', $Task)
}

Push-Location -LiteralPath $sourceDirectory
try {
    if ($npmCommand) {
        & $npmCommand.Source @npmArguments
    } else {
        & $nodeCommand.Source $localNpm @npmArguments
    }
    $taskExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $taskExitCode
