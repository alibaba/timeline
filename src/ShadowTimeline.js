import Timeline from './Timeline'

export default class ShadowTimeline extends Timeline {
    constructor(props={}) {
        props.ports = []; // 禁止即做master又做slave
        super(props);

        if (!props.port || (!props.id && props.id !== 0))
            throw new Error('wrong params: ' + JSON.stringify(props))

        this.port = props.port;
        this.id = props.id;
        this.shadow_id;

        // this.__timeNow = 0;

        // this.port.onmessage = ({data}) => {
        this.port.addEventListener('message', e => {
            const data = e.data;
            if (!data || data.__timeline_id !== this.id) return;

            // 已分配shadow_id，只接受自己的消息
            if (this.shadow_id) {
                if (data.__timeline_shadow_id !== this.shadow_id) return;

                if (data.__timeline_type === 'tick') {
                    this.currentTime = data.__timeline_msg.currentTime;
                    this.duration = data.__timeline_msg.duration;
                    this.referenceTime = data.__timeline_msg.referenceTime;
                    super.tick(true, this.currentTime);
                    // @NOTE currentTime会是对的，referenceTime会乱掉

                    // 完成回执
                    this.port.postMessage({
                        __timeline_type: 'done',
                        __timeline_id: this.id,
                        __timeline_shadow_id: this.shadow_id,
                    });
                }
            } else {
                // 未分配shadow_id，需要接受分配
                // @NOTE 抢占一个shadow_id即可，一个origin的多个shadow之间的顺序不重要
                // console.log('需要被分配', data)

                // if (data.__timeline_port_taken) return;

                if (data.__timeline_type === 'init') {
                    // console.log('接受分配', data);
                    // 占用该port
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation(); // IE 9
                    // data.__timeline_port_taken = true;
                    this.shadow_id = data.__timeline_shadow_id;
                    // @TODO 取消冒泡是否也可以，可以避免多余的判断
                    // 初始化自身的设置
                    this.config = data.__timeline_msg;
                    this.duration = this.config.duration;
                    this.loop = this.config.loop;
                }
            }

        });
    }

    // 调到指定时间
    seek(time) {
        this.currentTime = time;
        return this;
    }

    tick() { console.error('ShadowTimeline shall not be edited derictly!'); }
    play() { console.error('ShadowTimeline shall not be edited derictly!'); }
    // seek() { console.error('ShadowTimeline shall not be edited derictly!'); }
    stop() { console.error('ShadowTimeline shall not be edited derictly!'); }
    pause() { console.error('ShadowTimeline shall not be edited derictly!'); }
    resume() { console.error('ShadowTimeline shall not be edited derictly!'); }
}
