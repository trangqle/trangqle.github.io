let header = document.getElementById("header");
if (header) {
    new ResizeObserver((entries) => {
        document.documentElement.style.setProperty('--header-block-size', `${entries[entries.length - 1].borderBoxSize[0].blockSize}px`);
    }).observe(header);
}