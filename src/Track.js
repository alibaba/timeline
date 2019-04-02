/**
 * Copyright (c) 2017 Alibaba Group Holding Limited
 */

/**********************
 * Track for Timeline *
 * @author Meng       *
 **********************/

let __trackUUID = 0 // 避免uuid重复

/**
 * Track 🚀 🚀 🚀
 * 轨道，代表时间线上的一个行为对象，有自己的startTime, duration等特性
 * @NOTE started和running只是为了判断一种情况：整个track根本没开始就完全被跳过
 * TODO: startTime === endTime的处理
 * TODO: startTime and endTime过于接近的问题
 * TODO: onP
 * TODO: 回调中提供与预定时间的偏移量
 */
export default class Track {
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
	 // * @param {Func} onInit - 首次开始时的回调
	 * @param {Func} easing - easing - 缓动函数 p => p
	 */
	constructor({
		id,
		loop,
		startTime = 0,
		endTime,
		duration,
		onStart,
		onEnd,
		onUpdate,
		onInit,
		easing,
	}) {
		this.id = id !== undefined ? id : ''
		this.uuid = '' + Math.random() + __trackUUID++
		this.isTrack = true

		this._startTime = startTime
		this._endTime = endTime
		this.onStart = onStart
		this.onEnd = onEnd
		this.onUpdate = onUpdate
		this.onInit = onInit
		this.loop = loop
		this.easing = easing

		if (this.easing && (this.easing(0) !== 0 || this.easing(1) !== 1)) {
			console.warn('ease函数错误，（easing(0) should be 0, easing(1) should be 1）')
		}

		this.currentTime = 0 // timeLocal

		// 保证只被add一次
		this._taken = false

		// 计算duration和endTime，处理endTime与duration不一致的情况

		let _duration = duration // es lint

		// TODO 测试duration 0 的情况
		// NOTE 处理0
		// if (!_duration && !endTime) {
		if (_duration - 0 !== _duration && endTime - 0 !== endTime) {
			_duration = Infinity
		}

		if (_duration - 0 === _duration) {
			this._duration = _duration
			this._endTime = startTime + _duration
		}

		if (endTime - 0 === endTime) {
			this._duration = endTime - startTime
			if (this._endTime !== endTime) {
				console.warn('endTime与duration不一致，将以endTime为准')
				this._endTime = endTime
			}
		}

		if (this._startTime < 0 || this._endTime < this._startTime) {
			throw new Error('wrong parameters')
		}

		this.running = false // 运行中
		this.inited = false // 初始化完成
		this.started = false // 本轮播放过
		// 循环次数
		this.loopTime = 0

		// 垃圾回收flag
		this._alive = true
	}

	get startTime() {
		return this._startTime
	}
	set startTime(newTime) {
		// TODO: 这部分修改之后需要重新校验
		this._startTime = newTime
		this._endTime = this._startTime + this._duration
	}

	get endTime() {
		return this._endTime
	}
	set endTime(newTime) {
		this._endTime = newTime
		this._duration = this._endTime = this._startTime
	}

	get duration() {
		return this._duration
	}
	set duration(newTime) {
		this._duration = newTime
		this._endTime = this._startTime + this._duration
	}

	get alive() {
		return this._alive
	}
	set alive(v) {
		this._alive = v
	}

	reset() {
		// console.error('track reset');
		// debugger;
		if (this.started) {
			// NOTE: 避免终止位置不正确
			this.onUpdate && this.onUpdate(this.endTime, 1)
			this.onEnd && this.onEnd(this.endTime)
			this.inited = false
			this.started = false
			this.running = false
		}
	}

	tick(time) {
		if (!this.alive) {
			return
		}

		this.currentTime = time

		this.inited || (this.onInit && this.onInit())
		this.inited = true

		// TODO: 使用循环时，onEnd如何处理？暂时不处理
		if (this.loop && this.currentTime >= this._endTime) {
			// 循环次数, 处理onStart onEnd
			const newLoopTime = Math.floor((this.currentTime - this._startTime) / this._duration)
			this.currentTime =
				((this.currentTime - this._startTime) % this._duration) + this._startTime

			if (this.loopTime !== newLoopTime) {
				// 新的一轮循环
				this.loopTime = newLoopTime

				if (!this.started) {
					// 这里用running也一样
					this.started = true
					this.running = true

					this.onStart && this.onStart(this.currentTime)
					this.onUpdate && this.onUpdate(this.currentTime, this._getP())
				} else {
					this.onEnd && this.onEnd(this.currentTime)
					this.onStart && this.onStart(this.currentTime)
					// @BUG easing
					this.onUpdate && this.onUpdate(this.currentTime, this._getP())
				}
				return
			}
		}

		if (this.currentTime < this._startTime) {
			// Track未开始
			if (this.started) {
				this.reset()
			}
		} else if (this.currentTime >= this._endTime) {
			// Track已结束
			if (this.running) {
				this.running = false
				// NOTE: 避免终止位置不正确
				this.onUpdate && this.onUpdate(this.currentTime, 1)
				this.onEnd && this.onEnd(this.currentTime)
			} else if (!this.started) {
				// NOTE: 避免整个动画被跳过，起码要播一下最后一帧
				// @TODO 这里的time传哪个
				this.onStart && this.onStart(this.currentTime)
				this.onUpdate && this.onUpdate(this.currentTime, 1)
				this.onEnd && this.onEnd(this.currentTime)
				this.started = true
			}
			// 过期而且不循环（循环的情况在上面处理）
			this.alive = false
		} else {
			// Track运行中
			if (!this.running) {
				this.running = true
				// this.inited = false;
				this.started = true
				this.onStart && this.onStart(this.currentTime)
			}

			this.onUpdate && this.onUpdate(this.currentTime, this._getP())
		}
	}

	_getP() {
		let p = (this.currentTime - this._startTime) / this._duration
		// 缓动
		if (this.easing) {
			p = this.easing(p)
		}
		return p
	}
}
