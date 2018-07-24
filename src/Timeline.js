/**************************************************
 * Timeline                                       *
 * Manage All Your Events And Animations Together *
 * @author Meng                                   *
 **************************************************/

// @TODO 时间排序
// @TODO 自动排序插入
// @TODO 拆分动作保证顺序
// @TODO 所有的操作都应该在tick中执行，保证timeline之间可以同步状态

import Track from './Track';
import { getTimeNow, raf, cancelRaf } from './utils';
import Stats from './plugins/stats';

// 默认配置
const CONFIG_DEFAULT = {
	duration: Infinity,
	loop: false,
	autoRecevery: false,
	// 页面非激活状态（requestAnimationFrame不工作）时，自动停止播放
	// 避免长时间页面切走后切回，造成的时间突进
	pauseWhenInvisible: false,
	// 最长帧时间限制，如果帧长度超过这个值，则会被压缩到这个值
	// 用于避免打断点时继续计时，端点结束后时间突进
	maxStep: Infinity,
	// 最大帧率限制
	maxFPS: Infinity,

	// @TODO: 保证每个节点的执行顺序
	// orderGuarantee: true,

	// 开启性能面板
	openStats: false,
};

/**
 * Timeline 🌺 🌺 🌺
 * 接口风格与MediaElement保持一致
 */
export default class Timeline {
	// 创建一个Timeline实例，建议全局使用一个实例来方便同一控制所有行为与动画
	constructor(config) {
		this.config = {
			...CONFIG_DEFAULT,
			...config,
		};
		this.isTimeline = true;

		this.duration = this.config.duration;
		this.loop = this.config.loop;

		// 频率限制
		this.minFrame = 900 / this.config.maxFPS;

		this.tracks = [];
		this.currentTime = 0; // timeLocal
		this._lastCurrentTime = 0;
		this.referenceTime = this._getTimeNow(); // 参考时间

		this.animationFrameID = 0;

		this.running = false;

		// this.cbkEnd = [];

		// this._ticks = []; // 把需要执行的tick排序执行（orderGuarantee）

		this._timeBeforeHidden = 0;
		this._timeBeforePaused = 0;

		this._timeoutID = 0; // 用于给setTimeout和setInterval分配ID

		this.shadows = [];
		this.id = this.config.id;
		(this.config.shadows || []).forEach(port => this.addShadow(port));

		if (this.config.openStats) {
			this.stats = new Stats();
			this.stats.showPanel(0);
			document.body.appendChild(this.stats.dom);
		}

		// 页面不可见时暂停计时
		// 非浏览器主线程环境则忽略
		if (this.config.pauseWhenInvisible && typeof (document) !== 'undefined') {
			document.addEventListener("visibilitychange", () => {
				if (document.hidden) {
					this._timeBeforeHidden = this.currentTime;
					cancelRaf(this.animationFrameID);
				} else {
					this.seek(this._timeBeforeHidden);
					if (this.running) {
						this.tick();
					}
				}
			});
		}

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
				// const f = () => {
				//     shadow.waiting = true;
				//     shadow.port.postMessage(msg);
				// };

				if (shadow.waiting) {
					// 任务执行中，需要排队
					// console.log('任务执行中，需要排队', shadow.id)
					if (shadow.waitQueue.length >= MAX_WAIT_QUEUE) {
						// 队伍过长，挤掉前面的
						// console.log('等待队列满，将舍弃过旧的消息')
						shadow.waitQueue.shift();
					}
					shadow.waitQueue.push(msg);
				} else {
					// @TODO 是否可能在排队却没有任务在执行的情况？
					if (!shadow.waiting && shadow.waitQueue.length)
						console.error('在排队却没有任务在执行!!!');

					// 空闲状态，直接执行
					// f();
					shadow.waiting = true;
					shadow.port.postMessage(msg);
				}
			});
		};
	}

	// 播放结束的回调
	get onEnd() { return this.cbkEnd; }
	set onEnd(cbk) { this.cbkEnd.push(cbk); }

	// 相对时间，只能用来计算差值
	_getTimeNow() { return getTimeNow(); }

	// /**
	// * 每帧调用
	// * @param  {Bool} singleStep 单步逐帧播放
	// * @param  {Num}  time  opt, 跳转到特定时间
	// */
	// tick(singleStep = false, time) {
	/**
	* 每帧调用
	* @param  {Num}  time  opt, 跳转到特定时间, 单步逐帧播放
	*/
	tick(time) {

		if (time === undefined) {
			const currentTime = this._getTimeNow() - this.referenceTime;
			// FPS限制
			if (currentTime - this.currentTime < this.minFrame) {
				this.animationFrameID = raf(() => this.tick());
				return this;
			}
			this._lastCurrentTime = this.currentTime;
			this.currentTime = currentTime;
			// 最长帧限制
			const step = this.currentTime - this._lastCurrentTime;
			if (step > this.config.maxStep) {
				this.seek(this._lastCurrentTime + this.config.maxStep);
			}
		} else {
			this.seek(time);
		}

		// 播放完毕
		if (this.currentTime > this.duration) {
			// if (this.running) {
			// 	for (let i = this.cbkEnd.length - 1; i >= 0; i--) {
			// 		this.cbkEnd[i]();
			// 	}
			// }
			if (this.loop) {
				// @TODO 无法使用 seek(this.currentTime % this.duration)
				// 		 因为会导致onInit混乱
				// 		 onInit的逻辑依赖于循环时回到Track的前面
				this.seek(0); // 保证 onInit 和 onStart 会被触发
			} else {
				this.running = false;
				// 以免track在尾部得不到调用
				// this.onTimeUpdate && this.onTimeUpdate(this);
				// for (let i = this.tracks.length - 1; i >= 0; i--) {
				for (let i = 0; i < this.tracks.length; i++) {
					this.tracks[i].tick(this.currentTime);
				}
				// this.stop()
				return;
			}
		}

		if (this.stats) this.stats.begin()

		// 回调
		this.onTimeUpdate && this.onTimeUpdate(this);

		// 逐个轨道处理
		// for (let i = this.tracks.length - 1; i >= 0; i--) {
		for (let i = 0; i < this.tracks.length; i++) {
			this.tracks[i].tick(this.currentTime);
		}

		// 自动回收
		if (this.config.autoRecevery) {
			this.recovery();
		}

		if (this.stats) this.stats.end()

		if (time !== undefined) {
			this.running = false;
			return this;
		}
		this.animationFrameID = raf(() => this.tick());
		return this;
	}

	// 开始播放
	play() {
		this.stop();
		this.running = true;
		this.referenceTime = this._getTimeNow();
		this.tick();
		return this;
	}

	// 调到指定时间
	seek(time) {
		this.currentTime = time;
		this.referenceTime = this._getTimeNow() - time;
		return this;
	}

	// 停止播放
	stop() {
		this.running = false;
		cancelRaf(this.animationFrameID);
		return this;
	}

	// 暂停播放
	pause() {
		this.running = false;
		this._timeBeforePaused = this.currentTime;
		cancelRaf(this.animationFrameID);
		return this;
	}

	// 从暂停中恢复， ** 不能从停止中恢复 **
	resume() {
		this.pause();
		this.seek(this._timeBeforePaused);
		this.running = true;
		this.tick();
		return this;
	}

	// 清理掉整个Timeline，目前没有发现需要单独清理的溢出点
	destroy() {
		this.stop();
		this.tracks = [];
	}

	// 垃圾回收
	recovery() {
		// 倒序删除，以免数组索引混乱
		for (let i = this.tracks.length - 1; i >= 0; i--) {
			if (!this.tracks[i].alive) {
				this.tracks.splice(i, 1);
			}
		}
	}

	/**
	 * 根据配置创建一个Track
	 * @param {Object} props 配置项，详见Track.constructor
	 * @return {Track} 所创建的Track
	 */
	addTrack(props) {return this.add(props);}
	add(props) {
		if (props.isTimeline) {
			props.tracks.push(props)
			props.parent = this;
			props.onInit && props.onInit(this.currentTime);
			return props;
		} else if (props.isTrack) {
			const track = props;
			track._safeClip(this.duration);
			if (track.parent) {
				track.parent.remove(track);
			}
			track.parent = this;
			track.onInit && track.onInit(this.currentTime);
			this.tracks.push(track);
			return track;
		} else {
			const track = new Track(props);
			track._safeClip(this.duration);
			track.parent = this;
			track.onInit && track.onInit(this.currentTime);
			this.tracks.push(track);
			return track;
		}
	}

	// @TODO remove
	removeTrack(track) {return this.remove(track);}
	remove(track) {console.warn('remove TODO');}

	// 停掉指定Track
	stopTrack(track) {
		const uuid = track.uuid;
		for (let i = this.tracks.length - 1; i >= 0 ; i--) {
			if (this.tracks[i].uuid === uuid) {
				this.tracks[i].alive = false;
			}
		}
	}

	/**
	 * 根据ID获取Tracks
	 * @param  {Number} id
	 * @return {Array(Track)}
	 */
	getTracksByID(id) {
		const tracks = [];
		for (let i = 0; i < this.tracks.length; i++) {
			if (this.tracks[i].id === id) {
				tracks.push(this.tracks[i])
			}
		}
		return tracks;
	}

	clear() {
		this.tracks = [];
	}

	// 重写Dom标准中的 setTimeout 和 setInterval

	setTimeout(callback, time = 10) {
		if (time < 0) time = 0;
		const ID = this._timeoutID ++;
		this.addTrack({
			id: '__timeout__' + ID,
			startTime: this.currentTime + time,
			duration: 1000,
			loop: false,
			onStart: callback,
		});
		return ID;
	}

	setInterval(callback, time = 10) {
		if (time < 0) time = 0;
		const ID = this._timeoutID ++;
		this.addTrack({
			id: '__timeout__' + ID,
			startTime: this.currentTime + time,
			duration: time,
			loop: true,
			onStart: callback,
		});
		return ID;
	}

	clearTimeout(ID) {
		const track = this.getTracksByID('__timeout__' + ID)[0];
		if (track) this.stopTrack(track);
	}

	clearInterval(ID) {
		this.clearTimeout(ID);
	}

	getTime() {
		return this.referenceTime + this.currentTime;
	}

	// NOTE: 暂时不鼓励在外部创建Track
	// static Track = Track

	addShadow(port) {
		if ((!this.id && this.id !== 0))
			throw new Error('你需要给当前Timeline指定ID才能够为其添加shadow')

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

			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation(); // IE 9

			if (e.data.__timeline_type === 'done') {
				shadow.waiting = false;
				// shadow.waitQueue.length && shadow.waitQueue.shift()();
				if (shadow.waitQueue.length) {
					shadow.waiting = true;
					shadow.port.postMessage(shadow.waitQueue.shift());
				}
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
