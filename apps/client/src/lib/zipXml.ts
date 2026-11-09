import JSZip from 'jszip';

export interface ExtractedXml {
  filename: string;
  contentBase64: string;
  text: string;
  path: string;
}

async function collectFromZip(
  zip: JSZip,
  pathPrefix: string,
  out: ExtractedXml[],
  depth: number
): Promise<void> {
  if (depth > 5) return;

  const entries: { name: string; entry: JSZip.JSZipObject }[] = [];
  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    if (relativePath.startsWith('__MACOSX') || relativePath.split('/').some((p) => p.startsWith('.'))) {
      return;
    }
    entries.push({ name: relativePath, entry });
  });

  for (const { name, entry } of entries) {
    const fullPath = pathPrefix ? `${pathPrefix}/${name}` : name;
    const lower = name.toLowerCase();

    if (lower.endsWith('.xml')) {
      const text = await entry.async('string');
      const contentBase64 = btoa(unescape(encodeURIComponent(text)));
      out.push({
        filename: name.split('/').pop() || name,
        contentBase64,
        text,
        path: fullPath,
      });
      continue;
    }

    if (lower.endsWith('.zip')) {
      const buf = await entry.async('arraybuffer');
      try {
        const nested = await JSZip.loadAsync(buf);
        await collectFromZip(nested, fullPath, out, depth + 1);
      } catch {
        /* skip invalid nested zip */
      }
    }
  }
}

/**
 * Unzip (recursively) and collect all school XML files.
 * Supports nested school ZIPs (SuS/LuL) inside an outer package ZIP.
 */
export async function extractXmlFilesFromZip(file: File): Promise<ExtractedXml[]> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const out: ExtractedXml[] = [];
  await collectFromZip(zip, '', out, 0);

  if (out.length === 0) {
    throw new Error(
      'Keine XML-Datei in der ZIP gefunden. Erwartet: Schul-XML oder ZIP mit SuS/LuL-XML (auch verschachtelt).'
    );
  }
  return out;
}

/** @deprecated use extractXmlFilesFromZip – kept for single-file callers */
export async function extractSingleXmlFromZip(file: File) {
  const all = await extractXmlFilesFromZip(file);
  if (all.length !== 1) {
    throw new Error(
      `Erwarte genau eine XML-Datei, gefunden: ${all.length} (${all.map((e) => e.filename).join(', ')}). ` +
        'Mehrere XMLs (z. B. SuS + LuL) werden gemeinsam importiert – bitte aktuelle Import-Seite nutzen.'
    );
  }
  return all[0];
}
