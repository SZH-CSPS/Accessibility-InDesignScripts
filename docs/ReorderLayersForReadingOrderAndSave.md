# SyncReadingOrder

Reorders layer objects to match the Articles panel order, exports the PDF, then **automatically restores the original layer order**.

The source document is never permanently modified.

---

## The problem

InDesign manages two separate orders when exporting an accessible tagged PDF:

| | Defined in InDesign | Stored in the PDF | Used by |
|---|---|---|---|
| **Tagging order** | **Articles** panel | `StructTreeRoot` | PDF/UA-compliant screen readers |
| **Reading order** | **Layers** stacking order | Content stream | Text selection, Acrobat Reflow, non-compliant assistive technologies |

When these two orders differ, some assistive technologies and PDF viewers read content in the wrong order — even if the Articles panel is correctly configured.

Fixing the reading order manually requires reordering every object in the Layers panel, which is extremely time-consuming for complex or pre-existing documents.

---

## What this script does

```
1. Reads the object order from the Articles panel
2. Saves the current z-order of all objects
3. Reorders objects in the layers to match the Articles panel
4. Exports the PDF
5. Restores the original layer order
```

---

## How layer order maps to PDF reading order

InDesign writes objects into the PDF content stream from **bottom to top** of the layer stack. To produce a reading order of [Title → Exercise → Table → Validation], the layer stack must be:

```
▲  Validation   ← read last  (top of stack)
│  Table
│  Exercise
▼  Title        ← read first (bottom of stack)
```

The script builds this automatically from the Articles panel.

---

## Prerequisites

In the **Articles panel** (`Window > Articles`):
- All relevant content objects must be added to articles in the correct reading order
- The option **"Use for Reading Order in Tagged PDF"** must be enabled
  (Articles panel menu → check this option)

---

## Installation

1. In InDesign: **Window > Utilities > Scripts**
2. In the Scripts panel, right-click **User** → **Reveal in Finder / Show in Explorer**
3. Copy `SyncReadingOrder.jsx` into that folder
4. The script appears in the Scripts panel under **User**

---

## Usage

1. Open the InDesign document
2. Verify the Articles panel is correctly configured
3. Double-click `SyncReadingOrder` in the Scripts panel
4. Confirm the information dialog
5. Choose the output PDF file in the save dialog
6. The script reorders layers → exports → restores the original order
7. A confirmation message is displayed when done

---

## PDF export settings

The script looks for a PDF export preset in the following order:

- `PDF/UA-1`
- `PDFUA` / `PDF UA`
- `High Quality Print` / `Haute qualité`
- `[PDF/X-4:2010]`
- `[Press Quality]` / `[Presse qualité]`

If none is found, the current export settings are used. The following accessibility settings are always enforced regardless of the preset:

- Acrobat compatibility: Acrobat 7 (PDF 1.6)
- Include tag structure: enabled
- Export reader spreads: disabled

---

## Compatibility

InDesign CS6 and later (including all CC versions).

---

## Limitations

- Works on the active document only
- Grouped objects are treated as a single unit (the entire group)
- Objects not listed in the Articles panel are not reordered

---

## Error handling

If the script fails during execution, it attempts to automatically restore the original layer order. If that also fails, an error message is displayed indicating that manual correction is needed.

Use **Edit > Undo** (Cmd+Z / Ctrl+Z) to revert to the state before the script was run if needed.

---

## License

GNU General Public License v3.0 — see the [repository root](../README.md#license) for details.
