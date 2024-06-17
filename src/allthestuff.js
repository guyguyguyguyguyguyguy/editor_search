/*
* for resizing https://jsfiddle.net/dLp9qn8c/
*
* for snap and docking 
*   @author https://twitter.com/blurspline / https://github.com/zz85
*   See post @ http://www.lab4games.net/zz85/blog/2014/11/15/resizing-moving-snapping-windows-with-js-css/
*/

const invoke = window.__TAURI__.invoke

window.onload = function () {

    "use strict";

    // Minimum resizable area
    var minWidth = 60;
    var minHeight = 40;

    // Thresholds
    var FULLSCREEN_MARGINS = -10;
    var MARGINS = 4;

    // End of what's configurable.
    var clicked = null;
    var onRightEdge, onBottomEdge, onLeftEdge, onTopEdge;

    var rightScreenEdge, bottomScreenEdge;

    var preSnapped;

    var b, x, y;

    var redraw = false;

    var bar = document.querySelector('.topbar');
    var pane = document.querySelector('.webview');
    var ghostpane = document.querySelector('.ghostpane');
    var editor = document.getElementById('editor');

    function setBounds(element, x, y, w, h) {
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        element.style.width = w + 'px';
        element.style.height = h + 'px';
    }

    function hintHide() {
        setBounds(ghostpane, b.left, b.top, b.width, b.height);
        ghostpane.style.opacity = 0;
    }

    function resetEditor() {
        editor.style.left = "10px";
        editor.style.top = "10px";
        editor.style.width = "100vw";
        editor.style.height = "95vh";
    }

    // Mouse events
    bar.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);


    function onMouseDown(e) {
        onDown(e);
        e.preventDefault();
    }

    function onDown(e) {
        calc(e);

        var isResizing = onRightEdge || onBottomEdge || onTopEdge || onLeftEdge;

        clicked = {
            x: x,
            y: y,
            cx: e.clientX,
            cy: e.clientY,
            w: b.width,
            h: b.height,
            isResizing: isResizing,
            isMoving: !isResizing && canMove(),
            onTopEdge: onTopEdge,
            onLeftEdge: onLeftEdge,
            onRightEdge: onRightEdge,
            onBottomEdge: onBottomEdge
        };
    }

    const canMove = () => x > 0 && x < b.width && y > 0 && y < b.height && y < 30;

    function calc(e) {
        b = pane.getBoundingClientRect();
        x = e.clientX - b.left;
        y = e.clientY - b.top;
        onTopEdge = y < MARGINS;
        onLeftEdge = x < MARGINS;
        onRightEdge = x >= b.width - MARGINS;
        onBottomEdge = y >= b.height - MARGINS;
        rightScreenEdge = window.innerWidth - MARGINS;
        bottomScreenEdge = window.innerHeight - MARGINS;
    }

    var e;

    function onMove(ee) {

        calc(ee);

        e = ee;

        redraw = true;

    }

    function animate() {

        requestAnimationFrame(animate);

        if (!redraw) return;

        redraw = false;

        if (clicked && clicked.isResizing) {

            if (clicked.onRightEdge) pane.style.width = Math.max(x, minWidth) + 'px';
            if (clicked.onBottomEdge) pane.style.height = Math.max(y, minHeight) + 'px';

            if (clicked.onLeftEdge) {
                var currentWidth = Math.max(clicked.cx - e.clientX + clicked.w, minWidth);
                if (currentWidth > minWidth) {
                    pane.style.width = currentWidth + 'px';
                    pane.style.left = e.clientX + 'px';
                }
            }

            if (clicked.onTopEdge) {
                var currentHeight = Math.max(clicked.cy - e.clientY + clicked.h, minHeight);
                if (currentHeight > minHeight) {
                    pane.style.height = currentHeight + 'px';
                    pane.style.top = e.clientY + 'px';
                }
            }

            hintHide();
            return;
        }

        if (clicked && clicked.isMoving) {

            ghostpane.style.display = "inline";

            if (b.top < FULLSCREEN_MARGINS || b.left < FULLSCREEN_MARGINS || b.right > window.innerWidth - FULLSCREEN_MARGINS
                || b.bottom > window.innerHeight - FULLSCREEN_MARGINS) {
                // hintFull();
                setBounds(ghostpane, 0, 0, window.innerWidth, window.innerHeight);
                resetEditor();
                ghostpane.style.opacity = 0.2;
            } else if (b.top < MARGINS) { // hintTop(); 
                setBounds(ghostpane, 0, 0, window.innerWidth, window.innerHeight
                    / 2); ghostpane.style.opacity = 0.2;
                setBounds(editor, 10, (window.innerHeight / 2) + 10, window.innerWidth, 0.95 * window.innerHeight);
            } else if (b.left < MARGINS) { // hintLeft();
                setBounds(ghostpane, 0, 0, window.innerWidth / 2, window.innerHeight); setBounds(editor,
                    (window.innerWidth / 2) + 10, 10, window.innerWidth, 0.95 * window.innerHeight);
                ghostpane.style.opacity = 0.2;
            } else if (b.right > rightScreenEdge) {
                // hintRight();
                setBounds(ghostpane, window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
                setBounds(editor, 10, 10, (window.innerWidth / 2) - 10, 0.95 * window.innerHeight);
                ghostpane.style.opacity = 0.2;
            } else if (b.bottom > bottomScreenEdge) {
                // hintBottom();
                setBounds(ghostpane, 0, window.innerHeight / 2, window.innerWidth, window.innerWidth / 2);
                setBounds(editor, 10, 10, window.innerWidth, (window.innerHeight / 2) - 10);
                ghostpane.style.opacity = 0.2;
            } else {
                resetEditor();
                hintHide();
            }

            if (preSnapped) {
                setBounds(pane,
                    e.clientX - preSnapped.width / 2,
                    e.clientY - Math.min(clicked.y, preSnapped.height),
                    preSnapped.width,
                    preSnapped.height
                );
                return;
            }

            // moving
            pane.style.top = (e.clientY - clicked.y) + 'px';
            pane.style.left = (e.clientX - clicked.x) + 'px';

            return;
        }
    }

    animate();

    function onUp(e) {
        calc(e);

        if (clicked && clicked.isMoving) {
            // Snap
            var snapped = {
                width: b.width,
                height: b.height
            };

            if (b.top < FULLSCREEN_MARGINS || b.left < FULLSCREEN_MARGINS || b.right > window.innerWidth -
                FULLSCREEN_MARGINS || b.bottom > window.innerHeight - FULLSCREEN_MARGINS) {
                // hintFull();
                setBounds(pane, 0, 0, window.innerWidth, window.innerHeight);
                preSnapped = snapped;
            } else if (b.top < MARGINS) { // hintTop(); 
                setBounds(pane, 0, 0, window.innerWidth, window.innerHeight / 2); preSnapped = snapped;
            } else if (b.left < MARGINS) { // hintLeft();
                setBounds(pane, 0, 0, window.innerWidth / 2, window.innerHeight); preSnapped = snapped;
                pane.style.resize = "none";
                preSnapped = snapped;
            } else if
                (b.right > rightScreenEdge) {
                // hintRight();
                setBounds(pane, window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
            } else if (b.bottom > bottomScreenEdge) {
                // hintBottom();
                setBounds(pane, 0, window.innerHeight / 2, window.innerWidth, window.innerWidth / 2);
                preSnapped = snapped;
            } else {
                preSnapped = null;
            }

            hintHide();

        }

        clicked = null;

    }

    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && event.key === 'e') {
            if (overlay.style.display != 'none') {
                overlay.style.display = 'none';
            } else {
                event.preventDefault();
                const overlay = document.getElementById('overlay');
                const popupInput = document.getElementById('popup-input');
                overlay.style.display = 'flex';
                popupInput.focus();
            }
        }
    });

    document.getElementById('popup-input').addEventListener('input', function (event) {
        const overlay = document.getElementById('overlay');
        const webview = document.querySelector('.webview');
        const iframe = document.getElementById('webview-iframe');
        const value = event.target.value;

        // TODO: Here we send the input eg. "WW2" to the rust backend, which selects n number
        // of resources (scholar, wiki, etc.)
        // Then sends this back and it is displayed by the javascript
        // Selecting one will open it in the webview
        // Send value to Rust backend

        invoke('process_search', { query: value }).then(
            (message) => console.log(message)
        )

        if (event.key === 'Enter') {
            overlay.style.display = 'none';
            webview.style.width = "50%";
        }
    });

    // document.querySelector(".collapse-button").onclick = function () {
    //     const editor = document.getElementById('editor');
    //     if (editor.style.margin != null) {
    //         initalLayout();
    //     } else {
    //         const webview = document.querySelector('.webview');

    //         if (webview.style.width == "5vw") {
    //             webview.style.width = "10vw";
    //             editor.style.marginLeft = '23vw';
    //         } else {
    //             webview.style.width = "5vw";
    //             editor.style.marginLeft = '8vw';
    //         }
    //     }
    // }

    document.addEventListener('click', function (event) {
        const overlay = document.getElementById('overlay');
        if (event.target === overlay) {
            overlay.style.display = 'none';
        }
    });

    document.addEventListener('keydown', function (event) {
        const overlay = document.getElementById('overlay');
        if (event.key == 'Escape' && overlay.style.display != 'none') {
            overlay.style.display = 'none';
        }
    });

}