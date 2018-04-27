/* eslint-disable */

// ============ polyfill START ============

// 获取系统时间戳的函数
let getTimeNow = null;

// @NOTE: chrome的Worker里也是有process的!!!
// 			而且和node的process不一样!!!
if (typeof (window) === 'undefined' &&
	typeof (process) !== 'undefined' &&
	process.hrtime !== undefined) {

	getTimeNow = function () {
		const time = process.hrtime();
		// Convert [seconds, nanoseconds] to milliseconds.
		return time[0] * 1000 + time[1] / 1000000;
	};

} else if (typeof (this) !== 'undefined' &&
			this.performance !== undefined &&
			this.performance.now !== undefined) {

	// In a browser, use window.performance.now if it is available.
	// This must be bound, because directly assigning this function
	// leads to an invocation exception in Chrome.
	getTimeNow = window.performance.now.bind(window.performance);

} else if (Date.now !== undefined) {

	// Use Date.now if it is available.
	getTimeNow = Date.now;

} else {

	// Otherwise, use 'new Date().getTime()'.
	getTimeNow = function () {
		return new Date().getTime();
	};

}

//  raf
let raf, cancelRaf;

// NOTE 在Worker和node环境中不存在raf，因此可以使用setTimeout替代
if (typeof requestAnimationFrame !== 'undefined') {
	raf = requestAnimationFrame;
	cancelRaf = cancelAnimationFrame;
} else {
	raf = cbk => setTimeout(cbk, 20);
	cancelRaf = clearTimeout;
}

// ============ polyfill END ============



let __trackUUID = 0; // 避免uuid重复

/**
 * Track 🚀 🚀 🚀
 * 轨道，代表时间线上的一个行为对象，有自己的startTime, duration等特性
 * TODO: startTime === endTime的处理
 * TODO: startTime and endTime过于接近的问题
 * TODO: onP
 * TODO: 回调中提供与预定时间的偏移量
 */
class Track {
	/**
	 * 创建一个Track
	 * @param {any} id - 命名，可以用来查找制定Track，也便与调试
	 * @param {Bool} [loop=false] - 是否循环
	 * @param {Number} [startTime=0] - 起始时间
	 * @param {Number} endTime - 结束时间
	 * @param {Number} duration - 时长
	 * @param {Func} onStart - 开始时的回调，loop的话每次开始都会调用
	 * @param {Func} onEnd - 结束时的回调，loop的话每次结束都会调用
	 * @param {Func} onUpdate - 过程回调
	 * @param {Func} onInit - 首次开始时的回调
	 */
	constructor({ id, loop, startTime = 0, endTime, duration,
				  onStart, onEnd, onUpdate, onInit, }) {
		this.id = id !== undefined ? id : '';
		this.uuid = '' + Math.random() + __trackUUID ++;

		this._startTime = startTime;
		this._endTime = endTime;
		this.onStart = onStart;
		this.onEnd = onEnd;
		this.onUpdate = onUpdate;
		this.onInit = onInit;
		this.loop = loop;

		// 计算duration和endTime，处理endTime与duration不一致的情况

		let _duration = duration; // es lint

		if (!_duration && !endTime) {
			_duration = Infinity;
		}

		if (_duration) {
			this._duration = _duration;
			this._endTime = startTime + _duration;
		}

		if (endTime) {
			this._duration = endTime - startTime;
			if (this._endTime !== endTime) {
				console.warn('endTime与duration不一致，将以endTime为准');
				this._endTime = endTime;
			}
		}

		if (this._startTime < 0 || this._endTime <= this._startTime) {
			throw new Error('wrong parameters');
		}

		this.running = false; // 运行中
		this.inited = true; // 初始化完成
		this.started = false; // 本轮播放过
		// 循环次数
		this.loopTime = 0;

        // 垃圾回收flag
		this._alive = true;
	}

	get startTime() { return this._startTime; }
	set startTime(newTime) {
		// TODO: 这部分修改之后需要重新校验
		this._startTime = newTime;
		this._endTime = this._startTime + this._duration;
	}

	get endTime() { return this._endTime; }
	set endTime(newTime) {
		this._endTime = newTime;
		this._duration = this._endTime = this._startTime;
	}

	get duration() { return this._duration; }
	set duration(newTime) {
		this._duration = newTime;
		this._endTime = this._startTime + this._duration;
	}

	get alive() { return this._alive; }
	set alive(v) { this._alive = v; }

	tick(_time) {
		if (!this.alive) { return }

		let time = _time; // es lint
		// TODO: 使用循环时，onEnd如何处理？暂时不处理
		if (this.loop && time > this._endTime) {
			// 循环次数, 处理onStart onEnd
			const newLoopTime = Math.floor((time - this._startTime) / this._duration);
			time = (time - this._startTime) % this._duration + this._startTime;
			if (this.loopTime !== newLoopTime) {
				this.loopTime = newLoopTime;
				this.onStart && this.onStart(time);
				this.onUpdate && this.onUpdate(time, (time - this._startTime) / this._duration);
				this.onEnd && this.onEnd(time);
				return;
			}
		}

		if (time < this._startTime) {
			// Track未开始
			if (this.running) {
				this.running = false;
				// NOTE: 避免终止位置不正确
				this.onUpdate && this.onUpdate(time, 1);
				this.onEnd && this.onEnd(time);
			}
			if (!this.inited) {
				this.onInit && this.onInit(time);
				this.inited = true;
				this.started = false;
			}

		} else if (time > this._endTime) {
			// Track已结束
			if (this.running) {
				this.running = false;
				// NOTE: 避免终止位置不正确
				this.onUpdate && this.onUpdate(time, 1);
				this.onEnd && this.onEnd(time);
			} else if (!this.started) {
				// NOTE: 避免整个动画被跳过，起码要播一下最后一帧
				if (!this.inited) {
					this.onInit && this.onInit(time);
					this.inited = true;
				}
				this.onStart && this.onStart(time);
				this.onUpdate && this.onUpdate(time, 1);
				this.onEnd && this.onEnd(time);
				this.started = true;
			} else {
                // 过期而且不循环（循环的情况在上面处理）
				this.alive = false;
			}

		} else {
			// Track运行中
			if (!this.running) {
				this.running = true;
				this.inited = false;
				this.started = true;
				this.onStart && this.onStart(time);
			}
			if (this.onUpdate) {
				this.onUpdate(time, (time - this._startTime) / this._duration);
			}
		}
	}

	// 避免和时间线起点对齐导致onStart不能正确触发
	_safeClip(end) {
		if (this._startTime === 0) {
			this._startTime = 0.5;
		}
		if (this._startTime >= end) {
			this._startTime = end - 1;
		}
		if (this._endTime >= end) {
			this._endTime = end - 0.5;
			// 原则上，p不大于一即可
			this._duration = end - this._startTime;
		}
	}
}

//

const CONFIG_TIMELINE = {
	duration: Infinity,
	loop: false,
	autoRecevery: false,
	// 页面非激活状态（requestAnimationFrame不工作）时，自动停止播放
	// 如果document.hidden不可用，则该项不会生效
	// 避免长时间页面切走后切回，造成的时间突进
	pauseWhenInvisible: false,
	// 最长帧时间限制，如果帧长度超过这个值，则会被压缩到这个值
	// 用于避免打断点时继续计时，端点结束后时间突进
	maxStep: Infinity,
	// 最大帧率限制
	maxFPS: Infinity,
};

/**
 * Timeline 🌺 🌺 🌺
 * 接口风格与MediaElement保持一致
 */
export default class Timeline {
	/**
	 * 创建一个Timeline实例，建议全局使用一个实例来方便同一控制所有行为与动画
	 */
	constructor(config) {
		this.config = {
			...CONFIG_TIMELINE,
			...config,
		};

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

		this.cbkEnd = [];

		this._timeBeforeHidden = 0;
		this._timeBeforePaused = 0;

		this._timeoutID = 0; // 用于给setTimeout和setInterval分配ID

		// 页面不可见时暂停计时
		// 非浏览器主线程环境则忽略
		if (this.config.pauseWhenInvisible && typeof (document) !== 'undefined') {
			// this.invisiblePause = document.hidden
			document.addEventListener("visibilitychange", () => {
				// if (!document.hidden) {
				// 	console.log('重置时间');
				// 	this.referenceTime = this._getTimeNow();
				// }
				if (document.hidden) {
					// console.log('pause');
					this._timeBeforeHidden = this.currentTime;
					cancelRaf(this.animationFrameID);
				} else {
					// console.log('continue');
					this.seek(this._timeBeforeHidden);
					if (this.running) {
						this.tick();
					}
				}
			});
		}
	}

	// 播放结束的回调
	get onEnd() { return this.cbkEnd; }
	set onEnd(cbk) { this.cbkEnd.push(cbk); }

	// 相对时间，只能用来计算差值
	_getTimeNow() { return getTimeNow(); }

	/**
	* 每帧调用
	* @param  {Bool} singleStep 单步逐帧播放
	* @param  {Num}  time  opt, 跳转到特定时间
	*/
	tick(singleStep = false, time) {

		if (time === undefined) {
			const currentTime = this._getTimeNow() - this.referenceTime;
			if (currentTime - this.currentTime < this.minFrame) {
				this.animationFrameID = raf(() => this.tick());
				return this;
			}
			this._lastCurrentTime = this.currentTime;
			this.currentTime = currentTime;
			const step = this.currentTime - this._lastCurrentTime;
			if (step > this.config.maxStep) {
				this.seek(this._lastCurrentTime + this.config.maxStep);
			}
		} else {
			this.seek(time);
		}
		if (this.currentTime > this.duration) {
			if (this.running) {
				for (let i = this.cbkEnd.length - 1; i >= 0; i--) {
					this.cbkEnd[i]();
				}
			}
			if (this.loop) {
				this.seek(0); // 保证 onInit 和 onStart 会被触发
			} else {
				this.running = false;
				// 以免track在尾部得不到调用
				this.onTimeUpdate && this.onTimeUpdate(this);
				for (let i = this.tracks.length - 1; i >= 0; i--) {
					this.tracks[i].tick(this.currentTime);
				}
				// this.stop()
				return;
			}
		}
		this.onTimeUpdate && this.onTimeUpdate(this);
		for (let i = this.tracks.length - 1; i >= 0; i--) {
			this.tracks[i].tick(this.currentTime);
		}
        // 自动回收
		if (this.config.autoRecevery) {
			this.recovery();
		}
		if (singleStep) {
			this.running = false;
			return;
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
	addTrack(props) {
		// let track = null
		// if (startTimeOrTrack instanceof Track) {
		//  track = startTimeOrTrack
		// } else {
		//  track = new Track({startTimeOrTrack, endTime, onStart, onEnd, onUpdate})
		// }
		const track = new Track(props);
		track._safeClip(this.duration);
		track.onInit && track.onInit(this.currentTime);
		this.tracks.push(track);
		return track;
	}

	// 停掉指定Track
	stopTrack(track) {
		const uuid = track.uuid;
		for (let i = this.tracks.length - 1; i >= 0 ; i--) {
			if (this.tracks[i].uuid === uuid) {
				this.tracks[i].alive = false;
			}
		}
	}

	// 清理掉整个Timeline，目前没有发现需要单独清理的溢出点
	destroy() {
		this.stop();
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

	// 重写Dom标准中的 setTimeout 和 setInterval

	setTimeout(callback, time) {
		const ID = this._timeoutID ++;
		this.addTrack({
			id: '__timeout__' + ID,
			startTime: this.timeline.currentTime + time,
			duration: 1000,
			loop: false,
			onStart: callback,
		});
		return ID;
	}

	setInterval(callback, time) {
		const ID = this._timeoutID ++;
		this.addTrack({
			id: '__timeout__' + ID,
			startTime: this.timeline.currentTime + time,
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

	static Track = Track
}
