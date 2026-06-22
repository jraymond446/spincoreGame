Add-Type -AssemblyName System.Drawing

$processorSource = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class CharacterMenuAssetProcessor
{
    private enum BodyMaskKind
    {
        Skin,
        UniformPrimary,
        UniformAccent
    }

    private struct LabColor
    {
        public double L;
        public double A;
        public double B;

        public LabColor(double l, double a, double b)
        {
            L = l;
            A = a;
            B = b;
        }
    }

    private static readonly LabColor[] SkinPalette = ToLabPalette(new[]
    {
        "#FFF0C5", "#FEBE74", "#FBAF58", "#F39A51", "#D48D4E", "#DD733B",
        "#B9562F", "#8C3310", "#7D3524", "#642F22"
    });

    private static readonly LabColor[] UniformPrimaryPalette = ToLabPalette(new[]
    {
        "#FFFFFF", "#FEF2E9", "#D3C6D1", "#A9A9BA", "#77798C"
    });

    private static readonly LabColor[] UniformAccentPalette = ToLabPalette(new[]
    {
        "#A2E5DC", "#55C9C3", "#0C9999", "#087984", "#024B62"
    });

    public static void Process(string sourcePath, string destinationPath, bool luminanceMask)
    {
        using (var sourceImage = new Bitmap(sourcePath))
        using (var source = new Bitmap(sourceImage.Width, sourceImage.Height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(source))
            {
                graphics.CompositingMode = CompositingMode.SourceCopy;
                graphics.DrawImageUnscaled(sourceImage, 0, 0);
            }

            RemoveConnectedBackdrop(source, luminanceMask);

            using (var resized = new Bitmap(512, 512, PixelFormat.Format32bppArgb))
            using (var graphics = Graphics.FromImage(resized))
            {
                graphics.Clear(Color.Transparent);
                graphics.CompositingMode = CompositingMode.SourceCopy;
                graphics.InterpolationMode = InterpolationMode.NearestNeighbor;
                graphics.PixelOffsetMode = PixelOffsetMode.Half;
                graphics.DrawImage(
                    source,
                    new Rectangle(0, 0, 512, 512),
                    new Rectangle(0, 0, source.Width, source.Height),
                    GraphicsUnit.Pixel
                );

                Directory.CreateDirectory(Path.GetDirectoryName(destinationPath));
                resized.Save(destinationPath, ImageFormat.Png);
            }
        }
    }

    public static void CreateBodyMasks(string bodyPath, string outputDirectory)
    {
        Directory.CreateDirectory(outputDirectory);

        using (var sourceImage = new Bitmap(bodyPath))
        using (var body = new Bitmap(sourceImage.Width, sourceImage.Height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(body))
            {
                graphics.CompositingMode = CompositingMode.SourceCopy;
                graphics.DrawImageUnscaled(sourceImage, 0, 0);
            }

            var skin = CreateBodyMask(body, BodyMaskKind.Skin);
            var primary = CreateBodyMask(body, BodyMaskKind.UniformPrimary);
            var accent = CreateBodyMask(body, BodyMaskKind.UniformAccent);
            CompleteSockMasks(body, primary, accent);
            ResolveMaskOverlaps(skin, primary, accent);
            SaveBodyMask(skin, body.Width, body.Height, Path.Combine(outputDirectory, "skin-mask.png"));
            SaveBodyMask(primary, body.Width, body.Height, Path.Combine(outputDirectory, "uniform-primary-mask.png"));
            SaveBodyMask(accent, body.Width, body.Height, Path.Combine(outputDirectory, "uniform-accent-mask.png"));
        }
    }

    private static byte[] CreateBodyMask(Bitmap body, BodyMaskKind kind)
    {
        var width = body.Width;
        var height = body.Height;
        var alpha = new byte[width * height];

        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                var color = body.GetPixel(x, y);
                if (color.A == 0 || !IsInsideMaskSupport(kind, x, y))
                {
                    continue;
                }

                alpha[y * width + x] = GetMaskAlpha(kind, color, x, y);
            }
        }

        RemoveTinyComponents(alpha, width, height, 5);
        RemoveIsolatedPixels(alpha, width, height);
        return alpha;
    }

    private static void SaveBodyMask(byte[] alpha, int width, int height, string destinationPath)
    {
        using (var mask = new Bitmap(width, height, PixelFormat.Format32bppArgb))
        {
            for (var y = 0; y < height; y++)
            {
                for (var x = 0; x < width; x++)
                {
                    var value = alpha[y * width + x];
                    mask.SetPixel(x, y, Color.FromArgb(value, 255, 255, 255));
                }
            }

            mask.Save(destinationPath, ImageFormat.Png);
        }
    }

    private static void ResolveMaskOverlaps(byte[] skin, byte[] primary, byte[] accent)
    {
        for (var index = 0; index < skin.Length; index++)
        {
            var owner = 0;
            var strongest = skin[index];

            if (primary[index] > strongest)
            {
                owner = 1;
                strongest = primary[index];
            }

            if (accent[index] >= strongest && accent[index] > 0)
            {
                owner = 2;
            }

            if (owner != 0)
            {
                skin[index] = 0;
            }

            if (owner != 1)
            {
                primary[index] = 0;
            }

            if (owner != 2)
            {
                accent[index] = 0;
            }
        }
    }

    private static void CompleteSockMasks(Bitmap body, byte[] primary, byte[] accent)
    {
        for (var y = 0; y < body.Height; y++)
        {
            for (var x = 0; x < body.Width; x++)
            {
                var isLeftSock = InLeftSock(x, y);
                var isRightSock = InRightSock(x, y);
                if (!isLeftSock && !isRightSock)
                {
                    continue;
                }

                var color = body.GetPixel(x, y);
                if (color.A == 0)
                {
                    continue;
                }

                double hue;
                double saturation;
                double value;
                ToHsv(color, out hue, out saturation, out value);
                var isSkin = hue >= 4 && hue <= 58 && saturation >= 0.16 && value >= 0.20;
                var materialAlpha = GetSockMaterialAlpha(color.A, value);
                if (isSkin || materialAlpha == 0)
                {
                    continue;
                }

                var index = y * body.Width + x;
                var isStripe = isLeftSock
                    ? InLeftSockStripe(x, y)
                    : InRightSockStripe(x, y);
                var isAccentColor = accent[index] > 0 ||
                    (hue >= 145 && hue <= 220 && saturation >= 0.16);

                if (isStripe && isAccentColor)
                {
                    accent[index] = Math.Max(accent[index], materialAlpha);
                    primary[index] = 0;
                    continue;
                }

                accent[index] = 0;
                primary[index] = Math.Max(primary[index], materialAlpha);
            }
        }
    }

    private static byte GetSockMaterialAlpha(byte sourceAlpha, double value)
    {
        if (value <= 0.16)
        {
            return 0;
        }

        var coverage = SmoothStep((value - 0.16) / 0.14);
        return (byte)Math.Round(sourceAlpha * coverage);
    }

    private static byte GetMaskAlpha(BodyMaskKind kind, Color color, int x, int y)
    {
        double hue;
        double saturation;
        double value;
        ToHsv(color, out hue, out saturation, out value);
        var chroma = (Math.Max(color.R, Math.Max(color.G, color.B)) -
            Math.Min(color.R, Math.Min(color.G, color.B))) / 255.0;

        if (kind == BodyMaskKind.Skin)
        {
            var isEyeDetail = x >= 205 && x <= 315 && y >= 92 && y <= 154 &&
                (hue >= 75 || saturation < 0.13);
            var isMouthDetail = x >= 222 && x <= 300 && y >= 146 && y <= 190 &&
                (hue < 7 || hue > 345 || value < 0.38);
            var skinHue = hue >= 4 && hue <= 58 && saturation >= 0.16 && value >= 0.20;
            var skinHighlight = y < 205 && value >= 0.72 && chroma <= 0.24 && !isEyeDetail;

            if ((!skinHue && !skinHighlight) || isMouthDetail)
            {
                return 0;
            }

            return DistanceAlpha(color, SkinPalette, 13.0, 37.0);
        }

        if (kind == BodyMaskKind.UniformPrimary)
        {
            if (value < 0.25 || chroma > 0.31)
            {
                return 0;
            }

            return DistanceAlpha(color, UniformPrimaryPalette, 10.0, 34.0);
        }

        if (hue < 154 || hue > 215 || saturation < 0.24 || value < 0.17)
        {
            return 0;
        }

        return DistanceAlpha(color, UniformAccentPalette, 12.0, 34.0);
    }

    private static bool IsInsideMaskSupport(BodyMaskKind kind, int x, int y)
    {
        if (kind == BodyMaskKind.Skin)
        {
            return InEllipse(x, y, 256, 119, 94, 94) ||
                (y >= 202 && InEllipse(x, y, 153, 244, 44, 43)) ||
                (y >= 202 && InEllipse(x, y, 354, 248, 53, 57)) ||
                InEllipse(x, y, 169, 354, 43, 35) ||
                InEllipse(x, y, 309, 365, 44, 36);
        }

        if (kind == BodyMaskKind.UniformPrimary)
        {
            return InRect(x, y, 174, 174, 338, 315) ||
                InRect(x, y, 137, 278, 347, 370) ||
                InLeftSock(x, y) ||
                InRightSock(x, y);
        }

        return y >= 154 && y <= 507 && x >= 78 && x <= 397;
    }

    private static bool InRect(int x, int y, int left, int top, int right, int bottom)
    {
        return x >= left && x <= right && y >= top && y <= bottom;
    }

    private static bool InEllipse(int x, int y, double centerX, double centerY, double radiusX, double radiusY)
    {
        var normalizedX = (x - centerX) / radiusX;
        var normalizedY = (y - centerY) / radiusY;
        return normalizedX * normalizedX + normalizedY * normalizedY <= 1.0;
    }

    private static bool InLeftSock(int x, int y)
    {
        if (y < 365 || y > 420)
        {
            return false;
        }

        var progress = y - 365;
        var left = 132.0 + progress * 0.18;
        var right = 184.0 + progress * 0.04;
        var ankleBoundary = x * 0.20 + 384.0;
        return x >= left && x <= right && y <= ankleBoundary;
    }

    private static bool InRightSock(int x, int y)
    {
        if (y < 368 || y > 438)
        {
            return false;
        }

        var progress = y - 368;
        var left = 297.0 + progress * 0.35;
        var right = 354.0 + progress * 0.43;
        var ankleBoundary = x * 0.21 + 359.0;
        return x >= left && x <= right && y <= ankleBoundary;
    }

    private static bool InLeftSockStripe(int x, int y)
    {
        if (x < 136 || x > 193)
        {
            return false;
        }

        var top = 376.0 + (x - 140.0) * 0.15;
        return y >= top && y <= top + 13.0;
    }

    private static bool InRightSockStripe(int x, int y)
    {
        if (x < 297 || x > 367)
        {
            return false;
        }

        var top = 383.0 + (x - 300.0) * 0.28;
        return y >= top && y <= top + 13.0;
    }

    private static byte DistanceAlpha(Color color, LabColor[] palette, double fullDistance, double emptyDistance)
    {
        var sample = ToLab(color);
        var distance = double.MaxValue;

        foreach (var reference in palette)
        {
            var deltaL = sample.L - reference.L;
            var deltaA = sample.A - reference.A;
            var deltaB = sample.B - reference.B;
            distance = Math.Min(distance, Math.Sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB));
        }

        if (distance <= fullDistance)
        {
            return color.A;
        }

        if (distance >= emptyDistance)
        {
            return 0;
        }

        var amount = 1.0 - SmoothStep((distance - fullDistance) / (emptyDistance - fullDistance));
        return (byte)Math.Round(color.A * amount);
    }

    private static double SmoothStep(double value)
    {
        value = Math.Max(0.0, Math.Min(1.0, value));
        return value * value * (3.0 - 2.0 * value);
    }

    private static void RemoveTinyComponents(byte[] alpha, int width, int height, int minimumSize)
    {
        var visited = new bool[alpha.Length];
        var queue = new Queue<int>();
        var component = new List<int>();

        for (var start = 0; start < alpha.Length; start++)
        {
            if (visited[start] || alpha[start] < 8)
            {
                continue;
            }

            queue.Clear();
            component.Clear();
            queue.Enqueue(start);
            visited[start] = true;

            while (queue.Count > 0)
            {
                var index = queue.Dequeue();
                component.Add(index);
                var x = index % width;
                var y = index / width;

                for (var offsetY = -1; offsetY <= 1; offsetY++)
                {
                    for (var offsetX = -1; offsetX <= 1; offsetX++)
                    {
                        if (offsetX == 0 && offsetY == 0)
                        {
                            continue;
                        }

                        var nextX = x + offsetX;
                        var nextY = y + offsetY;
                        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height)
                        {
                            continue;
                        }

                        var next = nextY * width + nextX;
                        if (visited[next] || alpha[next] < 8)
                        {
                            continue;
                        }

                        visited[next] = true;
                        queue.Enqueue(next);
                    }
                }
            }

            if (component.Count >= minimumSize)
            {
                continue;
            }

            foreach (var index in component)
            {
                alpha[index] = 0;
            }
        }
    }

    private static void RemoveIsolatedPixels(byte[] alpha, int width, int height)
    {
        var cleaned = (byte[])alpha.Clone();

        for (var y = 1; y < height - 1; y++)
        {
            for (var x = 1; x < width - 1; x++)
            {
                var index = y * width + x;
                if (alpha[index] == 0)
                {
                    continue;
                }

                var neighbors = 0;
                for (var offsetY = -1; offsetY <= 1; offsetY++)
                {
                    for (var offsetX = -1; offsetX <= 1; offsetX++)
                    {
                        if ((offsetX != 0 || offsetY != 0) &&
                            alpha[(y + offsetY) * width + x + offsetX] > 0)
                        {
                            neighbors++;
                        }
                    }
                }

                if (neighbors <= 1)
                {
                    cleaned[index] = 0;
                }
            }
        }

        Array.Copy(cleaned, alpha, alpha.Length);
    }

    private static LabColor[] ToLabPalette(string[] values)
    {
        var palette = new LabColor[values.Length];
        for (var index = 0; index < values.Length; index++)
        {
            palette[index] = ToLab(ColorTranslator.FromHtml(values[index]));
        }

        return palette;
    }

    private static LabColor ToLab(Color color)
    {
        var red = PivotRgb(color.R / 255.0);
        var green = PivotRgb(color.G / 255.0);
        var blue = PivotRgb(color.B / 255.0);
        var x = (red * 0.4124 + green * 0.3576 + blue * 0.1805) / 0.95047;
        var y = (red * 0.2126 + green * 0.7152 + blue * 0.0722);
        var z = (red * 0.0193 + green * 0.1192 + blue * 0.9505) / 1.08883;
        var pivotX = PivotLab(x);
        var pivotY = PivotLab(y);
        var pivotZ = PivotLab(z);
        return new LabColor(
            116.0 * pivotY - 16.0,
            500.0 * (pivotX - pivotY),
            200.0 * (pivotY - pivotZ)
        );
    }

    private static double PivotRgb(double value)
    {
        return value > 0.04045 ? Math.Pow((value + 0.055) / 1.055, 2.4) : value / 12.92;
    }

    private static double PivotLab(double value)
    {
        return value > 0.008856 ? Math.Pow(value, 1.0 / 3.0) : 7.787 * value + 16.0 / 116.0;
    }

    private static void ToHsv(Color color, out double hue, out double saturation, out double value)
    {
        var red = color.R / 255.0;
        var green = color.G / 255.0;
        var blue = color.B / 255.0;
        var maximum = Math.Max(red, Math.Max(green, blue));
        var minimum = Math.Min(red, Math.Min(green, blue));
        var delta = maximum - minimum;
        hue = 0.0;

        if (delta > 0.0)
        {
            if (maximum == red)
            {
                hue = 60.0 * (((green - blue) / delta) % 6.0);
            }
            else if (maximum == green)
            {
                hue = 60.0 * (((blue - red) / delta) + 2.0);
            }
            else
            {
                hue = 60.0 * (((red - green) / delta) + 4.0);
            }
        }

        if (hue < 0.0)
        {
            hue += 360.0;
        }

        saturation = maximum == 0.0 ? 0.0 : delta / maximum;
        value = maximum;
    }

    private static void RemoveConnectedBackdrop(Bitmap bitmap, bool luminanceMask)
    {
        var rectangle = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        var data = bitmap.LockBits(rectangle, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        var bytes = new byte[Math.Abs(data.Stride) * bitmap.Height];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
        var backdropReferences = new[]
        {
            ReadColor(bytes, data.Stride, 0, 0),
            ReadColor(bytes, data.Stride, bitmap.Width - 1, 0),
            ReadColor(bytes, data.Stride, 0, bitmap.Height - 1),
            ReadColor(bytes, data.Stride, bitmap.Width - 1, bitmap.Height - 1)
        };
        var chromaKeyBackdrop = false;
        foreach (var reference in backdropReferences)
        {
            var minimumChannel = Math.Min(reference.R, Math.Min(reference.G, reference.B));
            var maximumChannel = Math.Max(reference.R, Math.Max(reference.G, reference.B));
            chromaKeyBackdrop = chromaKeyBackdrop || maximumChannel - minimumChannel >= 60;
        }

        var visited = new bool[bitmap.Width * bitmap.Height];
        var queue = new Queue<int>();

        Action<int, int> enqueueBackdrop = (x, y) =>
        {
            var pixelIndex = y * bitmap.Width + x;
            if (visited[pixelIndex])
            {
                return;
            }

            var byteIndex = y * data.Stride + x * 4;
            if (!IsBackdrop(
                bytes[byteIndex + 2],
                bytes[byteIndex + 1],
                bytes[byteIndex],
                backdropReferences
            ))
            {
                return;
            }

            visited[pixelIndex] = true;
            queue.Enqueue(pixelIndex);
        };

        for (var x = 0; x < bitmap.Width; x++)
        {
            enqueueBackdrop(x, 0);
            enqueueBackdrop(x, bitmap.Height - 1);
        }

        for (var y = 0; y < bitmap.Height; y++)
        {
            enqueueBackdrop(0, y);
            enqueueBackdrop(bitmap.Width - 1, y);
        }

        while (queue.Count > 0)
        {
            var pixelIndex = queue.Dequeue();
            var x = pixelIndex % bitmap.Width;
            var y = pixelIndex / bitmap.Width;

            if (x > 0) enqueueBackdrop(x - 1, y);
            if (x + 1 < bitmap.Width) enqueueBackdrop(x + 1, y);
            if (y > 0) enqueueBackdrop(x, y - 1);
            if (y + 1 < bitmap.Height) enqueueBackdrop(x, y + 1);
        }

        for (var y = 0; y < bitmap.Height; y++)
        {
            for (var x = 0; x < bitmap.Width; x++)
            {
                var pixelIndex = y * bitmap.Width + x;
                var byteIndex = y * data.Stride + x * 4;

                if (visited[pixelIndex] ||
                    (chromaKeyBackdrop && IsBackdrop(
                        bytes[byteIndex + 2],
                        bytes[byteIndex + 1],
                        bytes[byteIndex],
                        backdropReferences
                    )))
                {
                    bytes[byteIndex + 3] = 0;
                    continue;
                }

                bytes[byteIndex + 3] = 255;

                if (!luminanceMask)
                {
                    continue;
                }

                var luminance = (byte)Math.Round(
                    bytes[byteIndex + 2] * 0.2126 +
                    bytes[byteIndex + 1] * 0.7152 +
                    bytes[byteIndex] * 0.0722
                );
                bytes[byteIndex] = luminance;
                bytes[byteIndex + 1] = luminance;
                bytes[byteIndex + 2] = luminance;
            }
        }

        Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
        bitmap.UnlockBits(data);
    }

    private static Color ReadColor(byte[] bytes, int stride, int x, int y)
    {
        var index = y * stride + x * 4;
        return Color.FromArgb(bytes[index + 2], bytes[index + 1], bytes[index]);
    }

    private static bool IsBackdrop(byte red, byte green, byte blue, Color[] references)
    {
        var minimum = Math.Min(red, Math.Min(green, blue));
        var maximum = Math.Max(red, Math.Max(green, blue));
        if (minimum >= 210 && maximum - minimum <= 18)
        {
            return true;
        }

        foreach (var reference in references)
        {
            var deltaRed = red - reference.R;
            var deltaGreen = green - reference.G;
            var deltaBlue = blue - reference.B;
            if (deltaRed * deltaRed + deltaGreen * deltaGreen + deltaBlue * deltaBlue <= 55 * 55)
            {
                return true;
            }
        }

        return false;
    }
}
'@

Add-Type -TypeDefinition $processorSource -ReferencedAssemblies System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $root 'public\assets\characters\menu'
$processedRoot = Join-Path $sourceRoot 'processed'
$processedBodyPath = Join-Path $processedRoot 'bodies\masc_striker_01.png'

[CharacterMenuAssetProcessor]::Process(
  (Join-Path $sourceRoot 'bodies\masc_striker_01.png'),
  $processedBodyPath,
  $false
)

[CharacterMenuAssetProcessor]::CreateBodyMasks(
  $processedBodyPath,
  (Join-Path $processedRoot 'masks')
)

foreach ($index in 1..4) {
  $name = 'masc_hair_{0:D2}' -f $index
  [CharacterMenuAssetProcessor]::Process(
    (Join-Path $sourceRoot "hair\$name.png"),
    (Join-Path $processedRoot "hair\${name}_luminance.png"),
    $true
  )
}

Write-Output 'Processed menu character assets at 512x512 with transparent backgrounds.'
