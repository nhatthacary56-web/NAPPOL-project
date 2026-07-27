Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Resolve-Path "public\deeja-logo.png"))
$sizes = @{
  'mipmap-mdpi' = 48
  'mipmap-hdpi' = 72
  'mipmap-xhdpi' = 96
  'mipmap-xxhdpi' = 144
  'mipmap-xxxhdpi' = 192
}
foreach ($dir in $sizes.Keys) {
  $size = $sizes[$dir]
  $path = "android\app\src\main\res\$dir"
  foreach ($name in @('ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png')) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(255, 233, 30, 140))
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()
    $out = Join-Path $path $name
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
  }
}

New-Item -ItemType Directory -Force -Path 'store\play' | Out-Null

$playIcon = New-Object System.Drawing.Bitmap 512, 512
$g2 = [System.Drawing.Graphics]::FromImage($playIcon)
$g2.Clear([System.Drawing.Color]::FromArgb(255, 233, 30, 140))
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($src, 0, 0, 512, 512)
$g2.Dispose()
$playIcon.Save('store\play\icon-512.png', [System.Drawing.Imaging.ImageFormat]::Png)
$playIcon.Dispose()

$fg = New-Object System.Drawing.Bitmap 1024, 500
$g3 = [System.Drawing.Graphics]::FromImage($fg)
$g3.Clear([System.Drawing.Color]::FromArgb(255, 233, 30, 140))
$g3.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$logoSize = 360
$x = [int]((1024 - $logoSize) / 2)
$y = [int]((500 - $logoSize) / 2)
$g3.DrawImage($src, $x, $y, $logoSize, $logoSize)
$g3.Dispose()
$fg.Save('store\play\feature-graphic-1024x500.png', [System.Drawing.Imaging.ImageFormat]::Png)
$fg.Dispose()

$src.Dispose()
Write-Output 'icons ok'
