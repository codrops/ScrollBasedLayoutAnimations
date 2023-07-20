// Import the necessary function for preloading images
import { preloadImages } from './utils.js';

// Define a variable that will store the Lenis smooth scrolling object
let lenis;

// Function to initialize Lenis for smooth scrolling
const initSmoothScrolling = () => {
	// Instantiate the Lenis object with specified properties
	lenis = new Lenis({
		lerp: 0.1, // Lower values create a smoother scroll effect
		smoothWheel: true // Enables smooth scrolling for mouse wheel events
	});

	// Update ScrollTrigger each time the user scrolls
	lenis.on('scroll', () => ScrollTrigger.update());

	// Define a function to run at each animation frame
	const scrollFn = (time) => {
		lenis.raf(time); // Run Lenis' requestAnimationFrame method
		requestAnimationFrame(scrollFn); // Recursively call scrollFn on each frame
	};
	// Start the animation frame loop
	requestAnimationFrame(scrollFn);
};

// Function to trigger Flip animations when scrolling
const triggerFlipOnScroll = (galleryEl, options) => {
	// Default settings for Flip and ScrollTrigger
	let settings = {
		flip: {
			absoluteOnLeave: false,
			absolute: false,
			scale: true,
			simple: true,
			//...
		},
		scrollTrigger: {
			start: 'center center',
			end: '+=300%',
		},
		stagger: 0
	};

	// Merge default settings with options provided when calling the function
	settings = Object.assign({}, settings, options);
	
	// Select elements within the gallery that will be animated
	const galleryCaption = galleryEl.querySelector('.caption');
	const galleryItems = galleryEl.querySelectorAll('.gallery__item');
	const galleryItemsInner = [...galleryItems].map(item => item.children.length > 0 ? [...item.children] : []).flat();
	
	// Temporarily add the final class to capture the final state
	galleryEl.classList.add('gallery--switch');
	const flipstate = Flip.getState([galleryItems, galleryCaption], {props: 'filter, opacity'});

	// Remove the final class to revert to the initial state
	galleryEl.classList.remove('gallery--switch');
	
	// Create the Flip animation timeline
	const tl = Flip.to(flipstate, {
		ease: 'none',
		absoluteOnLeave: settings.flip.absoluteOnLeave,
		absolute: settings.flip.absolute,
		scale: settings.flip.scale,
		simple: settings.flip.simple,
		scrollTrigger: {
			trigger: galleryEl,
			start: settings.scrollTrigger.start,
			end: settings.scrollTrigger.end,
			pin: galleryEl.parentNode,
			scrub: true,
		},
		stagger: settings.stagger
	});

	// If there are inner elements in the gallery items, animate them too
	if ( galleryItemsInner.length ) {
		tl.fromTo(galleryItemsInner, {
			scale: 2
		}, {
			scale: 1,
			scrollTrigger: {
				trigger: galleryEl,
				start: settings.scrollTrigger.start,
				end: settings.scrollTrigger.end,
				scrub: true,
			},
		}, 0)
	}
};

// Function to apply scroll-triggered animations to various galleries
// Apply scroll-triggered animations to each gallery with specific settings
const scroll = () => {
	// Define the gallery IDs and their options
    const galleries = [
        { id: '#gallery-1', options: { flip: { absoluteOnLeave: true, scale: false } } },
        { id: '#gallery-2' },
        { id: '#gallery-3', options: { flip: { absolute: true, scale: false }, scrollTrigger: { start: 'center center', end: '+=900%' }, stagger: 0.05 } },
        { id: '#gallery-4' },
        { id: '#gallery-5' },
        { id: '#gallery-6' },
        { id: '#gallery-7' },
        { id: '#gallery-8', options: { flip: { scale: false } } },
        { id: '#gallery-9' },
    ];

    // Loop through the galleries and apply the scroll-triggered animations
    galleries.forEach(gallery => {
        const galleryElement = document.querySelector(gallery.id);
        triggerFlipOnScroll(galleryElement, gallery.options);
    });
}

// Preload images, initialize smooth scrolling, apply scroll-triggered animations, and remove loading class from body
preloadImages('.gallery__item').then(() => {
	initSmoothScrolling();
	scroll();
	document.body.classList.remove('loading');
});