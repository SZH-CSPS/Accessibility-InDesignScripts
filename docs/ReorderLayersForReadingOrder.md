# ReorderLayersForReadingOrder

Reorders layer objects to match the Articles panel order, **without exporting a PDF**.

Use this script when you want to prepare the document before a manual PDF export, or when you need to visually verify the stacking order in the Layers panel before committing to an export.

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
2. Reorders objects in the layers to match the Articles panel
3. Displays a confirmation message
```

The document is modified but not saved. The PDF export is left to you.

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
3. Copy `ReorderLayersForReadingOrder.jsx` into that folder
4. The script appears in the Scripts panel under **User**

---

## Usage

1. Open the InDesign document
2. Verify the Articles panel is correctly configured
3. Double-click `ReorderLayersForReadingOrder` in the Scripts panel
4. Confirm the dialog
5. The script reorders the layers and displays a confirmation message
6. Export the PDF manually when ready

> Use **Edit > Undo** (Cmd+Z / Ctrl+Z) to revert the layer changes if needed.

---

## Compatibility

InDesign CS6 and later (including all CC versions).

---

## Limitations

- Works on the active document only
- Grouped objects are treated as a single unit (the entire group)
- Objects not listed in the Articles panel are not reordered
- The original layer order is **not** automatically restored — use Undo or [SyncReadingOrder](SyncReadingOrder.md) if you need automatic restoration

---

## License

GNU General Public License v3.0 — see the [repository root](../README.md#license) for details.
