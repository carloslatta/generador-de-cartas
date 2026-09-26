param(
  [Parameter(Mandatory = $true)]
  [object[]]$Cards
)

$ua = @{ "User-Agent" = "Mozilla/5.0 (generador-de-cartas research)" }

function Get-WikiText {
  param([string]$BaseApi, [string]$Title)
  $u = $BaseApi + "?action=query&format=json&prop=revisions&rvprop=content&titles=" + [uri]::EscapeDataString($Title)
  $r = Invoke-RestMethod -Uri $u -Headers $ua
  $pg = $r.query.pages.PSObject.Properties.Value | Where-Object { $_.revisions } | Select-Object -First 1
  if (-not $pg) { return $null }
  $rev = $pg.revisions[0]
  if ($rev.slots -and $rev.slots.main -and $rev.slots.main.'*') { return $rev.slots.main.'*' }
  if ($rev.'*') { return $rev.'*' }
  return $null
}

function Get-FileUrl {
  param([string]$BaseApi, [string]$FileName)
  $u = $BaseApi + "?action=query&format=json&prop=imageinfo&iiprop=url|mime&titles=" + [uri]::EscapeDataString("File:" + $FileName)
  $r = Invoke-RestMethod -Uri $u -Headers $ua
  $pg = $r.query.pages.PSObject.Properties.Value | Where-Object { $_.imageinfo } | Select-Object -First 1
  if (-not $pg) { return $null }
  return $pg.imageinfo[0].url
}

function Select-BestArtwork {
  param([string]$WikiText)
  if (-not $WikiText) { return $null }
  $matches = [regex]::Matches($WikiText, '(?is)<gallery[^>]*>(.*?)</gallery>')
  $items = @()
  foreach ($m in $matches) {
    foreach ($line in ($m.Groups[1].Value -split "`n")) {
      $t = $line.Trim()
      if (-not $t) { continue }
      $parts = $t -split '\|', 2
      $file = $parts[0].Trim()
      $caption = if ($parts.Count -gt 1) { $parts[1].Trim() } else { "" }
      $items += [pscustomobject]@{ File = $file; Caption = $caption }
    }
  }
  foreach ($it in $items) {
    $score = 0
    if ($it.Caption -match 'Collector.s cards') { $score += 4 }
    if ($it.Caption -match 'NAS anime') { $score += 3 }
    if ($it.Caption -match '1st.*OCG') { $score += 2 }
    if ($it.Caption -match '2nd.*TCG') { $score += 2 }
    $it | Add-Member -NotePropertyName Score -NotePropertyValue $score
    $it | Add-Member -NotePropertyName Arte -NotePropertyValue ($it.File -match '(?i)artwork')
  }
  $best = $items | Where-Object { $_.Score -gt 0 } | Sort-Object -Property Score, @{ Expression = { $_.Arte } } -Descending | Select-Object -First 1
  if (-not $best) { $best = $items | Where-Object { $_.Arte } | Select-Object -First 1 }
  return $best
}

$api = "https://yugipedia.com/api.php"
$dest = "C:\Users\RYZEN\Documents\generador de cartas\assets\art"

foreach ($c in $Cards) {
  $local = $c[0]
  $title = $c[1]
  Write-Host "=== $title ==="
  $wt = Get-WikiText -BaseApi $api -Title ("Card Artworks:" + $title)
  if (-not $wt) {
    Write-Host "  pagina de artworks no encontrada"
    continue
  }
  $best = Select-BestArtwork -WikiText $wt
  if (-not $best) {
    Write-Host "  SIN RESULTADO (se mantiene el arte actual)"
    continue
  }
  $url = Get-FileUrl -BaseApi $api -FileName $best.File
  if (-not $url) {
    Write-Host "  URL no resuelta para: $($best.File)"
    continue
  }
  Invoke-WebRequest -Uri $url -OutFile "$dest\$local" -Headers $ua
  Write-Host "  OK -> $local"
  Write-Host "     origen: $($best.File)"
  Write-Host "     etiqueta: $($best.Caption)"
  Write-Host "     score: $($best.Score)  url: $url"
  Start-Sleep -Milliseconds 350
}