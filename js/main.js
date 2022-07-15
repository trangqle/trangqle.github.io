let docObjects = [];
let domAttrAdd = new Map();
let domAttrRemove = new Map();
let domSetStyle = new Map();
let domSetStyleProp = new Map();
let afterFrame = [];

let frameId = 0;
let lastFrameTime = 0;
function renderFrame(frameTime) {
    for (const [idx, elem] of domAttrAdd) {
        // Benchmarking shows that querying is faster than set
        if (!docObjects[idx].hasAttribute(elem))
            docObjects[idx].setAttribute(elem, '');
    }
    for (const [idx, elem] of domSetStyle)
        docObjects[idx].setAttribute('style', elem);
    for (const [idx, [prop, value]] of domSetStyleProp)
        docObjects[idx].style.setProperty(prop, value);
    for (const [idx, elem] of domAttrRemove) {
        if (docObjects[idx].hasAttribute(elem))
            docObjects[idx].removeAttribute(elem);
    }

    domAttrAdd.clear();
    domAttrRemove.clear();
    domSetStyle.clear();
    domSetStyleProp.clear();

    frameId = 0;

    let localAfterFrame = [...afterFrame];
    afterFrame.splice(0);
    for (let idx = 0; idx < localAfterFrame.length; idx++)
        localAfterFrame[idx](frameTime);

    lastFrameTime = frameTime;
}
function queueFrame() {
    frameId = frameId === 0 ? requestAnimationFrame(renderFrame) : frameId;
}

const DocId = docObjects.push(document.documentElement) - 1;

let instantCursors = [];
let lerpCursors = [];
for (cursor of document.getElementsByClassName("cursor")) {
    if (cursor.classList.contains('cursor-anim:lerp')) {
        lerpCursors.push(docObjects.push(cursor) - 1);
    } else {
        instantCursors.push(docObjects.push(cursor) - 1);
    }
}
let lerpPosition = lerpCursors.map(() => [0, 0]);

function setCursorPosition(id, x, y) {
    domSetStyleProp.set(id, ['transform', `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0)`]);
}

function lerp(src, dest, step) {
    return src + step * (dest - src);
}

let lerpAnimateId = -1;
let lerpTarget = [0, 0];
function animateLerpCursors(frameTime) {
    lerpAnimateId = -1;

    for (let idx = 0; idx < lerpCursors.length; idx++) {
        const id = lerpCursors[idx];
        if (Math.abs(lerpPosition[idx][0] - lerpTarget[0]) > 0.1
            || Math.abs(lerpPosition[idx][1] - lerpTarget[1]) > 0.1) {
            lerpPosition[idx][0] = lerp(lerpPosition[idx][0], lerpTarget[0], 0.5 * Math.min(1, (frameTime - lastFrameTime) / 50));
            lerpPosition[idx][1] = lerp(lerpPosition[idx][1], lerpTarget[1], 0.5 * Math.min(1, (frameTime - lastFrameTime) / 50));

            setCursorPosition(id, lerpPosition[idx][0], lerpPosition[idx][1]);

            queueLerpCursorAnimation();
            queueFrame();
        }
    }
}

function queueLerpCursorAnimation() {
    lerpAnimateId = lerpAnimateId < 0 ? afterFrame.push(animateLerpCursors) - 1 : lerpAnimateId;
}

function enableCursors() {
    domAttrAdd.set(DocId, 'data-customcursor');
    domAttrRemove.delete(DocId);
}

function disableCursors() {
    domAttrRemove.set(DocId, 'data-customcursor');
    domAttrAdd.delete(DocId);
}

function setHover(id) {
    domAttrAdd.set(id, 'data-hover');
    domAttrRemove.delete(id);
}

function setCursorHover() {
    for (let idx = 0; idx < instantCursors.length; idx++)
        setHover(instantCursors[idx]);
    for (let idx = 0; idx < lerpCursors.length; idx++)
        setHover(lerpCursors[idx]);
}

function unsetHover(id) {
    domAttrRemove.set(id, 'data-hover');
    domAttrAdd.delete(id);
}

function unsetCursorHover() {
    for (let idx = 0; idx < instantCursors.length; idx++)
        unsetHover(instantCursors[idx]);
    for (let idx = 0; idx < lerpCursors.length; idx++)
        unsetHover(lerpCursors[idx]);
}

function handlePointer(event) {
    if (event.pointerType !== 'touch') {
        if (event.type !== 'pointerleave')
            enableCursors();
        else
            disableCursors();

        if (event.type === 'pointerover')
            setCursorHover();
        else if (event.type === 'pointerout')
            unsetCursorHover();

        for (let idx = 0; idx < instantCursors.length; idx++)
            setCursorPosition(instantCursors[idx], event.clientX, event.clientY);

        lerpTarget = [event.clientX, event.clientY];
        queueLerpCursorAnimation();
        queueFrame();
    }
}

docObjects[DocId].addEventListener('pointerenter', handlePointer, {passive: true});
docObjects[DocId].addEventListener('pointermove', handlePointer, {passive: true});
docObjects[DocId].addEventListener('pointerleave', handlePointer, {passive: true});
for (const elem of document.querySelectorAll('a, button')) {
    elem.addEventListener('pointerover', handlePointer, {passive: true});
    elem.addEventListener('pointerout', handlePointer, {passive: true});
}

let header = document.getElementById("header");
if (header) {
    new ResizeObserver((entries) => {
        let box = entries[0];
        let blockSize = box.borderBoxSize ? box.borderBoxSize[0].blockSize : box.target.getBoundingClientRect().height;
        domSetStyleProp.set(DocId, ['--header-block-size', `${blockSize}px`]);
        queueFrame();
    }).observe(header, {box: 'border-box'});
}