import Timeline from './Timeline';

// 最大等待队列，超出后将舍弃最久的pull request
const MAX_WAIT_QUEUE = 2;

export default class OriginTimeline extends Timeline {
    constructor(props={}) {
        props.port = undefined;
        super(props);

        if ((!props.id && props.id !== 0))
            throw new Error('wrong params: ' + JSON.stringify(props))

        this.shadows = [];
        this.id = props.id;

        (props.shadows || []).forEach(port => this.addShadow(port));


        // onEnd回调需要特殊处理
        this.onEnd = () => {
            this.shadows.forEach(shadow => {
                // @TODO 清掉缓存中的请求，
                // onEnd优先级高，而且后面不能有延迟的请求
                shadow.port.postMessage({
                    __timeline_type: 'end',
                    __timeline_id: this.config.id,
                    __timeline_shadow_id: shadow.shadow_id,
                    __timeline_msg: {
                        currentTime: this.currentTime,
                        duration: this.duration,
                        referenceTime: this.referenceTime,
                    },
                });
            });
        };

        // 更新shadow时间
        // @TODO 似乎和Track等效
        this.onTimeUpdate = timeline => {
            // 同步Timeline

            this.shadows.forEach(shadow => {
                const msg = {
                    __timeline_type: 'tick',
                    __timeline_id: this.id,
                    __timeline_shadow_id: shadow.id,
                    __timeline_msg: {
                        currentTime: this.currentTime,
                        duration: this.duration,
                        referenceTime: this.referenceTime,
                    },
                };
                const f = () => {
                    shadow.waiting = true;
                    shadow.port.postMessage(msg);
                };

                if (shadow.waiting) {
                    // 任务执行中，需要排队
                    // console.log('任务执行中，需要排队', shadow.id)
                    if (shadow.waitQueue.length >= MAX_WAIT_QUEUE) {
                        // 队伍过长，挤掉前面的
                        // console.log('等待队列满，将舍弃过旧的消息')
                        shadow.waitQueue.shift();
                    }
                    shadow.waitQueue.push(f);
                } else {
                    // @TODO 是否可能在排队却没有任务在执行的情况？
                    if (!shadow.waiting && shadow.waitQueue.length)
                        console.error('在排队却没有任务在执行!!!');

                    // 空闲状态，直接执行
                    f();
                }
            });
        };
    }

    addShadow(port) {
        const shadow = {
            port,
            // 等待队列
            waitQueue: [],
            // 当前有任务在等待返回
            waiting: false,
            // 一对多，需要一个额外的ID
            id: performance.now() + Math.random(),
        };

        // 回执
        // port.onmessage = e => {
        port.addEventListener('message', e => {
            // console.log(e);
            if (!e.data ||
                 e.data.__timeline_id !== this.id ||
                 e.data.__timeline_shadow_id !== shadow.id
            ) return;

            if (e.data.__timeline_type === 'done') {
                shadow.waiting = false;
                shadow.waitQueue.length && shadow.waitQueue.shift()();
            }
        });

        // 同步初始状态
        port.postMessage({
            __timeline_type: 'init',
            __timeline_id: this.config.id,
            // 分配端口ID
            __timeline_shadow_id: shadow.id,
            __timeline_msg: {
                ...this.config,
                shadows: [],
            },
            // __timeline_timenow: this.referenceTime,
        });

        this.shadows.push(shadow);
    }
}
