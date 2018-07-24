import Timeline from './Timeline';

// 最大等待队列，超出后将舍弃最久的pull request
const MAX_WAIT_QUEUE = 2;

export default class OriginTimeline extends Timeline {
    constructor(props={}) {
        super(props)
        console.warn('OriginTimeline已被Timeline替代，可直接使用Timeline');
    }
}
