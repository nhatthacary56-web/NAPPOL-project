Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Resolve-Path 'public\deeja-logo.png'))
$files = Get-ChildItem -Recurse 'android\app\src\main\res' -Filter 'splash.png'
foreach ($f in $files) {
  $w = 480
  $h = 480
  try {
    $existing = [System.Drawing.Image]::FromFile($f.FullName)
    $w = $existing.Width
    $h = $existing.Height
    $existing.Dispose()
  } catch {}
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(255, 233, 30, 140))
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $side = [Math]::Min($w, $h) * 0.55
  $x = [int](($w - $side) / 2)
  $y = [int](($h - $side) / 2)
  $g.DrawImage($src, $x, $y, $side, $side)
  $g.Dispose()
  $bmp.Save($f.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
$src.Dispose()
Write-Output ("splash updated " + $files.Count)
