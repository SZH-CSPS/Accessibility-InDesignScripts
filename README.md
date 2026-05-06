# InDesign Accessibility Scripts

Scripts developed by the **[Swiss Centre for Special Needs Education (SZH/CSPS)](https://www.csps.ch)** — *Centre suisse de pédagogie spécialisée* — to help create accessible PDF documents from Adobe InDesign.

---

## Scripts

| Script | Description |
|--------|-------------|
| [ReorderLayersForReadingOrderAndSave](docs/ReorderLayersForReadingOrderAndSave.md) | Reorders layer objects to match the Articles panel, exports the PDF, then restores the original layer order |
| [ReorderLayersForReadingOrder](docs/ReorderLayersForReadingOrder.md) | Reorders layer objects to match the Articles panel, without exporting |

Scripts are located in the [`indesign scripts/`](indesign%20scripts/) folder.

---

## Feedback & Bug Reports

All feedback is welcome!

If you encounter a bug or unexpected behaviour, please **[open an issue](../../issues/new/choose)** using the bug report template. You will be asked to describe the problem in detail and to share the relevant files — either directly in the issue or via **[SwissTransfer](https://www.swisstransfer.com)**.


## ⚠️ Disclaimer

Some scripts in this repository modify the structure or stacking order of objects in your InDesign document (layers, z-order, etc.). Please refer to the documentation of each individual script for details on what is modified.

**It is strongly recommended to:**
- Keep a backup copy of your InDesign documents before running any script
- Manually verify the result after the script has completed — both in the InDesign document and in the exported PDF

These scripts are provided **as is**, without warranty of any kind. The Swiss Centre for Special Needs Education (SZH/CSPS) cannot be held responsible for any data loss, document corruption, or unintended changes resulting from the use of these scripts.
---

## License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

    Copyright (C) 2026 SZH/CSPS — Swiss Centre for Special Needs Education

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see <https://www.gnu.org/licenses/>.
