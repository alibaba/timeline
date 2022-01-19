/**
 * Copyright (c) 2017 Alibaba Group Holding Limited
 * Copyright (c) 2010-2012 Tween.js authors
 * @author Simon(Meng) / gaomeng1900 @gmail.com
 */

// polyfills

/**
 * polyfilled requestAnimationFrame
 */
let raf: typeof requestAnimationFrame
/**
 * polyfilled cancelAnimationFrame
 */
let cancelRaf: typeof cancelAnimationFrame

// 在Worker和node环境中不存在raf，因此可以使用setTimeout替代
if (typeof requestAnimationFrame !== 'undefined') {
	raf = requestAnimationFrame
	cancelRaf = cancelAnimationFrame
} else {
	console.warn('requestAnimationFrame does not exist in context. will use setTimeout instead')
	raf = (cbk) => setTimeout(cbk, 15)
	cancelRaf = clearTimeout
}

export { raf, cancelRaf }

/**
 * development mode
 */
export const DEV = true

// DEV check states
import type { Track } from './Track'
export function assertStates(track: Track, inited: boolean, started: boolean, running?: boolean) {
	if (!track.alive) {
		throw new Error(`Timeline::DEV: wrong state "alive"=${track.alive}`)
	}
	// if (track.alive !== alive) {
	// 	throw new Error(`Timeline::DEV: wrong state "alive"=${track.alive}`)
	// }
	if (track.inited !== inited) {
		throw new Error(`Timeline::DEV: wrong state "inited"=${track.inited}`)
	}
	if (track.started !== started) {
		throw new Error(`Timeline::DEV: wrong state "started"=${track.started}`)
	}
	if (running !== undefined && track.running !== running) {
		throw new Error(`Timeline::DEV: wrong state "running"=${track.running}`)
	}
}
