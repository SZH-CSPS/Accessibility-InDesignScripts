/**
 * ReorderLayersForReadingOrder.jsx
 * =================================
 * Reorders objects in the layers according to the order defined in the
 * InDesign Articles panel, WITHOUT exporting a PDF.
 *
 * Copyright (C) 2025
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
 * Copyright (C) 2025  Contributors
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
 * Use this script to prepare the document before a manual PDF export,
 * or to visually verify the stacking order in the Layers panel.
 *
 * WARNING: This script modifies the stacking order of objects in the layers.
 * Use Edit > Undo (Cmd+Z / Ctrl+Z) to revert the changes.
 */

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

    var proceed = confirm(
        "ReorderLayersForReadingOrder\n\n" +
        "This script will reorder objects in the layers\n" +
        "according to the order defined in the Articles panel.\n\n" +
        "The document will be modified but not saved.\n" +
        "Use Cmd+Z / Ctrl+Z to undo.\n\n" +
        "Continue?"
    );

    if (!proceed) return;

    // --- Run ---

    try {
        var articleItems = getArticleItems(doc);

        if (articleItems.length === 0) {
            alert("The Articles panel contains no objects.");
            return;
        }

        applyReadingOrder(doc, articleItems);

        alert(
            "Done!\n\n" +
            articleItems.length + " object(s) reordered according to the Articles panel.\n\n" +
            "The layer stacking order now matches the reading order.\n" +
            "You can export the PDF manually.\n\n" +
            "Use Cmd+Z / Ctrl+Z to undo if needed."
        );

    } catch (e) {
        alert("Error: " + e.message);
    }

})();


// ============================================================
// Read the Articles panel order
// ============================================================

/**
 * Returns an ordered list of pageItems referenced in the Articles panel.
 *
 * Iterates over all articles in order, then over all members of each
 * article in order. articleMember.itemRef points to the underlying pageItem.
 *
 * Returns an array of { item, articleIndex, memberIndex, articleName }
 * in the desired reading order.
 */
function getArticleItems(doc) {

    var result = [];

    for (var a = 0; a < doc.articles.length; a++) {
        var article = doc.articles[a];

        for (var m = 0; m < article.articleMembers.length; m++) {
            var member = article.articleMembers[m];

            try {
                var pageItem = member.itemRef;
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
// Apply the reading order to the layer stacking
// ============================================================

/**
 * Groups article objects by spread, then reorders them spread by spread.
 *
 * InDesign exports objects into the PDF content stream from the BOTTOM
 * to the TOP of the layer stack. To make the content stream reading order
 * match the Articles panel order, we place:
 *   - The first item to read at the BOTTOM of the stack
 *   - The last item to read at the TOP of the stack
 */
function applyReadingOrder(doc, articleItems) {

    // Group objects by spread
    // (only objects on the same spread can be reordered relative to each other)
    var bySpread = {};

    for (var i = 0; i < articleItems.length; i++) {
        var entry = articleItems[i];
        var item  = entry.item;

        var spreadIndex = getSpreadIndex(item);
        if (spreadIndex === -1) continue;

        var key = "spread_" + spreadIndex;
        if (!bySpread[key]) {
            bySpread[key] = { spreadIndex: spreadIndex, items: [] };
        }
        bySpread[key].items.push(item);
    }

    // Reorder spread by spread
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
        while (parent) {
            try {
                if (parent.reflect && parent.reflect.name === "Spread") return parent.index;
                if (parent.reflect && parent.reflect.name === "Page")   return parent.parent.index;
            } catch(e) {}
            if (parent === app.activeDocument) break;
            parent = parent.parent;
        }
    } catch(e) {}
    return -1;
}


/**
 * Reorders the objects of a spread into the desired reading order.
 *
 * items[0] = first to be read → placed at the BOTTOM of the z-order
 * items[last] = last to be read → placed at the TOP of the z-order
 *
 * Method:
 *   1. Bring the LAST item to front (it must be highest in the z-order)
 *   2. For each preceding item, place it just behind the item above it
 *
 * Uses sendToBack(reference) as the primary method, with a
 * repeated sendBackward() loop as fallback.
 */
function reorderItemsInSpread(spread, items) {

    if (items.length <= 1) return;

    // Filter out any invalid items
    var validItems = [];
    for (var i = 0; i < items.length; i++) {
        if (items[i].isValid) validItems.push(items[i]);
    }
    if (validItems.length <= 1) return;

    // The last item (read last) must be at the top of the z-order
    var lastItem = validItems[validItems.length - 1];
    lastItem.bringToFront();

    // Place each preceding item just behind the one above it in reading order
    for (var i = validItems.length - 2; i >= 0; i--) {
        var current = validItems[i];
        var inFront = validItems[i + 1];

        try {
            // Place current just behind inFront
            current.sendToBack(inFront);
        } catch(e) {
            // Fallback: use repeated sendBackward() calls
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
                    // current should be just below inFront (posC === posF - 1)
                    if (posC === posF - 1) break;
                    if (posC > posF) { current.sendBackward(); }
                    else             { break; } // current is already behind inFront
                } catch(e2) { break; }
                tries++;
            }
        }
    }
}
