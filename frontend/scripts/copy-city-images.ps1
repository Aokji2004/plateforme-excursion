# Script pour copier les images de villes depuis un dossier source vers frontend/public/cities
# Usage: .\copy-city-images.ps1 "C:\chemin\vers\ville sur eau"

param(
    [Parameter(Mandatory=$true)]
    [string]$SourceFolder
)

$targetFolder = "c:\Users\IMAD MSAADI\Desktop\Plateforme Excursion\frontend\public\cities"

# Créer le dossier de destination s'il n'existe pas
if (-not (Test-Path $targetFolder)) {
    New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null
    Write-Host "✅ Dossier créé: $targetFolder" -ForegroundColor Green
}

# Vérifier que le dossier source existe
if (-not (Test-Path $SourceFolder)) {
    Write-Host "❌ Erreur: Le dossier source n'existe pas: $SourceFolder" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Source: $SourceFolder" -ForegroundColor Cyan
Write-Host "📁 Destination: $targetFolder" -ForegroundColor Cyan
Write-Host ""

# Copier les images (jpg, jpeg, png, webp)
$imageExtensions = @("*.jpg", "*.jpeg", "*.png", "*.webp")
$copiedCount = 0

foreach ($ext in $imageExtensions) {
    $images = Get-ChildItem -Path $SourceFolder -Filter $ext -Recurse -File
    foreach ($img in $images) {
        $destPath = Join-Path $targetFolder $img.Name
        Copy-Item -Path $img.FullName -Destination $destPath -Force
        Write-Host "✅ Copié: $($img.Name)" -ForegroundColor Green
        $copiedCount++
    }
}

Write-Host ""
Write-Host "🎉 $copiedCount image(s) copiée(s) avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "Les images sont maintenant disponibles dans: $targetFolder" -ForegroundColor Cyan
