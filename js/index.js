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

	// Drive Lenis from GSAP's ticker, so the scroll and the animations update in the same frame
	const update = (time) => lenis.raf(time * 1000); // GSAP's time is in seconds, Lenis' in milliseconds
	gsap.ticker.add(update);
	// Turn off GSAP's lag smoothing, so the scroll never jumps after a slow frame
	gsap.ticker.lagSmoothing(0);

	// Return a function that stops the smooth scrolling again
	return () => {
		gsap.ticker.remove(update);
		lenis.destroy();
	};
};

// Function to trigger Flip animations when scrolling
const triggerFlipOnScroll = (galleryEl, options = {}) => {
	// Default settings for Flip and ScrollTrigger
	const defaults = {
		flip: {
			absoluteOnLeave: false,
			absolute: false,
			scale: true,
			simple: true,
			props: 'filter, opacity', // CSS properties recorded and animated along with the layout
			//...
		},
		scrollTrigger: {
			start: 'center center',
			end: '+=300%',
		},
		stagger: 0,
		ease: 'none'
	};

	// Merge default settings with options provided when calling the function,
	// group by group, so a gallery that sets one Flip option keeps the other defaults
	const settings = {
		...defaults,
		...options,
		flip: { ...defaults.flip, ...options.flip },
		scrollTrigger: { ...defaults.scrollTrigger, ...options.scrollTrigger }
	};

	// Select elements within the gallery that will be animated
	const galleryCaption = galleryEl.querySelector('.caption');
	const galleryItems = galleryEl.querySelectorAll('.gallery__item');
	const galleryItemsInner = galleryEl.querySelectorAll('.gallery__item-inner');
	
	// Temporarily add the final class to capture the final state
	galleryEl.classList.add('gallery--switch');
	const flipstate = Flip.getState([galleryItems, galleryCaption], {props: settings.flip.props});

	// Remove the final class to revert to the initial state
	galleryEl.classList.remove('gallery--switch');
	
	// Create the Flip animation timeline
	const tl = Flip.to(flipstate, {
		ease: settings.ease,
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

// Function to unroll a ring of pictures into the gallery's own row (or column) when scrolling.
// It's 3D, which Flip doesn't record, so the pictures are placed here on every update instead
const triggerUnrollOnScroll = (galleryEl, options = {}) => {
	// Default settings, merged with the options provided when calling the function
	const settings = { start: 'center center', end: '+=450%', unrollStart: 'top 40%', tilt: 22, scale: 1.5, turns: 0.4, overlap: 0.3, ...options };

	// Select elements within the gallery that will be animated
	const galleryCaption = galleryEl.querySelector('.caption');
	const galleryItems = [...galleryEl.querySelectorAll('.gallery__item')];

	// Where the middle of each picture lies along the row (or column on phones, as in css/base.css), from the middle of the row
	const vertical = !window.matchMedia('(min-width: 53em)').matches;
	const centers = galleryItems.map(item => {
		const rect = item.getBoundingClientRect();
		return vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
	});
	const middle = (centers[0] + centers[centers.length - 1]) / 2;
	const offsets = centers.map(center => center - middle);

	// Once flat, the row switches with Flip to a feature view (.gallery--switch): the card at the front large, the others thumbnails.
	// Recorded now, while the row still has no 3D on it and the gallery isn't tilted or scaled
	galleryEl.classList.add('gallery--switch');
	const featureState = Flip.getState(galleryItems, {props: 'borderRadius'});
	galleryEl.classList.remove('gallery--switch');
	const featureTl = Flip.to(featureState, {
		duration: 1,
		ease: 'power2.inOut',
		scale: false,
		simple: true,
		stagger: 0.03,
	});

	// Rolled up, the row closes into a ring exactly as long as itself, its two ends meeting at the back
	const rowLength = galleryItems.length * Math.abs(offsets[1] - offsets[0]);
	const fullBend = 2 * Math.PI / rowLength;

	// Place every picture on the ring for the current amount of unrolling (0 rolled up, 1 flat).
	// The pictures can also slide along the ring (shift, a distance along the row): while it's closed that turns the ring,
	// and as it opens the same slide becomes the row gliding into place
	const state = { unroll: 0, shift: 0 };
	const render = () => {
		const bend = (1 - state.unroll) * fullBend;
		galleryItems.forEach((item, pos) => {
			const angle = bend * (offsets[pos] + state.shift);
			const along = bend ? Math.sin(angle) / bend : offsets[pos] + state.shift;
			gsap.set(item, {
				[vertical ? 'y' : 'x']: along - offsets[pos],
				z: bend ? (Math.cos(angle) - 1) / bend : 0,
				[vertical ? 'rotationX' : 'rotationY']: (vertical ? -1 : 1) * angle * 180 / Math.PI,
				// Lit from the front, darker towards the back of the ring
				'--light': 0.35 + 0.65 * (1 + Math.cos(angle)) / 2
			});
		});
	};

	// Pin the gallery while it unrolls. The wrapper is the trigger, since the gallery itself is tilted and scaled when the positions are measured
	const pin = ScrollTrigger.create({
		trigger: galleryEl.parentNode,
		start: settings.start,
		end: settings.end,
		pin: galleryEl.parentNode,
	});

	// Create the timeline: the ring unrolls, levels out and comes down to size, then switches to the feature view and the caption rises.
	// It starts a little before the pin (unrollStart), while the gallery is still rising into place, and ends with it
	const tl = gsap.timeline({
		scrollTrigger: {
			trigger: galleryEl.parentNode,
			start: settings.unrollStart,
			end: () => pin.end,
			scrub: true,
		}
	});
	tl.fromTo(state, { unroll: 0 }, { unroll: 1, duration: 1, ease: 'power1.inOut', onUpdate: render }, 0)
	.fromTo(galleryEl, { [vertical ? 'rotationY' : 'rotationX']: vertical ? settings.tilt : -settings.tilt, scale: settings.scale }, { [vertical ? 'rotationY' : 'rotationX']: 0, scale: 1, duration: 1, ease: 'power1.inOut' }, 0)
	.add(featureTl, 1.1)
	.fromTo(galleryCaption, { opacity: 0, y: '25vh' }, { opacity: 1, y: 0, duration: 0.5, ease: 'power1.out' }, 1.6);

	// While the gallery comes into view, the ring turns around its axis, and it keeps sliding
	// into the first part of the unrolling (overlap), slowing down, so the two run as one motion
	gsap.fromTo(state, { shift: -settings.turns * rowLength }, {
		shift: 0,
		ease: 'power1.out',
		onUpdate: render,
		scrollTrigger: {
			trigger: galleryEl.parentNode,
			start: 'top bottom',
			// The unrolling is the timeline's first second
			end: () => tl.scrollTrigger.start + settings.overlap * (tl.scrollTrigger.end - tl.scrollTrigger.start) / tl.duration(),
			scrub: true,
		}
	});

	render();
};

// Function to apply scroll-triggered animations to various galleries
// Apply scroll-triggered animations to each gallery with specific settings
const scroll = () => {
	// Define the gallery IDs and their options
    const galleries = [
        // Layouts 01 (index.html)
        { id: '#gallery-1', options: { flip: { absoluteOnLeave: true, scale: false } } },
        { id: '#gallery-2' },
        { id: '#gallery-3', options: { flip: { absolute: true, scale: false }, scrollTrigger: { start: 'center center', end: '+=900%' }, stagger: 0.05 } },
        { id: '#gallery-4' },
        { id: '#gallery-5' },
        { id: '#gallery-6' },
        { id: '#gallery-7' },
        { id: '#gallery-8', options: { flip: { scale: false } } },
        { id: '#gallery-9' },
        // Layouts 02 (index2.html)
        { id: '#gallery-carousel', animate: triggerUnrollOnScroll },
        { id: '#gallery-pyramid', options: { flip: { scale: false, props: 'filter, opacity, borderRadius' }, stagger: 0.08, ease: 'power2.inOut' } },
        { id: '#gallery-sunflower', options: { scrollTrigger: { end: '+=600%' }, stagger: 0.01, ease: 'power2.inOut' } },
        { id: '#gallery-sun', options: { scrollTrigger: { end: '+=400%' }, stagger: 0.03, ease: 'power2.inOut' } },
        { id: '#gallery-pile', options: { stagger: 0.06, ease: 'power2.inOut' } },
        { id: '#gallery-slices', options: { flip: { scale: false, props: 'filter, opacity, backgroundSize, backgroundPosition' }, scrollTrigger: { end: '+=400%' }, stagger: 0.06, ease: 'power2.inOut' } },
        { id: '#gallery-stairs', options: { flip: { scale: false, props: 'filter, opacity, borderRadius' }, stagger: 0.06, ease: 'power2.inOut' } },
        { id: '#gallery-question', options: { scrollTrigger: { end: '+=400%' }, stagger: 0.006, ease: 'power2.inOut' } },
        { id: '#gallery-deal', options: { scrollTrigger: { end: '+=400%' }, stagger: 0.07, ease: 'power2.inOut' } },
        { id: '#gallery-reflow', options: { scrollTrigger: { end: '+=400%' }, stagger: 0.04, ease: 'power2.inOut' } },
    ];

    // Loop through the galleries on this page and apply the scroll-triggered animations
    galleries.forEach(gallery => {
        const galleryElement = document.querySelector(gallery.id);
        if ( !galleryElement ) return;
        // A Flip layout switch, unless the gallery has its own animation
        const animate = gallery.animate || triggerFlipOnScroll;
        animate(galleryElement, gallery.options);
    });
}

// Apply the scroll-triggered animations, and apply them again when the window changes size,
// since Flip records the start and end layouts in pixels
const initLayoutAnimations = () => {
	// Keep the inline styles the animated elements start with: removing a Flip animation leaves its end state on them
	const elements = document.querySelectorAll('.gallery__item, .gallery__item-inner, .gallery .caption');
	const styles = [...elements].map(el => el.getAttribute('style'));
	const resetStyles = () => elements.forEach((el, i) => styles[i] === null ? el.removeAttribute('style') : el.setAttribute('style', styles[i]));

	let ctx = gsap.context(scroll);
	let width = window.innerWidth;
	let height = window.innerHeight;
	let timeout;

	const onResize = () => {
		// On touch screens, only the width counts: the height changes as the browser's toolbar shows and hides
		const isTouch = window.matchMedia('(pointer: coarse)').matches;
		if ( window.innerWidth === width && (isTouch || window.innerHeight === height) ) return;
		width = window.innerWidth;
		height = window.innerHeight;

		clearTimeout(timeout);
		timeout = setTimeout(() => {
			ctx.revert();
			resetStyles();
			ctx = gsap.context(scroll);
			ScrollTrigger.refresh();
		}, 200);
	};
	window.addEventListener('resize', onResize);

	// Return a function that removes the animations again
	return () => {
		window.removeEventListener('resize', onResize);
		clearTimeout(timeout);
		ctx.revert();
		resetStyles();
	};
};

// Show every gallery in its final layout, without animating it
const showFinalLayouts = () => {
	const galleryElements = document.querySelectorAll('.gallery');
	galleryElements.forEach(galleryEl => galleryEl.classList.add('gallery--switch'));

	// Return a function that brings back the initial layouts
	return () => galleryElements.forEach(galleryEl => galleryEl.classList.remove('gallery--switch'));
};

// Preload images and fonts, initialize smooth scrolling, apply scroll-triggered animations, and remove loading class from body
Promise.all([preloadImages('.gallery__item, .gallery__item-inner'), document.fonts.ready]).then(() => {
	const mm = gsap.matchMedia();

	// Only when the visitor hasn't asked for reduced motion
	mm.add('(prefers-reduced-motion: no-preference)', () => {
		const stopSmoothScrolling = initSmoothScrolling();
		const stopLayoutAnimations = initLayoutAnimations();
		// Undo it all if the setting changes
		return () => {
			stopLayoutAnimations();
			stopSmoothScrolling();
		};
	});

	// Otherwise every gallery shows its final layout, still, and the page scrolls natively
	mm.add('(prefers-reduced-motion: reduce)', showFinalLayouts);

	document.body.classList.remove('loading');
});