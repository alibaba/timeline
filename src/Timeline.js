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
import TrackGroup from './TrackGroup';
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

	onInit: () => {},
	onStart: () => {},
	onEnd: () => {},
	onUpdate: () => {},
};

// 最大等待队列，超出后将舍弃最久的pull request
const MAX_WAIT_QUEUE = 2;

/**
 * Timeline 🌺 🌺 🌺
 * 接口风格与MediaElement保持一致
 */
export default class Timeline extends TrackGroup {
	// 创建一个Timeline实例，建议全局使用一个实例来方便同一控制所有行为与动画
	constructor(config) {
		config = {
			...CONFIG_DEFAULT,
			...config,
		};

		config.startTime = 0;

		super(config);

		this.config = config;
		this.isTimeline = true;

		this.duration = this.config.duration;
		// this.loop = this.config.loop;

		// 频率限制
		this.minFrame = 900 / this.config.maxFPS;

		// this.tracks = [];

		// this.currentTime = 0; // timeLocal
		this._lastCurrentTime = 0;
		this.referenceTime = this._getTimeNow(); // 参考时间

		this.animationFrameID = 0;

		this.playing = false;

		// this.cbkEnd = [];

		// this._ticks = []; // 把需要执行的tick排序执行（orderGuarantee）

		this._timeBeforeHidden = 0;
		this._timeBeforePaused = 0;

		this._timeoutID = 0; // 用于给setTimeout和setInterval分配ID

		this.ports = [];

		this.localShadows = [];
		this.remoteShadows = [];

		this.origin;
		this.config.origin && (this.setOrigin(this.config.origin));

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
					if (this.playing) {
						this.tick();
					}
				}
			});
		}

		// 更新shadow时间
		// @TODO 似乎和Track等效
		this.onUpdate = (time, p) => {
			// 逐个轨道处理
			for (let i = 0; i < this.tracks.length; i++) {
				this.tracks[i].tick(time);
			}

			this.config.onUpdate && this.config.onUpdate(time, p);
		};
	}

	// 相对时间，只能用来计算差值
	_getTimeNow() { return getTimeNow(); }

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

		// 同步Timeline
		this.remoteShadows.forEach(shadow => {
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

		this.localShadows.forEach(shadow => {
			shadow.currentTime = this.currentTime;
			shadow.duration = this.duration;
			shadow.referenceTime = this.referenceTime;
			shadow.tick(this.currentTime);
		});

		if (this.stats) this.stats.begin()

		// @NOTE 不使用Track.tick中对于循环的处理
		if (this.currentTime >= this.duration && this.loop) {
			if (!this.started) { // 这里用running也一样
				this.started = true
				this.running = true

				this.onInit && this.onInit(time);
				this.onStart && this.onStart(this.currentTime);
			} else {
				this.onEnd && this.onEnd(this.currentTime);
				this.onStart && this.onStart(this.currentTime);
			}
			this.seek(0);
			for (let i = 0; i < this.tracks.length; i++) {
				if (this.tracks[i].started) {
					this.tracks[i].reset()
				}
			}
		}

		super.tick(this.currentTime);

		// 自动回收
		if (this.config.autoRecevery) {
			this.recovery();
		}

		if (time !== undefined) {
			this.playing = false;
			return this;
		}

		if (this.alive) {
			this.playing = false;
			this.animationFrameID = raf(() => this.tick());
		}

		if (this.stats) this.stats.end()
		return this;
	}

	// 开始播放
	play() {
		this.stop();
		this.playing = true;
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
		this.playing = false;
		cancelRaf(this.animationFrameID);
		return this;
	}

	// 暂停播放
	pause() {
		this.playing = false;
		this._timeBeforePaused = this.currentTime;
		cancelRaf(this.animationFrameID);
		return this;
	}

	// 从暂停中恢复， ** 不能从停止中恢复 **
	resume() {
		this.pause();
		this.seek(this._timeBeforePaused);
		this.playing = true;
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

	listen(port) {
		if (this.ports.includes(port)) return;
		this.ports.push(port);

		port.addEventListener('message', e => {
			// console.log(e);
			if (!e.data ||
				e.data.__timeline_type !== 'PAIRING_REQ'
			) return;

			this._addShadow(port, e.data.__timeline_shadow_id);
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation(); // IE 9
		});
	}

	_addShadow(shadow, id) {
		// if ((!this.id && this.id !== 0))
		// 	throw new Error('你需要给当前Timeline指定ID才能够为其添加shadow')

		if (shadow.isTimeline) {
			// 本地
			shadow.config = {
				...this.config,
				shadows: [],
				onInit: null,
				onStart: null,
				onUpdate: null,
				onEnd: null,
			};
			shadow.duration = shadow.config.duration;
			shadow.loop = shadow.config.loop;
			this.localShadows.push(shadow);
		} else {
			// 远程
			const port = shadow;
			const remoteShadow = {
				port,
				// 等待队列
				waitQueue: [],
				// 当前有任务在等待返回
				waiting: false,
				// 一对多，需要一个额外的ID
				id,
			};

			// 回执
			// port.onmessage = e => {
			port.addEventListener('message', e => {
				// console.log(e);
				if (!e.data ||
					e.data.__timeline_shadow_id !== remoteShadow.id
				) return;

				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation(); // IE 9

				if (e.data.__timeline_type === 'done') {
					remoteShadow.waiting = false;
					// remoteShadow.waitQueue.length && shadow.waitQueue.shift()();
					if (remoteShadow.waitQueue.length) {
						remoteShadow.waiting = true;
						remoteShadow.port.postMessage(remoteShadow.waitQueue.shift());
					}
				}
			});

			// 同步初始状态
			port.postMessage({
				__timeline_type: 'init',
				// __timeline_id: this.config.id,
				// 分配端口ID
				__timeline_shadow_id: shadow.id,
				__timeline_msg: {
					...this.config,
					shadows: [],
					onInit: null,
					onStart: null,
					onUpdate: null,
					onEnd: null,
				},
				// __timeline_timenow: this.referenceTime,
			});

			this.remoteShadows.push(remoteShadow);
		}

	}

	setOrigin(origin) {
		if (this.origin) console.error('该timeline已经设置过Origin');

		this.origin = origin;

		this.shadow_id = performance.now() + Math.random();

		// 本地Origin和远程Origin
		if (origin.isTimeline) {
			// 本地
			origin._addShadow(this, this.shadow_id);
		} else {
			// 远程
			const port = origin;
			// 配对请求
			port.postMessage({
				__timeline_type: 'PAIRING_REQ',
				// __timeline_id: this.config.id,
				// 分配端口ID
				__timeline_shadow_id: this.shadow_id,
			});

			this.origin.addEventListener('message', e => {
				const data = e.data;

				// 已分配shadow_id，只接受自己的消息
				if (!data || data.__timeline_shadow_id !== this.shadow_id) return;

				if (data.__timeline_type === 'init') {
					// console.log('接受分配', data);
					// 占用该port
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation(); // IE 9
					// 初始化自身的设置
					this.config = data.__timeline_msg;
					this.duration = this.config.duration;
					this.loop = this.config.loop;
				}

				if (data.__timeline_type === 'tick') {
					this.currentTime = data.__timeline_msg.currentTime;
					this.duration = data.__timeline_msg.duration;
					this.referenceTime = data.__timeline_msg.referenceTime;
					this.tick(this.currentTime);
					// @NOTE currentTime会是对的，referenceTime会乱掉

					// 完成回执
					port.postMessage({
						__timeline_type: 'done',
						// __timeline_id: this.id,
						__timeline_shadow_id: this.shadow_id,
					});
				}

			});
		}

		// 剥夺控制权
		this.seek = (time) => { this.currentTime = time; return this; }
		// this.tick = () => { console.error('ShadowTimeline shall not be edited derictly!'); }
		this.play = () => { console.error('ShadowTimeline shall not be edited derictly!'); }
		this.stop = () => { console.error('ShadowTimeline shall not be edited derictly!'); }
		this.pause = () => { console.error('ShadowTimeline shall not be edited derictly!'); }
		this.resume = () => { console.error('ShadowTimeline shall not be edited derictly!'); }
	}
}
