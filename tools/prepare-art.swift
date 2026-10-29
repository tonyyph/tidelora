// Builds the runtime art in assets/art from the source packs in art/source/v1 and
// art/source/v3 (v3 adds lake light variants, quieter interiors and single-item
// sprites; it keeps v1's fish, dishes and morning scenes). macOS only (AppKit).
// Run with `pnpm art` after replacing source images. Masters are never modified.
//
// - Backgrounds: opaque, re-encoded as JPEG at native size.
// - Sprites: trimmed to their alpha bounds (plus a small margin), scaled down
//   to a phone-sized width, written as PNG.
// - src/rendering/artManifest.ts: the trimmed sizes, so layout knows each
//   sprite's aspect ratio without loading it.
import AppKit

let root = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : FileManager.default.currentDirectoryPath)
let sources = root.appendingPathComponent("art/source")
let out = root.appendingPathComponent("assets/art")
try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)

func load(_ path: String) -> NSBitmapImageRep {
  let data = try! Data(contentsOf: sources.appendingPathComponent(path))
  return NSBitmapImageRep(data: data)!
}

/// Copies `rect` (top-left origin) of `rep` into a new RGBA bitmap scaled to `width`.
func crop(_ rep: NSBitmapImageRep, _ rect: NSRect, width: Int) -> NSBitmapImageRep {
  let scale = min(1, Double(width) / rect.width)
  let w = Int((rect.width * scale).rounded()), h = Int((rect.height * scale).rounded())
  let dst = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  let ctx = NSGraphicsContext(bitmapImageRep: dst)!
  ctx.imageInterpolation = .high
  NSGraphicsContext.current = ctx
  let img = NSImage(size: NSSize(width: rep.pixelsWide, height: rep.pixelsHigh))
  img.addRepresentation(rep)
  // NSImage draws bottom-left origin; flip the source rect.
  let from = NSRect(x: rect.minX, y: Double(rep.pixelsHigh) - rect.maxY, width: rect.width, height: rect.height)
  img.draw(in: NSRect(x: 0, y: 0, width: w, height: h), from: from, operation: .copy, fraction: 1)
  NSGraphicsContext.restoreGraphicsState()
  return dst
}

/// Bounds (top-left origin) of the opaque blobs inside `within`, ignoring specks:
/// connected regions smaller than 3% of the largest one are dropped. This keeps
/// thin parts joined to the subject (fins, feelers) and drops a neighbour's edge.
/// Blobs ending above `minBottom` (relative to `within`) are ignored too.
func alphaBounds(_ rep: NSBitmapImageRep, within: NSRect, threshold: Int = 10, minBottom: Int = 0) -> NSRect {
  let x0 = Int(within.minX), y0 = Int(within.minY), w = Int(within.width), h = Int(within.height)
  var solid = [Bool](repeating: false, count: w * h)
  var px = [Int](repeating: 0, count: 4)
  for y in 0..<h { for x in 0..<w { rep.getPixel(&px, atX: x0 + x, y: y0 + y); solid[y * w + x] = px[3] > threshold } }
  var label = [Int32](repeating: -1, count: w * h)
  var blobs: [(n: Int, minX: Int, minY: Int, maxX: Int, maxY: Int)] = []
  var stack: [Int] = []
  for start in 0..<(w * h) where solid[start] && label[start] < 0 {
    let id = Int32(blobs.count + 1)
    var b = (n: 0, minX: Int.max, minY: Int.max, maxX: -1, maxY: -1)
    label[start] = id; stack.append(start)
    while let i = stack.popLast() {
      let x = i % w, y = i / w
      b.n += 1; b.minX = min(b.minX, x); b.maxX = max(b.maxX, x); b.minY = min(b.minY, y); b.maxY = max(b.maxY, y)
      for (nx, ny) in [(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)] where nx >= 0 && ny >= 0 && nx < w && ny < h {
        let j = ny * w + nx
        if solid[j] && label[j] < 0 { label[j] = id; stack.append(j) }
      }
    }
    if b.maxY >= minBottom { blobs.append(b) }
  }
  guard let biggest = blobs.map({ $0.n }).max() else { return within }
  var minX = Int.max, minY = Int.max, maxX = -1, maxY = -1
  for b in blobs where b.n * 33 >= biggest {
    minX = min(minX, b.minX); minY = min(minY, b.minY); maxX = max(maxX, b.maxX); maxY = max(maxY, b.maxY)
  }
  let m = 6
  let l = max(0, minX - m), t = max(0, minY - m), r = min(w, maxX + m + 1), btm = min(h, maxY + m + 1)
  return NSRect(x: x0 + l, y: y0 + t, width: r - l, height: btm - t)
}

func writePNG(_ rep: NSBitmapImageRep, _ name: String) {
  try! rep.representation(using: .png, properties: [:])!.write(to: out.appendingPathComponent(name))
}

var manifest: [(String, Int, Int)] = []

let backgrounds: [(String, String)] = [
  ("v1", "home-morning"), ("v1", "fishing-lake-morning"), ("v1", "kitchen-interior"),
  ("v3", "lake-noon"), ("v3", "lake-dusk"), ("v3", "lake-night"), ("v3", "storage-quiet"), ("v3", "tackle-workbench"),
]
for (pack, bg) in backgrounds {
  let rep = load("\(pack)/backgrounds/\(bg).png")
  try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.84])!.write(to: out.appendingPathComponent("bg-\(bg).jpg"))
  manifest.append(("bg-\(bg)", rep.pixelsWide, rep.pixelsHigh))
}

/// (pack, source name, runtime name, max width)
let sprites: [(String, String, String, Int)] = [
  ("v1", "fish-climbing-perch", "fish-climbing-perch", 1024), ("v1", "fish-silver-barb", "fish-silver-barb", 1024),
  ("v1", "fish-snakeskin-gourami", "fish-snakeskin-gourami", 1024), ("v1", "fish-striped-snakehead", "fish-striped-snakehead", 1200),
  ("v1", "dish-sour-fish-soup", "dish-sour-fish-soup", 800), ("v1", "dish-braised-fish", "dish-braised-fish", 800), ("v1", "dish-grilled-fish", "dish-grilled-fish", 900),
  ("v1", "rod-reel", "item-rod-carbon", 360),
  ("v3", "bait-earthworm", "item-earthworm", 256), ("v3", "basket-wicker", "item-basket", 320), ("v3", "cooler-blue", "item-cooler", 320),
  ("v3", "reel-spinning", "item-reel", 400), ("v3", "float-balsa", "float-balsa", 48), ("v3", "rod-grip-reel", "rod-grip-reel", 720),
]
for (pack, name, id, width) in sprites {
  let rep = load("\(pack)/sprites/\(name).png")
  let b = alphaBounds(rep, within: NSRect(x: 0, y: 0, width: rep.pixelsWide, height: rep.pixelsHigh))
  let o = crop(rep, b, width: width)
  writePNG(o, "\(id).png")
  manifest.append((id, o.pixelsWide, o.pixelsHigh))
}

var ts = "// Generated by tools/prepare-art.swift. Do not edit.\n/** Pixel size of each runtime image after trimming, for aspect ratios. */\nexport const ART_SIZE = {\n"
for (name, w, h) in manifest { ts += "  '\(name)': { w: \(w), h: \(h) },\n" }
ts += "} as const;\n"
try! ts.write(to: root.appendingPathComponent("src/rendering/artManifest.ts"), atomically: true, encoding: .utf8)
for (name, w, h) in manifest { print(name, w, h) }
