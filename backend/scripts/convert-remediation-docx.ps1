param(
    [string]$mdFile = "MANGAPAY_SPRINT_3_INDEPENDENT_VERIFICATION_REPORT.md",
    [string]$docxFile = "MANGAPAY_SPRINT_3_INDEPENDENT_VERIFICATION_REPORT.docx"
)
$mdPath = [System.IO.Path]::GetFullPath($mdFile)
$outPath = [System.IO.Path]::GetFullPath($docxFile)

$tempDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), [System.Guid]::NewGuid().ToString())

New-Item -ItemType Directory -Path "$tempDir\_rels" -Force | Out-Null
New-Item -ItemType Directory -Path "$tempDir\word\_rels" -Force | Out-Null

$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
'@

$globalRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'@

$docRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
'@

$styles = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:color w:val="222222"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:spacing w:before="280" w:after="140"/><w:jc w:val="left"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="32"/><w:color w:val="0D5C3A"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:spacing w:before="240" w:after="100"/><w:jc w:val="left"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="26"/><w:color w:val="107C41"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr><w:spacing w:before="180" w:after="80"/><w:jc w:val="left"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="23"/><w:color w:val="333333"/></w:rPr>
  </w:style>
</w:styles>
'@

[System.IO.File]::WriteAllText("$tempDir\[Content_Types].xml", $contentTypes, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText("$tempDir\_rels\.rels", $globalRels, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText("$tempDir\word\_rels\document.xml.rels", $docRels, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText("$tempDir\word\styles.xml", $styles, [System.Text.Encoding]::UTF8)

# Parse Markdown to WordprocessingML
$lines = Get-Content -Path $mdPath -Encoding UTF8
$bodyXml = ""

function Escape-Xml([string]$str) {
    if (-not $str) { return "" }
    return $str.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace('"', "&quot;").Replace("'", "&apos;")
}

foreach ($line in $lines) {
    $t = $line.Trim()
    if ($t -match '^# (.*)$') {
        $text = Escape-Xml $matches[1]
        $bodyXml += "<w:p><w:pPr><w:pStyle w:val=""Heading1""/></w:pPr><w:r><w:t>$text</w:t></w:r></w:p>"
    } elseif ($t -match '^## (.*)$') {
        $text = Escape-Xml $matches[1]
        $bodyXml += "<w:p><w:pPr><w:pStyle w:val=""Heading2""/></w:pPr><w:r><w:t>$text</w:t></w:r></w:p>"
    } elseif ($t -match '^### (.*)$') {
        $text = Escape-Xml $matches[1]
        $bodyXml += "<w:p><w:pPr><w:pStyle w:val=""Heading3""/></w:pPr><w:r><w:t>$text</w:t></w:r></w:p>"
    } elseif ($t -match '^[-*] (.*)$') {
        $text = Escape-Xml $matches[1]
        $bodyXml += "<w:p><w:pPr><w:ind w:left=""360""/><w:spacing w:after=""60""/></w:pPr><w:r><w:t>• $text</w:t></w:r></w:p>"
    } elseif ($t.Length -eq 0) {
        # Blank line
    } else {
        $text = Escape-Xml $t
        $bodyXml += "<w:p><w:pPr><w:spacing w:after=""120""/></w:pPr><w:r><w:t>$text</w:t></w:r></w:p>"
    }
}

$documentXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    $bodyXml
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>
"@

[System.IO.File]::WriteAllText("$tempDir\word\document.xml", $documentXml, [System.Text.Encoding]::UTF8)

if (Test-Path $outPath) { Remove-Item $outPath -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $outPath)
Remove-Item -Path $tempDir -Recurse -Force
Write-Host "Generated $outPath successfully."
