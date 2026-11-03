import AppKit
import PDFKit
import Foundation

guard CommandLine.arguments.count == 3 else {
    fatalError("Usage: swift render-pdf-slides.swift <presentation.pdf> <output-directory>")
}

let source = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)

guard let pdf = PDFDocument(url: source) else {
    fatalError("Could not open presentation PDF: \(source.path)")
}
guard pdf.pageCount == 29 else {
    fatalError("Expected 29 PDF pages, found \(pdf.pageCount)")
}

for index in 0..<pdf.pageCount {
    guard let page = pdf.page(at: index) else { continue }
    let image = page.thumbnail(of: CGSize(width: 1600, height: 900), for: .mediaBox)
    guard let tiff = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiff),
          let jpeg = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.92]) else {
        fatalError("Could not render PDF page \(index + 1)")
    }
    let filename = String(format: "slide-%02d.jpg", index + 1)
    try jpeg.write(to: output.appendingPathComponent(filename), options: .atomic)
}

print("Rendered \(pdf.pageCount) slides to \(output.path)")
