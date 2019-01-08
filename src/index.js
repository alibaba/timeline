import Timeline from './Timeline';

export default Timeline;

export {
    Timeline,
};

// 尝试挂到全局 @TODO Node与Worker的区分
let g = {};

// 浏览器主线程
if (typeof window !== 'undefined') { g = window; }
// Web Worker
else if (typeof self !== 'undefined') { g = self; }
// node
else if (typeof process !== 'undefined') { g = process; }

if (!g.Timeline) { g.Timeline = Timeline; }
// else if (g.Timeline.VERSION !== Timeline.VERSION) {
// 	console.warn('different version of timeline detected');
// }
