Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path (Get-Location) 'public/icons'
[IO.Directory]::CreateDirectory($iconDirectory) | Out-Null
foreach ($iconSize in @(192,512,96)) {
 $bitmap = [Drawing.Bitmap]::new($iconSize,$iconSize)
 $graphics = [Drawing.Graphics]::FromImage($bitmap)
 $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
 $graphics.Clear($(if($iconSize -eq 96){[Drawing.Color]::Transparent}else{[Drawing.Color]::FromArgb(16,18,30)}))
 $scale = $iconSize / 108.0
 $pen = [Drawing.Pen]::new($(if($iconSize -eq 96){[Drawing.Color]::White}else{[Drawing.Color]::FromArgb(193,220,214)}),[single](2.5*$scale))
 foreach($shape in @(@(36,27,76,27,65,76,25,76),@(43,34,83,34,72,83,32,83))){
  $points = [Drawing.PointF[]]::new(4)
  for($i=0;$i -lt 4;$i++){$points[$i]=[Drawing.PointF]::new([single]($shape[$i*2]*$scale),[single]($shape[$i*2+1]*$scale))}
  $graphics.DrawPolygon($pen,$points)
 }
 $fileName = if($iconSize -eq 96){'badge.png'}else{"app-$iconSize.png"}
 $bitmap.Save((Join-Path $iconDirectory $fileName),[Drawing.Imaging.ImageFormat]::Png)
 $pen.Dispose();$graphics.Dispose();$bitmap.Dispose()
}
