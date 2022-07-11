let header = document.getElementById("header");
if (header) {
    new ResizeObserver((entries) => {
        let box = entries[0];
        let blockSize = box.borderBoxSize ? box.borderBoxSize[0].blockSize : box.target.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-block-size', `${blockSize}px`);
    }).observe(header, {box: 'border-box'});
}

let cursors = Array.from(document.getElementsByClassName("cursor"));
let pointerPos = {x: 0, y: 0};
let cursorPos = cursors.map(() => {return {x: 0, y: 0};});

let enabledCursors = false;
let nextCursorState = enabledCursors;
let hoverState = false;
let nextHoverState = hoverState;

let rendererId = 0;
let updateCursorIds = new Array();
let cursorIds = new Array();
let lerpCursorIds = new Array();

for (const id of cursors.keys()) {
    let cursor = cursors[id];
    if (cursor.classList.contains('cursor-anim:lerp')) {
        lerpCursorIds.push(id);
    } else {
        cursorIds.push(id);
    }
}

let lastUpdate = 0;

let renderCursors = () => {
    if (nextCursorState !== enabledCursors) {
        for (let i = 0; nextCursorState && i < cursorPos.length; i++) {
            cursorPos[i].x = pointerPos.x;
            cursorPos[i].y = pointerPos.y;
            if (!updateCursorIds.includes(i))
                updateCursorIds.push(i);
        }
        if (enabledCursors) {
            document.documentElement.removeAttribute('data-customcursor');
        } else {
            document.documentElement.setAttribute('data-customcursor', '');
        }

        enabledCursors = nextCursorState;
    }

    while (updateCursorIds.length > 0) {
        let id = updateCursorIds.pop();
        // setAttribute is faster than everything else
        cursors[id].setAttribute('style', `--x: ${cursorPos[id].x}px; --y: ${cursorPos[id].y}px`);
        if (nextHoverState !== hoverState) {
            if (nextHoverState)
                cursors[id].setAttribute('data-hover', '');
            else
                cursors[id].removeAttribute('data-hover');
        }
    }

    hoverState = nextHoverState;
};

let lerp = (src, dst, step) => {
    return src + step * (dst - src);
};

let animateLerpCursors = (time) => {
    // Process lerp-ed cursor positions
    let needsUpdate = false;
    for (let i = 0; i < lerpCursorIds.length; i++) {
        let id = lerpCursorIds[i];
        let nextX = lerp(cursorPos[id].x, pointerPos.x, 0.5 * Math.max(1, (time - lastUpdate) / 50));
        let nextY = lerp(cursorPos[id].y, pointerPos.y, 0.5 * Math.max(1, (time - lastUpdate) / 50));

        nextX = Math.abs(nextX - pointerPos.x) < 0.001 ? pointerPos.x : nextX;
        nextY = Math.abs(nextY - pointerPos.y) < 0.001 ? pointerPos.y : nextY;

        needsUpdate = needsUpdate || cursorPos[id].x !== nextX || cursorPos[id].y !== nextY;

        cursorPos[id].x = nextX;
        cursorPos[id].y = nextY;

        if (!updateCursorIds.includes(id))
            updateCursorIds.push(id);
    }

    if (needsUpdate)
        requestRender();
};

let requestRender = () => {
    rendererId = rendererId === 0 ? requestAnimationFrame((time) => {
        updateCursors();
        renderCursors();
        rendererId = 0;
        animateLerpCursors(time);
        lastUpdate = time;
    }) : rendererId;
}

let updateCursors = () => {
    // Process normal cursor positions
    for (let i = 0; i < cursorIds.length; i++) {
        let id = cursorIds[i];
        cursorPos[id].x = pointerPos.x;
        cursorPos[id].y = pointerPos.y;
        if (!updateCursorIds.includes(id))
            updateCursorIds.push(id);
    }
};

let pointerHandler = (event) => {
    if (event.pointerType !== 'touch') {
        pointerPos.x = event.clientX;
        pointerPos.y = event.clientY;
        nextCursorState = event.type !== 'pointerleave';
        requestRender();
    }
};

let hoverHandler = (event) => {
    nextHoverState = event.type === 'pointerover';
    requestRender();
}

document.documentElement.addEventListener('pointermove', pointerHandler, {passive: true});

document.documentElement.addEventListener('pointerenter', pointerHandler, {passive: true});

document.documentElement.addEventListener('pointerleave', pointerHandler, {passive: true});

for (const elem of document.querySelectorAll('a, button')) {
    elem.addEventListener('pointerover', hoverHandler, {passive: true});
    elem.addEventListener('pointerout', hoverHandler, {passive: true});
}