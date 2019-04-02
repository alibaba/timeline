/**
 * Copyright (c) 2017 Alibaba Group Holding Limited
 * @author Simon / gaomeng1900@gmail.com
 */

import Timeline from './Timeline'

export default Timeline

export { Timeline }

// 尝试挂到全局 @TODO Node与Worker的区分
let g = {}

if (typeof window !== 'undefined') {
	// 浏览器主线程
	g = window
} else if (typeof self !== 'undefined') {
	// Web Worker
	g = self
} else if (typeof process !== 'undefined') {
	// node
	g = process
}

if (!g.Timeline) {
	g.Timeline = Timeline
}
// else if (g.Timeline.VERSION !== Timeline.VERSION) {
// 	console.warn('different version of timeline detected');
// }
