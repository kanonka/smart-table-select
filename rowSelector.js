.directive('rowSelector', ['$document', '$timeout', function ($document, $timeout) {
    return {
        restrict: 'A',
        link: function (scope, elem, attrs, ctrl) {
            var rowsName = attrs.stTable;
            var singleExpr = attrs.rowSelectorSingle;
            var rowSelector = attrs.rowSelector;
            var rowSelectorApi = scope[attrs.rowSelectorApi];
            var rowSelectorSelect = attrs.rowSelectorSelect;
            var elemFocus = false;
            var ignoreFocusEvent = false;
            var shiftPressed = false;
            var ctrlPressed = false;
            var displayListName = attrs.stTable;
                
            function isOurTable(outerTable) {
                if (!outerTable)
                    return false;
                var s = outerTable[0] ? outerTable[0].attributes.getNamedItem('st-table') : null;
                return s ? (s.nodeValue === rowsName) : false;
            }

            function isOurs(t) {
                return $.contains($(elem).get(0), t);
            };
            function getRowScope(el) {
                var outerTable = $(el).closest("table");
                while (outerTable) {
                    if (isOurTable(outerTable)) {
                        var tbody = $(el).closest('tbody');
                        if (!tbody || tbody.length == 0)
                            return null;
                        el = $(el).closest('td');
                        if (!el)
                            return null;
                        return $($(el).closest("tr")).scope();
                    }
                    el = $(outerTable).closest('td');
                    if (!el)
                        return null;
                    outerTable = $(el).closest("table");
                }                    
                return null;
            };
            function setActiveElem(e) {
                var possibleInput = $(e).find("button,input,textarea,select");
                if (possibleInput && possibleInput.length > 0) {
                    ignoreFocusEvent = true;
                    possibleInput[0].focus();
                    ignoreFocusEvent = false;
                }
            };
            function findDOMtrs(row) {
                var rows = scope[rowsName];
                var result = [];
                var body = $(elem).find("tbody").each(function (index, e) {
                    $(e).find("tr").each(function (index, tr) {
                        var scopeRow = $(tr).scope()[rowSelector];
                        if (scopeRow === row)
                            result.push(tr);
                    });
                });
                return result;
            };
            function scrollIntoView(element, container) {
                var containerTop = $(container).scrollTop();
                var containerBottom = containerTop + $(container).height();
                var elemTop = element.offsetTop;
                var elemBottom = elemTop + $(element).height();
                if (elemTop < containerTop) {
                    $(container).scrollTop(elemTop);
                } else if (elemBottom > containerBottom) {
                    $(container).scrollTop(elemBottom - $(container).height());
                }
            }
            var selectRow = function (row, doActivate) {
                if (row.isCurrentRow)
                    return; // do nothing - we already have it current
                var rows = scope[rowsName];
                var oldCurRowIdx = -1;
                var oldSelected = row.isSelected ? true : false; // preserve old state
                for (var i = 0; i < rows.length; i++) {
                    if (rows[i].isCurrentRow) {
                        oldCurRowIdx = i;
                        delete rows[i].isCurrentRow;
                    }
                }
                row.isCurrentRow = true;
                scope.$apply(); // let changes apply; if checkbox was checked, let this propagate to the value

                var newSelected = row.isSelected ? true : false;
                var stateChanged = newSelected != oldSelected;
                var isSingle = singleExpr ? scope.$eval(singleExpr) : true;
                var selectedCount = 0;
                for (var i = 0; i < rows.length; i++) {
                    if (isSingle)
                        rows[i].isSelected = false;
                    else
                        selectedCount += rows[i].isSelected ? 1 : 0;
                }
                var newCurRowIdx = rows.indexOf(row);
                var needActiveSet = false;
                if (row && !row.isSelected) {
                    row.isSelected = true;
                    selectedCount++;
                    if (isSingle)
                        needActiveSet = true;
                }

                if (!isSingle && !stateChanged) { 
                    // case 1: no shift pressed. Clear selection everywhere, and just keep it for us:
                    for (var i = 0; !ctrlPressed && i < rows.length; i++) {
                        rows[i].isSelected = false;
                    }
                    row.isSelected = true;
                    selectedCount = 1;
                    if (shiftPressed && oldCurRowIdx > -1) {
                        // now, select all rows between oldCurRowIdx and newCurRowIdx
                        var start = oldCurRowIdx < newCurRowIdx ? oldCurRowIdx : newCurRowIdx;
                        var end = oldCurRowIdx < newCurRowIdx ? newCurRowIdx : oldCurRowIdx;
                        for (var i = start; i <= end; i++) {
                            rows[i].isSelected = true;
                            selectedCount++;
                        }
                    }
                }                    
                scope.$apply();
                // now, we need to make sure that currentRow is visible.
                //TODO - if pagination, and row is not visible, shift                    


                var curRowElem = findDOMtrs(row);
                if (curRowElem.length > 0 && $(curRowElem[0]).get(0)) {
                    scrollIntoView(curRowElem[0], elem[0].parentElement);                        
                    if (doActivate && needActiveSet)
                        setActiveElem(curRowElem[0]);
                }
                if (angular.isUndefined(rowSelectorSelect) === false)
                    scope[rowSelectorSelect](row, selectedCount);
            };
                
            if (rowSelectorApi) {
                rowSelectorApi.setActiveElement = function (row) {
                    var curRowElem = findDOMtrs(row);
                    if (curRowElem.length > 0 && $(curRowElem[0]).get(0)) {
                        scrollIntoView(curRowElem[0], elem[0].parentElement);
                        setActiveElem(curRowElem[0]);
                    }
                };
                rowSelectorApi.getSelectionObject = function (getUniqueId) {
                    var keeper = {};
                    var displayList = scope[displayListName];
                    if (displayList)
                        for (var i = 0; i < displayList.length; i++) {
                            var row = displayList[i];
                            if (row.isSelected || row.isCurrentRow) {
                                var id = getUniqueId(row);
                                keeper[id] = { isSelected: row.isSelected ? true : false, isCurrentRow: row.isCurrentRow ? true :false };
                            }
                        }
                    return keeper;
                };
                rowSelectorApi.applySelectionObject = function (keeper, getUniqueId) {
                    var displayList = scope[displayListName];
                    var activeRow = null;
                    for (var i = 0; i < displayList.length; i++) {
                        var row = displayList[i];
                        var id = getUniqueId(row);
                        var data = keeper[id];
                        if (data) {
                            row.isCurrentRow = data.isCurrentRow ? true : false;
                            row.isSelected = data.isSelected ? true : false;
                            if (row.isCurrentRow)
                                activeRow = row;
                        }
                    }
                    if (activeRow) {
                        $timeout(function () {
                            rowSelectorApi.setActiveElement(activeRow);
                        }, 0);
                    }
                };
                rowSelectorApi.setDisplayedList = function (newlist, getUniqueId) {
                    var keeper = getUniqueId ? rowSelectorApi.getSelectionObject(getUniqueId) : {};
                    scope[displayListName] = [].concat(newlist);
                    if (getUniqueId)
                        rowSelectorApi.applySelectionObject(keeper, getUniqueId);
                }
            };

            elem.on('mouseenter', function () {
                elemFocus = true;
            });
            elem.on('mouseleave', function () {
                elemFocus = false;
                });
            var onFocusIn = function (e) {
                if (e.currentTarget && e.currentTarget.activeElement) { 
                    // walk by to find if this element belongs to our parent:
                    if (isOurs(e.currentTarget.activeElement)) {
                        elemFocus = true;
                        if (!ignoreFocusEvent) {
                            var rowScope = getRowScope(e.currentTarget.activeElement);
                            if (rowScope && !rowScope[rowSelector].isSelected) {
                                selectRow(rowScope[rowSelector]);
                            }
                        }
                    }
                }
            };
            $document.bind('focusin', onFocusIn);
            var onClick = function (e) {
                if (e.currentTarget && e.currentTarget.activeElement) {
                    if (e.target && !isOurs(e.currentTarget.activeElement) && isOurs(e.target)) {
                        var rowScope = getRowScope(e.target);
                        if (rowScope)
                            selectRow(rowScope[rowSelector], true);
                    }
                }
            };
            $document.bind('click', onClick);
            var onKeyUp = function(e) {
                if (e.keyCode == 16)
                    shiftPressed = false;
                if (e.keyCode == 17)
                    ctrlPressed = false;
            };
            $document.bind('keyup', onKeyUp);

            var onKeyDown = function (e) {
                if (e.keyCode == 16)
                    shiftPressed = true;
                if (e.keyCode == 17)
                    ctrlPressed = true;
                if (elemFocus) {
                    // can we move? if we have a dropdown in focus, we cannout!
                    var curFocus = document.activeElement;
                    if (curFocus && $(curFocus).get(0)) { 
                        // well, we have to test:
                        if ($(curFocus).is("select") || $(curFocus).is("textarea") || (curFocus && curFocus.parentElement && $(curFocus.parentElement).hasClass('selectize-input')))
                                return;
                        if (isOurs(curFocus)) {
                            var tBody = $(curFocus).closest('tbody');
                            if (!tBody || !$(tBody).get(0))
                                return;
                        }
                    }

                    var rows = scope[rowsName];
                    if (!(rows.length > 0))
                        return;
                        
                    // navigation does not work in multi select, so let's check for that:
                    var isSingle = singleExpr ? true : scope.$eval(singleExpr);
                    if (!isSingle)
                        return;
                        
                    var idxSelected = -1;
                    var idxCurrent = -1;
                    // ok, it is single, let's find out id of the currently selected item:                        
                    for (i = 0; i < rows.length; i++) {
                        if (rows[i].isSelected && idxSelected == -1) 
                            idxSelected = i;

                        if (rows[i].isCurrentRow && idxCurrent == -1) {
                            idxCurrent = i;
                            break;
                        }
                    }
                        
                    var idx = idxCurrent > -1 ? idxCurrent : (idxSelected > -1 ? idxSelected : 0);
                    if (e.keyCode == 38) {
                        if (idx == 0) {
                            return;
                        }
                            
                        selectRow(rows[idx - 1], true);
                        e.preventDefault();
                    }
                    if (e.keyCode == 40) {
                        if (idx == rows.length - 1) {
                            return;
                        }
                        selectRow(rows[idx + 1], true);
                        e.preventDefault();
                    }
                }
            };
            $document.bind('keydown', onKeyDown);

            scope.$on("$destroy", function () {
                elem.off('mouseenter');
                elem.off('mouseleave');
                $document.unbind('focusin', onFocusIn);
                $document.unbind('click', onClick);
                $document.unbind('keyup', onKeyUp);
                $document.unbind('keydown', onKeyDown);
            });
        }
    };
}]);
