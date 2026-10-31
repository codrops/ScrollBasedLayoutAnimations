// Preload images, including the ones set as CSS background images
const preloadImages = (selector = 'img') => {
    const images = [...document.querySelectorAll(selector)].map(el => {
        if ( el.tagName === 'IMG' ) return el;
        const url = getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
        if ( !url ) return null;
        const img = new Image();
        img.src = url;
        return img;
    }).filter(Boolean);
    // decode() resolves once an image is loaded and ready to paint (a broken image shouldn't hold up the page)
    return Promise.all(images.map(img => img.decode().catch(() => {})));
};

export {
    preloadImages,
};
