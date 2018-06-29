import Timeline from './Timeline';
import OriginTimeline from './OriginTimeline';
import ShadowTimeline from './ShadowTimeline';

Timeline.ShadowTimeline = ShadowTimeline;
Timeline.OriginTimeline = OriginTimeline;
export default Timeline;

export {
    Timeline,
    ShadowTimeline,
    OriginTimeline
};


// 尝试挂到全局 @TODO Node与Worker的区分
// 浏览器主线程
if (typeof window !== 'undefined') {
    window.Timeline || (window.Timeline = Timeline);
}
// Web Worker
if (typeof self !== 'undefined') {
    self.Timeline || (self.Timeline = Timeline);
}
// node
if (typeof window === 'undefined' && typeof process !== 'undefined') {
    process.Timeline || (process.Timeline = Timeline);
}
