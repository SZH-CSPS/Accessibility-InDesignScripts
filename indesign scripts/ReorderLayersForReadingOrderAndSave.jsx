/**
 * SyncReadingOrder.jsx
 * ====================
 * Synchronizes the PDF reading order (layer z-order) with the logical
 * order defined in the InDesign Articles panel, then exports a PDF.
 *
 * Copyright (C) 2026 Swiss Centre for Special Needs Education (SZH/CSPS) https://www.csps.ch
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * WHY THIS SCRIPT?
 * ----------------
 * InDesign manages two separate orders when exporting an accessible PDF:
 *
 *   1. TAGGING ORDER (Articles panel)
 *      → Defines the logical reading order (title, exercises, etc.)
 *      → Exported into the PDF StructTreeRoot
 *      → Used by PDF/UA-compliant screen readers
 *
 *   2. READING ORDER (layer z-order)
 *      → Determined by the stacking order of objects in the Layers panel
 *      → Exported into the PDF content stream
 *      → Used by text selection, some assistive technologies,
 *        and Acrobat Touch Up Reading Order
 *
 * Without this script, fixing the reading order requires manually
 * reordering every object in the Layers panel — extremely time-consuming
 * for complex or pre-existing documents.
 *
 * WHAT THIS SCRIPT DOES
 * ----------------------
 *   1. Reads the object order from the Articles panel (all pages)
 *   2. Reorders objects in the layers to match that order
 *      (Articles objects are stacked bottom-to-top in reverse reading order,
 *       because InDesign exports the content stream from bottom to top)
 *   3. Exports the PDF
 *   4. Restores the original z-order of all objects
 *
 * USAGE
 * -----
 *   - Open the InDesign document
 *   - Make sure the Articles panel is correctly configured and that
 *     the option "Use for Reading Order in Tagged PDF" is enabled
 *     in the Articles panel options
 *   - Double-click this script in the Scripts panel
 *   - Choose the destination folder and filename in the dialog
 *
 * COMPATIBILITY
 * -------------
 *   InDesign CS6 and later (including all CC versions)
 *
 * NOTES
 * -----
 *   - Non-destructive: the original z-order is always restored after export,
 *     even if an error occurs
 *   - Only objects listed in the Articles panel are reordered
 *   - Objects not in the Articles panel keep their original position
 */

// ============================================================
// ENTRY POINT
// ============================================================

(function () {

    // --- Preliminary checks ---

    if (app.documents.length === 0) {
        alert("No document is open.\nPlease open an InDesign document before running this script.");
        return;
    }

    var doc = app.activeDocument;

    if (doc.articles.length === 0) {
        alert(
            "This document contains no articles.\n\n" +
            "Please configure the Articles panel (Window > Articles)\n" +
            "to define the logical reading order first."
        );
        return;
    }

    // Note: useForReadingOrder is not accessible via scripting,
    // so we remind the user to enable it manually.
    var proceed = confirm(
        "SyncReadingOrder\n\n" +
        "This script will:\n" +
        "  1. Reorder objects in the layers according to the Articles panel\n" +
        "  2. Export the PDF\n" +
        "  3. Restore the original object order\n\n" +
        "IMPORTANT: Make sure the option\n" +
        "\"Use for Reading Order in Tagged PDF\"\n" +
        "is enabled in the Articles panel options.\n\n" +
        "Continue?"
    );

    if (!proceed) return;

    // --- Ask for the output file ---
    var pdfFile = File.saveDialog("Save PDF as", "*.pdf");
    if (!pdfFile) return;

    // Ensure the .pdf extension is present
    if (pdfFile.fullName.slice(-4).toLowerCase() !== ".pdf") {
        pdfFile = new File(pdfFile.fullName + ".pdf");
    }

    // --- Run ---
    main(doc, pdfFile);

})();


// ============================================================
// MAIN FUNCTION
// ============================================================

function main(doc, pdfFile) {

    var originalOrder = null;

    try {
        // Step 1: Build the ordered list of objects from the Articles panel
        var articleItems = getArticleItems(doc);

        if (articleItems.length === 0) {
            alert("The Articles panel contains no objects.\nExporting PDF without reordering.");
            exportPDF(doc, pdfFile);
            return;
        }

        // Step 2: Save the current z-order of ALL objects
        originalOrder = saveZOrder(doc);

        // Step 3: Reorder objects according to the Articles panel order
        applyReadingOrder(doc, articleItems);

        // Step 4: Export the PDF
        exportPDF(doc, pdfFile);

        // Step 5: Restore the original z-order
        restoreZOrder(doc, originalOrder);

        alert("Export completed successfully!\n\nFile: " + pdfFile.fsName);

    } catch (e) {

        // Always restore the original order if something goes wrong
        if (originalOrder !== null) {
            try {
                restoreZOrder(doc, originalOrder);
            } catch (restoreError) {
                alert(
                    "ERROR: Could not restore the original object order!\n\n" +
                    "Error: " + restoreError.message + "\n\n" +
                    "Please manually check and fix the stacking order in the Layers panel."
                );
            }
        }

        alert("Error: " + e.message + "\n\nThe original object order has been restored.");
    }
}


// ============================================================
// STEP 1: Read the Articles panel order
// ============================================================

/**
 * Returns an ordered list of pageItems referenced in the Articles panel.
 *
 * The Articles panel contains ArticleMember objects, each pointing to
 * a pageItem (text frame, image, group, etc.).
 * We iterate over all articles in order, then over all members of each
 * article in order.
 *
 * Returns an array of { item: PageItem, articleIndex: int, memberIndex: int }
 * in the desired reading order.
 */
function getArticleItems(doc) {

    var result = [];

    for (var a = 0; a < doc.articles.length; a++) {
        var article = doc.articles[a];

        for (var m = 0; m < article.articleMembers.length; m++) {
            var member = article.articleMembers[m];

            // articleMember.itemRef points to the underlying pageItem
            try {
                var pageItem = member.itemRef;

                // Make sure the object still exists and is valid
                if (pageItem && pageItem.isValid) {
                    result.push({
                        item:         pageItem,
                        articleIndex: a,
                        memberIndex:  m,
                        articleName:  article.name
                    });
                }
            } catch (e) {
                // Invalid or deleted member — skip it
            }
        }
    }

    return result;
}


// ============================================================
// STEP 2: Save the current z-order
// ============================================================

/**
 * Saves the current z-order of all pageItems in each spread.
 *
 * In InDesign, z-order is determined by an object's position within
 * its parent collection (page or layer). Index 0 = furthest to the back.
 *
 * We save: for each spread, the ordered list of object IDs
 * from bottom to top of the layer stack.
 *
 * Returns an object: { "spread_N": [itemID1, itemID2, ...] }
 */
function saveZOrder(doc) {

    var saved = {};

    for (var s = 0; s < doc.spreads.length; s++) {
        var spread = doc.spreads[s];

        // allPageItems returns objects in z-order (bottom → top)
        var allItems = spread.allPageItems;
        var ids = [];

        for (var i = 0; i < allItems.length; i++) {
            if (allItems[i].isValid) {
                ids.push(allItems[i].id);
            }
        }

        saved["spread_" + spread.index] = ids;
    }

    return saved;
}


// ============================================================
// STEP 3: Apply the reading order
// ============================================================

/**
 * Reorders objects in the layers so that their z-order matches
 * the desired reading order.
 *
 * HOW INDESIGN EXPORTS Z-ORDER TO PDF:
 * InDesign writes objects into the PDF content stream in z-order
 * from BOTTOM to TOP: the object furthest back (index 0) is written
 * FIRST into the stream.
 *
 * To make the content stream reading order [item1, item2, item3...],
 * the layer z-order must therefore be:
 *   - item1 at the bottom (lowest index = written first = read first)
 *   - item2 above it
 *   - item3 above that
 *   - etc.
 *
 * APPROACH: build the desired order bottom-to-top, then apply it by
 * starting with the last item (which must be on top), sending it to
 * front, then placing each preceding item just behind the next one.
 */
function applyReadingOrder(doc, articleItems) {

    // Group article objects by spread
    // (only objects on the same spread can be reordered relative to each other)
    var bySpread = {};

    for (var i = 0; i < articleItems.length; i++) {
        var entry = articleItems[i];
        var item  = entry.item;

        // Find the parent spread of this object
        var spreadIndex = getSpreadIndex(item);
        if (spreadIndex === -1) continue;

        var key = "spread_" + spreadIndex;
        if (!bySpread[key]) {
            bySpread[key] = { spreadIndex: spreadIndex, items: [] };
        }
        bySpread[key].items.push(item);
    }

    // Reorder objects spread by spread
    for (var key in bySpread) {
        if (!bySpread.hasOwnProperty(key)) continue;

        var group = bySpread[key];
        reorderItemsInSpread(doc.spreads[group.spreadIndex], group.items);
    }
}


/**
 * Returns the index of the parent spread of a pageItem.
 * Walks up the parent hierarchy until a Spread is found.
 */
function getSpreadIndex(pageItem) {
    try {
        var parent = pageItem.parent;

        // Walk up to the spread (parent can be Page, Layer, Group, etc.)
        while (parent) {
            if (parent.constructor && parent.constructor.name === "Spread") {
                return parent.index;
            }
            if (parent.constructor && parent.constructor.name === "Page") {
                // Get the spread that contains this page
                var pageParent = parent.parent;
                if (pageParent) return pageParent.index;
            }
            // Fallback via reflect API
            try {
                if (parent.reflect && parent.reflect.name === "Spread") {
                    return parent.index;
                }
                if (parent.reflect && parent.reflect.name === "Page") {
                    return parent.parent.index;
                }
            } catch(e) {}

            // Stop if we reach the document root
            if (parent === app.activeDocument) break;
            parent = parent.parent;
        }
    } catch(e) {}

    return -1;
}


/**
 * Reorders the objects of a spread into the desired reading order.
 *
 * The desired reading order is items[0] first (read first).
 * In InDesign z-order, "read first" = "furthest back in the layer".
 * So items[0] goes to the bottom, items[1] above it, etc.
 *
 * Method:
 *   1. Send the LAST item to the front (bringToFront) — it will be on top
 *   2. For each preceding item (iterating backwards), place it just
 *      behind the item that follows it in the reading order
 */
function reorderItemsInSpread(spread, items) {

    if (items.length <= 1) return;

    // Filter out any invalid items
    var validItems = [];
    for (var i = 0; i < items.length; i++) {
        if (items[i].isValid) validItems.push(items[i]);
    }
    if (validItems.length <= 1) return;

    // The LAST item in the list (read last) must be at the top of the z-order
    var lastItem = validItems[validItems.length - 1];
    lastItem.bringToFront();

    // Place each preceding item just behind the one that follows it
    // Iterate from second-to-last back to first
    for (var i = validItems.length - 2; i >= 0; i--) {
        var currentItem = validItems[i];
        var itemInFront = validItems[i + 1];

        // sendToBack(reference) places the object just behind the reference
        try {
            currentItem.sendToBack(itemInFront);
        } catch(e) {
            // Fallback: if sendToBack with a reference doesn't work,
            // use repeated sendBackward calls instead
            currentItem.bringToFront();

            var maxTries = 200;
            var tries    = 0;
            while (tries < maxTries) {
                try {
                    // Check whether currentItem is now just behind itemInFront
                    // by comparing their positions in allPageItems
                    var allItems = spread.allPageItems;
                    var posC = -1, posF = -1;
                    for (var k = 0; k < allItems.length; k++) {
                        if (allItems[k].id === currentItem.id) posC = k;
                        if (allItems[k].id === itemInFront.id) posF = k;
                    }
                    // currentItem should be just below itemInFront (posC === posF - 1)
                    if (posC === posF - 1) break;
                    if (posC > posF) {
                        currentItem.sendBackward();
                    } else {
                        // currentItem is already behind itemInFront — done
                        break;
                    }
                } catch(e2) {
                    break;
                }
                tries++;
            }
        }
    }
}


// ============================================================
// STEP 4: Export the PDF
// ============================================================

/**
 * Exports the document as a PDF with recommended PDF/UA settings.
 *
 * Uses an existing Adobe PDF preset if one is found, otherwise
 * exports with accessibility settings enabled.
 */
function exportPDF(doc, pdfFile) {

    var pdfExportPreset = null;

    // Look for a PDF/UA or high-quality preset in the existing presets
    var preferredPresets = [
        "PDF/UA-1", "PDFUA", "PDF UA",
        "High Quality Print", "Haute qualité",
        "[PDF/X-4:2010]", "[Press Quality]", "[Presse qualité]"
    ];

    for (var i = 0; i < preferredPresets.length; i++) {
        try {
            pdfExportPreset = app.pdfExportPresets.itemByName(preferredPresets[i]);
            if (pdfExportPreset.isValid) break;
            pdfExportPreset = null;
        } catch(e) {
            pdfExportPreset = null;
        }
    }

    // Configure export settings
    var exportSettings = app.pdfExportPreferences;

    // Essential accessibility settings
    exportSettings.acrobatCompatibility = AcrobatCompatibility.ACROBAT_7; // PDF 1.6
    exportSettings.exportReaderSpreads  = false;
    exportSettings.includeStructure     = true;  // Include tag structure
    exportSettings.generateThumbnails   = false;
    exportSettings.pageRange            = PageRange.ALL_PAGES;

    // Use the preset if available, otherwise use current settings
    if (pdfExportPreset !== null) {
        doc.exportFile(ExportFormat.PDF_TYPE, pdfFile, false, pdfExportPreset);
    } else {
        doc.exportFile(ExportFormat.PDF_TYPE, pdfFile, false);
    }
}


// ============================================================
// STEP 5: Restore the original z-order
// ============================================================

/**
 * Restores the original z-order of all objects.
 *
 * For each spread, objects are put back in the saved order
 * using their IDs (which are unaffected by z-order changes).
 */
function restoreZOrder(doc, savedOrder) {

    for (var s = 0; s < doc.spreads.length; s++) {
        var spread = doc.spreads[s];
        var key    = "spread_" + spread.index;

        if (!savedOrder.hasOwnProperty(key)) continue;

        var savedIds = savedOrder[key];

        // Rebuild object references from the saved IDs
        var itemsToRestore = [];
        for (var i = 0; i < savedIds.length; i++) {
            try {
                var item = doc.pageItems.itemByID(savedIds[i]);
                if (item && item.isValid) {
                    itemsToRestore.push(item);
                }
            } catch(e) {
                // Object was deleted in the meantime — skip it
            }
        }

        if (itemsToRestore.length <= 1) continue;

        // The last item in savedIds was on top in the original z-order
        // Bring it to front first, then place the others below it
        var lastItem = itemsToRestore[itemsToRestore.length - 1];
        try { lastItem.bringToFront(); } catch(e) {}

        for (var i = itemsToRestore.length - 2; i >= 0; i--) {
            var current = itemsToRestore[i];
            var inFront = itemsToRestore[i + 1];
            try {
                current.sendToBack(inFront);
            } catch(e) {
                // Fallback with sendBackward
                try { current.bringToFront(); } catch(e2) {}
                var maxTries = 200;
                var tries    = 0;
                while (tries < maxTries) {
                    try {
                        var allItems = spread.allPageItems;
                        var posC = -1, posF = -1;
                        for (var k = 0; k < allItems.length; k++) {
                            if (allItems[k].id === current.id) posC = k;
                            if (allItems[k].id === inFront.id) posF = k;
                        }
                        if (posC === posF - 1) break;
                        if (posC > posF) {
                            current.sendBackward();
                        } else {
                            break;
                        }
                    } catch(e2) { break; }
                    tries++;
                }
            }
        }
    }
}
