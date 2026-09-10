$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$stage = Join-Path $env:TEMP ('knn-app-deploy-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($relative in @('index.html','g4.html','g6.html','teacher.html','game.html','microbe.html','favicon.svg','og.png','og-game.png','package.json','package-lock.json','api','lib','js','css','img')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $relative) -Destination $stage -Recurse
}
New-Item -ItemType Directory -Path (Join-Path $stage '.vercel') | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot '.vercel/project.json') -Destination (Join-Path $stage '.vercel/project.json')
# Only application files are copied. Local credentials and teaching materials stay local.
vercel --prod --yes --cwd $stage
if ($LASTEXITCODE -ne 0) { throw 'Deployment failed.' }
