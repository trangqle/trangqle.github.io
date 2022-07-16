let docObjects = [];
let docToId = new Map();
let domAttrAdd = [];
let domAttrRemove = [];
let domSetStyle = [];
let domSetStyleProp = [];
let afterFrame = [];

let frameId = 0;
let lastFrameTime = 0;
function renderFrame(frameTime) {
    domAttrAdd.forEach((elem, idx) => {
        // Benchmarking shows that querying is faster than set
        if (!docObjects[idx].hasAttribute(elem))
            docObjects[idx].setAttribute(elem, '');
    });
    domSetStyle.forEach((elem, idx) => {
        docObjects[idx].setAttribute('style', elem);
    });
    domSetStyleProp.forEach(([prop, value], idx) => {
        docObjects[idx].style.setProperty(prop, value);
    });
    domAttrRemove.forEach((elem, idx) => {
        if (docObjects[idx].hasAttribute(elem))
            docObjects[idx].removeAttribute(elem);
    });

    domAttrAdd = [];
    domAttrRemove = [];
    domSetStyle = [];
    domSetStyleProp = [];

    frameId = 0;

    let localAfterFrame = afterFrame;
    afterFrame = [];
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
    domSetStyleProp[id] = ['transform', `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0)`];
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
    domAttrAdd[DocId] = 'data-customcursor';
    delete domAttrRemove[DocId];
}

function disableCursors() {
    domAttrRemove[DocId] = 'data-customcursor';
    delete domAttrAdd[DocId];
}

function setHover(id) {
    domAttrAdd[id] = 'data-hover';
    delete domAttrRemove[id];
}

function setCursorHover() {
    for (let idx = 0; idx < instantCursors.length; idx++)
        setHover(instantCursors[idx]);
    for (let idx = 0; idx < lerpCursors.length; idx++)
        setHover(lerpCursors[idx]);
}

function unsetHover(id) {
    domAttrRemove[id] = 'data-hover';
    delete domAttrAdd[id];
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
let headerBlockSize;
if (header) {
    new ResizeObserver((entries) => {
        let box = entries[0];
        headerBlockSize = box.borderBoxSize ? box.borderBoxSize[0].blockSize : box.target.getBoundingClientRect().height;
        domSetStyleProp[DocId] = ['--header-block-size', `${headerBlockSize}px`];
        queueFrame();
    }).observe(header, {box: 'border-box'});
}

let animeObserver = new IntersectionObserver((entries) => {
    let visibleIds = entries.filter(x => x.isIntersecting).map(x => docToId.get(x.target));
    for (let i = 0; i < visibleIds.length; i++)
        domAttrAdd[visibleIds[i]] = 'data-shown';
    queueFrame();
}, {
    threshold: 0.5
});
for (const elem of document.getElementsByClassName('anime')) {
    let elemId = docObjects.push(elem) - 1;
    docToId.set(elem, elemId);
    animeObserver.observe(elem);
}

let minInlineSize = [];
let sizeTracker = new ResizeObserver((entries) => {
    for (let i = 0; i < entries.length; i++) {
        const nodeId = docToId.get(entries[i].target);
        const minSize = minInlineSize[nodeId];
        const inlineSize = entries[i].borderBoxSize ? entries[i].borderBoxSize[0].inlineSize : entries[i].target.getBoundingClientRect().width;
        if (inlineSize >= minSize) {
            domAttrAdd[nodeId] = 'data-abovemininline';
            delete domAttrRemove[nodeId];
        } else {
            domAttrRemove[nodeId] = 'data-abovemininline';
            delete domAttrAdd[nodeId];
        }
    }

    queueFrame();
});

for (const elem of document.getElementsByClassName('track-size')) {
    if (elem.hasAttribute('data-mininlinesize')) {
        const nodeMinInlineSize = elem.getAttribute('data-mininlinesize');
        const test = document.createElement('div');
        test.style.inlineSize = nodeMinInlineSize;
        elem.appendChild(test);
        const minInlineSizeInPx = test.getBoundingClientRect().width;
        elem.removeChild(test);

        const id = docObjects.push(elem) - 1;
        docToId.set(elem, id);
        minInlineSize[id] = minInlineSizeInPx;

        sizeTracker.observe(elem);
    }
}