param(
  [string]$OutputRoot = (Join-Path $PSScriptRoot '..\docs\asset-templates')
)

Add-Type -AssemblyName System.Drawing

$output = [System.IO.Path]::GetFullPath($OutputRoot)
[System.IO.Directory]::CreateDirectory($output) | Out-Null

$colors = @{
  Boundary = [System.Drawing.Color]::FromArgb(255, 11, 32, 56)
  Axis = [System.Drawing.Color]::FromArgb(220, 79, 231, 255)
  Safe = [System.Drawing.Color]::FromArgb(255, 255, 207, 90)
  Origin = [System.Drawing.Color]::FromArgb(255, 255, 79, 96)
  Center = [System.Drawing.Color]::FromArgb(255, 230, 88, 210)
  Grip = [System.Drawing.Color]::FromArgb(255, 112, 255, 158)
  Pivot = [System.Drawing.Color]::FromArgb(255, 255, 159, 67)
  Pocket = [System.Drawing.Color]::FromArgb(255, 79, 231, 255)
  Tip = [System.Drawing.Color]::FromArgb(255, 181, 140, 255)
  Forward = [System.Drawing.Color]::White
  Ghost = [System.Drawing.Color]::FromArgb(90, 37, 185, 199)
}

function New-GuideBitmap([int]$Width, [int]$Height) {
  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Draw-BaseGuide($Graphics, [int]$Width, [int]$Height, $SafeBounds) {
  $boundaryPen = New-Object System.Drawing.Pen $colors.Boundary, 2
  $axisPen = New-Object System.Drawing.Pen $colors.Axis, 1
  $safePen = New-Object System.Drawing.Pen $colors.Safe, 2
  $axisPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
  $safePen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
  $Graphics.DrawRectangle($boundaryPen, 1, 1, $Width - 3, $Height - 3)
  $Graphics.DrawLine($axisPen, [int]($Width / 2), 2, [int]($Width / 2), $Height - 3)
  $Graphics.DrawLine($axisPen, 2, [int]($Height / 2), $Width - 3, [int]($Height / 2))
  $Graphics.DrawRectangle($safePen, $SafeBounds.X, $SafeBounds.Y, $SafeBounds.Width, $SafeBounds.Height)
  $boundaryPen.Dispose()
  $axisPen.Dispose()
  $safePen.Dispose()
}

function Draw-Marker($Graphics, [int]$X, [int]$Y, $Color, [int]$Radius = 4) {
  $brush = New-Object System.Drawing.SolidBrush $Color
  $Graphics.FillEllipse($brush, $X - $Radius, $Y - $Radius, $Radius * 2, $Radius * 2)
  $brush.Dispose()
}

function Draw-Arrow($Graphics, [int]$StartX, [int]$StartY, [int]$EndX, [int]$EndY) {
  $pen = New-Object System.Drawing.Pen $colors.Forward, 2
  $pen.CustomEndCap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap 4, 6
  $Graphics.DrawLine($pen, $StartX, $StartY, $EndX, $EndY)
  $pen.Dispose()
}

$character = New-GuideBitmap 128 128
Draw-BaseGuide $character.Graphics 128 128 @{ X = 18; Y = 8; Width = 92; Height = 112 }
$ghostBrush = New-Object System.Drawing.SolidBrush $colors.Ghost
$character.Graphics.FillEllipse($ghostBrush, 40, 9, 48, 48)
$character.Graphics.FillRectangle($ghostBrush, 42, 48, 44, 57)
$ghostBrush.Dispose()
Draw-Marker $character.Graphics 64 72 $colors.Origin 5
Draw-Marker $character.Graphics 64 62 $colors.Center 4
Draw-Marker $character.Graphics 64 31 $colors.Grip 4
Draw-Marker $character.Graphics 91 70 $colors.Pocket 4
Draw-Arrow $character.Graphics 64 72 64 14
$characterPath = Join-Path $output 'arena-character-template.png'
$character.Bitmap.Save($characterPath, [System.Drawing.Imaging.ImageFormat]::Png)
$character.Graphics.Dispose()
$character.Bitmap.Dispose()

$stick = New-GuideBitmap 160 96
Draw-BaseGuide $stick.Graphics 160 96 @{ X = 10; Y = 10; Width = 142; Height = 76 }
$stickPen = New-Object System.Drawing.Pen $colors.Ghost, 10
$stick.Graphics.DrawLine($stickPen, 24, 48, 123, 58)
$stick.Graphics.DrawArc($stickPen, 111, 31, 40, 40, 80, 210)
$stickPen.Dispose()
Draw-Marker $stick.Graphics 24 48 $colors.Grip 5
Draw-Marker $stick.Graphics 24 48 $colors.Pivot 3
Draw-Marker $stick.Graphics 123 58 $colors.Pocket 5
Draw-Marker $stick.Graphics 146 48 $colors.Tip 4
Draw-Arrow $stick.Graphics 24 48 150 48
$stickPath = Join-Path $output 'arena-stick-template.png'
$stick.Bitmap.Save($stickPath, [System.Drawing.Imaging.ImageFormat]::Png)
$stick.Graphics.Dispose()
$stick.Bitmap.Dispose()

$core = New-GuideBitmap 64 64
Draw-BaseGuide $core.Graphics 64 64 @{ X = 8; Y = 8; Width = 48; Height = 48 }
$coreBrush = New-Object System.Drawing.SolidBrush $colors.Ghost
$core.Graphics.FillEllipse($coreBrush, 8, 8, 48, 48)
$coreBrush.Dispose()
Draw-Marker $core.Graphics 32 32 $colors.Origin 4
Draw-Arrow $core.Graphics 32 32 54 32
$seamPen = New-Object System.Drawing.Pen $colors.Tip, 2
$core.Graphics.DrawArc($seamPen, 17, 13, 30, 38, 80, 210)
$seamPen.Dispose()
$corePath = Join-Path $output 'arena-core-template.png'
$core.Bitmap.Save($corePath, [System.Drawing.Imaging.ImageFormat]::Png)
$core.Graphics.Dispose()
$core.Bitmap.Dispose()

Write-Output "Generated arena asset templates in $output"
