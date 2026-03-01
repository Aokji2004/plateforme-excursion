# Demarre le backend avec la base excursionocp et le mot de passe aya
# Utilisez ce script si votre fichier .env n'est pas encore a jour
$env:DATABASE_URL = "postgresql://postgres:aya@localhost:5432/excursionocp"
if (-not $env:JWT_SECRET) { $env:JWT_SECRET = "un_super_secret_jwt_pour_ocp" }
if (-not $env:PORT) { $env:PORT = "4000" }
Write-Host "Demarrage du backend (base: excursionocp)..." -ForegroundColor Green
npm run dev
